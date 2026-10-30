import { useEffect } from "react";

/**
 * DigiLocker sends the person back to an https address (the backend only accepts return addresses on an allowed origin).
 * The iVerifi mobile app starts the round trip with this page as the return address, and this page hands the result
 * (`?aadhaar_verified=1`, `?pan_error=...`) back to the app through its own link.
 *
 * Only the query string is passed on, and only to the app's fixed scheme.
 */
const APP_LINK = "iverifi://digilocker-return";

export default function MobileReturn() {
  const target = `${APP_LINK}${window.location.search}`;

  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-base text-[var(--iverifi-text-primary)]">Returning to the iVerifi app…</p>
      <a href={target} className="rounded-xl bg-[var(--iverifi-accent)] px-5 py-3 font-semibold text-white">
        Open the iVerifi app
      </a>
    </div>
  );
}
