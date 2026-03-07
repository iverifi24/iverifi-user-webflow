import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthTabs } from "@/components/auth-tabs";
import { Toaster } from "@/components/ui/sonner";
import { IverifiLogo } from "@/components/iverifi-logo";
import { useAuth } from "@/context/auth_context";
import { LoadingScreen } from "@/components/loading-screen";

export default function SignupPage() {
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
    return <LoadingScreen variant="fullPage" />;
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
