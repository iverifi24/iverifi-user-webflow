import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HeaderProfileMenu } from "@/components/header-profile-menu";

const ProtectedLayout = () => {
  return (
    <SidebarProvider>
      {/* <AppSidebar /> */}
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="flex h-18 shrink-0 items-center justify-between gap-2 border-b pl-0 pr-4 min-w-0 overflow-hidden md:px-4">
          <div className="-ml-[120px] flex h-24 min-w-[320px] shrink-0 items-center justify-start overflow-hidden rounded-lg pr-2 md:min-w-[420px] md:-ml-[140px] md:pl-0">
            <div className="flex origin-[0_50%] items-center justify-start scale-[6] md:origin-left">
              <IverifiLogo
                containerClassName="inline-flex shrink-0 justify-start"
                className="h-[56px] w-[90px] min-w-[90px] shrink-0 object-contain object-left align-bottom md:w-[75px] md:min-w-[75px]"
              />
            </div>
          </div>
          <div className="flex items-center">
            <HeaderProfileMenu />
          </div>
        {/* <NavUser
          user={{
            name: auth.currentUser?.displayName || "No Name",
            email: auth.currentUser?.email || "no-email",
            avatar: auth.currentUser?.photoURL || "", // fallback image URL can be added here
          }}
        /> */}
          {/* <SidebarTrigger className="-ml-1" /> */}
          {/* <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Page</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb> */}
        </header>

        {/* Render your actual page content here */}
        <main className="flex flex-1 flex-col gap-4 p-4">
          <Outlet />
          <Toaster />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ProtectedLayout;
