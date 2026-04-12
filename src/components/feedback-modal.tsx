import { useState } from "react";
import { useSubmitFeedbackMutation } from "@/redux/api";
import { toast } from "sonner";

interface FeedbackModalProps {
  open: boolean;
  credentialRequestId: string;
  hotelName: string;
  onClose: () => void;
}

const EMOJI = ["😞", "😕", "😐", "😊", "🤩"];
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
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--iverifi-overlay)",
        backdropFilter: "blur(4px)",
        zIndex: 10200,
        display: "flex",
        alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          background: "var(--iverifi-sheet)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid var(--iverifi-sheet-border)",
          borderBottom: "none",
          padding: "8px 20px calc(88px + env(safe-area-inset-bottom,0px))",
          animation: "slide-up .3s cubic-bezier(.34,1.56,.64,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--iverifi-sheet-handle)", margin: "0 auto 22px" }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>
            {active ? EMOJI[active - 1] : "⭐"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--iverifi-text-primary)" }}>
            How was the check-in experience?
          </div>
          <div style={{ fontSize: 13, color: "var(--iverifi-label)", marginTop: 4 }}>
            Rate your iVerifi check-in at {hotelName}
          </div>
        </div>

        {/* Stars */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                fontSize: 36,
                lineHeight: 1,
                transition: "transform 0.15s",
                transform: star <= active ? "scale(1.15)" : "scale(1)",
                filter: star <= active ? "none" : "grayscale(1) opacity(0.35)",
              }}
              aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            >
              ⭐
            </button>
          ))}
        </div>

        {/* Label */}
        <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--iverifi-accent)", minHeight: 20, marginBottom: 16 }}>
          {active ? LABELS[active - 1] : ""}
        </div>

        {/* Optional message */}
        <textarea
          placeholder="Anything we can improve? (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={400}
          rows={3}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--iverifi-muted-surface)",
            border: "1.5px solid var(--iverifi-border-subtle)",
            color: "var(--iverifi-text-primary)",
            fontSize: 14,
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            disabled={!rating || isLoading}
            onClick={handleSubmit}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: 14,
              background: "linear-gradient(135deg,#00e0ff,#7B5CF5)",
              border: "none",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: rating && !isLoading ? "pointer" : "not-allowed",
              opacity: rating && !isLoading ? 1 : 0.4,
            }}
          >
            {isLoading ? "Submitting…" : "Submit feedback →"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: "var(--iverifi-muted-surface)",
              border: "1px solid var(--iverifi-border-subtle)",
              color: "var(--iverifi-label)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
