import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import QrScanner from "qr-scanner";
import { useAddConnectionMutation } from "@/redux/api";
import { toast } from "sonner";

const AddConnectionModal = () => {
  const [open, setOpen] = useState(false); // ✅ Control dialog state
  const [type, setType] = useState<"individual" | "company" | null>(null);
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);

  const [addConnection, { isLoading }] = useAddConnectionMutation();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const handleSubmit = async () => {
    if (!code || !type) return;

    const formattedType = type === "company" ? "Company" : "Individual";

    try {
      await addConnection({
        document_id: code,
        type: formattedType,
      }).unwrap();

      toast.success("Connection invited successfully!");

      setOpen(false); // ✅ Close dialog on success
      setCode("");
      setType(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to invite connection.");
      console.error(err);
    }
  };

  const startScanner = async () => {
    if (!videoRef.current) return;

    const hasCamera = await QrScanner.hasCamera();
    if (!hasCamera) {
      toast.error("No camera found on this device.");
      return;
    }

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        setCode(result.data);
        setScanning(false);
        scanner.stop();
      },
      {
        highlightScanRegion: true,
        returnDetailedScanResult: true,
      }
    );

    scannerRef.current = scanner;
    scanner.start();
    setScanning(true);
  };

  useEffect(() => {
    if (!scanning && scannerRef.current) {
      scannerRef.current.stop();
    }

    return () => {
      scannerRef.current?.stop();
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [scanning]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Connection</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md space-y-4">
        <DialogHeader>
          <DialogTitle>Add Connection</DialogTitle>
        </DialogHeader>

        {/* Connection Type */}
        <div>
          <Label className="block mb-2">Connection Type</Label>
          <RadioGroup
            onValueChange={(val) => setType(val as any)}
            value={type || undefined}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="individual" id="individual" />
              <Label htmlFor="individual">Individual</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="company" id="company" />
              <Label htmlFor="company">Company</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Code input */}
        <div>
          <Label>{type === "company" ? "Company" : "Individual"} Code</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            className="mt-1"
          />
        </div>

        {/* QR Scanner */}
        {!scanning ? (
          <Button variant="outline" onClick={startScanner}>
            Scan QR Code
          </Button>
        ) : (
          <div className="space-y-2">
            <video
              ref={videoRef}
              className="w-full rounded-md border"
              muted
              playsInline
            />
            <Button variant="destructive" onClick={() => setScanning(false)}>
              Stop Scanning
            </Button>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSubmit} disabled={!type || !code || isLoading}>
            {isLoading ? "Sharing..." : "Share Connection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddConnectionModal;
