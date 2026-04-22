import { useState, useRef } from "react";
import { auth } from "@/firebase/firebase_setup";
import { getIdToken } from "firebase/auth";
import { Loader2 } from "lucide-react";

export interface ForeignPassportPhotos {
  passportPhotoUrl: string;
  visaPhotoUrl: string;
  selfiePhotoUrl: string;
}

interface Props {
  open: boolean;
  onSave: (data: ForeignPassportPhotos) => Promise<void>;
  onClose: () => void;
}

type Step = "passport" | "visa" | "selfie" | "preview";

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
  background: "var(--iverifi-muted-surface)",
  border: "1px solid var(--iverifi-border-subtle)",
  color: "var(--iverifi-label)",
  fontSize: 14,
  cursor: "pointer",
};

async function uploadImageFile(file: File): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");
  const token = await getIdToken(currentUser);
  const baseUrl = (import.meta.env.VITE_BASE_URL as string || "").replace(/\/$/, "");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileType", "foreign_passport");
  const resp = await fetch(`${baseUrl}/users/uploadImage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const json = await resp.json();
  if (!resp.ok || !json?.data?.s3url) throw new Error(json?.message || "Upload failed");
  return json.data.s3url;
}

export function ForeignPassportDialog({ open, onSave, onClose }: Props) {
  const [step, setStep] = useState<Step>("passport");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [photos, setPhotos] = useState<{ passport: string; visa: string; selfie: string }>({
    passport: "", visa: "", selfie: "",
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  if (!open) return null;

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    setUploadError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch {
      setUploadError("Camera not available. Please upload a photo instead.");
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 480;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    stopCamera();
    setPhotos((p) => ({ ...p, selfie: dataUrl }));
  };

  const handleFileSelect = async (field: "passport" | "visa", file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const url = await uploadImageFile(file);
      setPhotos((p) => ({ ...p, [field]: url }));
      setStep(field === "passport" ? "visa" : "selfie");
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // selfie may be a data URL (base64) from camera — upload it
      let selfieUrl = photos.selfie;
      if (selfieUrl.startsWith("data:")) {
        const resp = await fetch(selfieUrl);
        const blob = await resp.blob();
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        selfieUrl = await uploadImageFile(file);
      }
      await onSave({
        passportPhotoUrl: photos.passport,
        visaPhotoUrl: photos.visa,
        selfiePhotoUrl: selfieUrl,
      });
      // reset
      setStep("passport");
      setPhotos({ passport: "", visa: "", selfie: "" });
      setUploadError("");
    } catch (e: any) {
      setUploadError(e?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setStep("passport");
    setPhotos({ passport: "", visa: "", selfie: "" });
    setUploadError("");
    onClose();
  };

  const stepBadge = (n: number, label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{
        padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
        background: "var(--iverifi-accent-soft)", color: "var(--iverifi-accent)",
        border: "1px solid var(--iverifi-accent-border)",
      }}>Step {n} of 3</span>
      <span style={{ fontSize: 13, color: "var(--iverifi-hint-text)" }}>{label}</span>
    </div>
  );

  const uploadCard = (icon: string, title: string, subtitle: string, inputId: string, onFile: (f: File) => void, demoLabel: string, onDemo: () => void, backLabel?: string, onBack?: () => void) => (
    <>
      <label
        htmlFor={inputId}
        style={{
          width: "100%", padding: "16px 20px", borderRadius: 14, boxSizing: "border-box",
          background: "linear-gradient(135deg,#00e0ff,#7B5CF5)",
          border: "none", cursor: uploading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 14, marginBottom: 10,
          opacity: uploading ? 0.6 : 1,
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 11, background: "rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18,
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{subtitle}</div>
        </div>
        {uploading && <Loader2 className="h-4 w-4 animate-spin text-white ml-auto" />}
        <input
          id={inputId} type="file" accept="image/*" capture="environment"
          style={{ display: "none" }} disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />
      </label>
      <button type="button" onClick={onDemo} disabled={uploading} style={{ ...BTN_SECONDARY, marginTop: 0, marginBottom: 10 }}>
        {demoLabel}
      </button>
      {onBack && (
        <button type="button" onClick={onBack} style={{ ...BTN_SECONDARY, marginTop: 0 }}>
          {backLabel || "← Back"}
        </button>
      )}
    </>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "flex-end" }}
      onClick={handleClose}
    >
      <div
        style={{
          width: "100%", maxHeight: "92dvh", background: "var(--iverifi-surface-0)",
          borderRadius: "24px 24px 0 0", border: "1px solid var(--iverifi-card-border)",
          borderBottom: "none", overflowY: "auto",
          padding: "8px 20px calc(40px + env(safe-area-inset-bottom,0px))",
          animation: "slide-up .3s cubic-bezier(.34,1.56,.64,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--iverifi-border-subtle)", margin: "0 auto 20px" }} />

        {uploadError && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--iverifi-error-soft)", border: "1px solid var(--iverifi-error-border)", color: "var(--iverifi-error)", fontSize: 13, marginBottom: 14 }}>
            {uploadError}
          </div>
        )}

        {/* ── STEP 1: Passport ── */}
        {step === "passport" && (
          <>
            {stepBadge(1, "Passport Photo")}
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 6 }}>
              Passport photo page
            </div>
            <div style={{ fontSize: 13, color: "var(--iverifi-hint-text)", marginBottom: 16, lineHeight: 1.5 }}>
              Take a clear photo of the page showing your photo and personal details.
            </div>
            {uploadCard(
              "📷", "Upload passport photo", "Camera or gallery",
              "fp-passport-upload",
              (f) => handleFileSelect("passport", f),
              "Demo — use sample photo",
              () => { setPhotos((p) => ({ ...p, passport: "demo" })); setStep("visa"); },
            )}
          </>
        )}

        {/* ── STEP 2: Visa / immigration stamp ── */}
        {step === "visa" && (
          <>
            {stepBadge(2, "Visa / Immigration Stamp")}
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 6 }}>
              Visa or immigration stamp
            </div>
            <div style={{ fontSize: 13, color: "var(--iverifi-hint-text)", marginBottom: 14, lineHeight: 1.5 }}>
              Photo of your visa sticker or the entry stamp in your passport.
            </div>
            {/* Passport thumbnail */}
            {photos.passport && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: 10, background: "var(--iverifi-success-soft)", borderRadius: 12, border: "1px solid var(--iverifi-success-border)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--iverifi-muted-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {photos.passport !== "demo" && photos.passport
                    ? <img src={photos.passport} alt="passport" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 18 }}>📷</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--iverifi-success)", fontWeight: 600 }}>✓ Passport photo saved</div>
              </div>
            )}
            {uploadCard(
              "📄", "Upload visa / stamp photo", "Camera or gallery",
              "fp-visa-upload",
              (f) => handleFileSelect("visa", f),
              "Demo — use sample photo",
              () => { setPhotos((p) => ({ ...p, visa: "demo" })); setStep("selfie"); startCamera(); },
              "← Back",
              () => setStep("passport"),
            )}
          </>
        )}

        {/* ── STEP 3: Selfie ── */}
        {step === "selfie" && (
          <>
            {stepBadge(3, "Selfie")}
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 6 }}>
              Take a selfie
            </div>
            <div style={{ fontSize: 13, color: "var(--iverifi-hint-text)", marginBottom: 14, lineHeight: 1.5 }}>
              Your face must be clearly visible.
            </div>
            {!cameraActive && !photos.selfie && (
              <button type="button" onClick={startCamera} style={{ ...BTN_PRIMARY, marginBottom: 10 }}>
                🤳 Open camera
              </button>
            )}
            {cameraActive && (
              <>
                <div style={{ width: 200, height: 200, margin: "0 auto 12px", background: "#000", borderRadius: 16, overflow: "hidden", position: "relative" }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <div style={{ width: "70%", height: "70%", borderRadius: "50%", border: "2px dashed rgba(0,224,255,0.5)" }} />
                  </div>
                </div>
                <button type="button" onClick={captureSelfie} style={{ ...BTN_PRIMARY, marginBottom: 10 }}>📸 Capture</button>
                <button type="button" onClick={() => { stopCamera(); setPhotos((p) => ({ ...p, selfie: "demo" })); }} style={{ ...BTN_SECONDARY, marginTop: 0, marginBottom: 10 }}>
                  Skip — use demo
                </button>
              </>
            )}
            {photos.selfie && !cameraActive && (
              <>
                <div style={{ width: 200, height: 200, margin: "0 auto 12px", borderRadius: 16, overflow: "hidden", background: "var(--iverifi-muted-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {photos.selfie !== "demo"
                    ? <img src={photos.selfie} alt="selfie" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ textAlign: "center" }}><div style={{ fontSize: 64 }}>👤</div><div style={{ fontSize: 13, color: "var(--iverifi-hint-text)", marginTop: 8 }}>Photo captured</div></div>}
                </div>
                <button type="button" onClick={() => setStep("preview")} style={{ ...BTN_PRIMARY, marginBottom: 10 }}>
                  Looks good →
                </button>
                <button type="button" onClick={() => { setPhotos((p) => ({ ...p, selfie: "" })); startCamera(); }} style={{ ...BTN_SECONDARY, marginTop: 0, marginBottom: 10 }}>
                  Retake
                </button>
              </>
            )}
            <button type="button" onClick={() => { stopCamera(); setStep("visa"); }} style={{ ...BTN_SECONDARY, marginTop: 0 }}>
              ← Back
            </button>
          </>
        )}

        {/* ── PREVIEW / CONFIRM ── */}
        {step === "preview" && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 6 }}>
              Review photos
            </div>
            <div style={{ fontSize: 13, color: "var(--iverifi-hint-text)", marginBottom: 16, lineHeight: 1.5 }}>
              These will be shared with the hotel for your check-in.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { key: "passport", label: "Passport", icon: "📷" },
                { key: "visa", label: "Visa / Stamp", icon: "📄" },
                { key: "selfie", label: "Selfie", icon: "🤳" },
              ].map(({ key, label, icon }) => {
                const src = photos[key as keyof typeof photos];
                return (
                  <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: "100%", aspectRatio: "1", borderRadius: 12, overflow: "hidden", background: "var(--iverifi-muted-surface)", border: "1px solid var(--iverifi-card-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {src && src !== "demo"
                        ? <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 28 }}>{icon}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--iverifi-label)", fontWeight: 600 }}>{label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: 12, background: "var(--iverifi-accent-soft)", border: "1px solid var(--iverifi-accent-border)", borderRadius: 12, marginBottom: 16, fontSize: 12, color: "var(--iverifi-hint-text)", lineHeight: 1.6 }}>
              🔐 Photos stored securely. Only this hotel can view them.
            </div>
            <button type="button" onClick={handleSave} disabled={saving} style={{ ...BTN_PRIMARY, marginBottom: 10, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit & Check In →"}
            </button>
            <button type="button" onClick={() => setStep("selfie")} disabled={saving} style={BTN_SECONDARY}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
