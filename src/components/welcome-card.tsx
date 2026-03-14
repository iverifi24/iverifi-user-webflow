import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

interface WelcomeCardProps {
  /** User's first name for "Welcome back, {name}!" */
  userName?: string;
  onScanQR?: () => void;
  className?: string;
}

/**
 * Welcome card: solid teal, formal copy, Scan QR CTA. DigiLocker-level tone.
 */
export function WelcomeCard({
  userName,
  onScanQR,
  className = "",
}: WelcomeCardProps) {
  const greeting = userName ? `Welcome back, ${userName}` : "Welcome back";

  return (
    <div
      className={
        "rounded-lg border border-teal-200 bg-teal-600 p-6 shadow-md " + className
      }
    >
      <h2 className="text-xl font-semibold text-white sm:text-2xl">{greeting}</h2>
      <p className="mt-1.5 text-sm text-white/90 sm:text-base">
        Your verified documents are stored securely.
      </p>
      <p className="mt-1.5 text-sm text-white/80 sm:text-base">
        Scan a QR code at the property to share your documents.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {onScanQR && (
          <Button
            type="button"
            variant="secondary"
            className="h-auto rounded-lg bg-white px-4 py-2.5 text-teal-700 shadow-sm hover:bg-white/95"
            onClick={onScanQR}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Scan QR Code
          </Button>
        )}
      </div>
    </div>
  );
}
