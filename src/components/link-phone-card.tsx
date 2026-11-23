import { useState } from "react";
import { getIdToken } from "firebase/auth";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRY_CODES } from "@/utils/countryCodes";
import { auth } from "@/firebase/firebase_setup";
import { getPinUnlockToken } from "@/utils/pin";

const apiBase = ((import.meta.env?.VITE_BASE_URL as string | undefined) || "").replace(/\/$/, "");

async function post(path: string, body: unknown, signedIn: boolean) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signedIn) {
    const user = auth.currentUser;
    if (!user) throw new Error("Please sign in again.");
    headers.Authorization = `Bearer ${await getIdToken(user)}`;
    const pinToken = getPinUnlockToken();
    if (pinToken) headers["x-pin-token"] = pinToken;
  }
  const res = await fetch(`${apiBase}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.hasError) throw new Error(json?.message || "Something went wrong. Please try again.");
  return json.data;
}

/**
 * For accounts made with Google or e-mail: proves a mobile number by SMS and adds it to THIS account, so signing in with
 * the number in the iVerifi phone app opens the same account instead of a new, empty one.
 */
export function LinkPhoneCard({ onLinked }: { onLinked: (phone: string) => void }) {
  const [countryCode, setCountryCode] = useState("+91");
  const [digits, setDigits] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const phone = `${countryCode}${digits}`;

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (digits.length < 6) return toast.error("Enter your mobile number");
    setBusy(true);
    try {
      const data = await post("/users/phone/send-otp", { phone }, false);
      setSessionId(data.sessionId);
      setOtp("");
      toast.success("Verification code sent to your phone");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || otp.length !== 6) return toast.error("Enter the 6-digit code from the SMS");
    setBusy(true);
    try {
      await post("/users/phone/link", { sessionId, otp, phone }, true);
      await auth.currentUser?.reload();
      toast.success("Mobile number linked. You can now sign in with it in the iVerifi app.");
      onLinked(phone);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" aria-hidden />
        <div>
          <div className="text-sm font-semibold text-foreground">Link your mobile number</div>
          <p className="text-sm text-muted-foreground">
            Verify your number to sign in to this same account in the iVerifi phone app.
          </p>
        </div>
      </div>
      {!sessionId ? (
        <form onSubmit={sendCode} className="space-y-2">
          <Label htmlFor="link-phone" className="text-xs text-foreground/90">
            Mobile number
          </Label>
          <div className="flex gap-2">
            <select
              aria-label="Country code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              disabled={busy}
              className="h-10 w-28 shrink-0 rounded-xl border border-border bg-card px-2 text-sm text-foreground"
            >
              {COUNTRY_CODES.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              id="link-phone"
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 15))}
              disabled={busy}
              className="h-10 flex-1 rounded-xl"
            />
          </div>
          <Button type="submit" className="h-10 w-full rounded-xl" disabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={link} className="space-y-2">
          <Label htmlFor="link-otp" className="text-xs text-foreground/90">
            Enter the 6-digit code sent to {countryCode} {digits}
          </Label>
          <Input
            id="link-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={busy}
            className="h-10 rounded-xl text-center text-lg tracking-[0.5em]"
          />
          <Button type="submit" className="h-10 w-full rounded-xl" disabled={busy}>
            {busy ? "Linking…" : "Verify and link"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setSessionId(null)}
            disabled={busy}
          >
            Use a different number
          </button>
        </form>
      )}
    </div>
  );
}
