import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { ChevronsUpDown, LogOut } from "lucide-react";
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
import { auth, db } from "@/firebase/firebase_setup";

export function HeaderProfileMenu() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("No Name");
  const [userEmail, setUserEmail] = useState<string>("no-email");
  const [userAvatar, setUserAvatar] = useState<string>("");

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;

      if (currentUser) {
        setUserEmail(currentUser.email || "no-email");
        setUserAvatar(currentUser.photoURL || "");

        try {
          const userDocRef = doc(db, "applicants", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const applicantData = userDoc.data();
            const firstName = applicantData.firstName || "";
            const lastName = applicantData.lastName || "";

            if (firstName || lastName) {
              setUserName(
                `${firstName} ${lastName}`.trim() ||
                  currentUser.displayName ||
                  "No Name"
              );
            } else {
              setUserName(currentUser.displayName || "No Name");
            }
          } else {
            setUserName(currentUser.displayName || "No Name");
          }
        } catch (error) {
          console.error("Error fetching applicant data:", error);
          setUserName(currentUser.displayName || "No Name");
        }
      }
    };

    fetchUserData();
    const unsubscribe = auth.onAuthStateChanged(() => {
      fetchUserData();
    });
    return () => unsubscribe();
  }, []);

  const getInitials = (name: string): string => {
    if (!name || name === "No Name") return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 gap-2 px-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="rounded-lg">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden flex-1 flex-col items-start gap-0.5 sm:flex sm:flex-row sm:items-center sm:gap-2">
            <span className="truncate text-sm font-medium">{userName}</span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">
              {userEmail}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="rounded-lg">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{userName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {userEmail}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
