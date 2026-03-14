import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  signInWithCustomToken,
} from "firebase/auth";
import { auth, googleProvider, authPersistenceReady } from "./firebase/firebase_setup";

export const loginWithEmail = async (email: string, password: string) => {
  await authPersistenceReady;
  return signInWithEmailAndPassword(auth, email, password);
};

export const signupWithEmail = async (email: string, password: string) => {
  await authPersistenceReady;
  return createUserWithEmailAndPassword(auth, email, password);
};

const loginWithGoogle = async () => {
  await authPersistenceReady;
  return signInWithPopup(auth, googleProvider);
};

export { createUserWithEmailAndPassword, loginWithGoogle };

export const logoutUser = () => signOut(auth);

/** Sign in to Firebase Auth using a custom token returned by the backend (for phone OTP via 2Factor). */
export const signInWithFirebaseCustomToken = async (token: string) => {
  await authPersistenceReady;
  return signInWithCustomToken(auth, token);
};
