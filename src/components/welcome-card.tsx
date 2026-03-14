import { Button } from "@/components/ui/button";
import { QrCode, FilePlus } from "lucide-react";

interface WelcomeCardProps {
  /** User's first name for "Welcome back, {name}!" */
  userName?: string;
  onScanQR?: () => void;
  onAddDocument?: () => void;
  className?: string;
}

/**
 * Hero welcome card matching the mobile app: gradient teal/green,
 * greeting, tagline, and primary CTAs (Scan QR Code, Add Document).
 */
export function WelcomeCard({
  userName,
  onScanQR,
  onAddDocument,
  className = "",
}: WelcomeCardProps) {
  const greeting = userName ? `Welcome back, ${userName}!` : "Welcome back!";

  return (
    <div
      className={
        "rounded-2xl bg-gradient-to-b from-teal-600 to-emerald-500 p-6 shadow-lg shadow-teal-900/10 " +
        className
      }
    >
      <h2 className="text-xl font-bold text-white sm:text-2xl">{greeting}</h2>
      <p className="mt-1 text-sm text-white/90 sm:text-base">
        Manage your verified documents securely.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {onScanQR && (
          <Button
            type="button"
            variant="secondary"
            className="h-auto rounded-xl bg-white px-4 py-3 text-teal-700 shadow-sm hover:bg-white/95"
            onClick={onScanQR}
          >
            <QrCode className="mr-2 h-5 w-5" />
            Scan QR Code
          </Button>
        )}
        {onAddDocument && (
          <Button
            type="button"
            className="h-auto rounded-xl border-2 border-white/80 bg-white/20 px-4 py-3 text-white hover:bg-white/30"
            onClick={onAddDocument}
          >
            <FilePlus className="mr-2 h-5 w-5" />
            Add Document
          </Button>
        )}
      </div>
    </div>
  );
}
