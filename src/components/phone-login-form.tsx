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
    <div className={cn("flex flex-col gap-2 sm:gap-3", className)}>
      {!sessionId ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <div className="space-y-1.5 sm:space-y-2">
            <Label
              htmlFor="phone-number"
              className="text-[11px] sm:text-xs md:text-sm"
            >
              Mobile number
            </Label>
            <div className="flex gap-1.5 sm:gap-2">
              <select
                id="phone-country"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-9 w-[5.5rem] shrink-0 rounded-lg border border-input bg-background px-2 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-10 sm:w-28 sm:rounded-xl sm:px-3 sm:text-xs md:text-sm"
                disabled={isSendingOtp}
              >
                {COUNTRY_CODES.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
              <Input
                id="phone-number"
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phoneDigits}
                onChange={(e) =>
                  setPhoneDigits(
                    e.target.value.replace(/\D/g, "").slice(0, 15)
                  )
                }
                disabled={isSendingOtp}
                className="h-9 flex-1 rounded-lg sm:h-10 sm:rounded-xl"
              />
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-9 w-full rounded-lg bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 shadow-[0_0_16px_rgba(0,224,255,0.35)] hover:from-[#40e8ff] hover:to-[#9274ff] sm:h-10 sm:rounded-xl"
            disabled={isSendingOtp}
          >
            {isSendingOtp ? "Sending…" : "Send OTP →"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-2 sm:space-y-3">
          <p className="text-[11px] leading-snug text-muted-foreground sm:text-sm">
            Enter the 6-digit code sent to {countryCode} {phoneDigits}
          </p>
          <div className="space-y-1.5 sm:space-y-2">
            <Label
              htmlFor="otp"
              className="text-[11px] sm:text-xs md:text-sm"
            >
              Verification code
            </Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={isVerifying}
              className="h-9 text-center text-base tracking-[0.35em] sm:h-10 sm:text-lg sm:tracking-[0.5em]"
            />
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 sm:h-10"
              disabled={isVerifying}
              onClick={() => {
                setSessionId(null);
                setOtp("");
              }}
            >
              Change number
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 flex-1 rounded-lg bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 shadow-[0_0_16px_rgba(0,224,255,0.35)] hover:from-[#40e8ff] hover:to-[#9274ff] sm:h-10 sm:rounded-xl"
              disabled={isVerifying || otp.length !== 6}
            >
              {isVerifying ? "Verifying…" : "Verify"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
