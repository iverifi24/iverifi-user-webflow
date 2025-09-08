import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithEmail, loginWithGoogle } from "@/firebase_auth_service";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getRecipientIdFromStorage, saveRecipientIdForLater } from "@/utils/connectionFlow";
import { toast } from "sonner";
import { saveUserDetailsToFirestore } from "@/utils/userRegistration";

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
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ✅ capture ?recipientId=... from URL on mount and persist for post-login
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

  const postLoginCheck = async () => {
    const pendingId = getRecipientIdFromStorage(); // reads & clears
    console.log("Pending ID from storage:", pendingId);

    if (pendingId) {
      // Store the pendingId locally since getRecipientIdFromStorage clears it
      const originalCode = pendingId;

      // Navigate to the connection page with the original code (recipientId)
      // The Connections component will handle adding the connection
      console.log("Navigating to connection page with code:", originalCode);
      nav(`/connections/${originalCode}`);
    } else {
      nav("/home");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailLoading(true);
    try {
      await loginWithEmail(email, password);

      await postLoginCheck();
    } catch (err: unknown) {
      console.error("Login failed:", err);
      const error = err as { code?: string };
      if (error.code === "auth/user-not-found") {
        toast.error("No account found with this email address");
      } else if (error.code === "auth/wrong-password") {
        toast.error("Incorrect password");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Please enter a valid email address");
      } else if (error.code === "auth/user-disabled") {
        toast.error("This account has been disabled");
      } else if (error.code === "auth/too-many-requests") {
        toast.error("Too many failed attempts. Please try again later");
      } else {
        toast.error("Login failed. Please try again");
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const userCredential = await loginWithGoogle();

      // Check if user document exists in applicants collection, if not create one
      try {
        await saveUserDetailsToFirestore(userCredential.user);
      } catch (saveError) {
        console.error("Failed to save user details:", saveError);
        // Continue with login even if saving fails
      }

      await postLoginCheck();
    } catch (err: unknown) {
      console.error("Google login failed:", err);
      const error = err as { code?: string };
      if (error.code === "auth/popup-closed-by-user") {
        toast.error("Google login was cancelled");
      } else if (error.code === "auth/popup-blocked") {
        toast.error("Popup was blocked. Please allow popups and try again");
      } else if (error.code === "auth/account-exists-with-different-credential") {
        toast.error("An account already exists with this email using a different sign-in method");
      } else {
        toast.error("Google login failed. Please try again");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleEmailLogin}>
        <div className="grid gap-6">
          <div className="flex flex-col gap-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isEmailLoading}
            >
              {isGoogleLoading ? "Signing in..." : "Login with Google"}
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
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isEmailLoading || isGoogleLoading}>
              {isEmailLoading ? "Signing in..." : "Login"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
