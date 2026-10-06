import { useState } from "react";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HotelBadge } from "@/components/hotel-badge";
import { PhoneLoginForm } from "@/components/phone-login-form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loginWithGoogle } from "@/firebase_auth_service";
import { syncApplicantProfileToBackend } from "@/utils/syncApplicantProfile";
import { recordLoginSession } from "@/utils/pin";

interface Props {
  hotelName: string;
  hotelLogoUrl?: string | null;
  onAuthSuccess: (phone: string) => void;
  onBack: () => void;
}

export default function GuestPhoneAuth({ onAuthSuccess, onBack, hotelName, hotelLogoUrl }: Props) {
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      const user = result.user;

      try {
        const nameParts = (user.displayName ?? "").split(" ").filter(Boolean);
        await syncApplicantProfileToBackend({
          firstName: nameParts[0] ?? "",
          lastName: nameParts.slice(1).join(" "),
          name: user.displayName ?? "",
          ...(user.email && { email: user.email }),
        });
      } catch (syncErr) {
        console.warn("Failed to sync Google profile:", syncErr);
      }

      recordLoginSession(user.uid);
      onAuthSuccess(user.phoneNumber ?? "");
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        toast.error(err?.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div className="flex justify-center"><IverifiLogo /></div>
        <HotelBadge name={hotelName} logoUrl={hotelLogoUrl} />

        <div className="w-full rounded-3xl border border-border/80 bg-card/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--iverifi-accent)] mb-2">
              Step 1 of 3 • Quick Login
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Enter Mobile <span style={{ color: "var(--iverifi-accent)" }}>Number</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              We'll send a 6-digit OTP code to verify your visit to <strong className="text-foreground">{hotelName}</strong>.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <PhoneLoginForm onSuccess={() => onAuthSuccess("")} />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/60" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border/60" />
            </div>

            <Button
              variant="outline"
              className="w-full h-11 rounded-2xl border-border/70 hover:bg-muted/50 gap-2.5 font-medium text-sm transition-all"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              🔒 256-bit Encrypted • Protected under DPDP Act 2023
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground text-sm"
          onClick={onBack}
        >
          ← Back
        </Button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
