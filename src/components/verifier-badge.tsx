import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DigiLockerIcon } from "@/components/digilocker-icon";
import { verifiedViaLabel } from "@/utils/verificationSource";

interface VerifierBadgeProps {
  /** `verified_via` of the credential: what actually verified it (DigiLocker, Kwik, iVerifi). */
  verifiedVia?: string | null;
  /** the kind of document, so Aadhaar is shown as verified through DigiLocker whichever way it was started */
  documentType?: string | null;
  className?: string;
  /** Icon height in px when showing the DigiLocker logo. */
  iconSize?: number;
}

const DEFAULT_ICON_SIZE = 16;

/**
 * "Verified" plus what verified it. The label comes from the credential itself, never from the document type, so a
 * driving licence approved in DigiLocker says DigiLocker. The DigiLocker logo is shown only for DigiLocker; when the
 * server does not know, the badge just says "Verified".
 */
export function VerifierBadge({ verifiedVia, documentType, className = "", iconSize = DEFAULT_ICON_SIZE }: VerifierBadgeProps) {
  const via = verifiedViaLabel(verifiedVia, documentType);
  return (
    <Badge
      className={`bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-[rgba(0,200,150,0.14)] dark:text-[#00c896] dark:border-[rgba(0,200,150,0.35)] shadow-none gap-1 px-2 py-0.5 ${className}`}
    >
      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs font-semibold">Verified</span>
      {via === "DigiLocker" ? (
        <DigiLockerIcon size={iconSize} className="shrink-0 opacity-90" />
      ) : via ? (
        <span className="text-[10px] font-medium opacity-95">via {via}</span>
      ) : null}
    </Badge>
  );
}
