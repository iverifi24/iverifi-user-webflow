import { AuthHeroHeader } from "@/components/auth-hero-header";
import { AuthTabs } from "@/components/auth-tabs";
import { Toaster } from "@/components/ui/sonner";

/**
 * Auth layout: min full viewport height; page scrolls when content is taller (e.g. email signup form).
 */
export function AuthScreenLayout() {
  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-background px-3 py-2 pb-6 text-foreground sm:px-4 sm:py-3 sm:pb-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 sm:gap-3">
        <AuthHeroHeader />

        <div className="w-full max-w-xl">
          <AuthTabs className="w-full" />
        </div>
      </div>

      <Toaster />
    </div>
  );
}
