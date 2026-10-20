/**
 * Honest labels for how a document is verified.
 *
 *  - ISSUER is a fact about the document: which authority issues a driving licence, PAN card and so on.
 *    It is always shown as "Issued by …" and never as the thing that verified it.
 *  - The VERIFIER is whatever actually did the check. For a verified document that is `credential.verified_via`
 *    (set by the server from what really verified it). For one not yet verified it is the first method the server
 *    currently offers for that document (`GET /users/verification/routes`), so the screen names what the tap will use.
 *
 * Never name a government system (Parivahan, e-Filing, Passport Seva…) as the verifier unless it is the one in use.
 */

export type VerifyMethod = "digilocker" | "kwik";

export const METHOD_LABEL: Record<VerifyMethod, string> = {
  digilocker: "DigiLocker",
  kwik: "iVerifi", // the camera scan is shown as iVerifi's own check; the scan partner is never named in the app
};

const ISSUER: Record<string, string> = {
  AADHAAR_CARD: "UIDAI",
  DRIVING_LICENSE: "State Transport Department (MoRTH)",
  PAN_CARD: "Income Tax Department",
  PASSPORT: "Ministry of External Affairs",
  FAMILY_AADHAAR: "UIDAI",
  FAMILY_DL: "State Transport Department (MoRTH)",
  FAMILY_PAN: "Income Tax Department",
  FAMILY_PASSPORT: "Ministry of External Affairs",
};

/** the authority that issues this kind of document, or null when unknown */
export function getIssuer(documentType: string | undefined): string | null {
  return (documentType && ISSUER[documentType.toUpperCase()]) || null;
}

/** server answer of GET /users/verification/routes: { AADHAAR_CARD: ["digilocker","kwik"], ... } */
export type VerificationRoutes = Record<string, VerifyMethod[]> | undefined;

/** family documents follow the route of the same document */
const ROUTE_KEY: Record<string, string> = {
  FAMILY_AADHAAR: "AADHAAR_CARD",
  FAMILY_DL: "DRIVING_LICENSE",
  FAMILY_PAN: "PAN_CARD",
  FAMILY_PASSPORT: "PASSPORT",
};

/**
 * Ways this document can be verified right now, preferred first. While the routes have not loaded (or the call failed) the
 * app falls back to Kwik, which always works, so nobody is stuck.
 */
export function methodsFor(routes: VerificationRoutes, documentType: string): VerifyMethod[] {
  const key = ROUTE_KEY[documentType] ?? documentType;
  const list = routes?.[key];
  return Array.isArray(list) ? list : routes ? [] : ["kwik"];
}

const isAadhaar = (documentType?: string | null) => /aadhaar/i.test(documentType ?? "");

/**
 * What to call a way of verifying, for this kind of document. Aadhaar is always checked through DigiLocker (the camera partner's
 * Aadhaar flow runs through it), so for Aadhaar the answer is "DigiLocker" whichever way it was started.
 */
export function labelForMethod(method: VerifyMethod, documentType?: string | null): string {
  return method === "kwik" && isAadhaar(documentType) ? "DigiLocker" : METHOD_LABEL[method];
}

/** "DigiLocker" / "iVerifi" for the method a tap will use, or null when none is available */
export function providerLabel(methods: VerifyMethod[], documentType?: string | null): string | null {
  return methods.length ? labelForMethod(methods[0], documentType) : null;
}

/** `verified_via` from the credential, as shown to people; null when the server does not know */
export function verifiedViaLabel(verifiedVia: string | null | undefined, documentType?: string | null): string | null {
  if (!verifiedVia) return null;
  // the stored value names the camera-scan vendor; people are shown DigiLocker for Aadhaar (it runs through it) and iVerifi otherwise
  if (verifiedVia === "Kwik") return isAadhaar(documentType) ? "DigiLocker" : "iVerifi";
  return ["DigiLocker", "iVerifi"].includes(verifiedVia) ? verifiedVia : null;
}
