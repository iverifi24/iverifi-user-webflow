import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createUserWithEmailAndPassword,
  loginWithGoogle,
} from "@/firebase_auth_service";
import { PhoneLoginForm } from "@/components/phone-login-form";
import { auth } from "@/firebase/firebase_setup";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getRecipientIdFromStorage,
  saveRecipientIdForLater,
  peekRecipientIdFromStorage,
} from "@/utils/connectionFlow";
import { saveUserDetailsToFirestore } from "@/utils/userRegistration";
import { isTermsAccepted } from "@/utils/terms";
import { useAddConnectionMutation } from "@/redux/api";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase_setup";
import { toast } from "sonner";

export function SignupForm({
  className,
  navigate,
  ...props
}: React.ComponentProps<"div"> & {
  navigate?: (path: string, options?: { replace?: boolean }) => void;
}) {
  const defaultNavigate = useNavigate();
  const nav = (navigate ?? defaultNavigate) as (path: string, options?: { replace?: boolean }) => void;
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneSignup, setShowPhoneSignup] = useState(true);
  const [addConnection] = useAddConnectionMutation();

  // Capture ?code=... or ?recipientId=... from URL on mount and persist for post-signup
  useEffect(() => {
    const codeFromUrl =
      searchParams.get("code") || searchParams.get("recipientId");
    if (codeFromUrl) {
      try {
        saveRecipientIdForLater(codeFromUrl);
      } catch (e) {
        console.error("Failed to persist code:", e);
      }
    }
  }, [searchParams]);

  const postSignupCheck = async () => {
    const user = auth.currentUser;
    if (!user) {
      nav("/", { replace: true });
      return;
    }

    const termsAccepted = await isTermsAccepted(user.uid);

    if (!termsAccepted) {
      const code = searchParams.get("code") || searchParams.get("recipientId") || peekRecipientIdFromStorage();
      const redirectUrl = code ? `/accept-terms?code=${code}` : "/accept-terms";
      nav(redirectUrl, { replace: true });
      return;
    }

    // Terms already accepted — go to home or connections
    const pendingId = getRecipientIdFromStorage();
    if (pendingId) {
      try {
        await addConnection({ document_id: pendingId, type: "Company" }).unwrap();
        nav(`/?code=${pendingId}`, { replace: true });
      } catch (err) {
        console.error("Failed to add connection after signup", err);
        nav("/", { replace: true });
      }
    } else {
      nav("/", { replace: true });
    }
  };

  const handlePhoneSignupSuccess = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, "applicants", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await saveUserDetailsToFirestore(user);
        }
      } catch (e) {
        console.error("Error saving user details after phone signup:", e);
      }
    }
    await postSignupCheck();
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Save user details to Firestore before proceeding
      await saveUserDetailsToFirestore(userCredential.user);

      toast.success("Account created successfully!");
      await postSignupCheck();
    } catch (err: any) {
      console.error("Signup failed:", err);
      console.error("Error code:", err?.code);
      console.error("Error message:", err?.message);

      const errorCode = err?.code || "";
      const errorMessage = err?.message || "";

      if (errorCode.includes("email-already-in-use")) {
        toast.error(
          "This email is already registered. Please try logging in instead."
        );
      } else if (errorCode.includes("weak-password")) {
        toast.error("Password is too weak. Please choose a stronger password.");
      } else if (errorCode.includes("invalid-email")) {
        toast.error("Please enter a valid email address.");
      } else if (errorCode.includes("operation-not-allowed")) {
        toast.error(
          "Email/password accounts are not enabled. Please contact support."
        );
      } else if (errorCode.includes("network-request-failed")) {
        toast.error("Network error. Please check your connection");
      } else {
        toast.error(`Signup failed: ${errorMessage || "Please try again"}`);
      }
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const userCredential = await loginWithGoogle();

      await saveUserDetailsToFirestore(userCredential.user);

      toast.success("Account created successfully!");
      await postSignupCheck();
    } catch (err: any) {
      console.error("Google signup failed:", err);
      const errorCode = err?.code || "";
      const errorMessage = err?.message || "";

      if (errorCode.includes("popup-closed-by-user")) {
        toast.error("Signup cancelled");
      } else if (errorCode.includes("popup-blocked")) {
        toast.error("Popup was blocked. Please allow popups for this site");
      } else if (errorCode.includes("account-exists-with-different-credential")) {
        toast.error(
          "This email is already registered. Please log in with your existing method instead."
        );
      } else if (errorCode.includes("network-request-failed")) {
        toast.error("Network error. Please check your connection");
      } else {
        toast.error(
          `Google signup failed: ${errorMessage || "Please try again"}`
        );
      }
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 sm:gap-3",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-500/85">
            Method
          </p>
          <span className="hidden text-right text-[10px] text-muted-foreground sm:inline">
            Create your wallet with phone or email
          </span>
        </div>

        <div className="flex rounded-xl bg-muted border border-border p-0.5 text-xs sm:rounded-2xl sm:p-1 sm:text-sm">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-lg py-1.5 px-3 font-medium transition-all duration-200 sm:rounded-xl sm:py-2 sm:px-4",
            showPhoneSignup
              ? "bg-card text-foreground shadow-sm dark:bg-[rgba(15,23,42,0.98)] dark:shadow-[0_0_22px_rgba(0,224,255,0.35)]"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setShowPhoneSignup(true)}
        >
          Phone
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-lg py-1.5 px-3 font-medium transition-all duration-200 sm:rounded-xl sm:py-2 sm:px-4",
            !showPhoneSignup
              ? "bg-card text-foreground shadow-sm dark:bg-[rgba(15,23,42,0.98)] dark:shadow-[0_0_22px_rgba(0,224,255,0.35)]"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setShowPhoneSignup(false)}
        >
          Email
        </button>
        </div>
      </div>

      {showPhoneSignup ? (
        <div className="flex flex-col gap-4 pt-0.5">
          <PhoneLoginForm onSuccess={handlePhoneSignupSuccess} />

          <p className="text-center text-[10px] leading-snug text-muted-foreground sm:text-[11px] md:text-xs">
            Data protected under DPDP Act 2023.
          </p>

          <div className="relative flex items-center py-0.5 text-[11px] md:text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span className="mx-2.5">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex h-9 w-full items-center justify-center gap-2 sm:h-10"
            onClick={handleGoogleSignup}
            disabled={isLoading}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isLoading ? "Signing up..." : "Sign up with Google"}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleEmailSignup} className="mt-1 space-y-2.5 sm:mt-2 sm:space-y-4">
          <div className="grid gap-2 sm:gap-3">
            <div className="grid gap-1.5 sm:gap-2">
              <Label htmlFor="email" className="text-xs md:text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className="h-9 sm:h-10"
              />
            </div>
            <div className="grid gap-1.5 sm:gap-2">
              <Label htmlFor="password" className="text-xs md:text-sm">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                className="h-9 sm:h-10"
              />
            </div>
            <div className="grid gap-1.5 sm:gap-2">
              <Label htmlFor="confirmPassword" className="text-xs md:text-sm">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                className="h-9 sm:h-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            className="h-9 w-full bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 shadow-[0_0_18px_rgba(0,224,255,0.35)] hover:from-[#40e8ff] hover:to-[#9274ff] sm:h-10"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>

          <div className="relative flex items-center text-[11px] md:text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span className="mx-3">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex h-9 w-full items-center justify-center gap-2 sm:h-10"
            onClick={handleGoogleSignup}
            disabled={isLoading}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isLoading ? "Signing up..." : "Sign up with Google"}
          </Button>
        </form>
      )}
    </div>
  );
}
