import * as React from "react";
import { useEffect, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { auth } from "@/firebase/firebase_setup";
import { NavUser } from "./nav-user";
import { IverifiLogo } from "./iverifi-logo";
import { getApplicantProfileFromBackend } from "@/utils/syncApplicantProfile";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [userName, setUserName] = useState<string>("No Name");
  const [userEmail, setUserEmail] = useState<string>("no-email");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [userPhone, setUserPhone] = useState<string>("");

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;

      if (currentUser) {
        setUserEmail(currentUser.email || "no-email");
        setUserAvatar(currentUser.photoURL || "");

        try {
          const profile = await getApplicantProfileFromBackend();
          const firstName = profile.firstName ?? "";
          const lastName = profile.lastName ?? "";
          const name = profile.name ?? "";

          if (firstName || lastName) {
            setUserName(`${firstName} ${lastName}`.trim() || currentUser.displayName || "No Name");
          } else if (name) {
            setUserName(name);
          } else {
            setUserName(currentUser.displayName || "No Name");
          }

          setUserPhone((profile.phone || profile.phoneNumber || "") as string);
        } catch (error) {
          console.error("Error fetching applicant profile:", error);
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
            phone: userPhone || undefined,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
