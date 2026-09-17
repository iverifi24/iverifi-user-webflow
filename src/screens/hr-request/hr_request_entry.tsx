import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, addDays, isAfter, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  useAddConnectionMutation,
  useGetRecipientCredentialsQuery,
  useGetCredentialsQuery,
  useUpdateCredentialsRequestMutation,
} from "@/redux/api";
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
  const [updateCredentials, { isLoading: isSharing }] = useUpdateCredentialsRequestMutation();
  const [error, setError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const startedRef = useRef(false);

  const code = searchParams.get("code");

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
    connection?.recipients?.name ||
    connection?.recipients?.firstName ||
    connection?.recipients?.businessName ||
    "This company";
  const verifiedDocs = credsData?.data?.credential || [];

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
      setShared(true);
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

  if (isConnecting || !connectionId || isLoadingConnection) {
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
            {requesterName} is requesting your verified documents
          </h2>
          <p className="text-sm text-[var(--iverifi-text-muted)]">
            Choose exactly what to share and for how long. Nothing is sent until you tap Share.
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]/60 px-4 py-3 text-xs text-[var(--iverifi-text-muted)] space-y-1">
          <p>
            <span className="font-semibold text-[var(--iverifi-text-secondary)]">Why {requesterName} is asking: </span>
            to verify your identity as part of employment onboarding. Only the documents and duration you choose below are shared - {requesterName} never gets your full iVerifi profile.
          </p>
          <p>
            You can revoke this access any time from your Connections page, and it expires automatically at the end of the share period you pick.
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] p-4 space-y-4">
          {isCredsLoading ? (
            <p className="text-sm text-[var(--iverifi-text-muted)]">Loading your verified documents…</p>
          ) : docsAvailableToShare.length === 0 ? (
            <p className="text-sm text-[var(--iverifi-text-muted)]">
              {verifiedDocs.length === 0
                ? "You don't have any verified documents yet. Verify a document first, then come back to this link."
                : `You've already shared all your verified documents with ${requesterName}.`}
            </p>
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
    </div>
  );
}
