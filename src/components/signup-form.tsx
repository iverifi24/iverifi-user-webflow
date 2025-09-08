import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserWithEmailAndPassword, loginWithGoogle } from "@/firebase_auth_service";
import { auth } from "@/firebase/firebase_setup";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getRecipientIdFromStorage, saveRecipientIdForLater } from "@/utils/connectionFlow";
import { saveUserDetailsToFirestore } from "@/utils/userRegistration";
import { toast } from "sonner";

export function SignupForm({
  className,
  navigate,
  ...props
}: React.ComponentProps<"div"> & { navigate?: (path: string) => void }) {
  const defaultNavigate = useNavigate();
  const nav = navigate || defaultNavigate;
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Capture ?recipientId=... from URL on mount and persist for post-signup
  useEffect(() => {
    const fromUrl = searchParams.get("recipientId");
    if (fromUrl) {
      try {
        saveRecipientIdForLater(fromUrl);
        console.log("Saved recipientId from URL:", fromUrl);
      } catch (e) {
        console.error("Failed to persist recipientId:", e);
      }
    }
  }, [searchParams]);

  const postSignupCheck = async () => {
    const pendingId = getRecipientIdFromStorage(); // reads & clears
    console.log("Pending ID from storage:", pendingId);

    if (pendingId) {
      // Store the pendingId locally since getRecipientIdFromStorage clears it
      const originalCode = pendingId;

      // Add a small delay to ensure Firestore document is fully created and available
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate to the connection page with the original code (recipientId)
      // The Connections component will handle adding the connection
      console.log("Navigating to connection page with code:", originalCode);
      nav(`/connections/${originalCode}`);
    } else {
      nav("/home");
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

    setIsEmailLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Save user details to Firestore before proceeding
      await saveUserDetailsToFirestore(userCredential.user);

      // Wait a bit more to ensure the document is fully created and available
      await new Promise((resolve) => setTimeout(resolve, 500));

      await postSignupCheck();
    } catch (err: unknown) {
      console.error("Signup failed:", err);
      const error = err as { code?: string };
      if (error.code === "auth/email-already-in-use") {
        toast.error("This email is already registered. Please try logging in instead.");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password is too weak. Please choose a stronger password.");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else if (error.code === "auth/operation-not-allowed") {
        toast.error("Email/password accounts are not enabled. Please contact support.");
      } else {
        toast.error("Signup failed. Please try again.");
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      const userCredential = await loginWithGoogle();

      // Save user details to Firestore before proceeding
      await saveUserDetailsToFirestore(userCredential.user);

      // Wait a bit more to ensure the document is fully created and available
      await new Promise((resolve) => setTimeout(resolve, 500));

      await postSignupCheck();
    } catch (err: unknown) {
      console.error("Google signup failed:", err);
      const error = err as { code?: string };
      if (error.code === "auth/popup-closed-by-user") {
        toast.error("Google signup was cancelled");
      } else if (error.code === "auth/popup-blocked") {
        toast.error("Popup was blocked. Please allow popups and try again");
      } else if (error.code === "auth/account-exists-with-different-credential") {
        toast.error("An account already exists with this email using a different sign-in method");
      } else {
        toast.error("Google signup failed. Please try again");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleEmailSignup}>
        <div className="grid gap-6">
          <div className="flex flex-col gap-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignup}
              disabled={isGoogleLoading || isEmailLoading}
            >
              {isGoogleLoading ? "Creating account..." : "Sign up with Google"}
            </Button>
          </div>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-card text-muted-foreground relative z-10 px-2">Or continue with</span>
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={isEmailLoading || isGoogleLoading}>
              {isEmailLoading ? "Creating account..." : "Create Account"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
