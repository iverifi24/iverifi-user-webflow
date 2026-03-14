import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithFirebaseCustomToken } from "@/firebase_auth_service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { auth } from "@/firebase/firebase_setup";
import { syncApplicantProfileToBackend } from "@/utils/syncApplicantProfile";

const COUNTRY_CODES: { code: string; label: string }[] = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "US / Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+86", label: "China (+86)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
  { code: "+65", label: "Singapore (+65)" },
];

function toE164(countryCode: string, digits: string): string {
  const cleaned = digits.replace(/\D/g, "");
  return `${countryCode}${cleaned}`;
}

export function PhoneLoginForm({
  onSuccess,
  className,
}: {
  onSuccess: () => void;
  className?: string;
}) {
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const baseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_BASE_URL
      ? String(import.meta.env.VITE_BASE_URL).replace(/\/$/, "")
      : "";

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = toE164(countryCode, phoneDigits);
    if (raw.length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    if (!baseUrl) {
      toast.error("Server is not configured. Please try again later.");
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await fetch(`${baseUrl}/users/phone/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: raw }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.hasError || !json.data?.sessionId) {
        const msg =
          json?.message ||
          (res.status >= 500
            ? "Failed to send OTP. Please try again."
            : "Could not send OTP. Check the number and try again.");
        throw new Error(msg);
      }
      setSessionId(json.data.sessionId as string);
      toast.success("Verification code sent to your phone");
      setOtp("");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "";
      toast.error(msg || "Failed to send code. Try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !otp.trim()) {
      toast.error("Enter the 6-digit code");
      return;
    }
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code from SMS");
      return;
    }
    if (!baseUrl) {
      toast.error("Server is not configured. Please try again later.");
      return;
    }
    setIsVerifying(true);
    try {
      const raw = toE164(countryCode, phoneDigits);
      const res = await fetch(`${baseUrl}/users/phone/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, otp: code, phone: raw }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.hasError || !json.data?.token) {
        const msg =
          json?.message ||
          (res.status >= 500
            ? "Verification failed. Please try again."
            : "Invalid or expired code. Request a new one.");
        throw new Error(msg);
      }

      const token = json.data.token as string;
      await signInWithFirebaseCustomToken(token);

      // Ensure Firebase auth.currentUser is loaded
      await auth.currentUser?.getIdToken(true);

      // Persist phone into applicant profile (and link it to this Firebase user).
      try {
        await syncApplicantProfileToBackend({
          phone: raw,
          phoneNumber: raw,
        });
      } catch (syncErr) {
        console.warn("Failed to sync phone to applicant profile after phone login:", syncErr);
      }

      toast.success("Signed in successfully");
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("expired")) {
        toast.error("Invalid or expired code. Request a new one.");
      } else {
        toast.error(msg || "Verification failed. Try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {!sessionId ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone-country">Country</Label>
            <select
              id="phone-country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={isSendingOtp}
            >
              {COUNTRY_CODES.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone number</Label>
            <Input
              id="phone-number"
              type="tel"
              inputMode="numeric"
              placeholder="9876543210"
              value={phoneDigits}
              onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 15))}
              disabled={isSendingOtp}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSendingOtp}>
            {isSendingOtp ? "Sending…" : "Send verification code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to {countryCode} {phoneDigits}
          </p>
          <div className="space-y-2">
            <Label htmlFor="otp">Verification code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={isVerifying}
              className="text-center text-lg tracking-[0.5em]"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isVerifying}
              onClick={() => {
                setSessionId(null);
                setOtp("");
              }}
            >
              Change number
            </Button>
            <Button type="submit" className="flex-1" disabled={isVerifying || otp.length !== 6}>
              {isVerifying ? "Verifying…" : "Verify"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
