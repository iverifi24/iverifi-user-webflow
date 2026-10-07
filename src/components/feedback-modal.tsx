import { useState } from "react";
import { useSubmitFeedbackMutation } from "@/redux/api";
import { toast } from "sonner";
import { Star, MessageSquare } from "lucide-react";

interface FeedbackModalProps {
  open: boolean;
  credentialRequestId: string;
  hotelName: string;
  onClose: () => void;
}

const LABELS = ["Poor", "Fair", "Okay", "Good", "Excellent"];

export function FeedbackModal({ open, credentialRequestId, hotelName, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [submitFeedback, { isLoading }] = useSubmitFeedbackMutation();

  if (!open) return null;

  const active = hovered || rating;

  const handleSubmit = async () => {
    if (!rating) return;
    try {
      await submitFeedback({
        credential_request_id: credentialRequestId,
        rating,
        feedback_message: message.trim() || undefined,
      }).unwrap();
      toast.success("Thanks for your feedback!");
      onClose();
    } catch (e: any) {
      // If already submitted just close silently
      if (e?.status === 409) { onClose(); return; }
      toast.error("Could not save feedback. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10200] flex items-end sm:items-center sm:justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-2xl border border-[var(--iverifi-sheet-border)] bg-[var(--iverifi-sheet,#0f172a)] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-5 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle for mobile */}
        <div className="w-10 h-1 rounded-full bg-[var(--iverifi-sheet-handle,#334155)] mx-auto mb-5 sm:hidden" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(0,224,255,0.15)]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            How was your verification experience?
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Rate your iVerifi digital verification at <span className="text-foreground font-medium">{hotelName || "this organization"}</span>
          </p>
        </div>

        {/* Star Rating */}
        <div className="flex justify-center items-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= active;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="p-2 rounded-xl transition-all duration-150 transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    isFilled
                      ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                      : "text-slate-600 fill-transparent hover:text-slate-400"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Sentiment Label */}
        <div className="text-center text-sm font-semibold text-cyan-400 h-6 mb-4 transition-all">
          {active ? LABELS[active - 1] : ""}
        </div>

        {/* Optional message */}
        <div className="mb-5">
          <textarea
            placeholder="Share your thoughts or suggestions... (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={400}
            rows={3}
            className="w-full rounded-xl bg-slate-900/60 border border-slate-800 p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 resize-none transition"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={!rating || isLoading}
            onClick={handleSubmit}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-slate-950 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] shadow-[0_0_20px_rgba(0,224,255,0.25)] hover:from-[#40e8ff] hover:to-[#9274ff] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? "Submitting…" : "Submit feedback →"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 transition cursor-pointer"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
