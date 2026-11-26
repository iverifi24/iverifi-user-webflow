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
 * Opening the Aadhaar App from the same phone. VSign's own link (https://maadhaar.com/getIntent?value=...) is NEVER used as a link: maadhaar.com is not UIDAI's
 * domain (it is parked and for sale), so a browser that follows it ends on a "buy this domain" page. On Android a browser link may instead name the app itself
 * (an `intent://` link with the app's package), which does not depend on that domain: the app is opened with the same address, and if it is not installed the browser
 * goes to the app's Play Store page. iOS has no such link, so there the person scans the code from another screen. The package is UIDAI's Aadhaar app; it can be
 * changed with VITE_AADHAAR_APP_PACKAGE if UIDAI or VSign name another one.
 */
const APP_PACKAGE = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AADHAAR_APP_PACKAGE || "in.gov.uidai.pehchaan";

export const isAndroidBrowser = (): boolean => typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

/** the link that opens the Aadhaar App on this Android phone, or null (not Android, or not an address we can use) */
export function aadhaarAppLink(qrUrl: string | null | undefined): string | null {
  if (!qrUrl || !isAndroidBrowser()) return null;
  try {
    const u = new URL(qrUrl);
    if (u.protocol !== "https:") return null;
    const fallback = encodeURIComponent(`https://play.google.com/store/apps/details?id=${APP_PACKAGE}`);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${APP_PACKAGE};S.browser_fallback_url=${fallback};end`;
  } catch {
    return null;
  }
}
