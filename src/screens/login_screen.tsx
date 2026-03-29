import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthScreenLayout } from "@/components/auth-screen-layout";
import { useAuth } from "@/context/auth_context";
import { LoadingScreen } from "@/components/loading-screen";

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
    return <LoadingScreen variant="fullPage" />;
  }

  return <AuthScreenLayout />;
}