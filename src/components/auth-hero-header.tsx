import { useSearchParams } from "react-router-dom";
import { IverifiLogo } from "@/components/iverifi-logo";
import { cn } from "@/lib/utils";
import { useGetHotelPublicInfoQuery } from "@/redux/api";
import { Building2, ShieldCheck } from "lucide-react";

const CHIPS = ["Hotels", "Hospitals", "Offices", "Travel", "Rentals"] as const;

/**
 * Shared branding block: logo, headline, tagline, category chips (login + accept-terms, etc.).
 * When visited with a QR ?code=..., highlights the specific business the visitor is checking into.
 */
export function AuthHeroHeader({ className }: { className?: string }) {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const { data } = useGetHotelPublicInfoQuery(code ?? "", { skip: !code });
  const businessName = data?.data?.name;

  return (
    <header
      className={cn(
        "flex shrink-0 flex-col items-center gap-2 text-center text-foreground sm:gap-2.5",
        className
      )}
    >
      <div className="flex w-full flex-col items-center gap-1">
        <div className="w-full max-w-[9.5rem] origin-top sm:max-w-[13.5rem]">
          <IverifiLogo />
        </div>

        {businessName ? (
          <div className="mt-1 flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Visitor Check-in at {businessName}</span>
            </div>
            <h1 className="text-balance px-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl md:text-3xl text-slate-900 dark:text-white">
              Instant Identity Verification
            </h1>
            <p className="text-xs text-muted-foreground max-w-sm flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Fast, secure, and paperless check-in under 30 seconds</span>
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-balance px-1 text-lg font-semibold leading-tight tracking-tight sm:text-2xl md:text-3xl">
              Verify once.{" "}
              <span className="text-foreground/60">Trust everywhere.</span>
            </h1>
            <p className="text-[11px] text-muted-foreground sm:text-sm">
              Your universal identity wallet.
            </p>
            <div className="mt-0.5 flex max-w-[17rem] flex-wrap justify-center gap-1 sm:max-w-md sm:gap-1.5">
              {CHIPS.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-border bg-accent/50 px-2 py-0.5 text-[9px] text-foreground/70 sm:text-[0.65rem]"
                >
                  {label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
