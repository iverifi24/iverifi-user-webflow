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
import { Button } from "@/components/ui/button";
import { AlertTriangle, Building2, Home, LogOut } from "lucide-react";
import { getVenueCopy } from "@/utils/venueCopy";
import { StepProgressBar } from "./checkin-steps";
import { CheckinStepContext, buildStepLabels } from "./checkin-step-context";

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
  businessType?: string | null;
}

/** "quota" = the venue cannot accept more requests; retrying will not help */
export type FlowErrorKind = "general" | "quota";

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
  errorKind: FlowErrorKind;
}

// ── Step map ─────────────────────────────────────────────────────────────────
// Which visible step (see buildStepLabels) each internal flow state belongs to.
// "family" is only reached when the venue allows companions; "details" is always last.

function stepIndexFor(step: FlowStep, labelCount: number): number {
  switch (step) {
    case "phone":
    case "otp":
    case "checking":
      return 0;
    case "kyc":
    case "returning":
      return 1;
    case "family":
      return 2;
    case "details":
    case "submitting":
      return labelCount - 1;
    default:
      return -1;
  }
}

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
      errorKind: "general",
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

  const copy = getVenueCopy(state.hotelInfo?.businessType);
  const venueName = state.hotelInfo?.name || copy.venueFallback;
  const stepLabels = buildStepLabels(copy.allowsCompanions);
  const stepIndex = stepIndexFor(state.step, stepLabels.length);
  // After choosing an ID, solo-visit venues skip the companions step entirely
  const stepAfterId: FlowStep = copy.allowsCompanions ? "family" : "details";

  const failWith = (msg: string, kind: FlowErrorKind = "general") =>
    advance({ step: "error", errorMessage: msg, errorKind: kind });

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
            hotelName={venueName}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            onAuthSuccess={(phone) => advance({ phone, step: "checking" })}
            onBack={() => advance({ step: "landing" })}
          />
        );

      case "checking":
        return (
          <GuestChecking
            hotelCode={state.hotelCode}
            hotelName={venueName}
            startedAt={state.startedAt}
            staffTerm={copy.staffTerm}
            actionNoun={copy.actionNoun}
            onResult={({ connectionId, credentials, isReturning, selectedCredential }) =>
              advance({
                connectionId,
                credentials,
                isReturning,
                selectedCredential,
                step: isReturning ? "returning" : "kyc",
              })
            }
            onError={failWith}
          />
        );

      case "kyc":
        return (
          <GuestKyc
            hotelName={venueName}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            staffTerm={copy.staffTerm}
            existingCredentials={state.credentials}
            connectionId={state.connectionId}
            startedAt={state.startedAt}
            onSelected={(credential) =>
              advance({ selectedCredential: credential, credentials: state.credentials.find(c => c.id === credential.id) ? state.credentials : [...state.credentials, credential], step: stepAfterId })
            }
            onForeignCheckin={(result, docType) => advance({
              step: "confirm",
              checkInResult: result,
              selectedCredential: docType
                ? { id: "manual", document_type: docType, state: "auto_approved" }
                : state.selectedCredential,
            })}
            onManualDetails={(docType) => advance({
              step: stepAfterId,
              selectedCredential: { id: "manual", document_type: docType, state: "auto_approved" },
            })}
            onError={failWith}
            // Only returning visitors have a real previous screen (their saved IDs).
            // For new visitors "back" used to re-run the connection and land here again.
            onBack={state.isReturning ? () => advance({ step: "returning" }) : undefined}
          />
        );

      case "family":
        return (
          <GuestFamilySelect
            hotelName={venueName}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            onContinue={(selected) => advance({ selectedFamilyCredentials: selected, step: "details" })}
            onSkip={() => advance({ selectedFamilyCredentials: [], step: "details" })}
          />
        );

      case "details":
        return (
          <GuestDetails
            hotelName={venueName}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            staffTerm={copy.staffTerm}
            phone={state.phone}
            credential={state.selectedCredential}
            credentials={state.credentials}
            familyCredentials={state.selectedFamilyCredentials}
            connectionId={state.connectionId}
            startedAt={state.startedAt}
            onSuccess={(result) =>
              advance({ step: "confirm", checkInResult: result })
            }
            onError={failWith}
            onCredentialChange={(c) => advance({ selectedCredential: c })}
          />
        );

      case "returning":
        return (
          <ReturningGuest
            hotelName={venueName}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            credentials={state.credentials}
            selectedCredential={state.selectedCredential}
            onContinue={() => advance({ step: stepAfterId })}
            onCredentialChange={(c) => advance({ selectedCredential: c })}
            onVerifyNew={() => advance({ step: "kyc" })}
          />
        );

      case "submitting":
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--iverifi-accent)] border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-sm">Submitting your {copy.actionNoun}…</p>
            </div>
          </div>
        );

      case "confirm":
        return (
          <GuestConfirmation
            hotelName={venueName}
            hotelLogoUrl={state.hotelInfo?.logo_url ?? null}
            hotelCode={state.hotelCode}
            staffTerm={copy.staffTerm}
            actionNoun={copy.actionNoun}
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
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-[var(--iverifi-accent-soft)] border-2 border-[var(--iverifi-accent-border)] text-[var(--iverifi-accent)]">
                <Building2 className="w-9 h-9" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Already checked in</h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  You're already checked in at <strong className="text-foreground">{venueName}</strong>.
                  Please check out with {copy.staffTerm} before checking in again.
                </p>
              </div>
              <Button
                variant="brand"
                className="w-full h-12 rounded-2xl text-base"
                onClick={() => { guestCheckin.clear(); navigate("/"); }}
              >
                Back to Home
              </Button>
            </div>
          </div>
        );

      case "error": {
        const isQuota = state.errorKind === "quota";
        return (
          <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="w-20 h-20 rounded-[24px] flex items-center justify-center bg-[var(--iverifi-danger-soft)] border border-red-600/30 text-red-500">
              <AlertTriangle className="w-9 h-9" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-foreground text-2xl font-bold">
                {isQuota ? "Unable to continue right now" : "Something went wrong"}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                {state.errorMessage || "An unexpected error occurred. Please try again."}
              </p>
            </div>
            {isQuota ? (
              // Retrying cannot fix a venue-side limit; send the visitor to staff instead
              <div className="w-full max-w-xs flex flex-col gap-3">
                <p className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                  Please speak to {copy.staffTerm} for assistance.
                </p>
                {user && (
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-2xl"
                    onClick={() => { guestCheckin.clear(); navigate("/"); }}
                  >
                    Back to Home
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="brand"
                className="w-full max-w-xs h-12 rounded-2xl text-base"
                onClick={() => {
                  if (state.errorMessage?.includes("24 hours")) {
                    window.location.reload();
                  } else {
                    // Signed-in visitors retry the connection; others start again from the landing page
                    advance({ step: user ? "checking" : "landing", errorMessage: "", errorKind: "general" });
                  }
                }}
              >
                Try Again
              </Button>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <CheckinStepContext.Provider value={{ index: stepIndex, labels: stepLabels }}>
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
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border bg-[var(--iverifi-muted-surface)]"
        >
          <Home className="w-4 h-4" />
          Home
        </button>
      )}

      {/* Logout button — only when signed in */}
      {state.step !== "loading" && user && (
        <button
          onClick={() => { logoutUser(); guestCheckin.clear(); navigate("/login"); }}
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors border border-border bg-[var(--iverifi-muted-surface)]"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      )}

      {/* Segmented step progress (hidden on landing, confirmation and error screens) */}
      <StepProgressBar />

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
    </CheckinStepContext.Provider>
  );
}

// ── Checking sub-screen (inline, lightweight) ─────────────────────────────────

interface CheckingProps {
  hotelCode: string;
  hotelName: string;
  startedAt: number;
  staffTerm: string;
  actionNoun: string;
  onResult: (r: {
    connectionId: string;
    credentials: FlowCredential[];
    isReturning: boolean;
    selectedCredential: FlowCredential | null;
  }) => void;
  onError: (msg: string, kind?: FlowErrorKind) => void;
}

function GuestChecking({ hotelCode, hotelName, startedAt: _startedAt, staffTerm, actionNoun, onResult, onError }: CheckingProps) {
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
          onError(`${hotelName} cannot accept new requests right now. Please speak to ${staffTerm}.`, "quota");
        } else {
          onError(err?.data?.message || err?.message || "Could not connect to the venue. Please try again.");
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
        <p className="text-muted-foreground text-sm">Setting up your verification and {actionNoun}…</p>
      </div>
    </div>
  );
}
