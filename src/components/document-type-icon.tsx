import React from "react";
import { FileText, Globe } from "lucide-react";
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
 * Wraps government brand logos in a white rounded pill so they're legible on any
 * background (including dark mode). Lucide fallback icons inherit current color.
 */
function LogoBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded-lg bg-white px-1.5 py-1 shadow-sm">
      {children}
    </span>
  );
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
    return <LogoBadge><DigiLockerIcon size={size} className="object-contain" /></LogoBadge>;
  }
  if (source === "Parivahan") {
    return <LogoBadge><ParivahanIcon size={size} className="object-contain" /></LogoBadge>;
  }
  if (source === "e-Filing") {
    return <LogoBadge><IncomeTaxIcon size={size} className="object-contain" /></LogoBadge>;
  }
  if (source === "Passport Seva") {
    return <LogoBadge><PassportSevaIcon size={size} className="object-contain" /></LogoBadge>;
  }

  if (source === "Passport Upload") {
    return <Globe className={`h-6 w-6 shrink-0 ${className}`} />;
  }

  // Election Commission, Manual, etc.: fallback
  return <FileText className={`h-6 w-6 shrink-0 ${className}`} />;
}
