import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createUserWithEmailAndPassword,
  loginWithGoogle,
} from "@/firebase_auth_service";
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
import { toast } from "sonner";

export function SignupForm({
  className,
  navigate,
  ...props
}: React.ComponentProps<"div"> & { navigate?: (path: string) => void }) {
  const defaultNavigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      defaultNavigate("/", { replace: true });
      return;
    }

    const termsAccepted = await isTermsAccepted(user.uid);

    if (!termsAccepted) {
      const code = searchParams.get("code") || searchParams.get("recipientId") || peekRecipientIdFromStorage();
      const redirectUrl = code ? `/accept-terms?code=${code}` : "/accept-terms";
      defaultNavigate(redirectUrl, { replace: true });
      return;
    }

    // Terms already accepted (e.g. existing user signing in via Google) — go to home or connections
    const pendingId = getRecipientIdFromStorage();
    if (pendingId) {
      try {
        await addConnection({ document_id: pendingId, type: "Company" }).unwrap();
        defaultNavigate(`/?code=${pendingId}`, { replace: true });
      } catch (err) {
        console.error("Failed to add connection after signup", err);
        defaultNavigate("/", { replace: true });
      }
    } else {
      defaultNavigate("/", { replace: true });
    }
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

      // Save user details to Firestore before proceeding
      await saveUserDetailsToFirestore(userCredential.user);

      toast.success("Account created successfully!");
      await postSignupCheck();
    } catch (err: any) {
      console.error("Google signup failed:", err);
      console.error("Error code:", err?.code);
      console.error("Error message:", err?.message);

      const errorCode = err?.code || "";
      const errorMessage = err?.message || "";

      if (errorCode.includes("popup-closed-by-user")) {
        toast.error("Signup cancelled");
      } else if (errorCode.includes("popup-blocked")) {
        toast.error("Popup was blocked. Please allow popups for this site");
      } else if (
        errorCode.includes("account-exists-with-different-credential")
      ) {
        toast.error(
          "An account already exists with this email using a different sign-in method"
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleEmailSignup}>
        <div className="grid gap-6">
          <div className="flex flex-col gap-4">
            {/* <Button variant="outline" className="w-full">
              Sign up with Apple
            </Button> */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignup}
              disabled={isLoading}
            >
              {isLoading ? "Signing up..." : "Sign up with Google"}
            </Button>
          </div>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-card text-muted-foreground relative z-10 px-2">
              Or continue with
            </span>
          </div>
          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="m@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-3">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-3">
              <div className="flex items-center">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
              </div>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
