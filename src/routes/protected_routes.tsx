import { useAuth } from "@/context/auth_context";
import { isTermsAccepted } from "@/utils/terms";
import { peekRecipientIdFromStorage } from "@/utils/connectionFlow";
import type { JSX } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/loading-screen";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);

  // Allow /complete-profile and /accept-terms without terms check (part of onboarding flow)
  // Check this FIRST before any database calls to avoid unnecessary checks
  const allowedPaths = ["/accept-terms", "/complete-profile"];
  const isAllowedPath = allowedPaths.includes(location.pathname);

  // Check terms acceptance from database on mount and when location changes
  // Skip check for allowed paths to avoid unnecessary database calls
  useEffect(() => {
    // For allowed paths, immediately set to true and skip database check
    if (isAllowedPath) {
      setTermsAccepted(true);
      return;
    }
  
    // For other paths, check database
    if (user && !loading) {
      // Check terms - the effect dependency array handles when to re-check
      isTermsAccepted(user.uid)
        .then((accepted) => {
          setTermsAccepted(accepted);
        })
        .catch((error) => {
          console.error("Error checking terms:", error);
          setTermsAccepted(false);
        });
    } else if (!user && !loading) {
      setTermsAccepted(false);
    }
  }, [user, loading, location.pathname, isAllowedPath]);

  // CRITICAL: Check allowed paths FIRST, before any other checks.
  // For onboarding routes like /complete-profile and /accept-terms, we deliberately
  // do NOT gate on auth state here to avoid "instant logout" feelings while Firebase
  // is still restoring the session or immediately after phone/signup flows.
  if (isAllowedPath) {
    return children;
  }

  // For non-allowed paths, do normal checks
  if (loading) return <LoadingScreen variant="fullPage" />;
  
  if (!user) return <Navigate to="/login" />;

  // Wait for terms check to complete
  if (termsAccepted === null) {
    return <LoadingScreen variant="fullPage" />;
  }

  // Check if terms accepted from database (source of truth) for other protected routes
  // Only redirect if explicitly false (not null, not true)
  // Also check that we're not already on accept-terms to prevent redirect loops
  if (termsAccepted === false && location.pathname !== "/accept-terms") {
    // Preserve the code query parameter if it exists
    // Check both URL params and localStorage (for cases where code is saved but not yet in URL)
    let code = searchParams.get("code");
    if (!code) {
      // Fallback: check localStorage (code might be saved there from login flow)
      // Use peekRecipientIdFromStorage to read without removing
      code = peekRecipientIdFromStorage();
    }
    const redirectUrl = code ? `/accept-terms?code=${code}` : "/accept-terms";
    return <Navigate to={redirectUrl} replace />;
  }

  return children;
};
export default ProtectedRoute;
