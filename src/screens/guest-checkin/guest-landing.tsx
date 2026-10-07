import { useState, useEffect } from "react";
import { useGetHotelPublicInfoQuery } from "@/redux/api";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HotelBadge } from "@/components/hotel-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Landmark, CheckCircle2 } from "lucide-react";
import type { HotelInfo } from "./guest-checkin-flow";

interface Props {
  hotelCode: string;
  onHotelInfo: (info: HotelInfo) => void;
  onStart: () => void;
}

export default function GuestLanding({ hotelCode, onHotelInfo, onStart }: Props) {
  const { data, isLoading } = useGetHotelPublicInfoQuery(hotelCode, { skip: !hotelCode });
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (data?.data && !data.hasError) onHotelInfo(data.data);
  }, [data]);

  const hotelName = data?.data?.name ?? (isLoading ? "Loading…" : "Verification Portal");
  const logoUrl = data?.data?.logo_url ?? null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div className="flex justify-center">
          <IverifiLogo />
        </div>

        <HotelBadge name={hotelName} logoUrl={logoUrl} />

        {/* Main Card Container */}
        <div className="w-full rounded-3xl border border-border/80 bg-card/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col gap-5 text-center">
          
          {/* Header & Subtitle */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs font-semibold text-[var(--iverifi-accent)] mb-3">
              ⚡ Instant Paperless Check-in
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Verify Your Identity
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 leading-relaxed">
              Complete instant digital verification for{" "}
              <strong className="text-foreground">{hotelName}</strong> in 3 simple steps.
            </p>
          </div>

          {/* Micro-Stepper Flow */}
          <div className="grid grid-cols-3 gap-2 py-1 text-left">
            <div className="flex flex-col gap-1 rounded-2xl bg-muted/50 dark:bg-slate-800/40 border border-border/50 p-2.5">
              <span className="text-[10px] font-bold text-[var(--iverifi-accent)] uppercase tracking-wider">Step 1</span>
              <span className="text-xs font-semibold text-foreground leading-tight">Mobile OTP</span>
              <span className="text-[10px] text-muted-foreground">Quick login</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl bg-muted/50 dark:bg-slate-800/40 border border-border/50 p-2.5">
              <span className="text-[10px] font-bold text-[var(--iverifi-accent)] uppercase tracking-wider">Step 2</span>
              <span className="text-xs font-semibold text-foreground leading-tight">Govt ID</span>
              <span className="text-[10px] text-muted-foreground">DigiLocker</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl bg-muted/50 dark:bg-slate-800/40 border border-border/50 p-2.5">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Step 3</span>
              <span className="text-xs font-semibold text-foreground leading-tight">Entry Pass</span>
              <span className="text-[10px] text-muted-foreground">Instant check-in</span>
            </div>
          </div>

          {/* Trust Pills */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {[
              { icon: <ShieldCheck className="h-3.5 w-3.5 text-[var(--iverifi-accent)] shrink-0" />, label: "DPDP Act 2023" },
              { icon: <Landmark className="h-3.5 w-3.5 text-[var(--iverifi-accent)] shrink-0" />, label: "Govt Verified" },
              { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />, label: "Paperless" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-foreground/80"
              >
                {icon} {label}
              </span>
            ))}
          </div>

          {/* Terms checkbox */}
          <div
            className={`w-full flex items-start gap-3 rounded-2xl border px-3.5 py-3 cursor-pointer transition-all text-left ${
              agreed
                ? "border-[var(--iverifi-accent)] bg-[var(--iverifi-accent-soft)]/50"
                : "border-border/70 bg-muted/30 hover:border-border"
            }`}
            onClick={() => setAgreed((v) => !v)}
          >
            <Checkbox
              id="guest-terms"
              checked={agreed}
              onCheckedChange={(c) => setAgreed(c === true)}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 shrink-0 h-4 w-4 border-2 border-slate-400 data-[state=checked]:border-[var(--iverifi-accent)]"
            />
            <label
              htmlFor="guest-terms"
              className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none"
              onClick={(e) => e.stopPropagation()}
            >
              I agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--iverifi-accent)] underline underline-offset-4 font-semibold hover:opacity-80"
                onClick={(e) => e.stopPropagation()}
              >
                Terms &amp; Conditions
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--iverifi-accent)] underline underline-offset-4 font-semibold hover:opacity-80"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
            </label>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onStart}
            disabled={isLoading || !agreed}
            className="w-full bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-bold dark:shadow-[0_0_24px_rgba(0,224,255,0.3)] hover:from-[#40e8ff] hover:to-[#9274ff] h-12 rounded-2xl text-base disabled:opacity-40 transition-all cursor-pointer"
          >
            Start Verification →
          </Button>

          <p className="text-[11px] text-muted-foreground">
            ⚡ Takes ~30 seconds • No physical paperwork needed
          </p>
        </div>
      </div>
    </div>
  );
}
