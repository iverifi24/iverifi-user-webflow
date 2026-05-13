import { useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth_context";
import { isValidQRCode } from "@/utils/qr-code-utils";

interface QRCodeHandlerProps {
  children: React.ReactNode;
}

// QRCodeHandler should be simplified to:
export function QRCodeHandler({ children }: QRCodeHandlerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const code = searchParams.get("code");
    const currentPath = location.pathname;

    // The guest check-in funnel manages itself — never intercept it
    if (currentPath.startsWith("/checkin")) return;

    // Don't intercept pages that have their own logic
    const excludedPaths = ["/accept-terms", "/terms", "/privacy", "/complete-profile"];
    if (excludedPaths.includes(currentPath) || !isValidQRCode(code)) return;

    // Any path with a valid ?code= → send everyone to the new check-in funnel
    navigate(`/checkin?code=${code}`, { replace: true });
  }, [user, loading, searchParams, navigate, location.pathname]);

  return <>{children}</>;
}