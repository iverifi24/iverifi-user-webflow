import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HeaderProfileMenu } from "@/components/header-profile-menu";
import { BottomNav } from "@/components/bottom-nav";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/theme_context";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { logoutUser } from "@/firebase_auth_service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ProtectedLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const showBottomNav = location.pathname !== "/complete-profile";

  const { showWarning, secondsLeft, stayLoggedIn, logoutNow } =
    useInactivityLogout(async () => {
      await logoutUser();
      navigate("/login", { replace: true });
    });

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

      <Dialog open={showWarning} onOpenChange={(open) => { if (!open) stayLoggedIn(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Session Expiring Soon</DialogTitle>
            <DialogDescription>
              You've been inactive for a while. You'll be logged out automatically in{" "}
              <span className="font-semibold text-foreground">{secondsLeft}s</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={logoutNow}>
              Log Out
            </Button>
            <Button className="flex-1" onClick={stayLoggedIn}>
              Stay Logged In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default ProtectedLayout;
