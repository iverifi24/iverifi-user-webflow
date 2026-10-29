import { Car, CreditCard, FileBadge, FileText, Plane, Smartphone, Vote } from "lucide-react";

interface DocumentTypeIconProps {
  /** document_type (e.g. AADHAAR_CARD, DRIVING_LICENSE, PAN_CARD, PASSPORT, FAMILY_DL). */
  documentType: string;
  /** Optional class for the icon (e.g. text color). */
  className?: string;
  /** Kept so existing callers keep compiling; the icons are a fixed size. */
  size?: number;
}

/**
 * A neutral icon for the KIND of document. It deliberately carries no government logo: a Parivahan or Income Tax logo on a
 * card would say that body verified it, and that is only true of what `VerifierBadge` reports from the credential.
 */
export function DocumentTypeIcon({ documentType, className = "" }: DocumentTypeIconProps) {
  const t = String(documentType || "").toUpperCase().replace(/^FAMILY_/, "");
  const cls = `h-6 w-6 shrink-0 ${className}`;
  if (t.includes("AADHAAR")) return <CreditCard className={cls} />;
  if (t.includes("DRIVING") || t === "DL") return <Car className={cls} />;
  if (t.includes("PAN")) return <FileBadge className={cls} />;
  if (t.includes("PASSPORT")) return <Plane className={cls} />;
  if (t.includes("VOTER")) return <Vote className={cls} />;
  if (t.includes("MOBILE")) return <Smartphone className={cls} />;
  return <FileText className={cls} />;
}
