import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase/firebase_setup";

export const loginWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);

export const signupWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

// Export the Firebase functions directly as requested
export { createUserWithEmailAndPassword, loginWithGoogle };

// export const loginWithApple = () => signInWithPopup(auth, appleProvider);

export const logoutUser = () => signOut(auth);
