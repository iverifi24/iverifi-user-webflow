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
      <Card className="border-border bg-card text-card-foreground shadow-lg dark:border-slate-800/80 dark:bg-[#020617]/80 dark:shadow-[0_0_40px_rgba(15,23,42,0.9)] dark:backdrop-blur-md">
        <CardHeader className="space-y-0.5 px-4 pb-1.5 pt-3 sm:px-6 sm:pb-2 sm:pt-4">
          <CardTitle className="text-sm font-medium sm:text-base md:text-lg">
            {activeTab === "login" ? "Sign in to your wallet" : "Create your wallet"}
          </CardTitle>
          <CardDescription className="hidden text-xs sm:block md:text-sm">
            {activeTab === "login"
              ? "Use your phone, email, or Google account to continue."
              : "Set up your iVerifi wallet in a few seconds."}
          </CardDescription>
        </CardHeader>

        {/* Account type: underline tabs (distinct from Phone/Email pill below) */}
        <div className="px-4 pb-2 sm:px-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Account
          </p>
          <div
            className="flex border-b border-border"
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
                  ? "border-sky-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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
                  ? "border-sky-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Sign Up
            </button>
          </div>
        </div>

        <CardContent className="border-t border-border px-4 pb-4 pt-4 sm:px-6 sm:pb-5">
          {activeTab === "login" ? (
            <LoginFormContent navigate={navigate} />
          ) : (
            <SignupFormContent navigate={navigate} />
          )}
        </CardContent>
      </Card>

      <div className="text-center text-[9px] leading-tight text-muted-foreground sm:text-[10px] md:text-xs">
        By continuing, you agree to our{" "}
        <span className="text-foreground underline underline-offset-4">
          Terms of Service
        </span>{" "}
        and{" "}
        <span className="text-foreground underline underline-offset-4">
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
