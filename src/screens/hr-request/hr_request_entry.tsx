import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, addDays, isAfter, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  useAddConnectionMutation,
  useGetRecipientCredentialsQuery,
  useGetCredentialsQuery,
  useUpdateCredentialsRequestMutation,
  useGetVerifyRequestInfoQuery,
  useClaimVerifyRequestMutation,
  useGetVerificationRoutesQuery,
} from "@/redux/api";
import { clearVerifyRef, peekVerifyRef } from "@/utils/connectionFlow";
import { TypedIdDialog } from "@/components/typed-id-dialog";
import { startDigilockerFlow } from "@/utils/digilockerStart";
import { methodsFor } from "@/utils/verificationSource";
import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

const shareBtnClass =
  "h-11 w-full rounded-xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] font-semibold text-white hover:opacity-95";
const selectTriggerThemed =
  "w-full border-[color:var(--iverifi-dialog-border)] !bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-primary)]";

const formatDocType = (type: string) =>
  type ? type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "Document";

/** a business's verification request asks for ONE document: which of the person's verified documents answers it, and what to call it */
const REQUESTED = {
  aadhaar: { types: ["AADHAAR_CARD", "DIGILOCKER"], label: "Aadhaar" },
  driving_licence: { types: ["DRIVING_LICENSE"], label: "driving licence" },
} as const;

/**
 * Entry point for a non-hotel business (e.g. an employer's HR system)
 * requesting a candidate's verified identity documents.
 *
 * Deliberately separate from the QR/guest-checkin funnel
 * (components/qr-code-handler.tsx, screens/guest-checkin/*) - that funnel
 * is hotel-specific (per-stay check-in limits tied to a paid subscription,
 * "property"/"front desk" copy) and is left completely untouched.
 *
 * Unlike the general ConnectionDetails screen (/connections/:id, meant for
 * managing an ongoing relationship - revoke, activity history, "no
 * documents shared yet" empty state), this is a single-purpose "someone is
 * requesting your documents right now" prompt: land, see who's asking,
 * pick documents, share, done - no extra click into a dialog on a mostly
 * empty page first.
 */
export default function HrRequestEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [addConnection, { isLoading: isConnecting }] = useAddConnectionMutation();
  const [claimRequest] = useClaimVerifyRequestMutation();
  const [updateCredentials, { isLoading: isSharing }] = useUpdateCredentialsRequestMutation();
  const [error, setError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const startedRef = useRef(false);

  const code = searchParams.get("code");
  // A request made through the iVerifi Verify API carries its id (kept through sign-in): it says who asks and for which document.
  const ref = searchParams.get("ref") || peekVerifyRef();
  const { data: requestInfo, isError: isAskedError } = useGetVerifyRequestInfoQuery(ref ?? "", { skip: !ref });
  const asked = requestInfo?.data ?? null;
  const requested = asked ? REQUESTED[asked.document] : null;
  // while the request is still being read, nothing is offered: a request for one document must never show the rest of the vault
  const askedLoading = !!ref && !asked && !isAskedError;
  const { data: routesData } = useGetVerificationRoutesQuery();
  const [typedDoc, setTypedDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("Missing request code.");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        // addConnection is idempotent for an existing recipient - safe to
        // call every time this screen is opened, resuming any prior
        // connection rather than creating a duplicate.
        await addConnection({ document_id: code, type: "Company" }).unwrap();
        // getRecipientCredentials (below) is keyed by recipient_id (`code`),
        // not the credential_request_id addConnection returns - confirmed
        // by ConnectionRequestsPage's own linking pattern.
        setConnectionId(code);
      } catch (err: any) {
        setError(err?.data?.message || "Could not start this request. Please try again.");
      }
    })();
  }, [code, addConnection]);

  // opening the link while signed in is enough to tell iVerifi the request is yours: a document shared earlier with this business then completes it too
  const claimedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ref || !connectionId || claimedRef.current === ref) return;
    claimedRef.current = ref;
    claimRequest(ref).unwrap().catch(() => undefined);
  }, [ref, connectionId, claimRequest]);

  const {
    data: connectionData,
    isLoading: isLoadingConnection,
    isError: isConnectionError,
    refetch: refetchConnection,
  } = useGetRecipientCredentialsQuery(connectionId || "", { skip: !connectionId });

  const { data: credsData, isLoading: isCredsLoading } = useGetCredentialsQuery();

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [sharePeriod, setSharePeriod] = useState<string>("");

  const connection = connectionData?.data?.requests?.[0];
  const requesterName =
    asked?.business_name ||
    connection?.recipients?.name ||
    connection?.recipients?.firstName ||
    connection?.recipients?.businessName ||
    "This company";
  const allVerifiedDocs = credsData?.data?.credential || [];
  // for a verification request only the document that was asked for is offered, never the rest of the person's vault
  const verifiedDocs = requested ? allVerifiedDocs.filter((doc: any) => (requested.types as readonly string[]).includes(doc.document_type)) : allVerifiedDocs;

  const activeSharedCredentialIds = useMemo(
    () =>
      new Set(
        (connection?.credentials || [])
          .filter((cred: any) => {
            const expiry = cred?.expiry_date;
            return expiry && isAfter(parseISO(expiry), new Date());
          })
          .map((cred: any) => cred.credential_id)
      ),
    [connection]
  );
  const alreadySharedCount = activeSharedCredentialIds.size;

  const docsAvailableToShare = verifiedDocs.filter(
    (doc: any) => !activeSharedCredentialIds.has(doc.id)
  );

  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  // the person has not verified the document that was asked for: verify it here, the way the vault does, then come back to this link
  const verifyAsked = async () => {
    if (!asked) return;
    const docType = asked.document === "aadhaar" ? "AADHAAR_CARD" : "DRIVING_LICENSE";
    const methods = methodsFor(routesData?.data?.routes, docType);
    if (!methods.length) return toast.error("This document cannot be verified right now. Please try again later.");
    if (methods[0] === "vsign") return setTypedDoc(docType);
    if (methods[0] === "digilocker") {
      try {
        await startDigilockerFlow({ docType: asked.document === "aadhaar" ? "AADHAAR_APP" : "DL" });
      } catch (e) {
        toast.error((e as Error)?.message || "Could not start DigiLocker verification");
      }
      return;
    }
    navigate("/"); // the camera scan lives on the home screen; the link is kept, so opening it again continues this request
  };

  const handleShare = async () => {
    if (!connection?.id) return;
    if (!selectedDocs.length || !sharePeriod) {
      toast.error("Select at least one document and share period");
      return;
    }
    const expiry = addDays(new Date(), parseInt(sharePeriod));
    const payload = verifiedDocs
      .filter((doc: any) => selectedDocs.includes(doc.id))
      .map((doc: any) => ({
        credential_id: doc.id,
        document_type: doc.document_type,
        status: "Active",
        expiry_date: format(expiry, "yyyy-MM-dd"),
      }));

    try {
      await updateCredentials({
        credential_request_id: connection.id,
        credentials: payload,
      }).unwrap();
      // tell iVerifi this request is theirs, so the business sees it complete; sharing itself already worked, so a failure here is not shown
      if (ref) await claimRequest(ref).unwrap().catch(() => undefined);
      setShared(true);
      clearVerifyRef();
      setSelectedDocs([]);
      setSharePeriod("");
      await refetchConnection();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to share documents");
    }
  };

  if (error) {
    return (
      <div className="min-h-0 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-sm text-[var(--iverifi-text-muted)]">{error}</p>
          <Button type="button" onClick={() => navigate("/", { replace: true })}>
            Go to your vault
          </Button>
        </div>
      </div>
    );
  }

  if (isConnecting || !connectionId || isLoadingConnection || askedLoading) {
    return <LoadingScreen variant="fullPage" />;
  }

  if (isConnectionError || !connection) {
    return (
      <div className="min-h-0 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-sm text-[var(--iverifi-text-muted)]">
            Could not load this request. Please try again.
          </p>
          <Button type="button" onClick={() => navigate("/", { replace: true })}>
            Go to your vault
          </Button>
        </div>
      </div>
    );
  }

  const alreadyFullyShared =
    alreadySharedCount > 0 && verifiedDocs.length > 0 && docsAvailableToShare.length === 0;

  // a request that is over cannot be answered any more
  if (asked && !shared && (asked.status === "expired" || asked.status === "cancelled" || asked.status === "completed")) {
    return (
      <div className="min-h-0 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h2 className="text-lg font-bold text-[var(--iverifi-text-primary)]">
            {asked.status === "completed" ? "This request is already done" : "This request is no longer open"}
          </h2>
          <p className="text-sm text-[var(--iverifi-text-muted)]">
            {asked.status === "completed"
              ? `${requesterName} already has what they asked for.`
              : `Ask ${requesterName} to send you a new link.`}
          </p>
          <Button type="button" onClick={() => { clearVerifyRef(); navigate("/", { replace: true }); }}>
            Go to your vault
          </Button>
        </div>
      </div>
    );
  }

  if (shared || alreadyFullyShared) {
    return (
      <div className="min-h-0 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <h2 className="text-lg font-bold text-[var(--iverifi-text-primary)]">
            You've shared your documents with {requesterName}
          </h2>
          <p className="text-sm text-[var(--iverifi-text-muted)]">
            They'll be notified right away. You can close this page now.
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-white/15 bg-transparent text-[var(--iverifi-text-secondary)] hover:bg-white/10"
            onClick={() => navigate("/", { replace: true })}
          >
            Go to your vault
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#7B5CF5]" />
          <h2 className="text-lg font-bold text-[var(--iverifi-text-primary)]">
            {requested ? `${requesterName} asks you to share your ${requested.label}` : `${requesterName} is requesting your verified documents`}
          </h2>
          <p className="text-sm text-[var(--iverifi-text-muted)]">
            Choose exactly what to share and for how long. Nothing is sent until you tap Share.
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]/60 px-4 py-3 text-xs text-[var(--iverifi-text-muted)] space-y-1">
          <p>
            <span className="font-semibold text-[var(--iverifi-text-secondary)]">Why {requesterName} is asking: </span>
            {requested ? "to verify your identity. " : "to verify your identity as part of employment onboarding. "}
            Only the {requested ? "document" : "documents"} and duration you choose below are shared - {requesterName} never gets your full iVerifi profile.
          </p>
          <p>
            You can revoke this access any time from your Connections page, and it expires automatically at the end of the share period you pick.
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] p-4 space-y-4">
          {isCredsLoading ? (
            <p className="text-sm text-[var(--iverifi-text-muted)]">Loading your verified documents…</p>
          ) : docsAvailableToShare.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--iverifi-text-muted)]">
                {verifiedDocs.length === 0
                  ? requested
                    ? `You haven't verified your ${requested.label} yet. Verify it now, then share it with ${requesterName}.`
                    : "You don't have any verified documents yet. Verify a document first, then come back to this link."
                  : `You've already shared all your verified documents with ${requesterName}.`}
              </p>
              {requested && verifiedDocs.length === 0 && (
                <Button type="button" className={shareBtnClass} onClick={verifyAsked}>
                  Verify my {requested.label}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {docsAvailableToShare.map((doc: any) => (
                <div key={doc.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedDocs.includes(doc.id)}
                    onCheckedChange={() => toggleDoc(doc.id)}
                  />
                  <Label className="truncate text-[var(--iverifi-text-secondary)]">
                    {formatDocType(doc.document_type)}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {docsAvailableToShare.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[var(--iverifi-text-secondary)]">Share period</Label>
              <Select onValueChange={setSharePeriod} value={sharePeriod}>
                <SelectTrigger className={selectTriggerThemed}>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent className="border border-[color:var(--iverifi-dialog-border)] bg-[var(--iverifi-select-content)] text-[var(--iverifi-text-primary)]">
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {docsAvailableToShare.length > 0 && (
          <Button type="button" className={shareBtnClass} onClick={handleShare} disabled={isSharing}>
            {isSharing ? "Sharing…" : "Share"}
          </Button>
        )}
      </div>
      <TypedIdDialog documentType={typedDoc} onClose={() => setTypedDoc(null)} />
    </div>
  );
}
