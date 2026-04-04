import { useState } from "react";
import { Input } from "@/components/ui/input";
import { auth } from "@/firebase/firebase_setup";
import { getIdToken } from "firebase/auth";

export interface CFormPassportData {
  surname: string;
  givenName: string;
  nationality: string;
  passportNo: string;
  passportExpiry: string;
  dateOfBirth: string;
  passportImageUrl?: string;
}

export interface CFormManualData {
  sex: string;
  arrivalDate: string;
  portOfArrival: string;
  visaNo: string;
  visaType: string;
  addressInIndia: string;
}

export type CFormData = CFormPassportData & CFormManualData;

type Step = "passport_preview" | "passport_upload" | "passport_manual" | "manual" | "preview";

interface CFormDialogProps {
  open: boolean;
  passportData: CFormPassportData;
  onSave: (data: CFormData) => Promise<void>;
  onClose: () => void;
  mode?: "kwik" | "manual";
}

const SEX_OPTIONS = ["Male", "Female", "Other"] as const;
const VISA_TYPES = ["Tourist", "Business", "Medical", "Student", "Other"] as const;

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  border: "1.5px solid rgba(255,255,255,0.08)",
  color: "var(--iverifi-text-primary)",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--iverifi-label)",
  marginBottom: 6,
  display: "block",
};

const BTN_PRIMARY: React.CSSProperties = {
  width: "100%",
  padding: "15px",
  borderRadius: 14,
  background: "linear-gradient(135deg,#00e0ff,#7B5CF5)",
  border: "none",
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};

const BTN_SECONDARY: React.CSSProperties = {
  width: "100%",
  marginTop: 2,
  padding: "14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--iverifi-border-subtle)",
  color: "var(--iverifi-label)",
  fontSize: 14,
  cursor: "pointer",
};

export function CFormDialog({ open, passportData, onSave, onClose, mode = "kwik" }: CFormDialogProps) {
  const initialStep: Step = mode === "manual" ? "passport_upload" : "passport_preview";

  const [step, setStep] = useState<Step>(initialStep);
  const [saving, setSaving] = useState(false);
  const [manual, setManual] = useState<CFormManualData>({
    sex: "",
    arrivalDate: new Date().toISOString().split("T")[0],
    portOfArrival: "",
    visaNo: "",
    visaType: "Tourist",
    addressInIndia: "",
  });

  // Manual mode passport fields
  const [manualPassport, setManualPassport] = useState<CFormPassportData>({
    surname: "", givenName: "", nationality: "",
    passportNo: "", passportExpiry: "", dateOfBirth: "", passportImageUrl: "",
  });
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  if (!open) return null;

  const updateManual = (key: keyof CFormManualData, value: string) =>
    setManual((prev) => ({ ...prev, [key]: value }));

  const updateManualPassport = (key: keyof CFormPassportData, value: string) =>
    setManualPassport((prev) => ({ ...prev, [key]: value }));

  const canSubmit =
    manual.sex.trim() !== "" &&
    manual.portOfArrival.trim() !== "" &&
    manual.visaNo.trim() !== "" &&
    manual.addressInIndia.trim() !== "";

  const canProceedFromPassportManual =
    manualPassport.surname.trim() !== "" &&
    manualPassport.givenName.trim() !== "" &&
    manualPassport.passportNo.trim() !== "";

  const handlePassportImageSelect = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", "passport");
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");
      const token = await getIdToken(currentUser);
      const baseUrl = (import.meta.env.VITE_BASE_URL as string || "").replace(/\/$/, "");
      const resp = await fetch(`${baseUrl}/users/uploadImage`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await resp.json();
      if (!resp.ok || !json?.data?.s3url) throw new Error(json?.message || "Upload failed");
      setUploadedImageUrl(json.data.s3url);
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const passportPayload: CFormPassportData =
        mode === "manual"
          ? { ...manualPassport, passportImageUrl: uploadedImageUrl }
          : passportData;
      await onSave({ ...passportPayload, ...manual });
      // reset for next time
      setStep(initialStep);
      setManual({
        sex: "",
        arrivalDate: new Date().toISOString().split("T")[0],
        portOfArrival: "",
        visaNo: "",
        visaType: "Tourist",
        addressInIndia: "",
      });
      setManualPassport({ surname: "", givenName: "", nationality: "", passportNo: "", passportExpiry: "", dateOfBirth: "", passportImageUrl: "" });
      setUploadedImageUrl("");
      setUploadError("");
    } finally {
      setSaving(false);
    }
  };

  const dobToAgeLabel = (dob: string): string => {
    if (!dob) return "";
    const s = dob.trim();
    let d: Date | null = null;
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) d = new Date(`${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`);
    else {
      const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (ymd) d = new Date(`${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`);
      else d = new Date(s);
    }
    if (!d || Number.isNaN(d.getTime())) return "";
    return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) >= 18 ? "Above 18" : "Below 18";
  };

  // Source of truth for passport data depending on mode
  const activePassport = mode === "manual" ? manualPassport : passportData;

  const passportRows: [string, string][] = [
    ["Surname", activePassport.surname],
    ["Given name", activePassport.givenName],
    ["Nationality", activePassport.nationality],
    ["Passport No.", activePassport.passportNo],
    ["Expiry", activePassport.passportExpiry],
    ["Age", dobToAgeLabel(activePassport.dateOfBirth)],
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  const allFields: [string, string][] = [
    ["Surname", activePassport.surname],
    ["Given name", activePassport.givenName],
    ["Nationality", activePassport.nationality],
    ["Passport No.", activePassport.passportNo],
    ["Age", dobToAgeLabel(activePassport.dateOfBirth)],
    ["Sex", manual.sex],
    ["Arrival date", manual.arrivalDate],
    ["Port of arrival", manual.portOfArrival],
    ["Visa No.", manual.visaNo],
    ["Visa type", manual.visaType],
    ["Address in India", manual.addressInIndia],
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--iverifi-overlay)",
        backdropFilter: "blur(4px)",
        zIndex: 10100,
        display: "flex",
        alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxHeight: "96dvh",
          background: "var(--iverifi-sheet)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid var(--iverifi-sheet-border)",
          borderBottom: "none",
          overflowY: "auto",
          padding: "8px 20px calc(88px + env(safe-area-inset-bottom,0px))",
          animation: "slide-up .3s cubic-bezier(.34,1.56,.64,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "var(--iverifi-sheet-handle)",
            margin: "0 auto 20px",
          }}
        />

        {/* ── STEP: passport_upload (manual mode only) ── */}
        {step === "passport_upload" && (
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 6 }}>
              Upload passport photo
            </div>
            <div style={{ fontSize: 13, color: "var(--iverifi-label)", marginBottom: 20, lineHeight: 1.5 }}>
              Take a clear photo of your passport's data page. Required for FRRO compliance.
            </div>

            {/* Upload area */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                minHeight: 160,
                borderRadius: 16,
                border: `2px dashed ${uploadedImageUrl ? "rgba(0,200,150,0.4)" : "rgba(0,224,255,0.25)"}`,
                background: uploadedImageUrl ? "rgba(0,200,150,0.06)" : "rgba(0,224,255,0.04)",
                cursor: uploading ? "not-allowed" : "pointer",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePassportImageSelect(file);
                  e.target.value = "";
                }}
              />
              {uploading ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                  <div style={{ fontSize: 13, color: "var(--iverifi-label)" }}>Uploading…</div>
                </div>
              ) : uploadedImageUrl ? (
                <div style={{ textAlign: "center", width: "100%", padding: "12px 0" }}>
                  <img
                    src={uploadedImageUrl}
                    alt="Passport"
                    style={{ maxHeight: 140, maxWidth: "90%", borderRadius: 10, objectFit: "cover", margin: "0 auto", display: "block" }}
                  />
                  <div style={{ fontSize: 12, color: "#00c896", marginTop: 10, fontWeight: 600 }}>✓ Uploaded — tap to change</div>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--iverifi-text-primary)" }}>Tap to take photo or choose file</div>
                  <div style={{ fontSize: 12, color: "var(--iverifi-label)", marginTop: 4 }}>JPG, PNG accepted</div>
                </div>
              )}
            </label>

            {uploadError && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", borderRadius: 10, padding: "8px 12px" }}>
                {uploadError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                style={{ ...BTN_PRIMARY, opacity: uploadedImageUrl ? 1 : 0.4, cursor: uploadedImageUrl ? "pointer" : "not-allowed" }}
                disabled={!uploadedImageUrl || uploading}
                onClick={() => setStep("passport_manual")}
              >
                Continue — fill passport details →
              </button>
              <button type="button" style={BTN_SECONDARY} onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: passport_manual (manual mode only) ── */}
        {step === "passport_manual" && (
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 6 }}>
              Passport details
            </div>
            <div style={{ fontSize: 13, color: "var(--iverifi-label)", marginBottom: 18, lineHeight: 1.5 }}>
              Enter the details exactly as they appear on your passport. Fields marked * are required.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span style={LABEL_STYLE}>SURNAME *</span>
                <Input
                  style={FIELD_STYLE}
                  placeholder="Family name / last name"
                  value={manualPassport.surname}
                  onChange={(e) => updateManualPassport("surname", e.target.value)}
                />
              </div>
              <div>
                <span style={LABEL_STYLE}>GIVEN NAME *</span>
                <Input
                  style={FIELD_STYLE}
                  placeholder="First / given name"
                  value={manualPassport.givenName}
                  onChange={(e) => updateManualPassport("givenName", e.target.value)}
                />
              </div>
              <div>
                <span style={LABEL_STYLE}>PASSPORT NO. *</span>
                <Input
                  style={FIELD_STYLE}
                  placeholder="e.g. A1234567"
                  value={manualPassport.passportNo}
                  onChange={(e) => updateManualPassport("passportNo", e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <span style={LABEL_STYLE}>NATIONALITY</span>
                <Input
                  style={FIELD_STYLE}
                  placeholder="e.g. American, British"
                  value={manualPassport.nationality}
                  onChange={(e) => updateManualPassport("nationality", e.target.value)}
                />
              </div>
              <div>
                <span style={LABEL_STYLE}>EXPIRY DATE</span>
                <input
                  type="date"
                  style={FIELD_STYLE}
                  value={manualPassport.passportExpiry}
                  onChange={(e) => updateManualPassport("passportExpiry", e.target.value)}
                />
              </div>
              <div>
                <span style={LABEL_STYLE}>DATE OF BIRTH</span>
                <input
                  type="date"
                  style={FIELD_STYLE}
                  value={manualPassport.dateOfBirth}
                  onChange={(e) => updateManualPassport("dateOfBirth", e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                style={{ ...BTN_PRIMARY, opacity: canProceedFromPassportManual ? 1 : 0.4, cursor: canProceedFromPassportManual ? "pointer" : "not-allowed" }}
                disabled={!canProceedFromPassportManual}
                onClick={() => setStep("manual")}
              >
                Continue — travel details →
              </button>
              <button type="button" style={BTN_SECONDARY} onClick={() => setStep("passport_upload")}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: passport_preview (kwik mode) ── */}
        {step === "passport_preview" && (
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 6 }}>
              Passport details extracted
            </div>
            <div style={{ fontSize: 13, color: "var(--iverifi-label)", marginBottom: 16, lineHeight: 1.5 }}>
              These fields are auto-filled from your passport. Review and continue.
            </div>

            <div
              style={{
                background: "rgba(0,224,255,0.04)",
                border: "1px solid rgba(0,224,255,0.15)",
                borderRadius: 14,
                padding: "0 16px",
                marginBottom: 16,
              }}
            >
              {passportRows.map(([label, value], idx) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom:
                      idx === passportRows.length - 1
                        ? "none"
                        : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--iverifi-label)" }}>{label}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--iverifi-text-primary)",
                      fontFamily: "monospace",
                      textAlign: "right",
                      maxWidth: "60%",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" style={BTN_PRIMARY} onClick={() => setStep("manual")}>
                Continue — fill remaining fields →
              </button>
              <button type="button" style={BTN_SECONDARY} onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: manual (travel fields — both modes) ── */}
        {step === "manual" && (
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 6 }}>
              Complete C-Form
            </div>
            <div style={{ fontSize: 13, color: "var(--iverifi-label)", marginBottom: 18, lineHeight: 1.5 }}>
              {mode === "manual" ? "Fill in your travel details for FRRO compliance." : "Passport details are pre-filled. Please complete the remaining fields."}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* SEX */}
              <div>
                <span style={LABEL_STYLE}>SEX</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {SEX_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateManual("sex", s)}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 12,
                        border: manual.sex === s ? "1.5px solid var(--iverifi-accent, #00e0ff)" : "1.5px solid rgba(255,255,255,0.1)",
                        background: manual.sex === s ? "rgba(0,224,255,0.1)" : "rgba(255,255,255,0.04)",
                        color: manual.sex === s ? "#00e0ff" : "var(--iverifi-text-primary)",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* ARRIVAL DATE */}
              <div>
                <span style={LABEL_STYLE}>ARRIVAL DATE</span>
                <input
                  type="date"
                  style={FIELD_STYLE}
                  value={manual.arrivalDate}
                  onChange={(e) => updateManual("arrivalDate", e.target.value)}
                />
              </div>

              {/* PORT OF ARRIVAL */}
              <div>
                <span style={LABEL_STYLE}>PORT OF ARRIVAL</span>
                <Input
                  style={FIELD_STYLE}
                  placeholder="e.g. Bengaluru International Airport"
                  value={manual.portOfArrival}
                  onChange={(e) => updateManual("portOfArrival", e.target.value)}
                />
              </div>

              {/* VISA NO */}
              <div>
                <span style={LABEL_STYLE}>VISA NO.</span>
                <Input
                  style={FIELD_STYLE}
                  placeholder="e.g. IND202401234"
                  value={manual.visaNo}
                  onChange={(e) => updateManual("visaNo", e.target.value)}
                />
              </div>

              {/* VISA TYPE */}
              <div>
                <span style={LABEL_STYLE}>VISA TYPE</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {VISA_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateManual("visaType", t)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 12,
                        border: manual.visaType === t ? "1.5px solid var(--iverifi-accent, #00e0ff)" : "1.5px solid rgba(255,255,255,0.1)",
                        background: manual.visaType === t ? "rgba(0,224,255,0.1)" : "rgba(255,255,255,0.04)",
                        color: manual.visaType === t ? "#00e0ff" : "var(--iverifi-text-primary)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* ADDRESS IN INDIA */}
              <div>
                <span style={LABEL_STYLE}>ADDRESS IN INDIA (HOTEL)</span>
                <Input
                  style={FIELD_STYLE}
                  placeholder="Hotel name and full address"
                  value={manual.addressInIndia}
                  onChange={(e) => updateManual("addressInIndia", e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                style={{ ...BTN_PRIMARY, opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? "pointer" : "not-allowed" }}
                disabled={!canSubmit}
                onClick={() => setStep("preview")}
              >
                Save C-Form →
              </button>
              <button
                type="button"
                style={BTN_SECONDARY}
                onClick={() => setStep(mode === "manual" ? "passport_manual" : "passport_preview")}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: preview ── */}
        {step === "preview" && (
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 4 }}>
              C-Form ready
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                border: "1px solid rgba(0,200,150,0.2)",
                background: "rgba(0,200,150,0.1)",
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "#00c896",
                marginBottom: 16,
              }}
            >
              ✓ All fields complete
            </div>

            {/* Passport image thumbnail (manual mode) */}
            {mode === "manual" && uploadedImageUrl && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--iverifi-label)", marginBottom: 8 }}>
                  Passport scan
                </div>
                <img
                  src={uploadedImageUrl}
                  alt="Passport"
                  style={{ height: 72, width: 72, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            )}

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--iverifi-border-subtle)",
                borderRadius: 14,
                padding: "0 16px",
                marginBottom: 16,
              }}
            >
              {allFields.map(([label, value], idx) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom:
                      idx === allFields.length - 1 ? "none" : "1px solid var(--iverifi-row-divider)",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--iverifi-label)" }}>{label}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--iverifi-text-primary)",
                      fontFamily: "monospace",
                      textAlign: "right",
                      maxWidth: "65%",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: 12,
                background: "rgba(0,224,255,0.05)",
                border: "1px solid rgba(0,224,255,0.1)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--iverifi-hint-text)",
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              🔒 Only share with registered hotels for FRRO compliance.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                style={{ ...BTN_PRIMARY, opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Submitting..." : "Submit C-Form & Check In →"}
              </button>
              <button type="button" style={BTN_SECONDARY} onClick={() => setStep("manual")}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
