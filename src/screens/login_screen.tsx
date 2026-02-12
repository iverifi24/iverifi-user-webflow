import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthTabs } from "@/components/auth-tabs";
import { Toaster } from "@/components/ui/sonner";
import { IverifiLogo } from "@/components/iverifi-logo";
import { useAuth } from "@/context/auth_context";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (loading) return;
    if (user) {
      const code = searchParams.get("code");
      if (code) {
        navigate(`/?code=${encodeURIComponent(code)}`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, loading, navigate, searchParams]);

  if (loading || user) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10 overflow-x-hidden">
      <div className="flex w-full max-w-sm flex-col gap-2">
        <IverifiLogo />
        <AuthTabs />
      </div>
      <Toaster />
    </div>
  );
}