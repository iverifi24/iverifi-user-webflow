/** What the user is told when coming back from DigiLocker with `?aadhaar_error=<code>` or `?pan_error=<code>`. */
const MESSAGES: Record<string, string> = {
  digilocker_denied: "You did not allow DigiLocker to share the document.",
  no_pan_in_digilocker: "No PAN card was found in your DigiLocker. Add it there first, or verify another way.",
  aadhaar_not_shared:
    "Aadhaar was not shared. On the DigiLocker screen, tick Aadhaar and allow. If Aadhaar is not listed there, it has not been enabled for iVerifi yet.",
  pan_not_shared:
    "PAN was not shared. On the DigiLocker screen, tick your PAN card and allow. If it is not listed there, it has not been enabled for iVerifi yet.",
  dl_not_shared:
    "Driving licence was not shared. On the DigiLocker screen, tick your driving licence and allow. If it is not listed there, it has not been enabled for iVerifi yet.",
  no_dl_in_digilocker: "No driving licence was found in your DigiLocker. Add it there first, or use the camera scan instead.",
  dl_not_readable: "We could not read your driving licence from DigiLocker.",
  pan_not_readable: "We could not read your PAN from DigiLocker.",
  aadhaar_not_readable: "We could not read your Aadhaar from DigiLocker.",
  pan_on_other_account: "This PAN is already linked to another iVerifi account.",
  save_failed: "Something went wrong while saving your document. Please try again.",
  digilocker_failed: "DigiLocker did not respond. Please try again.",
};

/** "also=pan,aadhaar" from the return url: other documents the user shared in the same visit and that were saved too */
export function alsoSavedMessage(also: string | null): string | null {
  const names = (also ?? "")
    .split(",")
    .map((k) => (k === "aadhaar" ? "Aadhaar" : k === "pan" ? "PAN" : k === "dl" ? "Driving licence" : ""))
    .filter(Boolean);
  return names.length ? `Also added from DigiLocker: ${names.join(" and ")}.` : null;
}

export function digilockerErrorMessage(code: string, label: string): string {
  return MESSAGES[code] ?? `${label} could not be verified through DigiLocker.`;
}
