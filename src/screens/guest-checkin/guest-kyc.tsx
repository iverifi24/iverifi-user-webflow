import { useState, useEffect, useRef } from "react";
import { auth } from "@/firebase/firebase_setup";
import { useGetCredentialsQuery, useSaveForeignPassportMutation, useUpdateCheckInStatusMutation, useMarkKycStartedMutation } from "@/redux/api";
import { Button } from "@/components/ui/button";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HotelBadge } from "@/components/hotel-badge";
import { ForeignPassportDialog } from "@/components/foreign-passport-dialog";
import { ManualIdUploadDialog } from "@/components/manual-id-upload-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ForeignPassportPhotos } from "@/components/foreign-passport-dialog";
import type { FlowCredential } from "./guest-checkin-flow";
import { toast } from "sonner";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";

import { Globe2, CreditCard, Car, FileBadge, Plane, ShieldCheck, Sparkles } from "lucide-react";

const IVERIFI_ORIGIN = import.meta.env.VITE_KWIK_ORIGIN || "https://iverifi.app.getkwikid.com";
const KWIK_CLIENT_ID = import.meta.env.VITE_KWIK_CLIENT_ID || "iverifi";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 20000;

const DOC_TYPES = [
  { type: "AADHAAR_CARD",     label: "Aadhaar Card",    icon: <CreditCard className="w-5 h-5 text-[var(--iverifi-accent)]" />, productCode: "KYC", issuer: "UIDAI / Govt of India", recommended: true },
  { type: "DRIVING_LICENSE",  label: "Driving Licence", icon: <Car className="w-5 h-5 text-[var(--iverifi-accent)]" />, productCode: "DL",  issuer: "Ministry of Road Transport" },
  { type: "PAN_CARD",         label: "PAN Card",        icon: <FileBadge className="w-5 h-5 text-[var(--iverifi-accent)]" />, productCode: "PC",  issuer: "Income Tax Department" },
  { type: "PASSPORT",         label: "Passport",        icon: <Plane className="w-5 h-5 text-[var(--iverifi-accent)]" />, productCode: "PP",  issuer: "Ministry of External Affairs" },
];

interface Props {
  hotelName: string;
  hotelLogoUrl?: string | null;
  existingCredentials: FlowCredential[];
  connectionId: string;
  startedAt: number;
  onSelected: (credential: FlowCredential) => void;
  onForeignCheckin: (result: "approved" | "pending", docType?: string) => void;
  onManualDetails: (docType: string) => void;
  onError: (msg: string) => void;
  onBack: () => void;
}

export default function GuestDocSelect({
  hotelName,
  hotelLogoUrl,
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

  // DL: choice modal + selfie
  const [dlChoiceOpen, setDlChoiceOpen] = useState(false);
  const [dlSelfieOpen, setDlSelfieOpen] = useState(false);
  // true when selfie was triggered by DigiLocker return (cred already exists); false for Kwik path
  const dlSelfieIsDigiLockerReturn = useRef(false);
  const dlSelfieStreamRef = useRef<MediaStream | null>(null);
  const dlSelfieVideoRef = useRef<HTMLVideoElement | null>(null);
  const dlSelfieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dlSelfieCaptured, setDlSelfieCaptured] = useState<string | null>(null);
  const [dlSelfieUploading, setDlSelfieUploading] = useState(false);
  // Holds the S3 URL of the selfie for the Kwik path — credential doesn't exist yet when the
  // selfie is submitted, so we store the URL here and attach it once polling finds the credential.
  const dlSelfieS3UrlRef = useRef<string | null>(null);

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
      dlSelfieIsDigiLockerReturn.current = true;
      setDlSelfieOpen(true);
    }
    if (dlError) {
      setVerifyingType("DRIVING_LICENSE");
      setKycFailed(true);
    }
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start/stop camera when selfie modal opens/closes
  useEffect(() => {
    if (dlSelfieOpen) {
      startDLSelfieCamera();
    } else {
      stopDLSelfieCamera();
      setDlSelfieCaptured(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlSelfieOpen]);

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
      // Kwik DL path: selfie was uploaded before the credential existed — attach it now.
      const pendingSelfieUrl = dlSelfieS3UrlRef.current;
      if (pendingSelfieUrl && newOne.document_type === "DRIVING_LICENSE") {
        dlSelfieS3UrlRef.current = null;
        const currentUser = auth.currentUser;
        if (currentUser) {
          const apiBase = ((import.meta as any).env.VITE_BASE_URL as string || "").replace(/\/$/, "");
          currentUser.getIdToken().then((token) => {
            fetch(`${apiBase}/users/updateDLSelfie`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ face_url: pendingSelfieUrl }),
            }).catch(() => {});
          }).catch(() => {});
        }
      }
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
          const wasDLKwik = (iframeUrl || "").includes("productCode=DL");
          setIframeUrl(null);
          if (wasDLKwik) {
            dlSelfieIsDigiLockerReturn.current = false; // Kwik path: cred not yet in Firestore
            setDlSelfieOpen(true);
          } else {
            // Polling already running from iframe open; just kick an immediate refetch
            await refetchCreds();
          }
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
  }, [refetchCreds, iframeUrl]);

  // Called after DigiLocker DL return (credential already exists in Firestore).
  // Tries to select it directly; falls back to polling only if it's not there yet.
  const afterDLVerification = async () => {
    const result = await refetchCreds();
    const allCreds: any[] = (result as any)?.data?.credential ?? [];
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

  // Called after Kwik DL completion (credential doesn't exist yet — webhook fires it).
  const startDLPolling = () => {
    const all: any[] = credsData?.data?.credential ?? [];
    credIdsBefore.current = new Set(
      all.filter((c: any) => (c.verification_status === "auto_approved" || c.state === "auto_approved")).map((c: any) => c.id)
    );
    setVerifyingType("DRIVING_LICENSE");
    setPolling(true);
    if (pollStop.current) clearTimeout(pollStop.current);
    pollStop.current = setTimeout(() => { setPolling(false); setTimedOut(true); }, POLL_TIMEOUT_MS);
  };

  // ── Selfie camera helpers ──
  const startDLSelfieCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      dlSelfieStreamRef.current = stream;
      if (dlSelfieVideoRef.current) dlSelfieVideoRef.current.srcObject = stream;
      setDlSelfieCaptured(null);
    } catch {
      toast.error("Could not access camera. Please allow camera permission.");
    }
  };

  const stopDLSelfieCamera = () => {
    dlSelfieStreamRef.current?.getTracks().forEach((t) => t.stop());
    dlSelfieStreamRef.current = null;
  };

  const captureDLSelfie = () => {
    const video = dlSelfieVideoRef.current;
    const canvas = dlSelfieCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setDlSelfieCaptured(canvas.toDataURL("image/jpeg", 0.85));
    stopDLSelfieCamera();
  };

  const handleDLSelfieSubmit = async () => {
    setDlSelfieUploading(true);
    try {
      const currentUser = auth.currentUser;
      if (dlSelfieCaptured && currentUser) {
        const res = await fetch(dlSelfieCaptured);
        const blob = await res.blob();
        const file = new File([blob], "dl_selfie.jpg", { type: "image/jpeg" });
        const apiBase = ((import.meta as any).env.VITE_BASE_URL as string || "").replace(/\/$/, "");
        const form = new FormData();
        form.append("file", file);
        form.append("fileType", "dl_selfie");
        const uploadRes = await fetch(`${apiBase}/users/uploadImage`, {
          method: "POST",
          headers: { Authorization: `Bearer ${await currentUser.getIdToken()}` },
          body: form,
        });
        const uploadJson = await uploadRes.json();
        const s3url: string = uploadJson?.data?.s3url;
        if (s3url) {
          if (dlSelfieIsDigiLockerReturn.current) {
            // DigiLocker path: credential already exists — attach selfie immediately.
            await fetch(`${apiBase}/users/updateDLSelfie`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await currentUser.getIdToken()}`,
              },
              body: JSON.stringify({ face_url: s3url }),
            });
          } else {
            // Kwik path: credential doesn't exist yet (webhook fires it after the iframe closes).
            // Store the URL so the polling effect can attach it once the credential appears.
            dlSelfieS3UrlRef.current = s3url;
          }
        }
      }
    } catch {
      // non-fatal
    } finally {
      setDlSelfieUploading(false);
      setDlSelfieOpen(false);
      setDlSelfieCaptured(null);
      stopDLSelfieCamera();
      if (dlSelfieIsDigiLockerReturn.current) {
        await afterDLVerification();
      } else {
        startDLPolling();
      }
    }
  };

  // Open the Kwik iframe. For DL, polling is deferred until after selfie (startDLPolling).
  // For all other docs, polling starts immediately so the "completed" postMessage just refetches.
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

    // DL Kwik: polling starts after selfie (via startDLPolling). Non-DL: start polling now.
    if (docType !== "DRIVING_LICENSE") {
      setPolling(true);
      if (pollStop.current) clearTimeout(pollStop.current);
      pollStop.current = setTimeout(() => { setPolling(false); setTimedOut(true); }, POLL_TIMEOUT_MS);
    }

    if (connectionId) {
      markKycStarted({ credential_request_id: connectionId, session_id: sessionId, document_type: docType })
        .catch(() => {});
    }
  };

  // ── DL verification handlers ──
  const handleVerifyDLKwik = () => openKwikIframe("DRIVING_LICENSE", "DL");

  const handleVerifyDLWithDigiLocker = () => {
    const user = auth.currentUser;
    if (!user) { onError("Not authenticated. Please restart."); return; }
    const apiBase = ((import.meta as any).env.VITE_BASE_URL as string || "").replace(/\/$/, "");
    const returnUrl = `${window.location.origin}/checkin`;
    window.location.assign(
      `${apiBase}/webhook/digilocker-aadhaar-oauth-start` +
      `?applicant_id=${encodeURIComponent(user.uid)}&doc_type=DL` +
      `&return_url=${encodeURIComponent(returnUrl)}`,
    );
  };

  // User manually closed the iframe without completing — show failed screen immediately.
  const closeIframe = () => {
    setIframeUrl(null);
    setPolling(false);
    setTimedOut(false);
    if (pollStop.current) { clearTimeout(pollStop.current); pollStop.current = null; }
    setKycFailed(true); // show "Verification unsuccessful" right away, no 20s wait
  };

  // Entry point for the "Verify" button on each doc card (DL opens choice modal; others open iframe).
  const handleVerify = (docType: string, productCode: string) => {
    if (docType === "DRIVING_LICENSE") {
      setDlChoiceOpen(true);
      return;
    }
    openKwikIframe(docType, productCode);
  };

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
        onError("This property has reached its check-in limit. Please speak to the front desk.");
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
            ✕ Close
          </Button>
          <span className="text-sm font-medium text-foreground">Identity Verification</span>
          <span className="ml-auto text-xs text-[var(--iverifi-accent)]">🔒 Secured by Kwik</span>
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
    PAN_CARD: "PAN Card", PASSPORT: "Passport",
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
            className="w-20 h-20 rounded-[24px] flex items-center justify-center text-4xl"
            style={{ background: "rgba(255,77,109,0.10)", border: "1.5px solid rgba(255,77,109,0.3)" }}
          >
            ❌
          </div>
          <div>
            <p className="font-bold text-lg text-foreground mb-1">Verification unsuccessful</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {kycFailed
                ? "Your identity verification was declined. This can happen due to a blurry document, liveness check failure, or an expired ID."
                : "Verification is taking longer than expected. The document may be unclear, expired, or the session timed out."}
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            {verifyingType && (() => {
              const dt = DOC_TYPES.find((d) => d.type === verifyingType);
              return dt ? (
                <Button
                  className="w-full h-12 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold hover:from-[#40e8ff] hover:to-[#9274ff]"
                  onClick={() => { setTimedOut(false); setKycFailed(false); handleVerify(dt.type, dt.productCode); }}
                >
                  Try again with {failedDocLabel}
                </Button>
              ) : null;
            })()}

            {timedOut && !kycFailed && (
              <Button
                className="w-full h-12 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold hover:from-[#40e8ff] hover:to-[#9274ff]"
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
              📷 Upload {failedDocLabel} manually
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
            Still having trouble? Please speak to the front desk.
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
            <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--iverifi-accent)] mb-2">
              Step 2 of 3 • Select Identity Document
            </div>
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
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{issuer}</p>
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
            disabled={!selectedId}
            onClick={handleContinue}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-bold dark:shadow-[0_0_24px_rgba(0,224,255,0.3)] hover:from-[#40e8ff] hover:to-[#9274ff] disabled:opacity-40 transition-all cursor-pointer"
          >
            Continue →
          </Button>
        </div>

        <Button
          variant="ghost"
          className="text-muted-foreground text-sm"
          onClick={onBack}
        >
          ← Back
        </Button>

      </div>
    </div>

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
            className="w-full rounded-xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold"
            onClick={() => { setDlChoiceOpen(false); handleVerifyDLWithDigiLocker(); }}
          >
            Yes — Use DigiLocker
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => { setDlChoiceOpen(false); handleVerifyDLKwik(); }}
          >
            No — Use Camera Scan
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* DL: Selfie capture modal */}
    <Dialog
      open={dlSelfieOpen}
      onOpenChange={async (open) => {
        if (!open) {
          stopDLSelfieCamera();
          setDlSelfieCaptured(null);
          if (dlSelfieOpen) {
            if (dlSelfieIsDigiLockerReturn.current) {
              await afterDLVerification();
            } else {
              startDLPolling();
            }
          }
        }
        setDlSelfieOpen(open);
      }}
    >
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Take a Selfie</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1 text-center">
          <p className="text-sm text-muted-foreground">
            Please take a quick selfie to complete your DL verification.
          </p>
          {!dlSelfieCaptured ? (
            <>
              <video
                ref={dlSelfieVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-xl"
                style={{ maxHeight: 260, background: "#000" }}
              />
              <canvas ref={dlSelfieCanvasRef} className="hidden" />
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold"
                onClick={captureDLSelfie}
              >
                Capture
              </Button>
            </>
          ) : (
            <>
              <img src={dlSelfieCaptured} alt="selfie preview" className="w-full rounded-xl" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => { setDlSelfieCaptured(null); startDLSelfieCamera(); }}
                >
                  Retake
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold"
                  disabled={dlSelfieUploading}
                  onClick={handleDLSelfieSubmit}
                >
                  {dlSelfieUploading ? "Saving..." : "Submit"}
                </Button>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            className="w-full text-sm"
            disabled={dlSelfieUploading}
            onClick={async () => {
              stopDLSelfieCamera();
              setDlSelfieOpen(false);
              setDlSelfieCaptured(null);
              if (dlSelfieIsDigiLockerReturn.current) {
                await afterDLVerification();
              } else {
                startDLPolling();
              }
            }}
          >
            Skip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
