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
  no_match: {
    label: "Photo does not match",
    cls: "bg-red-500/20 border-red-400/30 text-red-300",
    hint: "The photo on this document does not look like your live photo. If it is you, retake your live photo in good light.",
  },
} as const;

/**
 * Whether the photo on a document looks like the person's live photo (`photo_check` from the credential list). Shown only for the three
 * results a person can act on; "no photo on this document" and "could not be checked" show nothing. Nothing is blocked by it.
 */
export function PhotoCheckChip({ decision }: { decision?: string | null }) {
  const c = decision && decision in COPY ? COPY[decision as keyof typeof COPY] : null;
  if (!c) return null;
  return (
    <span title={c.hint} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.cls}`}>
      <ScanFace className="h-3 w-3" />
      {c.label}
    </span>
  );
}
