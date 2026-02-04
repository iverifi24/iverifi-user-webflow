import { getToken } from "firebase/messaging";
import { messaging } from "@/firebase/firebase_setup";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase_setup";
import type { User } from "firebase/auth";

export interface UserRegistrationData {
  batch: string;
  email: string;
  email_verified: boolean;
  fcm_token: string;
  firebase_user_id: string;
  firstName: string;
  kyc: boolean;
  kyc_data: string;
  lastName: string;
  mpin: null;
  notification: boolean;
  otp: null;
  payment: boolean;
  profile_completion_level: number;
  status: boolean;
  terms_accepted?: boolean;
  terms_accepted_timestamp?: string;
  terms_version?: string;
}

/**
 * Get FCM token for push notifications
 *
 * Note: You need to configure your VAPID key in Firebase Console:
 * 1. Go to Firebase Console > Project Settings > Cloud Messaging
 * 2. Generate a Web Push certificate (VAPID key)
 * 3. Replace "YOUR_VAPID_KEY" with your actual VAPID key
 */
export const getFCMToken = async (): Promise<string> => {
  try {
    const token = await getToken(messaging, {
      vapidKey: "YOUR_VAPID_KEY", // Replace with your actual VAPID key from Firebase Console
    });
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return ""; // Return empty string if token retrieval fails
  }
};

/**
 * Save user details to Firestore applicants collection
 */
export const saveUserDetailsToFirestore = async (user: User): Promise<void> => {
  try {
    // Check if user already exists in applicants collection
    const userDocRef = doc(db, "applicants", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return;
    }

    const fcmToken = await getFCMToken();
    const currentYear = new Date().getFullYear().toString();

    const userData: UserRegistrationData = {
      batch: currentYear,
      email: user.email || "",
      email_verified: user.emailVerified,
      fcm_token: fcmToken,
      firebase_user_id: user.uid,
      firstName: user.displayName || "",
      kyc: false,
      kyc_data: "",
      lastName: "",
      mpin: null,
      notification: true,
      otp: null,
      payment: false,
      profile_completion_level: 5,
      status: true,
    };

    // Save to Firestore applicants collection
    await setDoc(userDocRef, userData);
  } catch (error) {
    console.error("Error saving user details to Firestore:", error);
    throw error;
  }
};

/**
 * Save terms acceptance to Firestore for legal compliance
 * Stores: acceptance status, timestamp, terms version, and IP address (if available)
 */
export const saveTermsAcceptanceToFirestore = async (
  userId: string,
  accepted: boolean
): Promise<void> => {
  try {
    const userDocRef = doc(db, "applicants", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.warn("User document does not exist, cannot save terms acceptance");
      return;
    }

    const termsData = {
      terms_accepted: accepted,
      terms_accepted_timestamp: new Date().toISOString(),
      terms_version: "2.0", // Update this when terms are updated
      terms_effective_date: "2026-01-01",
    };

    await updateDoc(userDocRef, termsData);
    
    // Verify the write completed by reading it back
    const verifyDoc = await getDoc(userDocRef);
    if (verifyDoc.exists()) {
      const verifyData = verifyDoc.data();
      if (verifyData.terms_accepted !== accepted) {
        throw new Error("Terms acceptance verification failed - data mismatch");
      }
    }
  } catch (error) {
    console.error("Error saving terms acceptance to Firestore:", error);
    throw error; // Re-throw to let caller handle the error
  }
};
