import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPhoneOtp, confirmPhoneCode, type ConfirmationResult } from "@/firebase_auth_service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      try {
        (window as unknown as { __recaptchaVerifier?: { clear?: () => void } }).__recaptchaVerifier?.clear?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = toE164(countryCode, phoneDigits);
    if (raw.length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    if (!containerRef.current) {
      toast.error("Verification not ready. Please refresh.");
      return;
    }
    setIsSendingOtp(true);
    try {
      const freshContainer = document.createElement("div");
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(freshContainer);
      const result = await sendPhoneOtp(raw, freshContainer);
      setConfirmationResult(result);
      toast.success("Verification code sent to your phone");
      setOtp("");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      const msg = (err as { message?: string })?.message || "";
      if (code.includes("too-many-requests")) {
        toast.error("Too many attempts. Try again later.");
      } else if (code.includes("invalid-phone-number")) {
        toast.error("Invalid phone number. Use country code + number.");
      } else if (msg) {
        toast.error(msg);
      } else {
        toast.error("Failed to send code. Try again.");
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !otp.trim()) {
      toast.error("Enter the 6-digit code");
      return;
    }
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code from SMS");
      return;
    }
    setIsVerifying(true);
    try {
      await confirmPhoneCode(confirmationResult, code);
      toast.success("Signed in successfully");
      onSuccess();
    } catch (err: unknown) {
      const codeErr = (err as { code?: string })?.code || "";
      if (codeErr.includes("invalid-verification-code")) {
        toast.error("Invalid or expired code. Request a new one.");
      } else {
        toast.error("Verification failed. Try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div id="phone-recaptcha-container" ref={containerRef} aria-hidden className="hidden" />

      {!confirmationResult ? (
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
                setConfirmationResult(null);
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
