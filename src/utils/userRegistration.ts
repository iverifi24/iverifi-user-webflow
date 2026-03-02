import { getToken } from "firebase/messaging";
import { messaging } from "@/firebase/firebase_setup";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
 * Get FCM token for push notifications.
 * Returns "" if permission is denied/blocked or token fails — never blocks or throws.
 *
 * Configure VAPID key in Firebase Console > Project Settings > Cloud Messaging (Web Push certificate).
 */
export const getFCMToken = async (): Promise<string> => {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      return "";
    }
    const token = await getToken(messaging, {
      vapidKey: "YOUR_VAPID_KEY", // Replace with your actual VAPID key from Firebase Console
    });
    return token ?? "";
  } catch {
    return "";
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

    const fcmToken = await getFCMToken().catch(() => "");
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
 * Save terms acceptance to Firestore for legal compliance.
 * Uses setDoc with merge so terms are saved even when the applicant doc does not exist yet
 * (e.g. user went accept-terms → complete-profile before signup created the doc).
 */
export const saveTermsAcceptanceToFirestore = async (
  userId: string,
  accepted: boolean
): Promise<void> => {
  try {
    const userDocRef = doc(db, "applicants", userId);

    const termsData = {
      terms_accepted: accepted,
      terms_accepted_timestamp: new Date().toISOString(),
      terms_version: "2.0",
      terms_effective_date: "2026-01-01",
      firebase_user_id: userId,
    };

    await setDoc(userDocRef, termsData, { merge: true });

    const verifyDoc = await getDoc(userDocRef);
    if (verifyDoc.exists()) {
      const verifyData = verifyDoc.data();
      if (verifyData.terms_accepted !== accepted) {
        throw new Error("Terms acceptance verification failed - data mismatch");
      }
    }
  } catch (error) {
    console.error("Error saving terms acceptance to Firestore:", error);
    throw error;
  }
};
