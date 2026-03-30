import { IverifiLogo } from "@/components/iverifi-logo";
import { cn } from "@/lib/utils";

const CHIPS = ["Hotels", "Hospitals", "Offices", "Travel", "Rentals"] as const;

/**
 * Shared branding block: logo, headline, tagline, category chips (login + accept-terms, etc.).
 */
export function AuthHeroHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "flex shrink-0 flex-col items-center gap-1.5 text-center text-foreground sm:gap-2",
        className
      )}
    >
      <div className="flex w-full flex-col items-center gap-0.5">
        <div className="w-full max-w-[9.5rem] origin-top sm:max-w-[13.5rem]">
          <IverifiLogo />
        </div>
        <h1 className="text-balance px-1 text-lg font-semibold leading-tight tracking-tight sm:text-2xl md:text-3xl">
          Verify once.{" "}
          <span className="text-foreground/60">Trust everywhere.</span>
        </h1>
      </div>
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
    </header>
  );
}
