import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HeaderProfileMenu } from "@/components/header-profile-menu";
import { BottomNav } from "@/components/bottom-nav";
import { SupportWidget } from "@/components/support-widget";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/theme_context";
import { useAuth } from "@/context/auth_context";
import { PinLockScreen } from "@/components/pin-lock-screen";
import { useEffect } from "react";

// Routes where PIN lock should not block the user (onboarding)
const PIN_EXCLUDED_PATHS = ["/accept-terms", "/complete-profile", "/aadhaar-test"];

const ProtectedLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, pinLocked, needsPinSetup, pinHash, setPinLocked, setNeedsPinSetup } = useAuth();

  const showBottomNav = location.pathname !== "/complete-profile";
  const isOnboardingPath = PIN_EXCLUDED_PATHS.some((p) =>
    location.pathname.startsWith(p)
  );

  // Lock screen when user returns to the app (tab becomes visible again)
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && user && pinHash !== null) {
        setPinLocked(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user, pinHash, setPinLocked]);

  const showPinScreen = !isOnboardingPath && (pinLocked || needsPinSetup);

  return (
    <SidebarProvider>
      <SidebarInset className="min-h-0 min-w-0 overflow-x-hidden bg-background text-foreground">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md transition-colors sm:px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-xl transition-transform active:scale-95 focus:outline-hidden"
          >
            <IverifiLogo />
          </button>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/60 text-foreground shadow-2xs backdrop-blur-sm transition-all hover:bg-accent hover:text-accent-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>
            <HeaderProfileMenu />
          </div>
        </header>

        <main
          className={
            showBottomNav
              ? "flex min-h-0 flex-1 flex-col gap-4 p-4 pb-24"
              : "flex min-h-0 flex-1 flex-col gap-4 p-4"
          }
        >
          <Outlet />
          <Toaster />
        </main>
      </SidebarInset>

      {showBottomNav && <BottomNav />}
      {showBottomNav && <SupportWidget />}

      {/* PIN lock / setup overlay */}
      {showPinScreen && user && (
        <PinLockScreen
          uid={user.uid}
          mode={needsPinSetup ? "setup" : "lock"}
          onUnlocked={() => {
            setPinLocked(false);
            setNeedsPinSetup(false);
          }}
        />
      )}
    </SidebarProvider>
  );
};

export default ProtectedLayout;
