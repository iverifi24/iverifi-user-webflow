import { useContext } from "react";
import { CheckinStepContext } from "./checkin-step-context";

/** Small pill shown at the top of each step card: "Step 2 of 4 · Verify ID" */
export function StepPill() {
  const { index, labels } = useContext(CheckinStepContext);
  if (index < 0 || index >= labels.length) return null;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--iverifi-accent)] mb-2">
      Step {index + 1} of {labels.length} · {labels[index]}
    </div>
  );
}

/** Segmented progress bar pinned to the top of the flow */
export function StepProgressBar() {
  const { index, labels } = useContext(CheckinStepContext);
  if (index < 0 || labels.length === 0) return null;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 mx-auto flex max-w-[420px] gap-1 px-1 pt-1"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={labels.length}
      aria-valuenow={index + 1}
      aria-label={`Step ${index + 1} of ${labels.length}: ${labels[index]}`}
    >
      {labels.map((label, i) => (
        <div key={label} className="h-1 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#00E5C3] to-[#6C63FF] transition-all duration-500"
            style={{ width: i < index ? "100%" : i === index ? "50%" : "0%" }}
          />
        </div>
      ))}
    </div>
  );
}
