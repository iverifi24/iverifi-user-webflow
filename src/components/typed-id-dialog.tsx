import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVsignMobileSendMutation, useVsignMobileVerifyMutation, useVsignVerifyMutation } from "@/redux/api";

interface Props {
  /** the document being verified (PAN_CARD, PASSPORT, VOTER_ID or MOBILE_NUMBER); null keeps the dialog closed */
  documentType: string | null;
  onClose: () => void;
  /** called after the credential is saved, so the screen can refresh */
  onVerified?: () => void;
}

const TITLE: Record<string, string> = {
  PAN_CARD: "Verify your PAN",
  PASSPORT: "Verify your passport",
  VOTER_ID: "Verify your voter ID",
  MOBILE_NUMBER: "Verify your mobile number",
};

const LABEL: Record<string, string> = {
  PAN_CARD: "PAN number",
  PASSPORT: "Passport file number",
  VOTER_ID: "Voter ID (EPIC) number",
};

const PLACEHOLDER: Record<string, string> = {
  PAN_CARD: "ABCDE1234F",
  PASSPORT: "As printed on the passport",
  VOTER_ID: "ABC1234567",
};

/** the server's sentence when it has one (it never repeats the vendor's wording), else a plain fallback */
const messageOf = (e: unknown): string => {
  const m = (e as { data?: { message?: string } })?.data?.message;
  return m || "We could not verify these details. Please try again.";
};

/**
 * Typed-number checks. The person enters the number (and a date of birth for a passport, or an OTP for a mobile number); the
 * server checks it, matches the name to the account and saves the credential. Nothing is checked here beyond "not empty": the
 * server owns the rules, so they cannot drift.
 */
export function TypedIdDialog({ documentType, onClose, onVerified }: Props) {
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [otp, setOtp] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verify, { isLoading: verifying }] = useVsignVerifyMutation();
  const [sendOtp, { isLoading: sending }] = useVsignMobileSendMutation();
  const [verifyOtp, { isLoading: checking }] = useVsignMobileVerifyMutation();

  useEffect(() => {
    setIdNumber("");
    setDob("");
    setOtp("");
    setRequestId(null);
    setError(null);
  }, [documentType]);

  if (!documentType) return null;
  const isMobile = documentType === "MOBILE_NUMBER";
  const busy = verifying || sending || checking;

  const done = () => {
    toast.success("Verified");
    onVerified?.();
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isMobile && !requestId) {
        const r = await sendOtp({ mobile: idNumber }).unwrap();
        setRequestId(r.data.request_id);
        return;
      }
      if (isMobile && requestId) {
        await verifyOtp({ request_id: requestId, otp }).unwrap();
        return done();
      }
      await verify({ document_type: documentType, id_number: idNumber, ...(documentType === "PASSPORT" ? { dob } : {}) }).unwrap();
      done();
    } catch (err) {
      setError(messageOf(err));
    }
  };

  const ready = isMobile
    ? requestId
      ? otp.trim().length >= 4
      : idNumber.trim().length >= 10
    : idNumber.trim().length > 0 && (documentType !== "PASSPORT" || dob.trim().length > 0);

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLE[documentType] ?? "Verify your document"}</DialogTitle>
          <DialogDescription>
            {isMobile
              ? requestId
                ? "Enter the OTP sent to your mobile number."
                : "We will send an OTP to this number."
              : "Enter the number exactly as printed. The name on it must match the name on your account."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {isMobile && requestId ? (
            <div className="space-y-1.5">
              <Label htmlFor="typed-id-otp">OTP</Label>
              <Input id="typed-id-otp" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} disabled={busy} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="typed-id-number">{isMobile ? "Mobile number" : LABEL[documentType] ?? "ID number"}</Label>
              <Input
                id="typed-id-number"
                value={idNumber}
                inputMode={isMobile ? "tel" : "text"}
                autoCapitalize="characters"
                placeholder={isMobile ? "10-digit mobile number" : PLACEHOLDER[documentType]}
                onChange={(e) => setIdNumber(e.target.value)}
                disabled={busy}
              />
            </div>
          )}
          {documentType === "PASSPORT" && (
            <div className="space-y-1.5">
              <Label htmlFor="typed-id-dob">Date of birth</Label>
              <Input id="typed-id-dob" placeholder="DD-MM-YYYY" inputMode="numeric" value={dob} onChange={(e) => setDob(e.target.value)} disabled={busy} />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 text-white" disabled={!ready || busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isMobile && !requestId ? "Send OTP" : "Verify"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
