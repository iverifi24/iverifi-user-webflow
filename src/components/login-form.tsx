import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithEmail, loginWithGoogle } from "@/firebase_auth_service";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getRecipientIdFromStorage, saveRecipientIdForLater } from "@/utils/connectionFlow";
import { useAddConnectionMutation } from "@/redux/api";

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
  const [addConnection] = useAddConnectionMutation();

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
      try {
        await addConnection({
          document_id: pendingId,
          type: "Company",
        }).unwrap();
        nav(`/connections/${pendingId}`);
      } catch (err) {
        console.error("Failed to add connection after login", err);
        nav("/home");
      }
    } else {
      nav("/home");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithEmail(email, password);

      await postLoginCheck();
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      await postLoginCheck();
    } catch (err) {
      console.error("Google login failed:", err);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleEmailLogin}>
        <div className="grid gap-6">
          <div className="flex flex-col gap-4">
            <Button variant="outline" className="w-full">
              {/* Apple login placeholder */}
              Login with Apple
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
              Login with Google
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
            <Button type="submit" className="w-full">
              Login
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
