import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { guestCheckin } from "@/utils/connectionFlow";
import { useAddConnectionMutation, useGetCredentialsQuery, useGetRecipientCredentialsQuery, useGetHotelPublicInfoQuery } from "@/redux/api";
import { useAuth } from "@/context/auth_context";
import { setTermsAccepted } from "@/utils/terms";

import GuestLanding from "./guest-landing";
import GuestPhoneAuth from "./guest-phone-auth";
import GuestKyc from "./guest-kyc";
import GuestDetails from "./guest-details";
import ReturningGuest from "./returning-guest";
import GuestConfirmation from "./guest-confirmation";
import { SupportWidget } from "@/components/support-widget";

// ── Types ────────────────────────────────────────────────────────────────────

export type FlowStep =
  | "loading"
  | "landing"
  | "phone"
  | "otp"
  | "checking"
  | "kyc"
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
  state: string;
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
  details: 65,
  returning: 65,
  submitting: 85,
  confirm: 100,
  checkedin: 0,
  error: 0,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function GuestCheckinFlow() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

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
      advance({ step: "checking", phone: user.phoneNumber ?? "" });
    } else {
      advance({ step: "landing" });
    }
  }, [authLoading, user, state.step, advance]);

  // Persist hotel name so it's available across OTP redirect
  useEffect(() => {
    if (state.hotelInfo?.name) {
      guestCheckin.setHotelName(state.hotelInfo.name);
    }
  }, [state.hotelInfo?.name]);

  useEffect(() => {
    if (state.connectionId) guestCheckin.setConnectionId(state.connectionId);
  }, [state.connectionId]);

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
            onAlreadyCheckedIn={() => advance({ step: "checkedin" })}
            onError={(msg) => advance({ step: "error", errorMessage: msg })}
          />
        );

      case "kyc":
        return (
          <GuestKyc
            hotelName={state.hotelInfo?.name ?? "the hotel"}
            existingCredentials={state.credentials}
            connectionId={state.connectionId}
            startedAt={state.startedAt}
            onSelected={(credential) =>
              advance({ selectedCredential: credential, credentials: state.credentials.find(c => c.id === credential.id) ? state.credentials : [...state.credentials, credential], step: "details" })
            }
            onForeignCheckin={(result) => advance({ step: "confirm", checkInResult: result })}
            onError={(msg) => advance({ step: "error", errorMessage: msg })}
            onBack={() => advance({ step: "checking" })}
          />
        );

      case "details":
        return (
          <GuestDetails
            hotelName={state.hotelInfo?.name ?? "the hotel"}
            phone={state.phone}
            credential={state.selectedCredential}
            credentials={state.credentials}
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
            credentials={state.credentials}
            selectedCredential={state.selectedCredential}
            onContinue={() => advance({ step: "details" })}
            onCredentialChange={(c) => advance({ selectedCredential: c })}
            onVerifyNew={() => advance({ step: "kyc" })}
          />
        );

      case "submitting":
        return (
          <div className="min-h-screen bg-[#080c10] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-[#00E5C3] border-t-transparent animate-spin" />
              <p className="text-[#6b7e95] text-sm">Submitting check-in…</p>
            </div>
          </div>
        );

      case "confirm":
        return (
          <GuestConfirmation
            hotelName={state.hotelInfo?.name ?? "the hotel"}
            credential={state.selectedCredential}
            checkInResult={state.checkInResult}
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
          <div className="min-h-screen bg-[#080c10] flex flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="w-20 h-20 rounded-[24px] bg-[rgba(255,77,109,0.12)] border border-[rgba(255,77,109,0.3)] flex items-center justify-center text-4xl">
              ⚠️
            </div>
            <h2
              className="text-white text-2xl font-extrabold"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Something went wrong
            </h2>
            <p className="text-[#6b7e95] text-sm leading-relaxed max-w-xs">
              {state.errorMessage || "An unexpected error occurred. Please try again."}
            </p>
            <button
              className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-[#00E5C3] to-[#6C63FF] text-black font-extrabold text-base"
              style={{ fontFamily: "'Syne', sans-serif" }}
              onClick={() => advance({ step: "landing", errorMessage: "" })}
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
    <div className="relative min-h-screen bg-[#080c10] overflow-hidden">
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[200] opacity-[0.3]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Home button */}
      {state.step !== "loading" && (
        <button
          onClick={() => navigate("/")}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-[#6b7e95] hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Home
        </button>
      )}

      {/* Progress bar */}
      {state.step !== "loading" && state.step !== "landing" && state.step !== "error" && state.step !== "kyc" && state.step !== "checkedin" && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50 max-w-[420px] mx-auto">
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
  onAlreadyCheckedIn: () => void;
  onError: (msg: string) => void;
}

function GuestChecking({ hotelCode, hotelName, startedAt: _startedAt, onResult, onAlreadyCheckedIn, onError }: CheckingProps) {
  const [addConnection] = useAddConnectionMutation();
  const { data: credsData, isLoading: credsLoading } = useGetCredentialsQuery();
  const { data: recipientData, isLoading: recipientLoading } = useGetRecipientCredentialsQuery(hotelCode, { skip: !hotelCode });
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

        // 2. Check if already checked in (has check_in_time, no check_out_time) or pending approval
        const requests: any[] = recipientData?.data?.requests ?? [];
        const existing = requests.find((r: any) =>
          connectionId ? r.id === connectionId : true
        ) ?? requests[0] ?? null;

        const isCheckedIn = !!(existing?.check_in_time && !existing?.check_out_time);
        const isPendingApproval = !!(existing?.check_in_status === "pending" && !existing?.check_in_time);

        if (isCheckedIn || isPendingApproval) {
          onAlreadyCheckedIn();
          return;
        }

        // 3. Check existing verified credentials
        const allCreds: FlowCredential[] =
          (credsData?.data?.credential ?? []).filter(
            (c: any) => c.state === "auto_approved"
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
    <div className="min-h-screen bg-[#080c10] flex flex-col items-center justify-center gap-5 px-6">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(0,229,195,0.1) 0%, transparent 70%)",
        }}
      />
      <div className="relative w-16 h-16 rounded-full border-2 border-[#00E5C3]/30 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#00E5C3] border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p
          className="text-white font-bold text-lg mb-1"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Connecting to {hotelName}
        </p>
        <p className="text-[#6b7e95] text-sm">Setting up your check-in…</p>
      </div>
    </div>
  );
}
