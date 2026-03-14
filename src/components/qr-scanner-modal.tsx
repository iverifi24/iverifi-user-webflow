import { useRef, useEffect, useState } from "react";
import QrScanner from "qr-scanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the extracted venue/document code when a QR code is successfully scanned */
  onScanSuccess: (code: string) => void;
  /** Optional: validate the scanned value before calling onScanSuccess; return true to accept */
  validateCode?: (code: string) => boolean;
}

/**
 * Extracts venue/document code from a scanned string (URL with ?code=... or raw code).
 */
function extractCodeFromScan(data: string): string {
  const trimmed = data.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("code");
    if (code) return code;
  } catch {
    // not a URL, use as raw code
  }
  return trimmed;
}

export function QRScannerModal({
  open,
  onOpenChange,
  onScanSuccess,
  validateCode,
}: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCameraError(null);
      setStarting(false);
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    let mounted = true;
    // Wait for dialog portal and video to be in the DOM before starting camera
    const id = setTimeout(async () => {
      const video = videoRef.current;
      if (!mounted || !video) return;

    const start = async () => {
      setStarting(true);
      setCameraError(null);
      try {
        const hasCamera = await QrScanner.hasCamera();
        if (!mounted) return;
        if (!hasCamera) {
          setCameraError("No camera found on this device.");
          setStarting(false);
          return;
        }

        // Prefer "user" (front camera) so laptop webcams work; "environment" is often only on phones
        const scanner = new QrScanner(
          video,
          (result) => {
            const raw = typeof result === "string" ? result : result.data;
            const code = extractCodeFromScan(raw);
            if (!code) return;
            if (validateCode && !validateCode(code)) {
              toast.error("Invalid QR code. Please scan a valid venue code.");
              return;
            }
            scannerRef.current?.stop();
            scannerRef.current?.destroy();
            scannerRef.current = null;
            onScanSuccess(code);
            onOpenChange(false);
          },
          {
            preferredCamera: "user",
            highlightScanRegion: true,
            returnDetailedScanResult: true,
          }
        );
        scannerRef.current = scanner;
        // Let the dialog and video element finish mounting before starting the stream
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (!mounted) return;
        await scanner.start();
        if (!mounted) {
          scanner.stop();
          scanner.destroy();
        }
      } catch (err: unknown) {
        if (!mounted) return;
        const message =
          err instanceof Error ? err.message : "Could not access camera.";
        setCameraError(message);
        toast.error(message);
      } finally {
        if (mounted) setStarting(false);
      }
    };

      start();
    }, 150);

    return () => {
      clearTimeout(id);
      mounted = false;
      const video = videoRef.current;
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
    };
  }, [open, onOpenChange, onScanSuccess, validateCode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md overflow-hidden p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg">Scan QR Code</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-square w-full bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            autoPlay
          />
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center text-white">
              <p className="text-sm">{cameraError}</p>
              <p className="text-xs text-white/80">
                You can still add a code manually from the connection page.
              </p>
            </div>
          )}
          {starting && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-white">
              <p className="text-sm">Starting camera…</p>
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 rounded-full"
            onClick={() => onOpenChange(false)}
            aria-label="Close scanner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="p-4 pt-2 text-center text-sm text-muted-foreground">
          Point your camera at a venue or document QR code.
        </p>
      </DialogContent>
    </Dialog>
  );
}
