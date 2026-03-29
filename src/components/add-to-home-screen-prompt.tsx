import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Smartphone, Share } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "iverifi_install_prompt_dismissed";
const DISMISS_DAYS = 7;

function getDismissedAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const t = parseInt(raw, 10);
  return Number.isFinite(t) ? t : null;
}

function setDismissedAt(): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function shouldShowAgain(dismissedAt: number | null): boolean {
  if (!dismissedAt) return true;
  const elapsed = Date.now() - dismissedAt;
  return elapsed > DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window as Window & { standalone?: boolean }).standalone === true ||
    nav.standalone === true
  );
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function AddToHomeScreenPrompt() {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isStandalone()) return;
    if (!isMobile()) return;
    if (!shouldShowAgain(getDismissedAt())) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // If no beforeinstallprompt after a short delay, show anyway (e.g. iOS) so user can add manually
    const t = window.setTimeout(() => {
      if (!isStandalone() && isMobile() && shouldShowAgain(getDismissedAt())) {
        setVisible(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(t);
    };
  }, [mounted]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setShowIosInstructions(false);
    setDismissedAt();
  }, []);

  const handleAddClick = useCallback(async () => {
    if (installEvent) {
      installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
        setDismissedAt();
      }
      setInstallEvent(null);
      return;
    }
    if (isIOS()) {
      setShowIosInstructions(true);
    } else {
      handleDismiss();
    }
  }, [installEvent, handleDismiss]);

  if (!visible || !mounted) return null;

  return (
    <>
      <div className="fixed inset-0 z-[10000] bg-[var(--iverifi-overlay)] sm:hidden" aria-hidden onClick={handleDismiss} />
      <div
        className={cn(
          "fixed left-0 right-0 bottom-0 z-[10001] sm:hidden",
          "rounded-t-2xl bg-[var(--iverifi-sheet)] border-t border-[var(--iverifi-sheet-border)]",
          "shadow-[0_-4px_24px_rgba(0,0,0,0.24)]"
        )}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col gap-4 p-4 pt-3">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--iverifi-icon-box-bg)] border border-[var(--iverifi-icon-box-border)]">
              <img
                src="/new_no_bg.png"
                alt=""
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[var(--iverifi-text-primary)]">Add iVerifi to your home screen</h3>
              <p className="mt-0.5 text-sm text-[var(--iverifi-text-muted)]">
                Open with one tap and use it like an app—no browser bar, quicker access.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded-full p-1.5 text-[var(--iverifi-close-text)] hover:bg-[var(--iverifi-close-bg)] hover:text-[var(--iverifi-text-secondary)]"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {showIosInstructions ? (
            <div className="flex items-start gap-2 rounded-xl bg-[var(--iverifi-surface-2)] border border-[var(--iverifi-border-subtle)] p-3 text-left">
              <Share className="h-5 w-5 shrink-0 text-teal-500 mt-0.5" />
              <div className="text-sm text-[var(--iverifi-text-secondary)]">
                <p className="font-medium">On this device:</p>
                <p className="mt-1">Tap the <strong>Share</strong> button (square with arrow) at the bottom of Safari, then choose <strong>Add to Home Screen</strong>.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleAddClick}
                className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 font-medium"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Add to Home Screen
              </Button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-sm text-[var(--iverifi-text-muted)] hover:text-[var(--iverifi-text-secondary)]"
              >
                Not now
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
