import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithEmail, loginWithGoogle } from "@/firebase_auth_service";
import { PhoneLoginForm } from "@/components/phone-login-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getRecipientIdFromStorage,
  saveRecipientIdForLater,
  peekRecipientIdFromStorage,
} from "@/utils/connectionFlow";
import { useAddConnectionMutation } from "@/redux/api";
import { isTermsAccepted } from "@/utils/terms";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase_setup";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { saveUserDetailsToFirestore } from "@/utils/userRegistration";
import { toast } from "sonner";

export function LoginForm({
  className,
  navigate,
  ...props
}: React.ComponentProps<"div"> & { navigate?: (path: string) => void }) {
  const defaultNavigate = useNavigate();
  const nav = navigate || defaultNavigate;
  const [searchParams] = useSearchParams(); // ✅ top-level
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneLogin, setShowPhoneLogin] = useState(true);
  const [addConnection] = useAddConnectionMutation();

  // ✅ capture ?code=... or ?recipientId=... from URL on mount and persist for post-login
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

  const postLoginCheck = async () => {
    const user = auth.currentUser;
    if (!user) {
      nav("/");
      return;
    }
  
    // Check terms once at the beginning
    const termsAccepted = await isTermsAccepted(user.uid);
    
    if (!termsAccepted) {
      // Terms not accepted - redirect to accept-terms
      const pendingId = peekRecipientIdFromStorage();
      const redirectUrl = pendingId ? `/accept-terms?code=${pendingId}` : "/accept-terms";
      nav(redirectUrl);
      return;
    }
  
    // Terms accepted - proceed with connection flow
    const pendingId = getRecipientIdFromStorage(); // This removes it from storage
    
    if (pendingId) {
      try {
        await addConnection({
          document_id: pendingId,
          type: "Company",
        }).unwrap();
        nav(`/?code=${pendingId}`);
      } catch (err) {
        console.error("Failed to add connection after login", err);
        nav("/");
      }
    } else {
      nav("/");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      toast.success("Login successful!");
      await postLoginCheck();
    } catch (err: any) {
      console.error("Login failed:", err);
      console.error("Error code:", err?.code);
      console.error("Error message:", err?.message);

      const errorCode = err?.code || "";

      // Handle user-not-found first (don't check sign-in methods for non-existent users)
      if (errorCode.includes("user-not-found")) {
        toast.error("No account found with this email. Please sign up first.");
      } else if (errorCode.includes("invalid-email")) {
        toast.error("Please enter a valid email address");
      } else if (
        errorCode.includes("invalid-credential") ||
        errorCode.includes("wrong-password")
      ) {
        // Only check sign-in methods for credential errors (account exists but wrong password/method)
        try {
          // Check what sign-in methods are available for this email
          const signInMethods = await fetchSignInMethodsForEmail(auth, email);
          
          if (signInMethods.includes("google.com")) {
            toast.error(
              "This account was created with Google. Please use 'Login with Google' instead."
            );
          } else if (signInMethods.length > 0) {
            toast.error(
              "This account uses a different sign-in method. Please use the original method you signed up with."
            );
          } else {
            // Account exists but no other sign-in methods found
            toast.error("Invalid email or password");
          }
        } catch (checkError: any) {
          // If fetchSignInMethodsForEmail fails, it likely means the email doesn't exist
          // or there's a network issue - just show generic error
          console.error("Error checking sign-in methods:", checkError);
          toast.error("Invalid email or password");
        }
      } else if (errorCode.includes("too-many-requests")) {
        toast.error("Too many failed attempts. Please try again later");
      } else if (errorCode.includes("network-request-failed")) {
        toast.error("Network error. Please check your connection");
      } else if (errorCode) {
        // Show the error code if we have one
        toast.error(`Login failed: ${errorCode}`);
      } else {
        // Fallback
        toast.error("Login failed. Please try again");
      }
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const userCredential = await loginWithGoogle();
      // Check if user exists in Firestore, but don't block login if they don't
      // They might need to complete their profile, which will be handled in postLoginCheck
      const userDocRef = doc(db, "applicants", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // User doesn't exist in Firestore - they might have signed up but profile wasn't saved
        // Save their details now and continue with login
        try {
          await saveUserDetailsToFirestore(userCredential.user);
        } catch (saveError) {
          console.error("Error saving user details during login:", saveError);
          // Continue with login anyway - don't block the user
        }
      }
      
      toast.success("Login successful!");
      await postLoginCheck();
    } catch (err: any) {
      console.error("Google login failed:", err);
      console.error("Error code:", err?.code);
      console.error("Error message:", err?.message);

      const errorMessage = err?.message || "";
      const errorCode = err?.code || "";

      if (errorCode.includes("account-exists-with-different-credential")) {
        toast.error(
          "This email is already registered. Please log in with your email or phone number instead."
        );
      } else if (
        errorMessage.includes("doesn't exist") ||
        errorMessage.includes("sign up")
      ) {
        toast.error("User doesn't exist. Please sign up first");
      } else if (errorCode.includes("popup-closed-by-user")) {
        toast.error("Login cancelled");
      } else if (errorCode.includes("popup-blocked")) {
        toast.error("Popup was blocked. Please allow popups for this site");
      } else if (errorCode.includes("network-request-failed")) {
        toast.error("Network error. Please check your connection");
      } else {
        toast.error(
          `Google login failed: ${errorMessage || "Please try again"}`
        );
      }
      setIsLoading(false);
    }
  };

  const handlePhoneSuccess = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, "applicants", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await saveUserDetailsToFirestore(user);
        }
      } catch (e) {
        console.error("Error saving user details after phone login:", e);
      }
    }
    await postLoginCheck();
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
          <span className="hidden text-right text-[10px] text-slate-500 sm:inline">
            Choose how you’d like to continue
          </span>
        </div>

        <div className="flex rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(56,189,248,0.12)] p-0.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl sm:p-1 sm:text-sm">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-lg py-1.5 px-3 font-medium transition-all duration-200 sm:rounded-xl sm:py-2 sm:px-4",
            showPhoneLogin
              ? "bg-[rgba(15,23,42,0.98)] text-slate-50 shadow-[0_0_22px_rgba(0,224,255,0.35)]"
              : "text-slate-400 hover:text-slate-100"
          )}
          onClick={() => setShowPhoneLogin(true)}
        >
          Phone
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-lg py-1.5 px-3 font-medium transition-all duration-200 sm:rounded-xl sm:py-2 sm:px-4",
            !showPhoneLogin
              ? "bg-[rgba(15,23,42,0.98)] text-slate-50 shadow-[0_0_22px_rgba(0,224,255,0.35)]"
              : "text-slate-400 hover:text-slate-100"
          )}
          onClick={() => setShowPhoneLogin(false)}
        >
          Email
        </button>
        </div>
      </div>

      {showPhoneLogin ? (
        <div className="flex flex-col gap-4 pt-0.5">
          <PhoneLoginForm onSuccess={handlePhoneSuccess} />

          <p className="text-center text-[10px] leading-snug text-slate-500 sm:text-[11px] md:text-xs">
            Data protected under DPDP Act 2023.
          </p>

          <div className="relative flex items-center py-0.5 text-[11px] md:text-xs text-slate-500">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="mx-2.5 text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex h-9 w-full items-center justify-center gap-2 border-slate-700/80 bg-slate-900/60 text-slate-50 hover:bg-slate-800 sm:h-10"
            onClick={handleGoogleLogin}
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
            {isLoading ? "Logging in..." : "Continue with Google"}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleEmailLogin} className="mt-1 space-y-3 sm:mt-2 sm:space-y-4">
          <div className="grid gap-2 sm:gap-3">
            <div className="grid gap-1.5 sm:gap-2">
              <Label
                htmlFor="email"
                className="text-xs md:text-sm text-slate-200"
              >
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
                className="h-9 border-slate-800/80 bg-slate-900/60 text-slate-50 placeholder:text-slate-500 focus-visible:ring-sky-500/70 sm:h-10"
              />
            </div>
            <div className="grid gap-1.5 sm:gap-2">
              <Label
                htmlFor="password"
                className="text-xs md:text-sm text-slate-200"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-9 border-slate-800/80 bg-slate-900/60 text-slate-50 placeholder:text-slate-500 focus-visible:ring-sky-500/70 sm:h-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            className="h-9 w-full bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 shadow-[0_0_18px_rgba(0,224,255,0.35)] hover:from-[#40e8ff] hover:to-[#9274ff] sm:h-10"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Continue"}
          </Button>

          <div className="relative flex items-center text-[11px] md:text-xs text-slate-500">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="mx-3 text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex h-9 w-full items-center justify-center gap-2 border-slate-700/80 bg-slate-900/60 text-slate-50 hover:bg-slate-800 sm:h-10"
            onClick={handleGoogleLogin}
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
            {isLoading ? "Logging in..." : "Continue with Google"}
          </Button>
        </form>
      )}
    </div>
  );
}
