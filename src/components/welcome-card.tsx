import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

interface WelcomeCardProps {
  /** User's first name for "Welcome back, {name}!" */
  userName?: string;
  onScanQR?: () => void;
  className?: string;
}

/**
 * Hero welcome card: gradient teal/green, greeting, tagline, and Scan QR Code CTA.
 */
export function WelcomeCard({
  userName,
  onScanQR,
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
      <p className="mt-2 text-sm text-white/80 sm:text-base">
        Scan a QR code at your hotel to share your documents with them.
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
      </div>
    </div>
  );
}
