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
