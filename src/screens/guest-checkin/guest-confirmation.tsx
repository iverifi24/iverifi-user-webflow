import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { guestCheckin } from "@/utils/connectionFlow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HotelBadge } from "@/components/hotel-badge";
import { FeedbackModal } from "@/components/feedback-modal";
import { CheckCircle2, ShieldCheck, Check, Clock } from "lucide-react";
import type { FlowCredential } from "./guest-checkin-flow";

const DOC_LABELS: Record<string, string> = {
  AADHAAR_CARD: "Aadhaar Card",
  DRIVING_LICENSE: "Driving Licence",
  PAN_CARD: "PAN Card",
  PASSPORT: "Passport",
  FOREIGN_PASSPORT: "Foreign Passport",
};

interface Props {
  hotelName: string;
  hotelLogoUrl?: string | null;
  credential: FlowCredential | null;
  checkInResult: "approved" | "pending" | null;
  connectionId: string;
  onDone: () => void;
}

export default function GuestConfirmation({ hotelName, hotelLogoUrl, credential, checkInResult, connectionId, onDone }: Props) {
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const docLabel = credential ? (DOC_LABELS[credential.document_type] ?? credential.document_type) : "Document";
  const isApproved = checkInResult === "approved";
  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  // Auto-open feedback sheet after a short delay
  useEffect(() => {
    const t = setTimeout(() => setFeedbackOpen(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleDone = () => {
    guestCheckin.clear();
    onDone();
    navigate("/");
  };

  const handleFeedbackClose = () => {
    setFeedbackOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-5 text-center">
        <div className="flex justify-center"><IverifiLogo /></div>
        <HotelBadge name={hotelName} logoUrl={hotelLogoUrl} />

        {/* Success icon */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-[var(--iverifi-accent-soft)] border-2 border-[var(--iverifi-accent-border)] shadow-md">
          <CheckCircle2 className="w-10 h-10 text-[var(--iverifi-accent)]" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {isApproved ? "You're verified!" : "Verification requested!"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            {isApproved
              ? "Your verification is confirmed. You are all set to proceed."
              : "Your verification request has been submitted and is awaiting confirmation."}
          </p>
        </div>

        {/* Receipt card */}
        <Card className="w-full border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] shadow-xs">
          <CardContent className="pt-5 flex flex-col divide-y divide-border">
            <ReceiptRow label="Organization / Location" value={hotelName} />
            <ReceiptRow label="Document" value={docLabel} accent />
            <ReceiptRow
              label="Status"
              value={isApproved ? "Approved" : "Pending review"}
              color={isApproved ? "green" : "yellow"}
              icon={isApproved ? <Check className="w-3.5 h-3.5 mr-1" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
            />
            <ReceiptRow label="Shared at" value={now} />
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground max-w-xs flex items-center justify-center gap-1.5 leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--iverifi-accent)] shrink-0" />
          <span>
            Organization received only <strong className="text-foreground">verification status</strong>, not your document copy.
          </span>
        </p>

        <Button
          className="w-full h-12 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold dark:shadow-[0_0_24px_rgba(0,224,255,0.3)] hover:from-[#40e8ff] hover:to-[#9274ff]"
          onClick={handleDone}
        >
          Back to Home
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline transition-colors"
          onClick={() => setFeedbackOpen(true)}
        >
          Rate your experience
        </button>
      </div>

      <FeedbackModal
        open={feedbackOpen}
        credentialRequestId={connectionId}
        hotelName={hotelName}
        onClose={handleFeedbackClose}
      />
    </div>
  );
}

function ReceiptRow({
  label,
  value,
  accent,
  color,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  color?: "green" | "yellow";
  icon?: React.ReactNode;
}) {
  const colorStyle = accent
    ? { color: "var(--iverifi-accent)" }
    : color === "green"
    ? { color: "#22c55e" }
    : color === "yellow"
    ? { color: "#fbbf24" }
    : undefined;

  return (
    <div className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground flex items-center" style={colorStyle}>
        {icon}
        {value}
      </span>
    </div>
  );
}
