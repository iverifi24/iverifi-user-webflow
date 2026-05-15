import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  syncApplicantProfileToBackend,
  getApplicantProfileFromBackend,
} from "@/utils/syncApplicantProfile";
import {
  useUpdateCredentialsRequestMutation,
  useUpdateCheckInStatusMutation,
} from "@/redux/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { IverifiLogo } from "@/components/iverifi-logo";
import type { FlowCredential } from "./guest-checkin-flow";

function extractNameFromCredential(cred: FlowCredential | null): { firstName: string; lastName: string } {
  if (!cred) return { firstName: "", lastName: "" };

  const tryKeys = (obj: any, keys: string[]): string => {
    for (const k of keys) {
      const val = obj?.[k];
      if (val && typeof val === "string") return val.trim();
    }
    return "";
  };

  const step =
    (cred as any)?.session_data_array?.extras?.session_data?.summary_data?.data?.[0] ??
    (cred as any)?.sessionDataArray?.extras?.session_data?.summary_data?.data?.[0] ??
    {};
  const ocr = step?.ocr && typeof step.ocr === "object" ? step.ocr : {};
  const digilocker = step?.digilocker_data?.[0]?.data ?? {};

  const fullName =
    tryKeys(ocr, ["name", "fullname", "full_name", "Name", "holder_name", "card_holder_name", "applicant_name"]) ||
    tryKeys(digilocker, ["name", "fullname", "full_name", "Name", "holder_name"]) ||
    tryKeys(cred, ["name", "fullname", "full_name", "holder_name"]);

  if (!fullName) return { firstName: "", lastName: "" };
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

interface Props {
  hotelName: string;
  phone: string;
  credential: FlowCredential | null;
  credentials: FlowCredential[];
  connectionId: string;
  startedAt: number;
  onSuccess: (result: "approved" | "pending") => void;
  onError: (msg: string) => void;
  onCredentialChange: (c: FlowCredential) => void;
}

export default function GuestDetails({
  hotelName,
  phone,
  credential,
  credentials,
  connectionId,
  startedAt,
  onSuccess,
  onError,
}: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneInput, setPhoneInput] = useState(phone ?? "");
  useEffect(() => { if (phone && !phoneInput) setPhoneInput(phone); }, [phone]);
  const [submitting, setSubmitting] = useState(false);

  const [updateCredentialsRequest] = useUpdateCredentialsRequestMutation();
  const [updateCheckInStatus] = useUpdateCheckInStatusMutation();

  const selected = credential ?? credentials[0] ?? null;

  // Pre-fill name: try OCR first, then fall back to saved backend profile
  useEffect(() => {
    const { firstName: fn, lastName: ln } = extractNameFromCredential(credential);
    if (fn) {
      setFirstName(fn);
      setLastName(ln);
      return;
    }
    getApplicantProfileFromBackend()
      .then((profile) => {
        if (profile.firstName) setFirstName(profile.firstName);
        setLastName(profile.lastName ?? "");
        if (profile.email) setEmail(profile.email);
      })
      .catch(() => {});
  }, [credential?.id]);

  const handleSubmit = useCallback(async () => {
    const isManualUpload = selected?.id === "manual";
    if (!firstName.trim()) { toast.error("Please enter your first name"); return; }
    if (!selected || !connectionId) {
      onError("No credential selected. Please go back and try again.");
      return;
    }

    setSubmitting(true);
    try {
      // Save profile
      await syncApplicantProfileToBackend({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        ...(email.trim() && { email: email.trim() }),
        ...(phoneInput.trim() && { phone: phoneInput.trim(), phoneNumber: phoneInput.trim() }),
        profile_completion_level: 2,
      });

      if (!isManualUpload) {
        // Share KYC credential
        const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        await updateCredentialsRequest({
          credential_request_id: connectionId,
          credentials: [
            {
              credential_id: selected.id,
              document_type: selected.document_type,
              status: "Active",
              expiry_date: expiryDate,
            },
          ],
        }).unwrap();
      }

      // Submit check-in
      const checkInRes = await updateCheckInStatus({
        credential_request_id: connectionId,
        status: "checkin",
        credential_id: isManualUpload ? null : selected.id,
        document_type: selected.document_type,
        client_started_at: startedAt,
      }).unwrap();

      const isAutoApproved =
        checkInRes?.data?.status === "approved" ||
        checkInRes?.message?.toLowerCase().includes("recorded") ||
        checkInRes?.message?.toLowerCase().includes("approved");

      onSuccess(isAutoApproved ? "approved" : "pending");
    } catch (err: any) {
      const status = err?.status ?? err?.originalStatus;
      if (status === 403) {
        onError("This property has reached its check-in limit. Please speak to the front desk.");
      } else {
        onError(err?.data?.message || err?.message || "Failed to submit check-in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [firstName, lastName, email, phoneInput, selected, connectionId, startedAt, updateCredentialsRequest, updateCheckInStatus, onSuccess, onError]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex justify-center">
          <IverifiLogo />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-1">Your details</h1>
          <p className="text-sm text-muted-foreground">
            Used for your check-in record at{" "}
            <strong className="text-foreground">{hotelName}</strong>
          </p>
        </div>

        <Card className="border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]">
          <CardContent className="pt-5 flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Arjun"
                  disabled={submitting}
                  className="bg-background border-[color:var(--iverifi-card-border)]"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  disabled={submitting}
                  className="bg-background border-[color:var(--iverifi-card-border)]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Phone Number</Label>
              <Input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Phone number"
                type="tel"
                disabled={submitting}
                className="bg-background border-[color:var(--iverifi-card-border)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Email{" "}
                <span className="text-muted-foreground/60 font-normal">— optional</span>
              </Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
                disabled={submitting}
                className="bg-background border-[color:var(--iverifi-card-border)]"
              />
            </div>

            <div
              className="flex gap-3 rounded-lg p-3"
              style={{
                background: "var(--iverifi-accent-soft)",
                border: "1px solid var(--iverifi-accent-border)",
              }}
            >
              <span className="text-base flex-shrink-0">🔐</span>
              <p className="text-xs text-muted-foreground leading-snug">
                <strong className="text-foreground">Documents are never stored.</strong> iVeriFi
                reads only verified status from govt portals. DPDP Act 2023 compliant.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          disabled={!firstName.trim() || submitting}
          onClick={handleSubmit}
          className="w-full h-12 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold shadow-[0_0_24px_rgba(0,224,255,0.3)] hover:from-[#40e8ff] hover:to-[#9274ff] disabled:opacity-40"
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin inline-block" />
          ) : (
            `Confirm & Share with ${hotelName} →`
          )}
        </Button>
      </div>
    </div>
  );
}
