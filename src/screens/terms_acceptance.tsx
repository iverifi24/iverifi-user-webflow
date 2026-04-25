import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Grid3x3,
  FileText,
  Send,
  Lock,
  X,
  CheckCircle,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import { useGetRecipientCredentialsQuery } from "@/redux/api";
import { setTermsAccepted } from "@/utils/terms";
import { useAuth } from "@/context/auth_context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase_setup";
import { saveRecipientIdForLater } from "@/utils/connectionFlow";
import { AuthHeroHeader } from "@/components/auth-hero-header";

export default function TermsAcceptance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hintBottom, setHintBottom] = useState(24);
  const lastSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHint = () => {
      const vv = window.visualViewport;
      const viewportHeight = vv ? vv.height : window.innerHeight;
      const windowHeight = window.innerHeight;
      const browserBarHeight = windowHeight - viewportHeight;
      // Position above the browser bar with 16px padding
      setHintBottom(browserBarHeight + 16);

      const scrollable =
        document.documentElement.scrollHeight > windowHeight + 10;

      const isTabletOrAbove = window.innerWidth >= 768;
      if (isTabletOrAbove) {
        const lastSection = lastSectionRef.current;
        const lastSectionVisible = lastSection
          ? lastSection.getBoundingClientRect().top + lastSection.offsetHeight / 3 < viewportHeight
          : false;
        setShowScrollHint(scrollable && !lastSectionVisible);
      } else {
        const notScrolled = window.scrollY < 40;
        setShowScrollHint(scrollable && notScrolled);
      }
    };

    updateHint();
    window.addEventListener("scroll", updateHint);
    window.visualViewport?.addEventListener("resize", updateHint);
    window.visualViewport?.addEventListener("scroll", updateHint);
    return () => {
      window.removeEventListener("scroll", updateHint);
      window.visualViewport?.removeEventListener("resize", updateHint);
      window.visualViewport?.removeEventListener("scroll", updateHint);
    };
  }, []);
  const { user } = useAuth();
  const code = searchParams.get("code");

  const { data: recipientData } = useGetRecipientCredentialsQuery(code || "", {
    skip: !code,
  });

  const connectionName =
    recipientData?.data?.requests?.[0]?.recipients?.name ||
    recipientData?.data?.requests?.[0]?.recipients?.firstName ||
    "Hotel";

  const handleAccept = async () => {
    if (!acceptedTerms) return;
    if (!user?.uid) return;

    setIsSaving(true);
    const getRedirectPath = async () => {
      try {
        const userDocRef = doc(db, "applicants", user.uid);
        const userDoc = await getDoc(userDocRef);
        const profileCompletionLevel =
          userDoc.data()?.profile_completion_level || 0;
        if (profileCompletionLevel < 10) {
          if (code) saveRecipientIdForLater(code);
          return "/complete-profile";
        }
        return code ? `/?code=${code}` : "/";
      } catch {
        if (code) saveRecipientIdForLater(code);
        return code ? "/complete-profile" : "/";
      }
    };

    try {
      await setTermsAccepted(true, user.uid);
      const { isTermsAccepted: checkTerms } = await import("@/utils/terms");
      let verified = false;
      let retries = 0;
      while (!verified && retries < 5) {
        await new Promise((r) => setTimeout(r, 300));
        verified = await checkTerms(user.uid);
        if (verified) break;
        retries++;
      }
      const redirectPath = await getRedirectPath();
      navigate(redirectPath);
    } catch {
      const redirectPath = await getRedirectPath();
      navigate(redirectPath);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full py-6 sm:py-10 bg-[var(--iverifi-page)] text-[var(--iverifi-text-primary)]">
      <div className="w-full flex justify-center">
        <div className="w-full sm:max-w-2xl px-4 sm:px-6 pb-10">
          <div className="mb-8">
            <AuthHeroHeader />
          </div>

          <div className="space-y-4">
            {/* Section 1 — How It Works */}
            <div className="w-full bg-[var(--iverifi-card)] border border-[color:var(--iverifi-card-border)] shadow-md dark:shadow-[0_12px_35px_rgba(0,0,0,0.7)] rounded-xl p-4 space-y-4">
              <h2 className="text-lg font-bold text-[var(--iverifi-text-primary)] tracking-wide text-center">
                How It Works
              </h2>
              {/* Mobile: vertical stack with down arrows */}
              <div className="flex flex-col gap-0 md:hidden">
                {[
                  {
                    icon: <Grid3x3 className="h-4 w-4 text-sky-400" />,
                    title: "Scan QR Code",
                    desc: "Open verification on your phone.",
                  },
                  {
                    icon: <FileText className="h-4 w-4 text-sky-400" />,
                    title: "Verify Documents",
                    desc: "Connect to DigiLocker or govt portals.",
                  },
                  {
                    icon: <Send className="h-4 w-4 text-sky-400" />,
                    title: "Share Verified Result",
                    desc: `Only 'verified ✓' status sent to ${connectionName}.`,
                  },
                ].map((step, i, arr) => (
                  <div key={i}>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--iverifi-muted-surface)] border border-[color:var(--iverifi-card-border)]">
                      <div className="bg-[var(--iverifi-icon-box-bg)] border border-[color:var(--iverifi-icon-box-border)] p-2 rounded-lg shrink-0">
                        {step.icon}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-[var(--iverifi-text-primary)]">
                          {step.title}
                        </p>
                        <p className="text-xs text-[var(--iverifi-text-muted)] mt-0.5">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-4 w-4 text-[var(--iverifi-text-muted)]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: horizontal row with right arrows */}
              <div className="hidden md:flex items-stretch gap-2">
                {[
                  {
                    icon: <Grid3x3 className="h-4 w-4 text-sky-400" />,
                    title: "Scan QR Code",
                    desc: "Open verification on your phone.",
                  },
                  {
                    icon: <FileText className="h-4 w-4 text-sky-400" />,
                    title: "Verify Documents",
                    desc: "Connect to DigiLocker or govt portals.",
                  },
                  {
                    icon: <Send className="h-4 w-4 text-sky-400" />,
                    title: "Share Verified Result",
                    desc: `Only 'verified ✓' status sent to ${connectionName}.`,
                  },
                ].map((step, i, arr) => (
                  <div key={i} className="flex items-center gap-2 flex-1">
                    <div className="flex-1 flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-[var(--iverifi-muted-surface)] border border-[color:var(--iverifi-card-border)] h-full">
                      <div className="bg-[var(--iverifi-icon-box-bg)] border border-[color:var(--iverifi-icon-box-border)] p-2.5 rounded-lg shrink-0">
                        {step.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[var(--iverifi-text-primary)] whitespace-nowrap">
                          {step.title}
                        </p>
                        <p className="text-xs text-[var(--iverifi-text-muted)] mt-1 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-[var(--iverifi-text-muted)] shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2 — Privacy guarantee */}
            <div className="flex items-center gap-4 bg-[var(--iverifi-success-soft)] border border-[color:var(--iverifi-success-border)] rounded-xl px-4 py-4">
              <div className="bg-emerald-500/20 p-2.5 rounded-lg shrink-0">
                <Lock className="h-5 w-5 text-emerald-500 dark:text-emerald-300" />
              </div>
              <div>
                <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-50">
                  Your Documents Stay Private
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-200 mt-0.5">
                  Documents never stored - Verified with govt portals.
                </p>
              </div>
            </div>

            {/* Section 3 — What they get / don't get */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[var(--iverifi-card)] border border-[color:var(--iverifi-card-border)] shadow-sm rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-[var(--iverifi-text-muted)]">
                  What {connectionName} Receives:
                </h3>
                <ul className="space-y-2.5">
                  {[
                    'Verification status: "Verified"',
                    'Document type: "Aadhaar Card"',
                    `Timestamp: ${new Date().toLocaleString()}`,
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-sm text-[var(--iverifi-text-secondary)]"
                    >
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[var(--iverifi-card)] border border-[color:var(--iverifi-card-border)] shadow-sm rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-[var(--iverifi-text-muted)]">
                  What They DON&apos;T Get:
                </h3>
                <ul className="space-y-2.5">
                  {[
                    "Your document numbers",
                    "Your ID photo-copies",
                    "Your personal details",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-sm text-[var(--iverifi-text-secondary)]"
                    >
                      <X className="h-4 w-4 text-red-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Section 4 — Accept */}
            <div ref={lastSectionRef} className="w-full bg-[var(--iverifi-card)] border border-[color:var(--iverifi-card-border)] shadow-md dark:shadow-[0_12px_35px_rgba(0,0,0,0.7)] rounded-xl p-4 space-y-3">
              <div
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                  acceptedTerms
                    ? "border-sky-500/60 bg-sky-500/10"
                    : "border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-muted-surface)]"
                }`}
                onClick={() => setAcceptedTerms((v) => !v)}
              >
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(c) => setAcceptedTerms(c === true)}
                  className="mt-0.5 shrink-0 h-5 w-5 border-2 border-slate-400 data-[state=checked]:border-sky-400"
                  onClick={(e) => e.stopPropagation()}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-[var(--iverifi-text-secondary)] leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/terms");
                    }}
                    className="text-sky-400 underline underline-offset-4 hover:text-sky-300 cursor-pointer font-medium"
                  >
                    Terms &amp; Conditions
                  </span>{" "}
                  and{" "}
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/privacy");
                    }}
                    className="text-sky-400 underline underline-offset-4 hover:text-sky-300 cursor-pointer font-medium"
                  >
                    Privacy Policy
                  </span>
                  .
                </label>
              </div>

              <Button
                onClick={handleAccept}
                disabled={!acceptedTerms || isSaving}
                className="w-full py-3 text-base font-medium bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 shadow-[0_0_40px_rgba(0,224,255,0.35)] hover:from-[#40e8ff] hover:to-[#9274ff] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : acceptedTerms ? "Continue" : "Accept to Continue"}
              </Button>

              <p className="text-center text-xs text-[var(--iverifi-text-muted)]">
                Protected by 256-bit encryption • Takes 30 seconds
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint — fixed at bottom, fades out once user scrolls */}
      {showScrollHint && (
        <div
          className="fixed left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce z-50 cursor-pointer"
          style={{ bottom: hintBottom }}
          onClick={() =>
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: "smooth",
            })
          }
        >
          <span className="text-xs text-sky-300 bg-slate-900/90 border border-sky-500/40 rounded-full px-3 py-1 shadow-[0_0_12px_rgba(0,224,255,0.2)] backdrop-blur-sm whitespace-nowrap">
            Scroll down to Read & Accept
          </span>
          <ArrowDown className="h-4 w-4 text-sky-400" />
        </div>
      )}
    </div>
  );
}
