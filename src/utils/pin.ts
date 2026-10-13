import { auth } from "@/firebase/firebase_setup";
import { getIdToken } from "firebase/auth";

// The PIN is hashed and checked by the backend (bcrypt + lockout). The browser never sees a hash any more.
// "server" stands in for the old hash in the auth context: non-null means "this account has a PIN".
export const PIN_SET_MARKER = "server";

// Proof that the PIN was entered on this device. Memory only: a page reload locks the app again. The backend wants it
// as `x-pin-token` on the endpoints that list, share or delete documents (see base_query_with_reauth.ts).
let pinUnlockToken: string | null = null;
export const getPinUnlockToken = () => pinUnlockToken;
export const clearPinUnlock = () => {
  pinUnlockToken = null;
};
export const PIN_REQUIRED_EVENT = "iverifi:pin-required";

// While the PIN screen is up the pages behind it are already mounted and start loading data. The backend refuses
// those requests (no unlock yet), the pages cache the failure and then show "nothing here" after the PIN is entered.
// So requests simply wait here until the PIN screen closes, then go out with the unlock token.
let pinScreenOpen = false;
let pinWaiters: Array<() => void> = [];
export function setPinScreenOpen(open: boolean): void {
  pinScreenOpen = open;
  if (!open) {
    const waiting = pinWaiters;
    pinWaiters = [];
    waiting.forEach((release) => release());
  }
}
export function waitForPinUnlock(): Promise<void> {
  return pinScreenOpen ? new Promise<void>((resolve) => pinWaiters.push(resolve)) : Promise.resolve();
}

const apiBase = ((import.meta.env?.VITE_BASE_URL as string | undefined) || "").replace(/\/$/, "");

async function pinRequest(method: "GET" | "POST", path: string, body?: unknown) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  const token = await getIdToken(user);
  const resp = await fetch(`${apiBase}/users/pin/${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await resp.json().catch(() => null);
  return { resp, json };
}

export type PinStatus = "set" | "none" | "error";

/**
 * Does this account have a PIN? "error" means we could not find out (offline, server down): the caller must NOT treat
 * that as "no PIN", or a network blip would send the user to the set-a-new-PIN screen.
 */
export async function fetchPinStatus(): Promise<PinStatus> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { resp, json } = await pinRequest("GET", "status");
      if (resp.ok) return json?.data?.hasPin ? "set" : "none";
    } catch (err) {
      console.error("fetchPinStatus error:", err);
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 800)); // a cold server often answers the second time
  }
  return "error";
}

/**
 * Save a PIN. First PIN: nothing else needed. Changing it needs the current PIN, or a sign-in within the last few
 * minutes (the Forgot-PIN flow signs in again with the token the phone check returns).
 */
export async function savePin(pin: string, currentPin?: string): Promise<string> {
  const { resp, json } = await pinRequest("POST", "set", { pin, currentPin });
  if (!resp.ok) throw new Error(json?.message || "Could not save PIN");
  pinUnlockToken = json?.data?.pinToken ?? null;
  return PIN_SET_MARKER;
}

export interface PinCheck {
  ok: boolean;
  locked: boolean;
  remaining: number | null;
}

/** Check a PIN with the server. Wrong guesses are counted there; 5 in a row lock the account for 15 minutes. */
export async function verifyPin(pin: string): Promise<PinCheck> {
  const { resp, json } = await pinRequest("POST", "verify", { pin });
  if (resp.ok) {
    pinUnlockToken = json?.data?.pinToken ?? null;
    return { ok: true, locked: false, remaining: null };
  }
  if (resp.status === 401 || resp.status === 429) {
    return { ok: false, locked: resp.status === 429, remaining: json?.data?.remaining ?? null };
  }
  throw new Error(json?.message || "Could not check PIN");
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
