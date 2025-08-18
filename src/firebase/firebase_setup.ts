// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAuu8P-lzzLZoibHOXFwwIZe_fbhve52vY",
  authDomain: "iverifi-3a911.firebaseapp.com",
  projectId: "iverifi-3a911",
  storageBucket: "iverifi-3a911.firebasestorage.app",
  messagingSenderId: "866886737160",
  appId: "1:866886737160:web:720ea380e448a5ba8de0bd",
  measurementId: "G-2Y6X0Q45D5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;
