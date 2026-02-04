import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth_context";
import { isValidQRCode } from "@/utils/qr-code-utils";
import { isTermsAccepted } from "@/utils/terms";

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

    // Exclude protected routes and onboarding - let ProtectedRoute handle those
    const excludedPaths = [
      "/accept-terms", "/terms", "/privacy", "/complete-profile",
      "/login", "/signup", "/connections", "/home", "/documents", "/user-data"
    ];
    
    if (excludedPaths.includes(currentPath) || !isValidQRCode(code)) {
      return;
    }

    // Only handle QR code routing - no terms checking needed
    if (!user) {
      if (currentPath !== "/login" && currentPath !== "/signup") {
        navigate(`/login?code=${code}`, { replace: true });
      }
    } else {
      // User is authenticated - ProtectedRoute will handle terms check
      if (currentPath !== "/connections") {
        navigate(`/connections?code=${code}`, { replace: true });
      }
    }
  }, [user, loading, searchParams, navigate, location.pathname]);

  return <>{children}</>;
}