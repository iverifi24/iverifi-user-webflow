import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { guestCheckin } from "@/utils/connectionFlow";
import { Button } from "@/components/ui/button";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HotelBadge } from "@/components/hotel-badge";
import { FeedbackModal } from "@/components/feedback-modal";
import { CheckCircle2, ShieldCheck, Check, Clock, Ticket, Building2 } from "lucide-react";
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
  const docLabel = credential ? (DOC_LABELS[credential.document_type] ?? credential.document_type) : "Govt ID Document";
  const isApproved = checkInResult === "approved";
  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const passId = connectionId ? connectionId.slice(-8).toUpperCase() : "IV-" + Math.floor(100000 + Math.random() * 900000);

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

        {/* Success Pass Card */}
        <div className="w-full rounded-3xl border border-border/80 bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col items-center gap-5">
          
          {/* Animated Glow Icon */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
              <Ticket className="w-3 h-3" /> Digital Entry Pass
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {isApproved ? "Verification Confirmed!" : "Request Submitted!"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isApproved
                ? "Your visitor check-in is complete and verified. You're all set to enter."
                : "Your verification request has been received and is awaiting front desk confirmation."}
            </p>
          </div>

          {/* Ticket / Pass Container */}
          <div className="w-full rounded-2xl border border-border/70 bg-muted/30 divide-y divide-border/60 text-left p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--iverifi-accent)] shrink-0" />
                <span className="text-xs text-muted-foreground">Location</span>
              </div>
              <span className="text-xs font-bold text-foreground max-w-[160px] truncate text-right">
                {hotelName}
              </span>
            </div>

            <div className="pt-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pass Reference</span>
              <span className="text-xs font-mono font-bold tracking-wider text-[var(--iverifi-accent)]">
                #{passId}
              </span>
            </div>

            <div className="pt-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Verified ID</span>
              <span className="text-xs font-semibold text-foreground">
                {docLabel}
              </span>
            </div>

            <div className="pt-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className={`text-xs font-bold flex items-center gap-1 ${isApproved ? "text-emerald-500" : "text-amber-500"}`}>
                {isApproved ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {isApproved ? "Approved & Verified" : "Pending Check"}
              </span>
            </div>

            <div className="pt-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Timestamp</span>
              <span className="text-xs text-muted-foreground font-medium">
                {today} at {now}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--iverifi-accent)] shrink-0" />
            <span>
              Organization received only <strong>verification confirmation</strong>, not your document copy.
            </span>
          </div>

          <Button
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-bold dark:shadow-[0_0_24px_rgba(0,224,255,0.3)] hover:from-[#40e8ff] hover:to-[#9274ff] transition-all cursor-pointer"
            onClick={handleDone}
          >
            Back to Home
          </Button>

          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors cursor-pointer"
            onClick={() => setFeedbackOpen(true)}
          >
            Rate your check-in experience
          </button>
        </div>
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
