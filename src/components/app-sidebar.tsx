import * as React from "react";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { auth, db } from "@/firebase/firebase_setup";
import { NavUser } from "./nav-user";
import { IverifiLogo } from "./iverifi-logo";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [userName, setUserName] = useState<string>("No Name");
  const [userEmail, setUserEmail] = useState<string>("no-email");
  const [userAvatar, setUserAvatar] = useState<string>("");

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Set email and avatar from Firebase auth
        setUserEmail(currentUser.email || "no-email");
        setUserAvatar(currentUser.photoURL || "");

        // Fetch applicant data from Firestore
        try {
          const userDocRef = doc(db, "applicants", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const applicantData = userDoc.data();
            const firstName = applicantData.firstName || "";
            const lastName = applicantData.lastName || "";
            
            // Combine first and last name, fallback to displayName if not available
            if (firstName || lastName) {
              setUserName(`${firstName} ${lastName}`.trim() || currentUser.displayName || "No Name");
            } else {
              setUserName(currentUser.displayName || "No Name");
            }
          } else {
            // Fallback to displayName if applicant data doesn't exist
            setUserName(currentUser.displayName || "No Name");
          }
        } catch (error) {
          console.error("Error fetching applicant data:", error);
          // Fallback to displayName on error
          setUserName(currentUser.displayName || "No Name");
        }
      }
    };

    // Fetch data on mount
    fetchUserData();

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(() => {
      fetchUserData();
    });

    return () => unsubscribe();
  }, []);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <IverifiLogo />
        {/* <VersionSwitcher
          versions={data.versions}
          defaultVersion={data.versions[0]}
        />
        <SearchForm /> */}
        
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {/* {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))} */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: userName,
            email: userEmail,
            avatar: userAvatar,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
