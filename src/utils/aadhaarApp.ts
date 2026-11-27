/**
 * Aadhaar through the Aadhaar App (offline verification). Any screen that verifies a document calls this when the server's route for Aadhaar starts with
 * "ovse"; the dialog (components/aadhaar-app-dialog.tsx, mounted once in App.tsx) listens and runs the whole thing: ask for the QR, open the Aadhaar App,
 * wait for the result, refresh the documents.
 */

export const AADHAAR_APP_EVENT = "iverifi:aadhaar-app";

export type AadhaarAppRequest = {
  /** another way to verify Aadhaar, offered when this one fails (for example the camera scan) */
  alternate?: { label: string; run: () => void };
  /** called after the Aadhaar is saved */
  onVerified?: () => void;
};

export function openAadhaarApp(request: AadhaarAppRequest = {}): void {
  window.dispatchEvent(new CustomEvent<AadhaarAppRequest>(AADHAAR_APP_EVENT, { detail: request }));
}

/**
 * There is no link that opens the Aadhaar App for the person: the address VSign returns (https://maadhaar.com/getIntent?value=...) is on a domain that is not UIDAI's (it is
 * parked and for sale), and an Android intent to the app's package found nothing in the app that takes it (tried on a real phone, 27-11-2026). So the way is the QR: on a phone
 * the person saves it and picks it from the gallery in the Aadhaar App, and a person without the app is shown where to install it. The package is UIDAI's Aadhaar app; it
 * can be changed with VITE_AADHAAR_APP_PACKAGE.
 */
const APP_PACKAGE = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AADHAAR_APP_PACKAGE || "in.gov.uidai.pehchaan";

export const isAndroidBrowser = (): boolean => typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

/** where to install the Aadhaar App on this device (Android: its Play Store page); null where we have no verified address (the screen then says what to search for) */
export function aadhaarAppStoreLink(): string | null {
  return isAndroidBrowser() ? `https://play.google.com/store/apps/details?id=${APP_PACKAGE}` : null;
}
