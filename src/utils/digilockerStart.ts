import { auth } from "@/firebase/firebase_setup";
import { getIdToken } from "firebase/auth";

export interface DigilockerStartOptions {
  docType?: string;
  isFamilyMember?: boolean;
  memberNickname?: string;
  returnUrl?: string;
}

/**
 * Starts the DigiLocker flow.
 *
 * The redirect to the backend cannot carry an Authorization header, so the backend no longer
 * trusts `?applicant_id=` from the URL. Instead we first ask it (authenticated) for a short-lived
 * ticket bound to the signed-in user, then redirect with only that ticket.
 */
export async function startDigilockerFlow(opts: DigilockerStartOptions = {}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const apiBase = (((import.meta as any).env.VITE_BASE_URL as string) || "").replace(/\/$/, "");
  const token = await getIdToken(user);

  const resp = await fetch(`${apiBase}/users/digilocker/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      doc_type: opts.docType,
      is_family_member: opts.isFamilyMember,
      member_nickname: opts.memberNickname,
      return_url: opts.returnUrl,
    }),
  });
  const json = await resp.json().catch(() => null);
  const ticket: string | undefined = json?.data?.ticket;
  if (!resp.ok || !ticket) {
    throw new Error(json?.message || "Could not start DigiLocker verification");
  }

  window.location.assign(
    `${apiBase}/webhook/digilocker-aadhaar-oauth-start?ticket=${encodeURIComponent(ticket)}`,
  );
}
