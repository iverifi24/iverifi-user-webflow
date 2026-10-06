import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetCredentialsQuery } from "@/redux/api";
import { LoadingScreen } from "@/components/loading-screen";
import { getApplicantProfileFromBackend } from "@/utils/syncApplicantProfile";
import { resolveAgeCheckFromCredentials } from "@/utils/credentialAge";
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Clock,
  Sparkles,
  Lock,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AgeCheckScreen() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetCredentialsQuery();
  const [displayName, setDisplayName] = useState<string>("");
  const [liveTime, setLiveTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const profile = await getApplicantProfileFromBackend();
        if (!mounted) return;
        const name =
          (profile as any)?.name ||
          [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
          "";
        setDisplayName(name);
      } catch (e) {
        console.warn("Failed to fetch applicant name:", e);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const credentials = useMemo(() => data?.data?.credential ?? [], [data]);

  const resolution = useMemo(
    () => resolveAgeCheckFromCredentials(credentials as unknown[]),
    [credentials]
  );

  const ok = resolution.outcome === "above18";
  const under18 = resolution.outcome === "under18";

  if (isLoading) return <LoadingScreen variant="fullPage" />;

  return (
    <div className="min-h-0 flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-5">
        {/* Top Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-cyan-300 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
            Zero-Knowledge Age Proof
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Age Verification
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Instant privacy-first age credential for hotel check-ins, venues, and transit
          </p>
        </div>

        {/* The Digital Token Card */}
        <div className="relative w-full rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl backdrop-blur-xl dark:border-border/40 dark:bg-slate-900/90 dark:shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex flex-col items-center gap-5">
          {/* Status Badge Ring */}
          <div className="relative flex items-center justify-center">
            {ok ? (
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-cyan-500/20 border-4 border-emerald-500/40 shadow-inner">
                <span className="absolute -inset-2 rounded-full border border-emerald-500/30 animate-ping opacity-30" />
                <div className="flex flex-col items-center justify-center">
                  <ShieldCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-3xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
                    18+
                  </span>
                </div>
              </div>
            ) : under18 ? (
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-rose-500/10 border-4 border-rose-500/40 shadow-inner">
                <div className="flex flex-col items-center justify-center">
                  <ShieldAlert className="h-10 w-10 text-rose-500" />
                  <span className="text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                    &lt;18
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-amber-500/10 border-4 border-amber-500/40 shadow-inner">
                <div className="flex flex-col items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-amber-500" />
                  <span className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                    —
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* User Identification */}
          {displayName && (
            <div className="text-lg font-bold text-foreground">
              {displayName}
            </div>
          )}

          {/* Result details */}
          {ok ? (
            <div className="w-full space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Legal Majority Confirmed (18+)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cryptographically derived from verified{" "}
                <strong className="text-foreground">
                  {formatDocLabel(resolution.documentType)}
                </strong>
                .
              </p>
            </div>
          ) : under18 ? (
            <div className="w-full rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-xs text-rose-800 dark:text-rose-300">
              <p className="font-semibold">Minor Access</p>
              <p className="mt-1">
                Verified Date of Birth indicates age is below 18 years.
              </p>
            </div>
          ) : (
            <div className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-800 dark:text-amber-300 space-y-3">
              <p className="font-semibold">No Verified Date of Birth</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Add an Aadhaar, PAN, Passport, or Driving License to generate your 18+ proof token.
              </p>
              <Button
                type="button"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold h-9 shadow-xs"
                onClick={() => navigate("/")}
              >
                Add Document <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}

          {/* Live Anti-Fraud Running Watermark (Seconds Only) */}
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-2 border-t border-border/50 w-full">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Tamper-Proof Live Session</span>
            </div>
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
              <span>{liveTime}</span>
            </div>
          </div>
        </div>

        {/* Privacy Shield Disclaimer */}
        <div className="w-full rounded-2xl border border-border/60 bg-muted/20 p-3.5 text-left flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-teal-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">DPDP Act 2023 Compliant:</strong> Your exact Date of Birth and residential address are never disclosed. Only cryptographic boolean age eligibility is shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDocLabel(documentType: string): string {
  if (!documentType) return "Govt ID";
  if (documentType.includes("_")) {
    return documentType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return documentType;
}
