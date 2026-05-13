import { useState, useEffect } from "react";
import { useGetHotelPublicInfoQuery } from "@/redux/api";
import { IverifiLogo } from "@/components/iverifi-logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

  const hotelName = data?.data?.name ?? (isLoading ? "Loading…" : "Hotel Check-In");
  const logoUrl = data?.data?.logo_url ?? null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <IverifiLogo />

        {/* Hotel badge */}
        <div className="flex items-center gap-2 rounded-full border border-[var(--iverifi-card-border)] bg-[var(--iverifi-card)] px-4 py-2 text-sm font-medium text-[var(--iverifi-text-secondary)]">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-5 h-5 rounded object-cover" />
          ) : (
            <span>🏨</span>
          )}
          <span>{hotelName}</span>
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Verify your identity
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Check in to <strong className="text-foreground">{hotelName}</strong> in under 30 seconds.
            No photocopies, no forms.
          </p>
        </div>

        {/* Trust pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: "🔒", label: "DPDP Compliant" },
            { icon: "🏛️", label: "Govt Verified" },
            { icon: "✅", label: "No Data Stored" },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--iverifi-accent-border)] bg-[var(--iverifi-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--iverifi-accent)]"
            >
              {icon} {label}
            </span>
          ))}
        </div>

        {/* Terms checkbox */}
        <div
          className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors text-left ${
            agreed
              ? "border-[var(--iverifi-accent)] bg-[var(--iverifi-accent-soft)]"
              : "border-[var(--iverifi-card-border)] bg-[var(--iverifi-card)]"
          }`}
          onClick={() => setAgreed((v) => !v)}
        >
          <Checkbox
            id="guest-terms"
            checked={agreed}
            onCheckedChange={(c) => setAgreed(c === true)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 shrink-0 h-5 w-5 border-2 border-slate-400 data-[state=checked]:border-[var(--iverifi-accent)]"
          />
          <label
            htmlFor="guest-terms"
            className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none"
            onClick={(e) => e.stopPropagation()}
          >
            I agree to the{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--iverifi-accent)] underline underline-offset-4 font-medium hover:opacity-80"
              onClick={(e) => e.stopPropagation()}
            >
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--iverifi-accent)] underline underline-offset-4 font-medium hover:opacity-80"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </a>
          </label>
        </div>

        <Button
          onClick={onStart}
          disabled={isLoading || !agreed}
          className="w-full bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold shadow-[0_0_24px_rgba(0,224,255,0.3)] hover:from-[#40e8ff] hover:to-[#9274ff] h-12 text-base disabled:opacity-40"
        >
          Start Check-In →
        </Button>

        <p className="text-xs text-muted-foreground">Takes about 30 seconds</p>
      </div>
    </div>
  );
}
