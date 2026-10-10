import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { guestCheckin } from "@/utils/connectionFlow";
import { useGetConnectionsQuery } from "@/redux/api";
import { Button } from "@/components/ui/button";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HotelBadge } from "@/components/hotel-badge";
import { FeedbackModal } from "@/components/feedback-modal";
import { CheckCircle2, ShieldCheck, Check, Clock, Ticket, Building2, XCircle, Loader2 } from "lucide-react";
import type { FlowCredential } from "./guest-checkin-flow";

const DOC_LABELS: Record<string, string> = {
  AADHAAR_CARD: "Aadhaar Card",
  DRIVING_LICENSE: "Driving Licence",
  PAN_CARD: "PAN Card",
  PASSPORT: "Passport",
  FOREIGN_PASSPORT: "Foreign Passport",
};

/** How often to re-check a pending request while the visitor waits at the desk */
const APPROVAL_POLL_MS = 5000;

type LiveStatus = "approved" | "pending" | "rejected";

/** The fields of a credential request (from listOfCredentialsRequest) this screen reads */
interface ConnectionRequestStatus {
  id?: string;
  recipient_id?: string;
  check_in_time?: number | string | null;
  check_in_status?: string | null;
}

interface Props {
  hotelName: string;
  hotelLogoUrl?: string | null;
  hotelCode: string;
  /** Who to ask for help at this venue, e.g. "the front desk" */
  staffTerm: string;
  /** "check-in" or "visit" */
  actionNoun: string;
  credential: FlowCredential | null;
  checkInResult: "approved" | "pending" | null;
  connectionId: string;
  onDone: () => void;
}

export default function GuestConfirmation({
  hotelName,
  hotelLogoUrl,
  hotelCode,
  staffTerm,
  actionNoun,
  credential,
  checkInResult,
  connectionId,
  onDone,
}: Props) {
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // true when feedback was opened by "Done", so closing it should leave this screen
  const [leaveAfterFeedback, setLeaveAfterFeedback] = useState(false);
  const docLabel = credential ? (DOC_LABELS[credential.document_type] ?? credential.document_type) : "Govt ID Document";
  const startedPending = checkInResult !== "approved";

  // While the request is pending, keep checking the visitor's connections so the
  // screen flips to approved (or declined) the moment the venue acts on it.
  const { data: connectionsData } = useGetConnectionsQuery(undefined, {
    skip: !startedPending || !connectionId,
    pollingInterval: APPROVAL_POLL_MS,
    skipPollingIfUnfocused: true,
  });

  const liveStatus: LiveStatus = useMemo(() => {
    if (!startedPending) return "approved";
    const requests: ConnectionRequestStatus[] = connectionsData?.data?.requests ?? [];
    const req =
      requests.find((r) => r?.id === connectionId) ??
      (hotelCode ? requests.find((r) => r?.recipient_id === hotelCode) : undefined);
    if (!req) return "pending";
    if (req.check_in_time) return "approved";
    if (req.check_in_status === "rejected") return "rejected";
    return "pending";
  }, [startedPending, connectionsData, connectionId, hotelCode]);

  const isApproved = liveStatus === "approved";
  const isRejected = liveStatus === "rejected";
  const isPending = liveStatus === "pending";

  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const passId = connectionId ? connectionId.slice(-8).toUpperCase() : "IV-" + Math.floor(100000 + Math.random() * 900000);

  const finish = () => {
    guestCheckin.clear();
    onDone();
    navigate("/");
  };

  // Ask for feedback after the visitor is done, not on top of the result they may need to show
  const handleDone = () => {
    if (isApproved) {
      setLeaveAfterFeedback(true);
      setFeedbackOpen(true);
    } else {
      finish();
    }
  };

  const handleFeedbackClose = () => {
    setFeedbackOpen(false);
    if (leaveAfterFeedback) finish();
  };

  const statusTone = isApproved
    ? {
        ring: "bg-emerald-500/15 border-emerald-500/30 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)]",
        pill: "bg-emerald-500/15 border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
        text: "text-emerald-500",
      }
    : isRejected
      ? {
          ring: "bg-rose-500/15 border-rose-500/30 text-rose-500",
          pill: "bg-rose-500/15 border-rose-500/25 text-rose-600 dark:text-rose-400",
          text: "text-rose-500",
        }
      : {
          ring: "bg-amber-500/15 border-amber-500/30 text-amber-500",
          pill: "bg-amber-500/15 border-amber-500/25 text-amber-600 dark:text-amber-400",
          text: "text-amber-500",
        };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-5 text-center">
        <div className="flex justify-center"><IverifiLogo /></div>
        <HotelBadge name={hotelName} logoUrl={hotelLogoUrl} />

        <div className="w-full rounded-3xl border border-border/80 bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col items-center gap-5">

          <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${statusTone.ring}`}>
            {isApproved ? <CheckCircle2 className="w-9 h-9" /> : isRejected ? <XCircle className="w-9 h-9" /> : <Clock className="w-9 h-9" />}
          </div>

          <div>
            <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${statusTone.pill}`}>
              {isApproved ? (
                <><Ticket className="w-3 h-3" /> Digital Entry Pass</>
              ) : isRejected ? (
                <><XCircle className="w-3 h-3" /> Request declined</>
              ) : (
                <><Loader2 className="w-3 h-3 animate-spin" /> Waiting for approval</>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {isApproved ? "Verification confirmed" : isRejected ? "Request declined" : "Request sent"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isApproved
                ? `Your ${actionNoun} is complete and verified. You're all set.`
                : isRejected
                  ? `${hotelName} declined this request. Please speak to ${staffTerm}.`
                  : `${hotelName} is reviewing your request. This screen updates automatically once it is approved.`}
            </p>
          </div>

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
              <span className="text-xs text-muted-foreground">Reference</span>
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
              <span className={`text-xs font-bold flex items-center gap-1 ${statusTone.text}`}>
                {isApproved ? <Check className="w-3.5 h-3.5" /> : isRejected ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {isApproved ? "Approved & Verified" : isRejected ? "Declined" : "Awaiting approval"}
              </span>
            </div>

            <div className="pt-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Submitted</span>
              <span className="text-xs text-muted-foreground font-medium">
                {today} at {now}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--iverifi-accent)] shrink-0" />
            <span>Shared with {hotelName} only for this {actionNoun}, with your consent.</span>
          </div>

          <Button
            variant={isPending ? "outline" : "brand"}
            className="w-full h-12 rounded-2xl font-bold cursor-pointer"
            onClick={handleDone}
          >
            {isPending ? "Back to Home" : "Done"}
          </Button>

          {isPending && (
            <p className="-mt-2 text-[11px] text-muted-foreground">
              You can also follow this request later under Shared With.
            </p>
          )}

          {isApproved && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors cursor-pointer"
              onClick={() => setFeedbackOpen(true)}
            >
              Rate your {actionNoun} experience
            </button>
          )}
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
