import { useMemo, useState, type JSX } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Activity, BadgeCheck, Lock, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { useAddConnectionMutation } from "@/redux/api";
import { determineConnectionType, isValidQRCode } from "@/utils/qr-code-utils";

type BottomNavItem =
  | {
      type: "navigate";
      path: string;
      label: string;
      Icon: (props: { active: boolean }) => JSX.Element;
    }
  | {
      type: "scan";
      label: string;
      Icon: (props: { active: boolean }) => JSX.Element;
    };

function VaultIcon({ active }: { active: boolean }) {
  return <Lock className="h-6 w-6" color={active ? "var(--iverifi-accent)" : "var(--iverifi-inactive-icon)"} />;
}
function ScanIcon({ active }: { active: boolean }) {
  return (
    <ScanLine
      className="h-6 w-6"
      color={active ? "var(--iverifi-accent)" : "var(--iverifi-inactive-icon)"}
    />
  );
}
function AgeIcon({ active }: { active: boolean }) {
  return (
    <BadgeCheck
      className="h-6 w-6"
      color={active ? "var(--iverifi-accent)" : "var(--iverifi-inactive-icon)"}
    />
  );
}
function ActivityIcon({ active }: { active: boolean }) {
  return (
    <Activity
      className="h-6 w-6"
      color={active ? "var(--iverifi-accent)" : "var(--iverifi-inactive-icon)"}
    />
  );
}

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scanOpen, setScanOpen] = useState(false);
  const [addConnection, { isLoading }] = useAddConnectionMutation();

  const pathname = location.pathname;

  const items: BottomNavItem[] = useMemo(
    () => [
      { type: "navigate", path: "/", label: "Vault", Icon: VaultIcon },
      { type: "scan", label: "Scan", Icon: ScanIcon },
      { type: "navigate", path: "/age-check", label: "18+", Icon: AgeIcon },
      {
        type: "navigate",
        path: "/my-activity",
        label: "Activity",
        Icon: ActivityIcon,
      },
    ],
    []
  );

  const activeForItem = (item: BottomNavItem): boolean => {
    if (item.type === "scan") return pathname.startsWith("/connections");
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
      // Same destination as camera / deep link: home with ?code= opens hotel share flow + auto share sheet
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
              className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto"
              style={{ paddingBottom: "0px" }}
            >
              <div
                className="w-full rounded-t-2xl rounded-b-2xl border px-2 py-2 shadow-lg dark:shadow-[0_0_40px_rgba(2,6,23,0.6)]"
                style={{
                  backgroundColor: "var(--iverifi-nav-bg)",
                  borderColor: "var(--iverifi-nav-border)",
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  {items.map((item) => {
                    const active = activeForItem(item);
                    const Icon = item.Icon;

                    const onClick = () => {
                      if (item.type === "scan") {
                        setScanOpen(true);
                        return;
                      }
                      navigate(item.path);
                    };

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={onClick}
                        disabled={isLoading && item.type === "scan"}
                        className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5"
                      >
                        <div
                          className={
                            active
                              ? "flex h-2 w-2 items-center justify-center rounded-full bg-[var(--iverifi-accent)] shadow-[0_0_18px_rgba(0,224,255,0.4)]"
                              : "invisible h-2 w-2 rounded-full bg-[var(--iverifi-accent)]"
                          }
                        />
                        <Icon active={active} />
                        <span
                          className={
                            active
                              ? "text-xs font-semibold text-[var(--iverifi-accent)]"
                              : "text-xs font-semibold text-muted-foreground"
                          }
                        >
                          {item.label}
                        </span>
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

