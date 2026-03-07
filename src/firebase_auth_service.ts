import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { auth, googleProvider } from "./firebase/firebase_setup";

export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signupWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

export { createUserWithEmailAndPassword, loginWithGoogle };

export const logoutUser = () => signOut(auth);

/** Create a RecaptchaVerifier bound to a container element (use invisible for better UX). */
export function getRecaptchaVerifier(containerIdOrElement: string | HTMLElement) {
  if (typeof window === "undefined") throw new Error("RecaptchaVerifier requires browser");
  const existing = (window as unknown as { __recaptchaVerifier?: RecaptchaVerifier }).__recaptchaVerifier;
  if (existing) {
    try {
      existing.clear?.();
    } catch {
      // ignore
    }
    (window as unknown as { __recaptchaVerifier?: RecaptchaVerifier }).__recaptchaVerifier = undefined;
  }
  const container =
    typeof containerIdOrElement === "string"
      ? document.getElementById(containerIdOrElement)
      : containerIdOrElement;
  if (!container) throw new Error("Recaptcha container not found");
  const verifier = new RecaptchaVerifier(auth, container, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {},
  });
  (window as unknown as { __recaptchaVerifier?: RecaptchaVerifier }).__recaptchaVerifier = verifier;
  return verifier;
}

/** Send OTP to phone number (E.164). Returns confirmation result to pass to confirmPhoneCode. */
export async function sendPhoneOtp(
  phoneNumberE164: string,
  recaptchaContainerIdOrElement: string | HTMLElement
): Promise<ConfirmationResult> {
  const verifier = getRecaptchaVerifier(recaptchaContainerIdOrElement);
  return signInWithPhoneNumber(auth, phoneNumberE164, verifier);
}

/** Complete phone sign-in with the 6-digit code from SMS. */
export function confirmPhoneCode(confirmationResult: ConfirmationResult, code: string) {
  return confirmationResult.confirm(code);
}

export type { ConfirmationResult };
