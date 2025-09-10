import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";

interface AuthTabsProps {
  className?: string;
}

export function AuthTabs({ className }: AuthTabsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current route
  const activeTab: "login" | "signup" = location.pathname === "/signup" ? "signup" : "login";

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card>
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">{activeTab === "login" ? "Welcome back" : "Create your account"}</CardTitle>
          <CardDescription>
            {activeTab === "login"
              ? "Login with your Apple or Google account"
              : "Sign up with your Apple or Google account"}
          </CardDescription>
        </CardHeader>

        {/* Tab Navigation */}
        <div className="px-6 pb-4">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              type="button"
              onClick={() => navigate(`/login${location.search}`)}
              className={cn(
                "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200",
                activeTab === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate(`/signup${location.search}`)}
              className={cn(
                "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200",
                activeTab === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign Up
            </button>
          </div>
        </div>

        <CardContent className="pt-0">
          {activeTab === "login" ? <LoginFormContent navigate={navigate} /> : <SignupFormContent navigate={navigate} />}
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-center text-xs">
        By clicking continue, you agree to our Terms of Service and Privacy Policy.
      </div>
    </div>
  );
}

// Separate components to avoid passing props through multiple levels
function LoginFormContent({ navigate }: { navigate: (path: string) => void }) {
  return <LoginForm className="!gap-0" navigate={navigate} />;
}

function SignupFormContent({ navigate }: { navigate: (path: string) => void }) {
  return <SignupForm className="!gap-0" navigate={navigate} />;
}
