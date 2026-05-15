import { useState, useEffect, useRef } from "react";
import { auth } from "@/firebase/firebase_setup";
import { useGetCredentialsQuery, useSaveForeignPassportMutation, useUpdateCheckInStatusMutation, useMarkKycStartedMutation } from "@/redux/api";
import { Button } from "@/components/ui/button";
import { IverifiLogo } from "@/components/iverifi-logo";
import { ForeignPassportDialog } from "@/components/foreign-passport-dialog";
import { ManualIdUploadDialog } from "@/components/manual-id-upload-dialog";
import type { ForeignPassportPhotos } from "@/components/foreign-passport-dialog";
import type { FlowCredential } from "./guest-checkin-flow";

const IVERIFI_ORIGIN = "https://iverifi.app.getkwikid.com";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 20000;

const DOC_TYPES = [
  { type: "AADHAAR_CARD",     label: "Aadhaar Card",    icon: "🪪", productCode: "KYC", issuer: "UIDAI / Govt of India" },
  { type: "DRIVING_LICENSE",  label: "Driving Licence", icon: "🚗", productCode: "DL",  issuer: "Ministry of Road Transport" },
  { type: "PAN_CARD",         label: "PAN Card",        icon: "💳", productCode: "PC",  issuer: "Income Tax Department" },
  { type: "PASSPORT",         label: "Passport",        icon: "✈️", productCode: "PP",  issuer: "Ministry of External Affairs" },
];

interface Props {
  hotelName: string;
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
  existingCredentials,
  connectionId,
  startedAt,
  onSelected,
  onForeignCheckin,
  onManualDetails,
  onError,
  onBack,
}: Props) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [verifyingType, setVerifyingType] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [kycFailed, setKycFailed] = useState(false);
  const [manualUploadOpen, setManualUploadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    existingCredentials[0]?.id ?? null
  );
  const [localCreds, setLocalCreds] = useState<FlowCredential[]>(existingCredentials);
  const [foreignPassportOpen, setForeignPassportOpen] = useState(false);
  const [foreignSubmitting, setForeignSubmitting] = useState(false);

  const [saveForeignPassport] = useSaveForeignPassportMutation();
  const [updateCheckInStatus] = useUpdateCheckInStatusMutation();
  const [markKycStarted] = useMarkKycStartedMutation();

  const credIdsBefore = useRef<Set<string>>(new Set(existingCredentials.map((c) => c.id)));
  const pollStop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollInterval = polling ? POLL_INTERVAL_MS : 0;

  const { data: credsData, refetch: refetchCreds } = useGetCredentialsQuery(undefined, {
    pollingInterval: pollInterval,
  });

  // Ensure credentials are fresh when this screen first mounts
  useEffect(() => { refetchCreds(); }, []);

  // Detect newly verified credential from webhook
  useEffect(() => {
    if (!polling) return;
    const all: any[] = credsData?.data?.credential ?? [];
    const approved = all.filter((c) => c.state === "auto_approved") as FlowCredential[];
    const newOne = approved.find((c) => !credIdsBefore.current.has(c.id));
    if (newOne) {
      if (pollStop.current) clearTimeout(pollStop.current);
      setPolling(false);
      setVerifyingType(null);
      setIframeUrl(null);
      setTimedOut(false);
      setLocalCreds(approved);
      setSelectedId(newOne.id);
      credIdsBefore.current = new Set(approved.map((c) => c.id));
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
          setPolling(true);
          await refetchCreds();
          if (pollStop.current) clearTimeout(pollStop.current);
          pollStop.current = setTimeout(() => {
            setPolling(false);
            setTimedOut(true);
          }, POLL_TIMEOUT_MS);
        } else if (d?.status === "failed" || d?.status === "rejected" || d?.status === "error") {
          setIframeUrl(null);
          setVerifyingType(null);
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

  const closeIframe = () => {
    const wasVerifying = !!verifyingType;
    setIframeUrl(null);
    setKycFailed(false);
    if (!wasVerifying) {
      setVerifyingType(null);
      return;
    }
    // Was mid-verification — quick check for a new credential.
    // If one appeared (KYC completed just before close) → update badge silently.
    // If not → show error screen so the user sees their options.
    setPolling(true);
    refetchCreds().then((result: any) => {
      setPolling(false);
      const all: any[] = result.data?.data?.credential ?? [];
      const approved = all.filter((c: any) => c.state === "auto_approved") as FlowCredential[];
      const newOne = approved.find((c: any) => !credIdsBefore.current.has(c.id));
      if (newOne) {
        setLocalCreds(approved);
        setSelectedId(newOne.id);
        credIdsBefore.current = new Set(approved.map((c: any) => c.id));
        setVerifyingType(null);
      } else {
        // No new credential — surface the error screen with options
        setKycFailed(true);
      }
    }).catch(() => {
      setPolling(false);
      setKycFailed(true);
    });
  };

  const handleVerify = (docType: string, productCode: string) => {
    const user = auth.currentUser;
    if (!user) { onError("Not authenticated. Please restart."); return; }

    // Snapshot approved IDs before opening so we can detect the new one after polling
    const current: any[] = credsData?.data?.credential ?? [];
    credIdsBefore.current = new Set(
      current.filter((c: any) => c.state === "auto_approved").map((c: any) => c.id)
    );

    const sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const url =
      `${IVERIFI_ORIGIN}/user/home?client_id=iverifi&api_key=iverifi&process=U` +
      `&productCode=${encodeURIComponent(productCode)}` +
      `&user_id=${encodeURIComponent(user.uid)}` +
      `&session_id=${encodeURIComponent(sessionId)}` +
      `&redirect_origin=${encodeURIComponent(window.location.origin)}`;

    setVerifyingType(docType);
    setIframeUrl(url);

    // Fire-and-forget: record that this guest opened the KYC iframe so the hotel
    // admin can see incomplete verifications in their dashboard.
    if (connectionId) {
      markKycStarted({ credential_request_id: connectionId, session_id: sessionId, document_type: docType })
        .catch(() => {/* non-critical — ignore failures */});
    }
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
            {/* Try again — re-open Kwik for same doc type */}
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

            {/* Check again (polling timeout only) */}
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

            {/* Upload manually */}
            <Button
              variant="outline"
              className="w-full h-12 border-[var(--iverifi-card-border)] text-foreground"
              onClick={() => setManualUploadOpen(true)}
            >
              📷 Upload {failedDocLabel} manually
            </Button>

            {/* Try different ID */}
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
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex justify-center">
          <IverifiLogo />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-1">Choose your ID</h1>
          <p className="text-sm text-muted-foreground">
            Share one with <strong className="text-foreground">{hotelName}</strong>
          </p>
        </div>

        {/* Foreign national banner — placed prominently before the Indian ID list */}
        <button
          type="button"
          onClick={() => setForeignPassportOpen(true)}
          disabled={foreignSubmitting}
          className="w-full text-left rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[var(--iverifi-accent-soft)] disabled:opacity-50"
          style={{ borderColor: "var(--iverifi-accent-border)", background: "var(--iverifi-accent-soft)" }}
        >
          <span className="text-2xl flex-shrink-0">🌍</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">I'm a foreign national</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check in with your foreign passport instead</p>
          </div>
          <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--iverifi-accent)" }}>Tap →</span>
        </button>

        <div className="flex flex-col gap-3">
          {DOC_TYPES.map(({ type, label, icon, productCode, issuer }) => {
            const verified = verifiedMap[type];
            const isSelected = selectedId === verified?.id;
            const isVerifying = verifyingType === type;

            return (
              <div
                key={type}
                className={`rounded-xl border transition-all ${verified ? "cursor-pointer" : ""}`}
                style={{
                  borderColor: isSelected
                    ? "var(--iverifi-accent)"
                    : "var(--iverifi-card-border)",
                  background: isSelected
                    ? "var(--iverifi-accent-soft)"
                    : "var(--iverifi-card)",
                }}
                onClick={verified ? () => setSelectedId(verified.id) : undefined}
              >
                <div className="flex items-center gap-4 p-4">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 border"
                    style={{
                      background: "var(--iverifi-muted-surface)",
                      borderColor: "var(--iverifi-card-border)",
                    }}
                  >
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{issuer}</p>
                    {verified && (
                      <span
                        className="inline-flex items-center gap-1 mt-1 text-xs font-semibold rounded-full px-2 py-0.5"
                        style={{
                          background: "var(--iverifi-accent-soft)",
                          color: "var(--iverifi-accent)",
                        }}
                      >
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {verified ? (
                      // Verified — radio selection indicator only
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: isSelected ? "var(--iverifi-accent)" : "#6b7280" }}
                      >
                        {isSelected && (
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: "var(--iverifi-accent)" }}
                          />
                        )}
                      </div>
                    ) : (
                      // Not verified — verify button
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isVerifying || !!verifyingType}
                        onClick={(e) => { e.stopPropagation(); handleVerify(type, productCode); }}
                        className="h-8 text-xs border-[var(--iverifi-card-border)] text-[var(--iverifi-accent)] hover:bg-[var(--iverifi-accent-soft)]"
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

        {/* Continue button — only active when a verified doc is selected */}
        <Button
          disabled={!selectedId}
          onClick={handleContinue}
          className="w-full h-12 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold shadow-[0_0_24px_rgba(0,224,255,0.3)] hover:from-[#40e8ff] hover:to-[#9274ff] disabled:opacity-40"
        >
          Continue →
        </Button>

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
    </>
  );
}
