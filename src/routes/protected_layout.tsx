import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HeaderProfileMenu } from "@/components/header-profile-menu";
import { BottomNav } from "@/components/bottom-nav";
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
        <header className="flex h-18 shrink-0 items-center justify-between gap-2 border-b border-border bg-background pl-0 pr-4 min-w-0 overflow-hidden md:px-4">
          <div className="-ml-[120px] flex h-24 min-w-[320px] shrink-0 items-center justify-start gap-2 overflow-hidden rounded-lg pr-2 md:min-w-[420px] md:-ml-[140px] md:pl-0">
            <div
              onClick={() => navigate("/")}
              className="flex cursor-pointer origin-[0_50%] scale-[6] items-center justify-start md:origin-left"
            >
              <IverifiLogo
                containerClassName="inline-flex shrink-0 justify-start"
                className="h-[56px] w-[90px] min-w-[90px] shrink-0 object-contain object-left align-bottom md:w-[75px] md:min-w-[75px]"
              />
            </div>
            <div className="hidden flex-col justify-center md:flex">
              <span className="text-sm font-semibold text-foreground">iVerifi</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-transparent text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
