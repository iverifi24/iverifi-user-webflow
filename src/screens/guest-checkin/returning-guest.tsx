import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HotelBadge } from "@/components/hotel-badge";
import {
  CreditCard,
  Car,
  FileBadge,
  Plane,
  FileText,
  Sparkles,
  Camera,
  User,
  Hash,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Check,
} from "lucide-react";
import type { FlowCredential } from "./guest-checkin-flow";

interface ChipDef {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  AADHAAR_CARD: FileBadge,
  DRIVING_LICENSE: Car,
  PAN_CARD: CreditCard,
  PASSPORT: Plane,
};

const LABELS: Record<string, string> = {
  AADHAAR_CARD: "Aadhaar Card",
  DRIVING_LICENSE: "Driving Licence",
  PAN_CARD: "PAN Card",
  PASSPORT: "Passport",
};

const SHARED_CHIPS: Record<string, ChipDef[]> = {
  AADHAAR_CARD: [
    { label: "Photo", icon: Camera },
    { label: "Full Name", icon: User },
    { label: "Aadhaar (masked)", icon: Hash },
    { label: "Age 18+", icon: Calendar },
    { label: "State", icon: MapPin },
  ],
  DRIVING_LICENSE: [
    { label: "Photo", icon: Camera },
    { label: "Full Name", icon: User },
    { label: "Licence No.", icon: FileBadge },
    { label: "Valid till", icon: Calendar },
  ],
  PAN_CARD: [
    { label: "Photo", icon: Camera },
    { label: "Full Name", icon: User },
    { label: "PAN No.", icon: CreditCard },
  ],
  PASSPORT: [
    { label: "Photo", icon: Camera },
    { label: "Full Name", icon: User },
    { label: "Passport (masked)", icon: Plane },
  ],
};

interface Props {
  hotelName: string;
  hotelLogoUrl?: string | null;
  credentials: FlowCredential[];
  selectedCredential: FlowCredential | null;
  onContinue: () => void;
  onCredentialChange: (c: FlowCredential) => void;
  onVerifyNew: () => void;
}

export default function ReturningGuest({
  hotelName,
  hotelLogoUrl,
  credentials,
  selectedCredential,
  onContinue,
  onCredentialChange,
  onVerifyNew,
}: Props) {
  const selected = selectedCredential ?? credentials[0] ?? null;
  const sharedChips = SHARED_CHIPS[selected?.document_type ?? "AADHAAR_CARD"] ?? SHARED_CHIPS["AADHAAR_CARD"];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex justify-center">
          <IverifiLogo />
        </div>
        <HotelBadge name={hotelName} logoUrl={hotelLogoUrl} />

        <div className="text-center">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold mb-3 shadow-sm"
            style={{
              background: "var(--iverifi-accent-soft)",
              border: "1px solid var(--iverifi-accent-border)",
              color: "var(--iverifi-accent)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome back</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Your verified ID</h1>
          <p className="text-sm text-muted-foreground">
            Select the ID to share with{" "}
            <strong className="text-foreground">{hotelName || "the organization"}</strong>
          </p>
        </div>

        {/* Credential cards */}
        <div className="flex flex-col gap-3">
          {credentials.map((c) => {
            const isSel = selected?.id === c.id;
            const DocIcon = ICONS[c.document_type] ?? FileText;
            return (
              <div
                key={c.id}
                className="rounded-xl border transition-all cursor-pointer shadow-sm hover:border-[var(--iverifi-accent)]"
                style={{
                  borderColor: isSel ? "var(--iverifi-accent)" : "var(--iverifi-card-border)",
                  background: isSel ? "var(--iverifi-accent-soft)" : "var(--iverifi-card)",
                }}
                onClick={() => onCredentialChange(c)}
              >
                <div className="flex items-center gap-4 p-4">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 border"
                    style={{ background: "var(--iverifi-muted-surface)", borderColor: "var(--iverifi-card-border)" }}
                  >
                    <DocIcon className="w-5 h-5 text-[var(--iverifi-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{LABELS[c.document_type] ?? c.document_type}</p>
                    <p className="text-xs font-medium flex items-center gap-1 mt-0.5" style={{ color: "var(--iverifi-accent)" }}>
                      <Check className="w-3 h-3" />
                      <span>Verified</span>
                    </p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ borderColor: isSel ? "var(--iverifi-accent)" : "#6b7280" }}
                  >
                    {isSel && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--iverifi-accent)" }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* What gets shared */}
        <Card className="border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] shadow-sm">
          <CardContent className="pt-4 flex flex-col gap-3.5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Shared with organization</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sharedChips.map((chip) => {
                  const ChipIcon = chip.icon;
                  return (
                    <span
                      key={chip.label}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                      style={{
                        background: "var(--iverifi-accent-soft)",
                        borderColor: "var(--iverifi-accent-border)",
                        color: "var(--iverifi-accent)",
                      }}
                    >
                      <ChipIcon className="w-3 h-3" />
                      <span>{chip.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1 border-t border-[var(--iverifi-card-border)]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Never shared</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["Full Aadhaar number", "Biometrics", "Bank details"].map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium text-rose-400"
                    style={{ background: "rgba(255,77,109,0.08)", borderColor: "rgba(255,77,109,0.2)" }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            {/* Auto-Revocation Timer Badge */}
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--iverifi-card-border)] text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                <strong>Auto-Revocation:</strong> Access terminates automatically in 24 hours under DPDP Act 2023.
              </span>
            </div>
          </CardContent>
        </Card>

        <Button
          disabled={!selected}
          onClick={onContinue}
          className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold shadow-md shadow-teal-500/25 hover:from-teal-600 hover:to-cyan-600 disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>Express Check-In ({LABELS[selected?.document_type ?? ""] ?? "ID"}) →</span>
        </Button>

        <Button
          variant="ghost"
          className="text-muted-foreground text-sm hover:text-foreground"
          onClick={onVerifyNew}
        >
          Verify a different document instead
        </Button>
      </div>
    </div>
  );
}
