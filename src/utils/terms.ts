import { saveTermsAcceptanceToFirestore } from "./userRegistration";
import { auth, db } from "@/firebase/firebase_setup";
import { doc, getDoc } from "firebase/firestore";

/**
 * Check if the user has accepted the terms and conditions from the database
 * Database is the only source of truth - no localStorage to prevent manipulation
 * @param {string} userId - Optional user ID (if not provided, uses current user)
 * @param {number} retries - Number of retry attempts (default: 2)
 * @returns {Promise<boolean>} true if terms are accepted in database, false otherwise
 */
export const isTermsAccepted = async (userId?: string, retries: number = 2): Promise<boolean> => {
  const user = userId || auth.currentUser?.uid;
  if (!user) return false;

  // Retry logic for network issues or temporary failures
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const userDocRef = doc(db, "applicants", user);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return false;
      }

      const data = userDoc.data();
      // Check for terms_accepted field - handle both boolean true and string "true"
      const accepted = data.terms_accepted === true || data.terms_accepted === "true";
      
      return accepted;
    } catch (error) {
      console.error(`Error checking terms acceptance (attempt ${attempt + 1}/${retries + 1}):`, error);
      
      // If not the last attempt, wait before retrying
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1))); // Exponential backoff
      }
    }
  }

  // If all retries failed, return false (secure by default)
  return false;
};

/**
 * Set terms acceptance status in database (only source of truth)
 * @param {boolean} accepted - Whether terms are accepted
 * @param {string} userId - Optional user ID for database storage (if not provided, uses current user)
 */
export const setTermsAccepted = async (
  accepted: boolean,
  userId?: string
): Promise<void> => {
  const user = userId || auth.currentUser?.uid;
  if (!user) {
    throw new Error("User ID is required to save terms acceptance");
  }

  try {
    await saveTermsAcceptanceToFirestore(user, accepted);
  } catch (error) {
    console.error("Failed to save terms acceptance to database:", error);
    throw error; // Re-throw to let caller handle the error
  }
};

/**
 * Get the timestamp when terms were accepted from database
 * @param {string} userId - Optional user ID (if not provided, uses current user)
 * @returns {Promise<string | null>} ISO timestamp string or null if not accepted
 */
export const getTermsAcceptedTimestamp = async (
  userId?: string
): Promise<string | null> => {
  try {
    const user = userId || auth.currentUser?.uid;
    if (!user) return null;

    const userDocRef = doc(db, "applicants", user);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return data.terms_accepted_timestamp || null;
  } catch (error) {
    console.error("Error getting terms acceptance timestamp from database:", error);
    return null;
  }
};


