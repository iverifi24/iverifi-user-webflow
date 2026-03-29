import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";

interface AuthTabsProps {
  className?: string;
}

export function AuthTabs({ className }: AuthTabsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current route
  const activeTab: "login" | "signup" =
    location.pathname === "/signup" ? "signup" : "login";

  return (
    <div className={cn("flex min-h-0 flex-col gap-2 sm:gap-3", className)}>
      <Card className="border-slate-800/80 bg-[#020617]/80 text-slate-50 shadow-[0_0_40px_rgba(15,23,42,0.9)] backdrop-blur-md">
        <CardHeader className="space-y-0.5 px-4 pb-1.5 pt-3 sm:px-6 sm:pb-2 sm:pt-4">
          <CardTitle className="text-sm font-medium text-slate-100 sm:text-base md:text-lg">
            {activeTab === "login" ? "Sign in to your wallet" : "Create your wallet"}
          </CardTitle>
          <CardDescription className="hidden text-xs text-slate-400 sm:block md:text-sm">
            {activeTab === "login"
              ? "Use your phone, email, or Google account to continue."
              : "Set up your iVerifi wallet in a few seconds."}
          </CardDescription>
        </CardHeader>

        {/* Account type: underline tabs (distinct from Phone/Email pill below) */}
        <div className="px-4 pb-2 sm:px-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Account
          </p>
          <div
            className="flex border-b border-slate-800/90"
            role="tablist"
            aria-label="Account type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "login"}
              onClick={() => navigate(`/login${location.search}`)}
              className={cn(
                "flex-1 border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors sm:text-[0.9375rem]",
                activeTab === "login"
                  ? "border-sky-400 text-slate-50"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "signup"}
              onClick={() => navigate(`/signup${location.search}`)}
              className={cn(
                "flex-1 border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors sm:text-[0.9375rem]",
                activeTab === "signup"
                  ? "border-sky-400 text-slate-50"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              Sign Up
            </button>
          </div>
        </div>

        <CardContent className="border-t border-slate-800/50 px-4 pb-4 pt-4 sm:px-6 sm:pb-5">
          {activeTab === "login" ? (
            <LoginFormContent navigate={navigate} />
          ) : (
            <SignupFormContent navigate={navigate} />
          )}
        </CardContent>
      </Card>

      <div className="text-center text-[9px] leading-tight text-slate-500 sm:text-[10px] md:text-xs">
        By continuing, you agree to our{" "}
        <span className="text-slate-300 underline underline-offset-4">
          Terms of Service
        </span>{" "}
        and{" "}
        <span className="text-slate-300 underline underline-offset-4">
          Privacy Policy
        </span>
        .
      </div>
    </div>
  );
}

// Separate components to avoid passing props through multiple levels
function LoginFormContent({ navigate }: { navigate: (path: string) => void }) {
  return <LoginForm className="!gap-3" navigate={navigate} />;
}

function SignupFormContent({ navigate }: { navigate: (path: string) => void }) {
  return <SignupForm className="!gap-3" navigate={navigate} />;
}
