/** What the user is told when coming back from DigiLocker with `?aadhaar_error=<code>` or `?pan_error=<code>`. */
const MESSAGES: Record<string, string> = {
  digilocker_denied: "You did not allow DigiLocker to share the document.",
  no_pan_in_digilocker: "No PAN card was found in your DigiLocker. Add it there first, or verify another way.",
  pan_not_readable: "We could not read your PAN from DigiLocker.",
  aadhaar_not_readable: "We could not read your Aadhaar from DigiLocker.",
  pan_on_other_account: "This PAN is already linked to another iVerifi account.",
  save_failed: "Something went wrong while saving your document. Please try again.",
  digilocker_failed: "DigiLocker did not respond. Please try again.",
};

export function digilockerErrorMessage(code: string, label: string): string {
  return MESSAGES[code] ?? `${label} could not be verified through DigiLocker.`;
}
