import { AuthTabs } from "@/components/auth-tabs";
import { Toaster } from "@/components/ui/sonner";
import { IverifiLogo } from "@/components/iverifi-logo";

export default function SignupPage() {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10 overflow-x-hidden">
        <div className="flex w-full max-w-sm flex-col gap-2">
          <IverifiLogo />
          <AuthTabs />
        </div>
        <Toaster />
      </div>
    );
}
