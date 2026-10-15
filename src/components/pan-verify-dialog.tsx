import { useState } from "react";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useVerifyPanMutation } from "@/redux/api";

interface Props {
  open: boolean;
  onClose: () => void;
  /** called with the new credential id once the PAN is verified and saved */
  onVerified: (documentId: string) => void;
}

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** 01011990 -> 01-01-1990 while typing */
const formatDob = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
};

/**
 * Verifies a PAN against the government record. The PAN is sent once over HTTPS and is never kept in the app:
 * the field is cleared on success, on close and when the dialog unmounts. The server stores only a masked value.
 */
export function PanVerifyDialog({ open, onClose, onVerified }: Props) {
  const [pan, setPan] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [verifyPan, { isLoading }] = useVerifyPanMutation();

  const reset = () => {
    setPan("");
    setName("");
    setDob("");
    setConsent(false);
    setError("");
  };
  const close = () => {
    if (isLoading) return;
    reset();
    onClose();
  };

  const panOk = PAN_RE.test(pan);
  const dobOk = /^\d{2}-\d{2}-\d{4}$/.test(dob);
  const canSubmit = panOk && dobOk && name.trim().length >= 2 && consent && !isLoading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    try {
      const res = await verifyPan({ pan, name: name.trim(), dob, consent: true }).unwrap();
      const id = res?.data?.document_id as string;
      reset();
      onVerified(id);
    } catch (err) {
      // the server's message is written for the user ("name does not match…", "already linked…")
      setError((err as { data?: { message?: string } })?.data?.message || "Could not verify your PAN. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--iverifi-accent)]" /> Verify your PAN
          </DialogTitle>
          <DialogDescription>
            We check your PAN with the Income Tax Department. Only a masked version (XXXXXX234F) is kept.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" autoComplete="off">
          <div className="space-y-1.5">
            <Label htmlFor="pan-number">PAN number</Label>
            <Input
              id="pan-number"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
              placeholder="ABCDE1234F"
              maxLength={10}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              aria-invalid={pan.length === 10 && !panOk}
            />
            {pan.length === 10 && !panOk && <p className="text-xs text-red-500">A PAN looks like ABCDE1234F.</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pan-name">Name as printed on the PAN card</Label>
            <Input
              id="pan-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              placeholder="Full name"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pan-dob">Date of birth (DD-MM-YYYY)</Label>
            <Input
              id="pan-dob"
              value={dob}
              onChange={(e) => setDob(formatDob(e.target.value))}
              placeholder="DD-MM-YYYY"
              inputMode="numeric"
              maxLength={10}
              autoComplete="off"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-[var(--iverifi-text-muted)]">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span>I agree to iVerifi checking my PAN with the Income Tax Department and saving a masked copy.</span>
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </p>
          )}

          <Button type="submit" variant="brand" className="w-full h-11" disabled={!canSubmit}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              "Verify PAN"
            )}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--iverifi-text-muted)]">
            <Lock className="h-3 w-3" /> Sent securely. Your full PAN is not saved.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
