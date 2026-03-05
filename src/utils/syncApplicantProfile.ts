/**
 * Sync applicant PII to the backend so it can be stored encrypted.
 * Call this instead of writing firstName, lastName, phone etc. directly to Firestore.
 */
import { auth } from "@/firebase/firebase_setup";
import { getIdToken } from "firebase/auth";

const getBaseUrl = () =>
  typeof import.meta !== "undefined" && import.meta.env?.VITE_BASE_URL
    ? String(import.meta.env.VITE_BASE_URL).replace(/\/$/, "")
    : "";

export interface SyncApplicantProfilePayload {
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  dob?: string;
  nin?: string;
  address?: Record<string, unknown>;
  profile_completion_level?: number;
  batch?: string;
  [key: string]: unknown;
}

/**
 * Send applicant profile (PII) to backend. Backend verifies Firebase ID token and
 * writes to applicants/{uid} with PII encrypted at rest.
 */
export async function syncApplicantProfileToBackend(
  payload: SyncApplicantProfilePayload
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error("VITE_BASE_URL is not configured");
  }
  const token = await getIdToken(user);
  if (!token) {
    throw new Error("Could not get Firebase ID token");
  }
  const res = await fetch(`${baseUrl}/users/syncApplicantProfile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message || `Sync failed: ${res.status}`);
  }
}
