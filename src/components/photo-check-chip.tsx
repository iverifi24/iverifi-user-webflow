import { ScanFace } from "lucide-react";

const COPY = {
  match: {
    label: "Photo matches you",
    cls: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300",
    hint: "The photo on this document looks like your live photo.",
  },
  second_check: {
    label: "Photo needs review",
    cls: "bg-amber-500/20 border-amber-400/30 text-amber-300",
    hint: "The photo on this document looks different from your live photo, often because the document photo is old. A staff member may compare it in person.",
  },
  // Worded as "not confirmed", not "does not match": document photos are often years old, small or blurry, so a low score usually means we
  // cannot tell, not that it is someone else. Nothing is blocked.
  no_match: {
    label: "Photo not confirmed",
    cls: "bg-orange-500/20 border-orange-400/30 text-orange-300",
    hint: "We could not confirm that the photo on this document is you. This is common when a document photo is old or unclear, and nothing is blocked. If it is you, you can retake your live photo in good light.",
  },
} as const;

/**
 * Whether the photo on a document looks like the person's live photo (`photo_check` from the credential list). Shown only for the three
 * results a person can act on; "no photo on this document" and "could not be checked" show nothing. Nothing is blocked by it.
 */
export function PhotoCheckChip({ decision, userAnswer }: { decision?: string | null; userAnswer?: boolean | null }) {
  // the person's own answer to "is this you in the document photo?" replaces the unsure result
  if ((decision === "second_check" || decision === "no_match") && userAnswer === true) {
    return (
      <span title="You confirmed this is you in the document photo." className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
        <ScanFace className="h-3 w-3" />
        You confirmed this is you
      </span>
    );
  }
  if ((decision === "second_check" || decision === "no_match") && userAnswer === false) {
    return (
      <span title="You said this is not you in the document photo." className="inline-flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-300">
        <ScanFace className="h-3 w-3" />
        You said this is not you
      </span>
    );
  }
  const c = decision && decision in COPY ? COPY[decision as keyof typeof COPY] : null;
  if (!c) return null;
  return (
    <span title={c.hint} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.cls}`}>
      <ScanFace className="h-3 w-3" />
      {c.label}
    </span>
  );
}
