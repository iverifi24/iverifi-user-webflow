import { useState, useEffect, useRef } from "react";
import { auth } from "@/firebase/firebase_setup";
import { useGetCredentialsQuery, useGetVerificationRoutesQuery, useSaveForeignPassportMutation, useUpdateCheckInStatusMutation, useMarkKycStartedMutation } from "@/redux/api";
import { methodsFor, providerLabel, labelForMethod } from "@/utils/verificationSource";
import type { VerifyMethod } from "@/utils/verificationSource";
import { digilockerErrorMessage, alsoSavedMessage } from "@/utils/digilockerErrors";
import { Button } from "@/components/ui/button";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HotelBadge } from "@/components/hotel-badge";
import { ForeignPassportDialog } from "@/components/foreign-passport-dialog";
import { ManualIdUploadDialog } from "@/components/manual-id-upload-dialog";
import { LivePhotoGate } from "@/components/live-photo-gate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ForeignPassportPhotos } from "@/components/foreign-passport-dialog";
import type { FlowCredential, FlowErrorKind } from "./guest-checkin-flow";
import { StepPill } from "./checkin-steps";
import { toast } from "sonner";
import { startDigilockerFlow } from "@/utils/digilockerStart";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";

import { Globe2, CreditCard, Car, FileBadge, Plane, ShieldCheck, Sparkles, XCircle, Clock, Camera, X, Lock, Check } from "lucide-react";

const IVERIFI_ORIGIN = import.meta.env.VITE_KWIK_ORIGIN || "https://iverifi.app.getkwikid.com";
const KWIK_CLIENT_ID = import.meta.env.VITE_KWIK_CLIENT_ID || "iverifi";
const POLL_INTERVAL_MS = 2000;
// Verification results arrive by webhook; give slow providers a full minute before asking the visitor
const POLL_TIMEOUT_MS = 60000;

const DOC_TYPES = [
  { type: "AADHAAR_CARD",     label: "Aadhaar Card",    icon: <CreditCard className="w-5 h-5 text-[var(--iverifi-accent)]" />, productCode: "KYC", issuer: "UIDAI", recommended: true },
  { type: "DRIVING_LICENSE",  label: "Driving Licence", icon: <Car className="w-5 h-5 text-[var(--iverifi-accent)]" />, productCode: "DL",  issuer: "State Transport (MoRTH)" },
  { type: "PAN_CARD",         label: "PAN Card",        icon: <FileBadge className="w-5 h-5 text-[var(--iverifi-accent)]" />, productCode: "PC",  issuer: "Income Tax Department" },
  { type: "PASSPORT",         label: "Passport",        icon: <Plane className="w-5 h-5 text-[var(--iverifi-accent)]" />, productCode: "PP",  issuer: "Ministry of External Affairs" },
];

interface Props {
  hotelName: string;
  hotelLogoUrl?: string | null;
  /** Who to ask for help at this venue, e.g. "the front desk" */
  staffTerm: string;
  existingCredentials: FlowCredential[];
  connectionId: string;
  startedAt: number;
  onSelected: (credential: FlowCredential) => void;
  onForeignCheckin: (result: "approved" | "pending", docType?: string) => void;
  onManualDetails: (docType: string) => void;
  onError: (msg: string, kind?: FlowErrorKind) => void;
  /** Omitted when there is no meaningful previous screen */
  onBack?: () => void;
}

export default function GuestDocSelect({
  hotelName,
  hotelLogoUrl,
  staffTerm,
  existingCredentials,
  connectionId,
  startedAt,
  onSelected,
  onForeignCheckin,
  onManualDetails,
  onError,
  onBack,
}: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [verifyingType, setVerifyingType] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [kycFailed, setKycFailed] = useState(false);
  const [manualUploadOpen, setManualUploadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    existingCredentials[0]?.id ?? null
  );
  const [foreignPassportOpen, setForeignPassportOpen] = useState(false);
  const [foreignSubmitting, setForeignSubmitting] = useState(false);

  // DL: choice modal
  const [dlChoiceOpen, setDlChoiceOpen] = useState(false);

  const { data: routesData } = useGetVerificationRoutesQuery();
  const routes = routesData?.data?.routes;

  const [saveForeignPassport] = useSaveForeignPassportMutation();
  const [updateCheckInStatus] = useUpdateCheckInStatusMutation();
  const [markKycStarted] = useMarkKycStartedMutation();

  const credIdsBefore = useRef<Set<string>>(new Set(existingCredentials.map((c) => c.id)));
  const pollStop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollInterval = polling ? POLL_INTERVAL_MS : 0;

  const { data: credsData, refetch: refetchCreds } = useGetCredentialsQuery(undefined, {
    pollingInterval: pollInterval,
  });

  const fetchedCreds: FlowCredential[] = (
    (credsData?.data?.credential ?? []) as any[]
  ).filter((c: any) => (c.verification_status === "auto_approved" || c.state === "auto_approved"));
  const localCreds = fetchedCreds.length > 0 ? fetchedCreds : existingCredentials;

  // Ensure credentials are fresh when this screen first mounts
  useEffect(() => { refetchCreds(); }, []);

  // Detect DigiLocker DL return: /?dl_verified=1 or /checkin?dl_verified=1
  useEffect(() => {
    const dlVerified = searchParams.get("dl_verified");
    const dlError = searchParams.get("dl_error");
    if (!dlVerified && !dlError) return;
    if (dlVerified === "1") {
      // the licence is already saved: pick it up straight away (the live photo is asked for separately, by the gate)
      void afterDLVerification();
    }
    if (dlError) {
      setVerifyingType("DRIVING_LICENSE");
      setKycFailed(true);
      toast.error(digilockerErrorMessage(dlError, "Driving licence"));
    }
    const alsoMsg = alsoSavedMessage(searchParams.get("also"));
    if (alsoMsg) toast.success(alsoMsg);
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect newly verified credential from webhook
  useEffect(() => {
    if (!polling) return;
    const all: any[] = credsData?.data?.credential ?? [];
    const approved = all.filter((c) => (c.verification_status === "auto_approved" || c.state === "auto_approved")) as FlowCredential[];
    const newOne = approved.find((c) => !credIdsBefore.current.has(c.id));
    if (newOne) {
      if (pollStop.current) clearTimeout(pollStop.current);
      setPolling(false);
      setVerifyingType(null);
      setIframeUrl(null);
      setTimedOut(false);
      credIdsBefore.current = new Set(approved.map((c) => c.id));
      onSelected(newOne);
    }
  }, [credsData, polling]);

  // postMessage from Kwik iframe
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (typeof event.origin !== "string" || !event.origin.startsWith(IVERIFI_ORIGIN)) return;
      const d = event.data;
      if (d?.type === "iverifi") {
        if (d?.status === "completed") {
          setIframeUrl(null);
          // Polling already running from iframe open; just kick an immediate refetch
          await refetchCreds();
        } else if (d?.status === "failed" || d?.status === "rejected" || d?.status === "error") {
          setIframeUrl(null);
          // Keep verifyingType so failedDocType defaults to the correct doc that failed
          setKycFailed(true);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      if (pollStop.current) clearTimeout(pollStop.current);
    };
  }, [refetchCreds]);

  // Called after DigiLocker DL return (credential already exists in Firestore).
  // Tries to select it directly; falls back to polling only if it's not there yet.
  const afterDLVerification = async () => {
    const result = await refetchCreds();
    const allCreds: any[] = (result as any)?.data?.data?.credential ?? [];
    const approved = allCreds.filter((c: any) => (c.verification_status === "auto_approved" || c.state === "auto_approved"));
    const dlCred = approved.find((c: any) => c.document_type === "DRIVING_LICENSE");
    if (dlCred) {
      onSelected(dlCred as FlowCredential);
      return;
    }
    // Credential not yet propagated — snapshot ALL current approved creds as "before" so only
    // the incoming DL cred is detected as new. Without this, an existing PAN would be picked up.
    credIdsBefore.current = new Set(approved.map((c: any) => c.id));
    setVerifyingType("DRIVING_LICENSE");
    setPolling(true);
    if (pollStop.current) clearTimeout(pollStop.current);
    pollStop.current = setTimeout(() => { setPolling(false); setTimedOut(true); }, POLL_TIMEOUT_MS);
  };

  // Open the Kwik iframe. Polling starts at once, so the "completed" postMessage only has to refetch.
  const openKwikIframe = (docType: string, productCode: string) => {
    const user = auth.currentUser;
    if (!user) { onError("Not authenticated. Please restart."); return; }

    const current: any[] = credsData?.data?.credential ?? [];
    credIdsBefore.current = new Set(
      current.filter((c: any) => (c.verification_status === "auto_approved" || c.state === "auto_approved")).map((c: any) => c.id)
    );

    const sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const url =
      `${IVERIFI_ORIGIN}/user/home?client_id=${KWIK_CLIENT_ID}&api_key=${KWIK_CLIENT_ID}&process=U` +
      `&productCode=${encodeURIComponent(productCode)}` +
      `&user_id=${encodeURIComponent(user.uid)}` +
      `&session_id=${encodeURIComponent(sessionId)}` +
      `&redirect_origin=${encodeURIComponent(window.location.origin)}`;

    setVerifyingType(docType);
    setIframeUrl(url);

    // the webhook saves the credential: look for it straight away
    setPolling(true);
    if (pollStop.current) clearTimeout(pollStop.current);
    pollStop.current = setTimeout(() => { setPolling(false); setTimedOut(true); }, POLL_TIMEOUT_MS);

    if (connectionId) {
      markKycStarted({ credential_request_id: connectionId, session_id: sessionId, document_type: docType })
        .catch(() => {});
    }
  };

  // ── DL verification handlers ──
  const handleVerifyDLKwik = () => openKwikIframe("DRIVING_LICENSE", "DL");

  const handleVerifyDLWithDigiLocker = async () => {
    const user = auth.currentUser;
    if (!user) { onError("Not authenticated. Please restart."); return; }
    try {
      await startDigilockerFlow({ docType: "DL", returnUrl: `${window.location.origin}/checkin` });
    } catch (e: any) {
      toast.error(e?.message || "Could not start DigiLocker verification");
    }
  };

  // User closed the iframe without completing — that is a choice, not a failure.
  // Return to the ID list so they can pick another document or try again.
  const closeIframe = () => {
    setIframeUrl(null);
    setPolling(false);
    setTimedOut(false);
    setKycFailed(false);
    setVerifyingType(null);
    if (pollStop.current) { clearTimeout(pollStop.current); pollStop.current = null; }
    toast.info("Verification cancelled. Choose an ID to continue.");
  };

  // Entry point for the "Verify" button on each doc card (DL opens choice modal; others open iframe).
  // DigiLocker for Aadhaar, PAN and driving licence: the backend sends the user to DigiLocker and reads the result itself
  const startDigilocker = async (docType: string) => {
    const ticketDoc = docType === "AADHAAR_CARD" ? "AADHAAR_APP" : docType === "PAN_CARD" ? "PAN_APP" : docType === "DRIVING_LICENSE" ? "DL" : null;
    if (!ticketDoc) { toast.error("DigiLocker is not available for this document."); return; }
    try {
      await startDigilockerFlow({ docType: ticketDoc, returnUrl: `${window.location.origin}/checkin` });
    } catch (e: any) {
      toast.error(e?.message || "Could not start DigiLocker verification");
    }
  };

  const verifyWith = (method: VerifyMethod, docType: string, productCode: string) => {
    if (method === "digilocker") return startDigilocker(docType);
    openKwikIframe(docType, productCode);
  };

  // Which way a document is verified is decided by the server (DigiLocker first where it works, Kwik as the fallback)
  const handleVerify = (docType: string, productCode: string) => {
    const methods = methodsFor(routes, docType);
    if (!methods.length) { toast.error("This document cannot be verified right now. Please try again later."); return; }
    if (docType === "DRIVING_LICENSE" && methods.includes("digilocker") && methods.includes("kwik")) {
      setDlChoiceOpen(true);
      return;
    }
    verifyWith(methods[0], docType, productCode);
  };

  // Back from DigiLocker for Aadhaar or PAN: pick the saved credential, or explain what went wrong and offer another way
  useEffect(() => {
    for (const [kind, label, docType, code] of [["aadhaar", "Aadhaar", "AADHAAR_CARD", "KYC"], ["pan", "PAN", "PAN_CARD", "PC"]] as const) {
      const ok = searchParams.get(`${kind}_verified`);
      const err = searchParams.get(`${kind}_error`);
      if (!ok && !err) continue;
      const alsoMsg = alsoSavedMessage(searchParams.get("also"));
      if (alsoMsg) toast.success(alsoMsg);
      navigate(location.pathname, { replace: true });
      if (ok === "1") {
        (async () => {
          const result = await refetchCreds();
          const all = (result.data as { data?: { credential?: FlowCredential[] } } | undefined)?.data?.credential ?? [];
          const cred = all.find((c) => c.document_type === docType && (c.verification_status === "auto_approved" || c.state === "auto_approved"));
          if (cred) onSelected(cred);
        })();
      } else if (err) {
        const other = methodsFor(routes, docType).find((m) => m !== "digilocker");
        toast.error(digilockerErrorMessage(err, label), other
          ? { action: { label: `Use ${labelForMethod(other, docType)}`, onClick: () => verifyWith(other, docType, code) } }
          : undefined);
      }
      break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleForeignPassportSave = async (data: ForeignPassportPhotos) => {
    if (!connectionId) { onError("No connection found. Please restart."); return; }
    setForeignSubmitting(true);
    try {
      await saveForeignPassport({ credential_request_id: connectionId, foreign_passport_data: data }).unwrap();
      const res = await updateCheckInStatus({
        credential_request_id: connectionId,
        status: "checkin",
        credential_id: null,
        document_type: "FOREIGN_PASSPORT",
        client_started_at: startedAt,
      }).unwrap();
      setForeignPassportOpen(false);
      const isApproved =
        res?.data?.status === "approved" ||
        res?.message?.toLowerCase().includes("approved") ||
        res?.message?.toLowerCase().includes("recorded");
      onForeignCheckin(isApproved ? "approved" : "pending", "FOREIGN_PASSPORT");
    } catch (err: any) {
      const status = err?.status ?? err?.originalStatus;
      if (status === 403) {
        onError(`${hotelName} cannot accept new requests right now. Please speak to ${staffTerm}.`, "quota");
      } else {
        onError(err?.data?.message || err?.message || "Failed to submit foreign passport. Please try again.");
      }
    } finally {
      setForeignSubmitting(false);
    }
  };

  const handleContinue = () => {
    const cred = localCreds.find((c) => c.id === selectedId);
    if (cred) onSelected(cred);
  };

  // ── Kwik iframe open ──────────────────────────────────────────────────────
  if (iframeUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-[var(--iverifi-card-border)] px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={closeIframe}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4" /> Close
          </Button>
          <span className="text-sm font-medium text-foreground">Identity Verification</span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--iverifi-accent)]"><Lock className="h-3.5 w-3.5" /> Secure session</span>
        </div>
        <iframe
          src={iframeUrl}
          className="flex-1 w-full border-none"
          allow="camera; microphone; geolocation"
          title="Identity Verification"
        />
      </div>
    );
  }

  // ── Polling / waiting for webhook ─────────────────────────────────────────
  if (polling) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--iverifi-accent)] border-t-transparent animate-spin" />
        <div>
          <p className="font-semibold text-foreground">Processing your verification</p>
          <p className="text-sm text-muted-foreground mt-1">Usually takes a few seconds…</p>
        </div>
      </div>
    );
  }

  // ── KYC error (explicit failure postMessage or polling timeout) ───────────
  const showError = timedOut || kycFailed;
  const failedDocType = verifyingType ?? localCreds[0]?.document_type ?? "AADHAAR_CARD";
  const DOC_LABELS_MAP: Record<string, string> = {
    AADHAAR_CARD: "Aadhaar Card", DRIVING_LICENSE: "Driving Licence",
    PAN_CARD: "PAN Card", PASSPORT: "Passport", VOTER_ID: "Voter ID",
  };
  const failedDocLabel = DOC_LABELS_MAP[failedDocType] ?? "ID Document";

  const handleManualUploadSave = async (data: ForeignPassportPhotos) => {
    if (!connectionId) { onError("No connection found. Please restart."); return; }
    await saveForeignPassport({ credential_request_id: connectionId, foreign_passport_data: data }).unwrap();
    setManualUploadOpen(false);
    setTimedOut(false);
    setKycFailed(false);
    onManualDetails(failedDocType);
  };

  if (showError) {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center max-w-sm mx-auto">
          <div
            className={`w-20 h-20 rounded-[24px] flex items-center justify-center border ${
              kycFailed
                ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                : "bg-amber-500/10 border-amber-500/30 text-amber-500"
            }`}
          >
            {kycFailed ? <XCircle className="w-9 h-9" /> : <Clock className="w-9 h-9" />}
          </div>
          <div>
            <p className="font-bold text-lg text-foreground mb-1">
              {kycFailed ? "Verification unsuccessful" : "Still processing"}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {kycFailed
                ? "Your identity verification was declined. This can happen due to a blurry document, liveness check failure, or an expired ID."
                : "Your verification is taking longer than usual. It may still go through, so check again or choose another option below."}
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            {verifyingType && (() => {
              const dt = DOC_TYPES.find((d) => d.type === verifyingType);
              return dt ? (
                <Button
                  variant="brand"
                  className="w-full h-12"
                  onClick={() => { setTimedOut(false); setKycFailed(false); handleVerify(dt.type, dt.productCode); }}
                >
                  Try again with {failedDocLabel}
                </Button>
              ) : null;
            })()}

            {timedOut && !kycFailed && (
              <Button
                variant="brand"
                className="w-full h-12"
                onClick={async () => {
                  setTimedOut(false);
                  setPolling(true);
                  await refetchCreds();
                  if (pollStop.current) clearTimeout(pollStop.current);
                  pollStop.current = setTimeout(() => { setPolling(false); setTimedOut(true); }, POLL_TIMEOUT_MS);
                }}
              >
                Check if verification went through
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full h-12 border-[var(--iverifi-card-border)] text-foreground"
              onClick={() => setManualUploadOpen(true)}
            >
              <Camera className="h-4 w-4" /> Upload {failedDocLabel} manually
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 border-[var(--iverifi-card-border)] text-muted-foreground"
              onClick={() => { setTimedOut(false); setKycFailed(false); setVerifyingType(null); }}
            >
              Try a different ID
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Still having trouble? Please speak to {staffTerm}.
          </p>
        </div>

        <ManualIdUploadDialog
          open={manualUploadOpen}
          documentLabel={failedDocLabel}
          onSave={handleManualUploadSave}
          onClose={() => setManualUploadOpen(false)}
        />
      </>
    );
  }

  // ── Document selection ────────────────────────────────────────────────────
  const verifiedMap = Object.fromEntries(localCreds.map((c) => [c.document_type, c]));

  return (
    <>
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div className="flex justify-center">
          <IverifiLogo />
        </div>
        <HotelBadge name={hotelName} logoUrl={hotelLogoUrl} />

        <div className="w-full rounded-3xl border border-border/80 bg-card/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col gap-4">
          <div>
            <StepPill />
            <h1 className="text-xl font-bold text-foreground">Choose Your ID</h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Select an official document to share with <strong className="text-foreground">{hotelName}</strong>.
            </p>
          </div>

          {/* Foreign National banner */}
          <button
            type="button"
            onClick={() => setForeignPassportOpen(true)}
            disabled={foreignSubmitting}
            className="w-full text-left rounded-2xl border border-[var(--iverifi-accent-border)] bg-[var(--iverifi-accent-soft)]/50 hover:bg-[var(--iverifi-accent-soft)] p-3 flex items-center gap-3 transition-all shadow-xs disabled:opacity-50 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/15 border border-cyan-500/30 text-[var(--iverifi-accent)] shrink-0">
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-foreground">Foreign National Registration</p>
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-cyan-500/20 text-[var(--iverifi-accent)] border border-cyan-500/30">
                  FRRO
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Visiting from abroad? Passport &amp; visa
              </p>
            </div>
            <span className="text-xs font-semibold shrink-0 text-[var(--iverifi-accent)] group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </button>

          {/* Document list */}
          <div className="flex flex-col gap-2.5">
            {DOC_TYPES.map(({ type, label, icon, productCode, issuer, recommended }) => {
              const verified = verifiedMap[type];
              const isSelected = selectedId === verified?.id;
              const isVerifying = verifyingType === type;

              return (
                <div
                  key={type}
                  className={`rounded-2xl border transition-all ${
                    verified ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "border-[var(--iverifi-accent)] bg-[var(--iverifi-accent-soft)]/60 shadow-sm"
                      : recommended && !verified
                      ? "border-emerald-500/40 bg-muted/30 hover:border-emerald-500/60"
                      : "border-border/70 bg-muted/20 hover:border-border"
                  }`}
                  onClick={verified ? () => setSelectedId(verified.id) : undefined}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border border-border/60 bg-muted/60"
                    >
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-foreground text-xs sm:text-sm">{label}</p>
                        {recommended && !verified && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                            <Sparkles className="w-2.5 h-2.5" /> Fastest
                          </span>
                        )}
                        {verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Issued by {issuer}
                        {!verified && (providerLabel(methodsFor(routes, type), type) ? ` · verified via ${providerLabel(methodsFor(routes, type), type)}` : " · not available now")}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {verified ? (
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                          style={{ borderColor: isSelected ? "var(--iverifi-accent)" : "#94a3b8" }}
                        >
                          {isSelected && (
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: "var(--iverifi-accent)" }}
                            />
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isVerifying || !!verifyingType}
                          onClick={(e) => { e.stopPropagation(); handleVerify(type, productCode); }}
                          className={`h-8 px-3 text-xs rounded-xl font-medium border-border/80 transition-all ${
                            recommended
                              ? "bg-gradient-to-r from-[#00e0ff]/10 to-[#7B5CF5]/10 border-cyan-500/40 text-[var(--iverifi-accent)] hover:from-[#00e0ff]/20 hover:to-[#7B5CF5]/20 font-bold"
                              : "text-[var(--iverifi-accent)] hover:bg-[var(--iverifi-accent-soft)]"
                          }`}
                        >
                          {isVerifying ? (
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--iverifi-accent)] shrink-0" />
            <span>DPDP Act 2023 Compliant • Encrypted data transfer</span>
          </div>

          <Button
            variant="brand"
            disabled={!selectedId}
            onClick={handleContinue}
            className="w-full h-12 rounded-2xl font-bold cursor-pointer"
          >
            Continue →
          </Button>
        </div>

        {onBack && (
          <Button
            variant="ghost"
            className="text-muted-foreground text-sm"
            onClick={onBack}
          >
            ← Back
          </Button>
        )}

      </div>
    </div>

    <LivePhotoGate />
    <ForeignPassportDialog
      open={foreignPassportOpen}
      onSave={handleForeignPassportSave}
      onClose={() => setForeignPassportOpen(false)}
    />

    {/* DL: DigiLocker vs Camera Scan choice modal */}
    <Dialog open={dlChoiceOpen} onOpenChange={setDlChoiceOpen}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Verify Driving License</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <p className="text-sm text-muted-foreground">
            Do you have a DigiLocker account with your Driving License already on it?
          </p>
          <Button
            variant="brand"
            className="w-full rounded-xl"
            onClick={() => { setDlChoiceOpen(false); handleVerifyDLWithDigiLocker(); }}
          >
            Yes — Use DigiLocker
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => { setDlChoiceOpen(false); handleVerifyDLKwik(); }}
          >
            No — Scan with camera
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    </>
  );
}
