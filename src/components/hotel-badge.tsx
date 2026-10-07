import { Building2 } from "lucide-react";

interface HotelBadgeProps {
  name: string;
  logoUrl?: string | null;
}

export function HotelBadge({ name, logoUrl }: HotelBadgeProps) {
  if (!name && !logoUrl) return null;
  return (
    <div className="flex justify-center">
      {logoUrl ? (
        <div className="rounded-xl border border-border/70 bg-card/60 p-1.5 shadow-xs backdrop-blur-xs">
          <img src={logoUrl} alt={name || "Business Logo"} className="h-10 w-auto max-w-[180px] object-contain rounded-lg" />
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/60 dark:bg-slate-900/80 px-3.5 py-1.5 shadow-xs backdrop-blur-xs">
          <Building2 className="h-3.5 w-3.5 text-[var(--iverifi-accent)] shrink-0" />
          <span className="text-xs font-semibold tracking-wide text-foreground uppercase">
            {name || "Verification Portal"}
          </span>
        </div>
      )}
    </div>
  );
}

export const BusinessBadge = HotelBadge;
