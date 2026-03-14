import { FileText } from "lucide-react";
import { DigiLockerIcon } from "@/components/digilocker-icon";
import { ParivahanIcon } from "@/components/parivahan-icon";
import { IncomeTaxIcon } from "@/components/income-tax-icon";
import { PassportSevaIcon } from "@/components/passport-seva-icon";
import { getVerificationSource } from "@/utils/verificationSource";

interface DocumentTypeIconProps {
  /** document_type (e.g. AADHAAR_CARD, DRIVING_LICENSE, PAN_CARD, PASSPORT). */
  documentType: string;
  /** Optional class for the icon (e.g. text color). Size is fixed for consistency. */
  className?: string;
  /** Height in px for official logos; Lucide icons use h-6 w-6. */
  size?: number;
}

/**
 * Renders the official verifier/source icon for a document type where we have one
 * (DigiLocker, Parivahan, Income Tax), and a neutral icon otherwise (Passport → Globe).
 * Use on document cards to show authenticity at a glance.
 */
export function DocumentTypeIcon({
  documentType,
  className = "",
  size = 28,
}: DocumentTypeIconProps) {
  const source = getVerificationSource(documentType);

  if (source === "DigiLocker") {
    return <DigiLockerIcon size={size} className={`object-contain ${className}`} />;
  }
  if (source === "Parivahan") {
    return <ParivahanIcon size={size} className={`object-contain ${className}`} />;
  }
  if (source === "e-Filing") {
    return <IncomeTaxIcon size={size} className={`object-contain ${className}`} />;
  }
  if (source === "Passport Seva") {
    return <PassportSevaIcon size={size} className={`object-contain ${className}`} />;
  }

  // Election Commission, Manual, etc.: fallback
  return <FileText className={`h-6 w-6 shrink-0 ${className}`} />;
}
