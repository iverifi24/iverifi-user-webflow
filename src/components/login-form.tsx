import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithEmail, loginWithGoogle } from "@/firebase_auth_service";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getRecipientIdFromStorage,
  saveRecipientIdForLater,
} from "@/utils/connectionFlow";
import { useAddConnectionMutation } from "@/redux/api";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase_setup";
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
  const [addConnection] = useAddConnectionMutation();

  // ✅ capture ?code=... or ?recipientId=... from URL on mount and persist for post-login
  useEffect(() => {
    const codeFromUrl =
      searchParams.get("code") || searchParams.get("recipientId");
    if (codeFromUrl) {
      try {
        saveRecipientIdForLater(codeFromUrl);
        console.log("Saved code from URL:", codeFromUrl);
      } catch (e) {
        console.error("Failed to persist code:", e);
      }
    }
  }, [searchParams]);

  const postLoginCheck = async () => {
    const pendingId = getRecipientIdFromStorage(); // reads & clears
    console.log("Pending ID from storage:", pendingId);

    if (pendingId) {
      try {
        await addConnection({
          document_id: pendingId,
          type: "Company",
        }).unwrap();
        nav(`/connections?code=${pendingId}`);
      } catch (err) {
        console.error("Failed to add connection after login", err);
        nav("/home");
      }
    } else {
      nav("/home");
    }
  };

  const checkIfUserExists = async (user: User) => {
    const userDocRef = doc(db, "applicants", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await auth.signOut?.();
      console.log(
        "User already exists in applicants collection, skipping registration"
      );
      return;
    }
    throw new Error("User doesn't exist. Please sign up.");
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

      // Always show a toast to confirm it's working
      if (
        errorCode.includes("wrong-password") ||
        errorCode.includes("user-not-found") ||
        errorCode.includes("invalid-credential")
      ) {
        toast.error("Invalid email or password");
      } else if (errorCode.includes("invalid-email")) {
        toast.error("Please enter a valid email address");
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
      await checkIfUserExists(userCredential.user);
      toast.success("Login successful!");
      await postLoginCheck();
    } catch (err: any) {
      console.error("Google login failed:", err);
      console.error("Error code:", err?.code);
      console.error("Error message:", err?.message);

      const errorMessage = err?.message || "";
      const errorCode = err?.code || "";

      if (
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

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleEmailLogin}>
        <div className="grid gap-6">
          <div className="flex flex-col gap-4">
            {/* <Button variant="outline" className="w-full">
              Login with Apple
            </Button> */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login with Google"}
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
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
