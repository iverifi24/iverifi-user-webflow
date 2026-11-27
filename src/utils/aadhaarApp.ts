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
 * (an `intent://` link with the app's package), which does not depend on that domain: the app is opened with the same address, and if the phone finds nothing in the app
 * that takes it, the browser comes back to the page. (Found on a real Android phone, 27-11-2026: with VSign's UAT address the phone did not find a match and went to the fallback,
 * so the address VSign gives in UAT may be only a placeholder; the format the app really takes is in the technical spec UIDAI gives registered OVSEs, not in the public Playbook.) iOS has no such link, so there the person scans the code from another screen. The package is UIDAI's Aadhaar app; it can be
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
    // if the phone finds nothing in the app that takes this request (or the app is not there) the browser comes back to THIS page, which shows the QR and the steps
    // (it does not go to the Play Store: the app is usually installed, and that page only confused people)
    const back = typeof window !== "undefined" && window.location ? `;S.browser_fallback_url=${encodeURIComponent(window.location.href)}` : "";
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${APP_PACKAGE}${back};end`;
  } catch {
    return null;
  }
}

/** just opens the Aadhaar App (its home screen) on this Android phone, no request attached: for when the app does not take the request address, the person then taps Scan QR */
export function aadhaarAppLaunchLink(): string | null {
  if (!isAndroidBrowser()) return null;
  const fallback = encodeURIComponent(`https://play.google.com/store/apps/details?id=${APP_PACKAGE}`);
  return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${APP_PACKAGE};S.browser_fallback_url=${fallback};end`;
}
