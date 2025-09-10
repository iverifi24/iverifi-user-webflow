import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserWithEmailAndPassword, loginWithGoogle } from "@/firebase_auth_service";
import { auth } from "@/firebase/firebase_setup";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getRecipientIdFromStorage, saveRecipientIdForLater } from "@/utils/connectionFlow";
import { useAddConnectionMutation } from "@/redux/api";
import { saveUserDetailsToFirestore } from "@/utils/userRegistration";

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
  const [addConnection] = useAddConnectionMutation();

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
      try {
        await addConnection({
          document_id: pendingId,
          type: "Company",
        }).unwrap();
        nav(`/connections/${pendingId}`);
      } catch (err) {
        console.error("Failed to add connection after signup", err);
        nav("/home");
      }
    } else {
      nav("/home");
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Save user details to Firestore before proceeding
      await saveUserDetailsToFirestore(userCredential.user);

      await postSignupCheck();
    } catch (err: unknown) {
      console.error("Signup failed:", err);
      const error = err as { code?: string };
      if (error.code === "auth/email-already-in-use") {
        alert("This email is already registered. Please try logging in instead.");
      } else if (error.code === "auth/weak-password") {
        alert("Password is too weak. Please choose a stronger password.");
      } else if (error.code === "auth/invalid-email") {
        alert("Please enter a valid email address.");
      } else {
        alert("Signup failed. Please try again.");
      }
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const userCredential = await loginWithGoogle();

      // Save user details to Firestore before proceeding
      await saveUserDetailsToFirestore(userCredential.user);

      await postSignupCheck();
    } catch (err) {
      console.error("Google signup failed:", err);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleEmailSignup}>
        <div className="grid gap-6">
          <div className="flex flex-col gap-4">
            <Button variant="outline" className="w-full">
              {/* Apple signup placeholder */}
              Sign up with Apple
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignup}>
              Sign up with Google
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
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
