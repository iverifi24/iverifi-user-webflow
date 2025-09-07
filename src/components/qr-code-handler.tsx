import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/auth_context";
import { isValidQRCode } from "@/utils/qr-code-utils";

interface QRCodeHandlerProps {
  children: React.ReactNode;
}

export function QRCodeHandler({ children }: QRCodeHandlerProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  const isAuthenticated = !!user;

  useEffect(() => {
    // Don't process anything while auth is loading
    if (loading) return;

    const code = searchParams.get("code");

    // Only proceed if there's a valid code parameter
    if (!isValidQRCode(code)) return;

    const handleQRCodeFlow = async () => {
      try {
        // Case 1: User not logged in - redirect to login with code
        if (!isAuthenticated) {
          const currentPath = window.location.pathname;

          // Only redirect if we're not already on the login page
          if (currentPath !== "/login") {
            navigate(`/login?code=${code}`, { replace: true });
          }
          return;
        }

        // Case 2: User already logged in - redirect to connections with code
        if (isAuthenticated) {
          navigate(`/connections?code=${code}`, { replace: true });
        }
      } catch (error) {
        console.error("Error handling QR code flow:", error);

        // You might want to show a toast notification here
        // For now, we'll navigate to home on error
        navigate("/home");
      }
    };

    handleQRCodeFlow();
  }, [isAuthenticated, loading, searchParams, navigate]);

  return <>{children}</>;
}
