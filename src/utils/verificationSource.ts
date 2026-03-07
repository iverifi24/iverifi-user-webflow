/**
 * Maps document_type to the government/source verifier name for display.
 * Aligns with backend getVerificationSource (hotelAdminControllers).
 * Used to show the correct verifier per ID (DigiLocker, Parivahan, e-Filing, etc.).
 */
const SOURCE_MAP: Record<string, string> = {
  aadhaar_card: "DigiLocker",
  AADHAAR_CARD: "DigiLocker",
  "Child 1 Aadhaar": "DigiLocker",
  "Child 2 Aadhaar": "DigiLocker",
  "Child 3 Aadhaar": "DigiLocker",
  pan_card: "e-Filing",
  PAN_CARD: "e-Filing",
  passport: "Passport Seva",
  PASSPORT: "Passport Seva",
  driving_license: "Parivahan",
  DRIVING_LICENSE: "Parivahan",
  voter_id: "Election Commission",
  VOTER_ID: "Election Commission",
};

export type VerifierKey = "DigiLocker" | "e-Filing" | "Parivahan" | "Passport Seva" | "Election Commission" | "Manual";

/**
 * Returns the display verifier name for a document type.
 * Credential may have verifiers_name from API (e.g. Kwik); we map by document_type to govt source.
 */
export function getVerificationSource(documentType: string | undefined): string {
  if (!documentType) return "Manual Verification";
  return SOURCE_MAP[documentType] ?? "Manual Verification";
}

/** Whether we have a logo for this verifier. */
export function verifierHasLogo(verifierName: string): boolean {
  return verifierName === "DigiLocker" || verifierName === "Parivahan" || verifierName === "e-Filing";
}
