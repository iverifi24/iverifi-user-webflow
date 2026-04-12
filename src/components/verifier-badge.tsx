import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DigiLockerIcon } from "@/components/digilocker-icon";
import { ParivahanIcon } from "@/components/parivahan-icon";
import { IncomeTaxIcon } from "@/components/income-tax-icon";
import { PassportSevaIcon } from "@/components/passport-seva-icon";
import { getVerificationSource } from "@/utils/verificationSource";

interface VerifierBadgeProps {
  /** document_type from credential (e.g. AADHAAR_CARD, PAN_CARD, DRIVING_LICENSE). */
  documentType: string;
  className?: string;
  /** Icon height in px when showing verifier logo. */
  iconSize?: number;
}

const DEFAULT_ICON_SIZE = 16;

/**
 * Shows "Verified" with the correct verifier for the document:
 * DigiLocker (Aadhaar), Parivahan (DL), e-Filing (PAN), or text for others.
 */
export function VerifierBadge({
  documentType,
  className = "",
  iconSize = DEFAULT_ICON_SIZE,
}: VerifierBadgeProps) {
  const source = getVerificationSource(documentType);

  // PAN → e-Filing; DL → Parivahan; Aadhaar → DigiLocker; Passport → Passport Seva
  const VerifierLogo =
    source === "e-Filing"
      ? () => <IncomeTaxIcon size={iconSize} className="shrink-0 opacity-90" />
      : source === "Parivahan"
        ? () => <ParivahanIcon size={iconSize} className="shrink-0 opacity-90" />
        : source === "DigiLocker"
          ? () => <DigiLockerIcon size={iconSize} className="shrink-0 opacity-90" />
          : source === "Passport Seva"
            ? () => <PassportSevaIcon size={iconSize} className="shrink-0 opacity-90" />
            : null;

  return (
    <Badge
      className={`bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-[rgba(0,200,150,0.14)] dark:text-[#00c896] dark:border-[rgba(0,200,150,0.35)] shadow-none gap-1 px-2 py-0.5 ${className}`}
    >
      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs font-semibold">Verified</span>
      {VerifierLogo ? (
        <VerifierLogo />
      ) : (
        <span className="text-[10px] font-medium opacity-95">by {source}</span>
      )}
    </Badge>
  );
}
