import { useMemo, useState, type JSX } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Wallet,
  Building2,
  ScanLine,
  BadgeCheck,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { useAddConnectionMutation, useGetConnectionsQuery } from "@/redux/api";
import { determineConnectionType, isValidQRCode } from "@/utils/qr-code-utils";

type BottomNavItem =
  | {
      type: "navigate";
      path: string;
      label: string;
      badge?: number;
      Icon: (props: { active: boolean }) => JSX.Element;
    }
  | {
      type: "scan";
      label: string;
    };

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scanOpen, setScanOpen] = useState(false);
  const [addConnection, { isLoading: isAddingConnection }] = useAddConnectionMutation();
  const { data: connectionsData } = useGetConnectionsQuery();

  const pathname = location.pathname;

  const pendingCount = useMemo(() => {
    const requests = connectionsData?.data?.requests || [];
    return requests.filter((r: any) => r?.check_in_status === "pending").length;
  }, [connectionsData]);

  const items: BottomNavItem[] = useMemo(
    () => [
      {
        type: "navigate",
        path: "/",
        label: "Wallet",
        Icon: ({ active }) => (
          <Wallet
            className={`h-5 w-5 transition-transform duration-200 ${
              active ? "text-teal-600 dark:text-cyan-400 scale-110" : "text-muted-foreground"
            }`}
          />
        ),
      },
      {
        type: "navigate",
        path: "/connections",
        label: "Connections",
        badge: pendingCount > 0 ? pendingCount : undefined,
        Icon: ({ active }) => (
          <Building2
            className={`h-5 w-5 transition-transform duration-200 ${
              active ? "text-teal-600 dark:text-cyan-400 scale-110" : "text-muted-foreground"
            }`}
          />
        ),
      },
      {
        type: "scan",
        label: "Scan",
      },
      {
        type: "navigate",
        path: "/age-check",
        label: "18+ Proof",
        Icon: ({ active }) => (
          <BadgeCheck
            className={`h-5 w-5 transition-transform duration-200 ${
              active ? "text-teal-600 dark:text-cyan-400 scale-110" : "text-muted-foreground"
            }`}
          />
        ),
      },
      {
        type: "navigate",
        path: "/my-activity",
        label: "Activity",
        Icon: ({ active }) => (
          <History
            className={`h-5 w-5 transition-transform duration-200 ${
              active ? "text-teal-600 dark:text-cyan-400 scale-110" : "text-muted-foreground"
            }`}
          />
        ),
      },
    ],
    [pendingCount]
  );

  const activeForItem = (item: BottomNavItem): boolean => {
    if (item.type === "scan") return false;
    if (item.path === "/") return pathname === "/" || pathname === "/home";
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  };

  const handleScanSuccess = async (code: string) => {
    if (!isValidQRCode(code)) {
      toast.error("Invalid QR code.");
      return;
    }
    try {
      const type = determineConnectionType(code);
      await addConnection({
        document_id: code,
        type,
      }).unwrap();
      navigate(`/?code=${encodeURIComponent(code)}`);
    } catch (e) {
      console.error("Scan add connection failed:", e);
      toast.error("Could not process scanned code.");
    } finally {
      setScanOpen(false);
    }
  };

  return (
    <>
      <QRScannerModal
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScanSuccess={handleScanSuccess}
        validateCode={(c) => isValidQRCode(c)}
      />
      {typeof document !== "undefined"
        ? createPortal(
            <nav
              className="fixed bottom-0 left-0 right-0 z-40 pointer-events-auto flex justify-center pb-safe"
              aria-label="Mobile Navigation"
            >
              <div className="w-full max-w-md mx-auto px-4 pb-3 pt-1">
                <div className="relative flex items-center justify-between rounded-2xl border border-border/70 bg-card/90 px-2 py-1.5 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-border/40 dark:bg-slate-900/90 dark:shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
                  {items.map((item) => {
                    if (item.type === "scan") {
                      return (
                        <div key="scan-button" className="relative -top-4 flex items-center justify-center px-1">
                          <button
                            type="button"
                            onClick={() => setScanOpen(true)}
                            disabled={isAddingConnection}
                            aria-label="Scan QR code"
                            className="group relative flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-400 text-white shadow-lg shadow-teal-500/30 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
                          >
                            <span className="absolute -inset-1 rounded-full bg-teal-400/20 blur-xs transition-all group-hover:bg-teal-400/40 animate-pulse" />
                            <ScanLine className="relative h-6 w-6 stroke-[2.2] transition-transform group-hover:scale-110" />
                          </button>
                        </div>
                      );
                    }

                    const active = activeForItem(item);
                    const Icon = item.Icon;

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => navigate(item.path)}
                        className={`group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 px-1 transition-all ${
                          active ? "text-teal-600 dark:text-cyan-400 font-bold" : "text-muted-foreground hover:text-foreground font-medium"
                        }`}
                      >
                        <div className="relative flex items-center justify-center">
                          <Icon active={active} />
                          {item.badge ? (
                            <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] tracking-tight leading-none">
                          {item.label}
                        </span>
                        {active && (
                          <span className="h-1 w-1 rounded-full bg-teal-600 dark:bg-cyan-400 animate-in fade-in zoom-in-50 duration-200" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>,
            document.body
          )
        : null}
    </>
  );
}
