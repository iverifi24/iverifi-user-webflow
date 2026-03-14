// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyAuu8P-lzzLZoibHOXFwwIZe_fbhve52vY",
//   authDomain: "iverifi-3a911.firebaseapp.com",
//   projectId: "iverifi-3a911",
//   storageBucket: "iverifi-3a911.firebasestorage.app",
//   messagingSenderId: "866886737160",
//   appId: "1:866886737160:web:720ea380e448a5ba8de0bd",
//   measurementId: "G-2Y6X0Q45D5",
// };
const firebaseConfig = {
  apiKey: "AIzaSyCwEuosz3iLj3KMN7KIClAmeKADCTEYPK0",
  authDomain: "iverifi-fdc87.firebaseapp.com",
  projectId: "iverifi-fdc87",
  storageBucket: "iverifi-fdc87.firebasestorage.app",
  messagingSenderId: "45201970430",
  appId: "1:45201970430:web:0ced9f55fd18e9e70b01af",
  measurementId: "G-TEP0H745YS"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Ensure auth state persists across full page reloads (including custom-token sign-ins).
// Export a promise so callers can await persistence before signing in.
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Failed to set Firebase auth persistence:", err);
});
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const messaging = getMessaging(app);

export default app;
