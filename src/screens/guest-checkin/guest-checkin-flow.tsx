import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { guestCheckin } from "@/utils/connectionFlow";
import { useAddConnectionMutation, useGetCredentialsQuery, useGetRecipientCredentialsQuery, useGetHotelPublicInfoQuery } from "@/redux/api";
import { useAuth } from "@/context/auth_context";
import { setTermsAccepted } from "@/utils/terms";
import { logoutUser } from "@/firebase_auth_service";

import GuestLanding from "./guest-landing";
import GuestPhoneAuth from "./guest-phone-auth";
import GuestKyc from "./guest-kyc";
import GuestDetails from "./guest-details";
import ReturningGuest from "./returning-guest";
import GuestConfirmation from "./guest-confirmation";
import GuestFamilySelect from "./guest-family-select";
import type { FamilyCredential } from "./guest-family-select";
import { SupportWidget } from "@/components/support-widget";
import { PinLockScreen } from "@/components/pin-lock-screen";

// ── Types ────────────────────────────────────────────────────────────────────

export type FlowStep =
  | "loading"
  | "landing"
  | "phone"
  | "otp"
  | "checking"
  | "kyc"
  | "family"
  | "details"
  | "returning"
  | "submitting"
  | "confirm"
  | "checkedin"
  | "error";

export interface HotelInfo {
  name: string;
  logo_url: string | null;
}

export interface FlowCredential {
  id: string;
  document_type: string;
  verification_status?: string;
  state?: string;
  face_url?: string;
  /** flat OCR / display fields */
  [key: string]: unknown;
}

export interface GuestFlowState {
  step: FlowStep;
  hotelCode: string;
  hotelInfo: HotelInfo | null;
  /** E.164 phone used for auth */
  phone: string;
  /** credential_request_id from addConnection */
  connectionId: string;
  /** Credential the user selected to share */
  selectedCredential: FlowCredential | null;
  /** All verified credentials for this user */
  credentials: FlowCredential[];
  /** true if user already had verified credentials (returning guest) */
  isReturning: boolean;
  /** Family members selected to share with the hotel */
  selectedFamilyCredentials: FamilyCredential[];
  /** Final check-in result */
  checkInResult: "approved" | "pending" | null;
  /** Timestamp when user tapped "Start Check-In" */
  startedAt: number;
  errorMessage: string;
}

// ── Progress map ─────────────────────────────────────────────────────────────

const PROGRESS: Record<FlowStep, number> = {
  loading: 0,
  landing: 0,
  phone: 18,
  otp: 36,
  checking: 50,
  kyc: 55,
  family: 62,
  details: 70,
  returning: 62,
  submitting: 85,
  confirm: 100,
  checkedin: 0,
  error: 0,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function GuestCheckinFlow() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, pinLocked, needsPinSetup, pinHash, setPinLocked, setNeedsPinSetup } = useAuth();

  const [state, setState] = useState<GuestFlowState>(() => {
    const urlCode = searchParams.get("code") ?? "";
    const savedCode = guestCheckin.getHotelCode();
    const hotelCode = urlCode || savedCode;
    if (hotelCode) guestCheckin.setHotelCode(hotelCode);

    return {
      step: "loading",
      hotelCode,
      hotelInfo: guestCheckin.getHotelName()
        ? { name: guestCheckin.getHotelName(), logo_url: null }
        : null,
      phone: "",
      connectionId: guestCheckin.getConnectionId(),
      selectedCredential: null,
      credentials: [],
      isReturning: false,
      selectedFamilyCredentials: [],
      checkInResult: null,
      startedAt: guestCheckin.getStartedAt() || Date.now(),
      errorMessage: "",
    };
  });

  const advance = useCallback((partial: Partial<GuestFlowState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  // Always fetch hotel info so it's available even when landing page is skipped (returning user)
  const { data: hotelPublicData } = useGetHotelPublicInfoQuery(state.hotelCode, { skip: !state.hotelCode });
  useEffect(() => {
    if (hotelPublicData?.data && !hotelPublicData.hasError) {
      advance({ hotelInfo: hotelPublicData.data });
    }
  }, [hotelPublicData]);

  // Wait for Firebase auth to resolve, then decide first step
  useEffect(() => {
    if (authLoading) return;
    if (state.step !== "loading") return;
    if (user) {
      const dlVerified = searchParams.get("dl_verified");
      const dlFamilyVerified = searchParams.get("dl_family_verified");
      if (dlFamilyVerified === "1" && state.connectionId) {
        // Returning from DigiLocker family DL OAuth — jump to family step.
        // guest-family-select detects ?dl_family_verified=1 and starts polling.
        const restoredCred = guestCheckin.getSelectedCredential() as FlowCredential | null;
        advance({ step: "family", phone: user.phoneNumber ?? "", credentials: [], selectedCredential: restoredCred });
      } else if (dlVerified === "1" && state.connectionId) {
        // Returning from DigiLocker DL OAuth — skip GuestChecking, go straight to kyc.
        // GuestKyc will detect ?dl_verified=1 and open the selfie modal.
        advance({ step: "kyc", phone: user.phoneNumber ?? "", credentials: [] });
      } else {
        advance({ step: "checking", phone: user.phoneNumber ?? "" });
      }
    } else {
      advance({ step: "landing" });
    }
  }, [authLoading, user, state.step, advance]);

  // Lock when user returns to the tab (same rule as ProtectedLayout)
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && user && pinHash !== null) {
        setPinLocked(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user, pinHash, setPinLocked]);

  // Persist hotel name so it's available across OTP redirect
  useEffect(() => {
    if (state.hotelInfo?.name) {
      guestCheckin.setHotelName(state.hotelInfo.name);
    }
  }, [state.hotelInfo?.name]);

  useEffect(() => {
    if (state.connectionId) guestCheckin.setConnectionId(state.connectionId);
  }, [state.connectionId]);

  // Save selected credential before DigiLocker family redirect wipes state
  useEffect(() => {
    if (state.step === "family" && state.selectedCredential) {
      guestCheckin.setSelectedCredential(state.selectedCredential);
    }
  }, [state.step, state.selectedCredential]);

  const progress = PROGRESS[state.step] ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (state.step) {
      case "loading":
        return (
          <div className="flex min-h-screen items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--iverifi-accent)] border-t-transparent animate-spin" />
          </div>
        );

      case "landing":
        return (
          <GuestLanding
            hotelCode={state.hotelCode}
            onHotelInfo={(info) => advance({ hotelInfo: info })}
            onStart={() => {
              const startedAt = Date.now();
              guestCheckin.setStartedAt(startedAt);
              advance({ step: "phone", startedAt });
            }}
          />
        );

      case "phone":
      case "otp":
        return (
          <GuestPhoneAuth
            hotelName={state.hotelInfo?.name ?? "the hotel"}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            onAuthSuccess={(phone) => advance({ phone, step: "checking" })}
            onBack={() => advance({ step: "landing" })}
          />
        );

      case "checking":
        return (
          <GuestChecking
            hotelCode={state.hotelCode}
            hotelName={state.hotelInfo?.name ?? "the hotel"}
            startedAt={state.startedAt}
            onResult={({ connectionId, credentials, isReturning, selectedCredential }) =>
              advance({
                connectionId,
                credentials,
                isReturning,
                selectedCredential,
                step: isReturning ? "returning" : "kyc",
              })
            }
            onError={(msg) => advance({ step: "error", errorMessage: msg })}
          />
        );

      case "kyc":
        return (
          <GuestKyc
            hotelName={state.hotelInfo?.name ?? "the hotel"}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            existingCredentials={state.credentials}
            connectionId={state.connectionId}
            startedAt={state.startedAt}
            onSelected={(credential) =>
              advance({ selectedCredential: credential, credentials: state.credentials.find(c => c.id === credential.id) ? state.credentials : [...state.credentials, credential], step: "family" })
            }
            onForeignCheckin={(result, docType) => advance({
              step: "confirm",
              checkInResult: result,
              selectedCredential: docType
                ? { id: "manual", document_type: docType, state: "auto_approved" }
                : state.selectedCredential,
            })}
            onManualDetails={(docType) => advance({
              step: "family",
              selectedCredential: { id: "manual", document_type: docType, state: "auto_approved" },
            })}
            onError={(msg) => advance({ step: "error", errorMessage: msg })}
            onBack={() => advance({ step: "checking" })}
          />
        );

      case "family":
        return (
          <GuestFamilySelect
            hotelName={state.hotelInfo?.name ?? "the hotel"}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            onContinue={(selected) => advance({ selectedFamilyCredentials: selected, step: "details" })}
            onSkip={() => advance({ selectedFamilyCredentials: [], step: "details" })}
          />
        );

      case "details":
        return (
          <GuestDetails
            hotelName={state.hotelInfo?.name ?? "the hotel"}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            phone={state.phone}
            credential={state.selectedCredential}
            credentials={state.credentials}
            familyCredentials={state.selectedFamilyCredentials}
            connectionId={state.connectionId}
            startedAt={state.startedAt}
            onSuccess={(result) =>
              advance({ step: "confirm", checkInResult: result })
            }
            onError={(msg) => advance({ step: "error", errorMessage: msg })}
            onCredentialChange={(c) => advance({ selectedCredential: c })}
          />
        );

      case "returning":
        return (
          <ReturningGuest
            hotelName={state.hotelInfo?.name ?? "the hotel"}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            credentials={state.credentials}
            selectedCredential={state.selectedCredential}
            onContinue={() => advance({ step: "family" })}
            onCredentialChange={(c) => advance({ selectedCredential: c })}
            onVerifyNew={() => advance({ step: "kyc" })}
          />
        );

      case "submitting":
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--iverifi-accent)] border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-sm">Submitting check-in…</p>
            </div>
          </div>
        );

      case "confirm":
        return (
          <GuestConfirmation
            hotelName={state.hotelInfo?.name ?? "the hotel"}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            credential={state.selectedCredential}
            checkInResult={state.checkInResult}
            connectionId={state.connectionId}
            onDone={() => {}}
          />
        );

      case "checkedin":
        return (
          <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-sm flex flex-col items-center gap-5 text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ background: "var(--iverifi-accent-soft)", border: "2px solid var(--iverifi-accent-border)" }}
              >
                🏨
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Already checked in</h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  You're already checked in at <strong className="text-foreground">{state.hotelInfo?.name ?? "this hotel"}</strong>.
                  Please check out at the front desk before checking in again.
                </p>
              </div>
              <button
                className="w-full py-4 rounded-2xl text-slate-950 font-semibold text-base"
                style={{ background: "linear-gradient(135deg,#00e0ff,#7B5CF5)" }}
                onClick={() => { guestCheckin.clear(); navigate("/"); }}
              >
                Back to Home
              </button>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
            <div
              className="w-20 h-20 rounded-[24px] flex items-center justify-center text-4xl"
              style={{ background: "var(--iverifi-danger-soft)", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              ⚠️
            </div>
            <h2 className="text-foreground text-2xl font-extrabold">
              Something went wrong
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              {state.errorMessage || "An unexpected error occurred. Please try again."}
            </p>
            <button
              className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-[#00E5C3] to-[#6C63FF] text-slate-950 font-extrabold text-base"
              onClick={() => {
                if (state.errorMessage?.includes("24 hours")) {
                  window.location.reload();
                } else {
                  advance({ step: "landing", errorMessage: "" });
                }
              }}
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Noise overlay — subtle in light, more visible in dark */}
      <div
        className="pointer-events-none fixed inset-0 z-[200] opacity-[0.015] dark:opacity-[0.3]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Home button — only when signed in */}
      {state.step !== "loading" && user && (
        <button
          onClick={() => navigate("/")}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border"
          style={{ background: "var(--iverifi-muted-surface)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Home
        </button>
      )}

      {/* Logout button — only when signed in */}
      {state.step !== "loading" && user && (
        <button
          onClick={() => { logoutUser(); guestCheckin.clear(); navigate("/login"); }}
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors border border-border"
          style={{ background: "var(--iverifi-muted-surface)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      )}

      {/* Progress bar */}
      {state.step !== "loading" && state.step !== "landing" && state.step !== "error" && state.step !== "kyc" && state.step !== "checkedin" && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/5 z-50 max-w-[420px] mx-auto">
          <div
            className="h-full rounded-r-sm"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(135deg, #00E5C3 0%, #6C63FF 100%)",
              transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="w-full max-w-[420px] mx-auto min-h-screen flex flex-col">
        {renderStep()}
      </div>

      <SupportWidget />

      {/* PIN lock / setup — same enforcement as the main app */}
      {user && (pinLocked || needsPinSetup) && (
        <PinLockScreen
          uid={user.uid}
          mode={needsPinSetup ? "setup" : "lock"}
          onUnlocked={() => {
            setPinLocked(false);
            setNeedsPinSetup(false);
          }}
        />
      )}
    </div>
  );
}

// ── Checking sub-screen (inline, lightweight) ─────────────────────────────────

interface CheckingProps {
  hotelCode: string;
  hotelName: string;
  startedAt: number;
  onResult: (r: {
    connectionId: string;
    credentials: FlowCredential[];
    isReturning: boolean;
    selectedCredential: FlowCredential | null;
  }) => void;
  onError: (msg: string) => void;
}

function GuestChecking({ hotelCode, hotelName, startedAt: _startedAt, onResult, onError }: CheckingProps) {
  const [addConnection] = useAddConnectionMutation();
  const { data: credsData, isLoading: credsLoading } = useGetCredentialsQuery();
  const { isLoading: recipientLoading } = useGetRecipientCredentialsQuery(hotelCode, { skip: !hotelCode });
  const ranRef = useRef(false);

  useEffect(() => {
    // Wait for both queries to finish before proceeding
    if (credsLoading || recipientLoading) return;
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        // 1. Create / touch credential_request
        const connResult = await addConnection({
          document_id: hotelCode,
          type: "Company",
        }).unwrap();
        const connectionId: string =
          connResult?.data?.credential_request_id ??
          connResult?.credential_request_id ??
          "";

        if (connectionId) guestCheckin.setConnectionId(connectionId);

        // Persist terms acceptance now that we have an authenticated user
        setTermsAccepted(true).catch(() => {});

        // 2. Check existing verified credentials
        const allCreds: FlowCredential[] =
          (credsData?.data?.credential ?? []).filter(
            (c: any) => c.verification_status === "auto_approved" || c.state === "auto_approved"
          );

        const isReturning = allCreds.length > 0;
        const selectedCredential = isReturning ? allCreds[0] : null;

        onResult({ connectionId, credentials: allCreds, isReturning, selectedCredential });
      } catch (err: any) {
        const status = err?.status ?? err?.originalStatus;
        if (status === 403) {
          onError("This property has reached its check-in limit. Please speak to the front desk.");
        } else {
          onError(err?.data?.message || err?.message || "Failed to connect to hotel. Please try again.");
        }
      }
    })();
  }, [credsLoading, recipientLoading]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6">
      <div className="relative w-16 h-16 rounded-full border-2 border-[color:var(--iverifi-accent-border)] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[color:var(--iverifi-accent)] border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-foreground font-bold text-lg mb-1">
          Connecting to {hotelName}
        </p>
        <p className="text-muted-foreground text-sm">Setting up your check-in…</p>
      </div>
    </div>
  );
}
