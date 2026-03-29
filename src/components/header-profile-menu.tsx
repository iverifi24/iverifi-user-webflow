import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut, linkWithPopup } from "firebase/auth";
import { ChevronsUpDown, FileText, History, Home, LogOut, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, googleProvider } from "@/firebase/firebase_setup";
import { getApplicantProfileFromBackend } from "@/utils/syncApplicantProfile";
import { useDeleteProfileMutation } from "@/redux/api";
import { toast } from "sonner";

export function HeaderProfileMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string>("No Name");
  const [userEmail, setUserEmail] = useState<string>("no-email");
  const [userPhone, setUserPhone] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [hasGoogleLinked, setHasGoogleLinked] = useState<boolean>(false);
  const [deleteProfileOpen, setDeleteProfileOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteProfile, { isLoading: isDeletingProfile }] = useDeleteProfileMutation();

  const onDeleteProfileOpenChange = (open: boolean) => {
    setDeleteProfileOpen(open);
    if (!open) setDeleteConfirmText("");
  };

  const loadUserFromBackend = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setUserAvatar(currentUser.photoURL || "");
    setHasGoogleLinked(currentUser.providerData.some((p) => p.providerId === "google.com"));

    try {
      const profile = await getApplicantProfileFromBackend();
      const firstName = profile.firstName ?? "";
      const lastName = profile.lastName ?? "";
      const name = profile.name ?? "";

      if (firstName || lastName) {
        setUserName(
          `${firstName} ${lastName}`.trim() ||
            currentUser.displayName ||
            "No Name"
        );
      } else if (name) {
        setUserName(name);
      } else {
        setUserName(currentUser.displayName || "No Name");
      }

      const profileEmail = (profile.email as string) || "";
      setUserEmail(profileEmail || currentUser.email || "no-email");
      setUserPhone((profile.phone || profile.phoneNumber || "") as string);
    } catch (error) {
      console.error("Error fetching applicant profile:", error);
      setUserName(currentUser.displayName || "No Name");
      setUserEmail(currentUser.email || "no-email");
    }
  };

  // Initial load + react to auth changes
  useEffect(() => {
    loadUserFromBackend();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setHasGoogleLinked(currentUser.providerData.some((p) => p.providerId === "google.com"));
      } else {
        setHasGoogleLinked(false);
      }
      loadUserFromBackend();
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also reload profile whenever the route changes (e.g. after completing profile)
  useEffect(() => {
    loadUserFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const getInitials = (name: string): string => {
    if (!name || name === "No Name") return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLinkGoogle = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("You need to be logged in to link Google.");
      return;
    }
    try {
      await linkWithPopup(currentUser, googleProvider);
      setHasGoogleLinked(true);
      toast.success("Google account linked successfully. You can now sign in with Google.");
    } catch (err: any) {
      console.error("Link Google failed:", err);
      const code = err?.code || "";
      if (code.includes("account-exists-with-different-credential")) {
        toast.error("This Google account is already linked to a different user.");
      } else if (code.includes("popup-closed-by-user")) {
        toast.error("Linking cancelled.");
      } else if (code.includes("popup-blocked")) {
        toast.error("Popup was blocked. Please allow popups for this site.");
      } else {
        toast.error("Failed to link Google account. Please try again.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      const savedTheme = localStorage.getItem("iverifi-theme");
      await signOut(auth);
      localStorage.clear();
      if (savedTheme === "light" || savedTheme === "dark") {
        localStorage.setItem("iverifi-theme", savedTheme);
      }
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleDeleteProfile = async () => {
    try {
      const savedTheme = localStorage.getItem("iverifi-theme");
      await deleteProfile().unwrap();
      toast.success("Profile deleted. You have been signed out.");
      setDeleteProfileOpen(false);
      await signOut(auth);
      localStorage.clear();
      if (savedTheme === "light" || savedTheme === "dark") {
        localStorage.setItem("iverifi-theme", savedTheme);
      }
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to delete profile");
    }
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 gap-2 px-2 text-foreground hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
        >
          <Avatar className="h-8 w-8 rounded-lg border border-border">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="rounded-lg bg-sky-500/20 text-foreground">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden flex-1 flex-col items-start gap-0.5 sm:flex sm:flex-row sm:items-center sm:gap-2">
            <span className="truncate text-sm font-medium">{userName}</span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">
              {userEmail}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-xl border border-border bg-popover text-popover-foreground"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg border border-border">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="rounded-lg bg-sky-500/20 text-foreground">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{userName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {userEmail}
              </span>
              {userPhone ? (
                <span className="truncate text-xs text-muted-foreground">
                  {userPhone}
                </span>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground" onClick={() => navigate("/connections")}>
          <Home className="size-4" />
          Connections
        </DropdownMenuItem>
        <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground" onClick={() => navigate("/my-activity")}>
          <History className="size-4" />
          My Activity
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {!hasGoogleLinked && (
          <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground" onClick={handleLinkGoogle}>
            <FileText className="size-4" />
            Link Google account
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:bg-accent focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
          onClick={() => setDeleteProfileOpen(true)}
        >
          <Trash2 className="size-4" />
          Delete profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground" onClick={handleLogout}>
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={deleteProfileOpen} onOpenChange={onDeleteProfileOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-red-400">Delete your account</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-slate-400">
              <p className="font-medium text-slate-100">This action is permanent and cannot be undone.</p>
              <p>The following will be permanently removed:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Your profile and personal information</li>
                <li>All verified documents and credentials</li>
                <li>Your connections and shared access with properties</li>
                <li>Your activity and check-in history</li>
                <li>Your Firebase authentication account (you will not be able to sign in with this email or phone again)</li>
              </ul>
              <p>If you have shared credentials with any property, they will no longer have access to your documents.</p>
              <p className="pt-2 text-slate-100">
                To confirm, type <strong className="font-mono text-red-400">DELETE</strong> below.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="delete-confirm" className="text-slate-400">
            Type DELETE to confirm
          </Label>
          <Input
            id="delete-confirm"
            placeholder="DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="font-mono placeholder:font-mono border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
            disabled={isDeletingProfile}
            autoComplete="off"
            aria-describedby="delete-confirm-hint"
          />
          <p id="delete-confirm-hint" className="text-xs text-slate-500">
            This helps prevent accidental deletion.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
            onClick={() => onDeleteProfileOpenChange(false)}
            disabled={isDeletingProfile}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteProfile}
            disabled={isDeletingProfile || deleteConfirmText !== "DELETE"}
          >
            {isDeletingProfile ? "Deleting…" : "Permanently delete my account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
