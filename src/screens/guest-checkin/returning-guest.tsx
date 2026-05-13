import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IverifiLogo } from "@/components/iverifi-logo";
import type { FlowCredential } from "./guest-checkin-flow";

const ICONS: Record<string, string> = {
  AADHAAR_CARD: "🪪",
  DRIVING_LICENSE: "🚗",
  PAN_CARD: "💳",
  PASSPORT: "✈️",
};
const LABELS: Record<string, string> = {
  AADHAAR_CARD: "Aadhaar Card",
  DRIVING_LICENSE: "Driving Licence",
  PAN_CARD: "PAN Card",
  PASSPORT: "Passport",
};
const SHARED_CHIPS: Record<string, string[]> = {
  AADHAAR_CARD: ["📸 Photo", "👤 Full Name", "🔢 Aadhaar (masked)", "🗓️ Age 18+", "📍 State"],
  DRIVING_LICENSE: ["📸 Photo", "👤 Full Name", "🪪 Licence No.", "✅ Valid till"],
  PAN_CARD: ["📸 Photo", "👤 Full Name", "💳 PAN No."],
  PASSPORT: ["📸 Photo", "👤 Full Name", "✈️ Passport (masked)"],
};

interface Props {
  hotelName: string;
  credentials: FlowCredential[];
  selectedCredential: FlowCredential | null;
  onContinue: () => void;
  onCredentialChange: (c: FlowCredential) => void;
  onVerifyNew: () => void;
}

export default function ReturningGuest({
  hotelName,
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

        <div className="text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold mb-3"
            style={{
              background: "var(--iverifi-accent-soft)",
              border: "1px solid var(--iverifi-accent-border)",
              color: "var(--iverifi-accent)",
            }}
          >
            👋 Welcome back!
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Your verified ID</h1>
          <p className="text-sm text-muted-foreground">
            Select the ID to share with{" "}
            <strong className="text-foreground">{hotelName}</strong>
          </p>
        </div>

        {/* Credential cards */}
        <div className="flex flex-col gap-3">
          {credentials.map((c) => {
            const isSel = selected?.id === c.id;
            return (
              <div
                key={c.id}
                className="rounded-xl border transition-all cursor-pointer"
                style={{
                  borderColor: isSel ? "var(--iverifi-accent)" : "var(--iverifi-card-border)",
                  background: isSel ? "var(--iverifi-accent-soft)" : "var(--iverifi-card)",
                }}
                onClick={() => onCredentialChange(c)}
              >
                <div className="flex items-center gap-4 p-4">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 border"
                    style={{ background: "var(--iverifi-muted-surface)", borderColor: "var(--iverifi-card-border)" }}
                  >
                    {ICONS[c.document_type] ?? "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{LABELS[c.document_type] ?? c.document_type}</p>
                    <p className="text-xs font-medium" style={{ color: "var(--iverifi-accent)" }}>✓ Verified</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
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
        <Card className="border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]">
          <CardContent className="pt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">✅ Shared with hotel</p>
              <div className="flex flex-wrap gap-2">
                {sharedChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: "var(--iverifi-accent-soft)",
                      borderColor: "var(--iverifi-accent-border)",
                      color: "var(--iverifi-accent)",
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">❌ Never shared</p>
              <div className="flex flex-wrap gap-2">
                {["Full Aadhaar number", "Biometrics", "Bank details"].map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium text-red-400"
                    style={{ background: "rgba(255,77,109,0.08)", borderColor: "rgba(255,77,109,0.2)" }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          disabled={!selected}
          onClick={onContinue}
          className="w-full h-12 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold shadow-[0_0_24px_rgba(0,224,255,0.3)] hover:from-[#40e8ff] hover:to-[#9274ff] disabled:opacity-40"
        >
          Continue →
        </Button>

        <Button
          variant="ghost"
          className="text-muted-foreground text-sm"
          onClick={onVerifyNew}
        >
          Verify a different document instead
        </Button>
      </div>
    </div>
  );
}
