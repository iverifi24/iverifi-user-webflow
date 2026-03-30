import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase_setup";

// ── Hashing ───────────────────────────────────────────────────────────────────

export async function hashPin(pin: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Firestore PIN storage ─────────────────────────────────────────────────────

/** Fetch the stored PIN hash from Firestore. Returns null if no PIN set yet. */
export async function fetchPinHash(uid: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "applicants", uid));
    if (!snap.exists()) return null;
    return snap.data()?.pinHash ?? null;
  } catch (err) {
    console.error("fetchPinHash error:", err);
    return null;
  }
}

/**
 * Hash `pin` and persist it to Firestore. Returns the hash so the caller can
 * update in-memory context immediately without a second read.
 */
export async function savePinToFirestore(uid: string, pin: string): Promise<string> {
  const hash = await hashPin(pin);
  await setDoc(doc(db, "applicants", uid), { pinHash: hash }, { merge: true });
  return hash;
}

/** Compare a plain-text PIN against the stored hash (in-memory comparison). */
export async function verifyPin(storedHash: string, pin: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === storedHash;
}

// ── 30-day session (low-risk metadata, localStorage is fine here) ─────────────

const SESSION_KEY = "iverifi_session";
const SESSION_30_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function recordLoginSession(uid: string): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ uid, loginTime: Date.now() }));
}

export function isSessionExpired(uid: string): boolean {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  try {
    const { uid: storedUid, loginTime } = JSON.parse(raw);
    if (storedUid !== uid) return true;
    return Date.now() - loginTime > SESSION_30_DAYS_MS;
  } catch {
    return false;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
