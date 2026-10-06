import { useState, useRef } from "react";
import { auth } from "@/firebase/firebase_setup";
import { getIdToken } from "firebase/auth";
import {
  Loader2,
  Camera,
  FileText,
  UserCheck,
  Aperture,
  Lock,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
    passport: "",
    visa: "",
    selfie: "",
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
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
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
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

  const renderStepBadge = (n: number, label: string) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="inline-flex items-center rounded-full border border-[var(--iverifi-accent-border)] bg-[var(--iverifi-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--iverifi-accent)]">
        Step {n} of 3
      </span>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-y-auto p-6 sm:p-7 flex flex-col gap-4 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle / Close */}
        <div className="flex items-center justify-between pb-1 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--iverifi-accent-soft)] border border-[var(--iverifi-accent-border)] flex items-center justify-center text-[var(--iverifi-accent)]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Foreign National Registration</h2>
              <p className="text-xs text-muted-foreground">FRRO / C-Form Compliance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploadError && (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-medium leading-relaxed">
            {uploadError}
          </div>
        )}

        {/* STEP 1: Passport */}
        {step === "passport" && (
          <div className="space-y-4">
            {renderStepBadge(1, "Passport Bio-Data Page")}
            <div>
              <h3 className="text-lg font-bold text-foreground">Passport Photo Page</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Take a clear, glare-free photo of your passport's bio-data page showing your full name, photo, and passport number.
              </p>
            </div>

            <label
              htmlFor="fp-passport-upload"
              className={`w-full p-4 rounded-xl border border-[var(--iverifi-accent-border)] bg-[var(--iverifi-accent-soft)] hover:opacity-90 flex items-center gap-3.5 cursor-pointer transition-all shadow-xs ${
                uploading ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--iverifi-accent)]/20 border border-[var(--iverifi-accent-border)] flex items-center justify-center text-[var(--iverifi-accent)] shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-foreground">Upload Passport Photo</p>
                <p className="text-xs text-muted-foreground">Camera or file browser</p>
              </div>
              {uploading && <Loader2 className="w-4 h-4 animate-spin text-[var(--iverifi-accent)] ml-auto" />}
              <input
                id="fp-passport-upload"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect("passport", f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}

        {/* STEP 2: Visa / Stamp */}
        {step === "visa" && (
          <div className="space-y-4">
            {renderStepBadge(2, "Visa or Entry Stamp")}
            <div>
              <h3 className="text-lg font-bold text-foreground">Visa or Immigration Stamp</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Photo of your Indian visa sticker or the entry stamp endorsed in your passport upon arrival.
              </p>
            </div>

            {photos.passport && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-emerald-500/30 bg-muted">
                  <img src={photos.passport} alt="Passport thumbnail" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" /> Passport photo captured
                </div>
              </div>
            )}

            <label
              htmlFor="fp-visa-upload"
              className={`w-full p-4 rounded-xl border border-[var(--iverifi-accent-border)] bg-[var(--iverifi-accent-soft)] hover:opacity-90 flex items-center gap-3.5 cursor-pointer transition-all shadow-xs ${
                uploading ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--iverifi-accent)]/20 border border-[var(--iverifi-accent-border)] flex items-center justify-center text-[var(--iverifi-accent)] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-foreground">Upload Visa or Entry Stamp</p>
                <p className="text-xs text-muted-foreground">Camera or file browser</p>
              </div>
              {uploading && <Loader2 className="w-4 h-4 animate-spin text-[var(--iverifi-accent)] ml-auto" />}
              <input
                id="fp-visa-upload"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect("visa", f);
                  e.target.value = "";
                }}
              />
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("passport")}
              className="w-full gap-1.5 border-border"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Passport
            </Button>
          </div>
        )}

        {/* STEP 3: Selfie */}
        {step === "selfie" && (
          <div className="space-y-4">
            {renderStepBadge(3, "Live Selfie Verification")}
            <div>
              <h3 className="text-lg font-bold text-foreground">Take a Quick Selfie</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Ensure your face is clearly visible without glasses or hats for liveness verification.
              </p>
            </div>

            {!cameraActive && !photos.selfie && (
              <Button
                type="button"
                onClick={startCamera}
                className="w-full h-12 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold gap-2"
              >
                <Camera className="w-4 h-4" /> Open Camera
              </Button>
            )}

            {cameraActive && (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-52 h-52 rounded-2xl overflow-hidden bg-black border border-border shadow-inner">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-40 h-40 rounded-full border-2 border-dashed border-cyan-400/70" />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={captureSelfie}
                  className="w-full h-11 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold gap-2"
                >
                  <Aperture className="w-4 h-4" /> Capture Photo
                </Button>
              </div>
            )}

            {photos.selfie && !cameraActive && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-44 h-44 rounded-2xl overflow-hidden border border-border bg-muted">
                  <img src={photos.selfie} alt="Selfie preview" className="w-full h-full object-cover" />
                </div>
                <Button
                  type="button"
                  onClick={() => setStep("preview")}
                  className="w-full h-11 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold"
                >
                  Looks Good →
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPhotos((p) => ({ ...p, selfie: "" }));
                    startCamera();
                  }}
                  className="w-full gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Retake Selfie
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                stopCamera();
                setStep("visa");
              }}
              className="w-full gap-1.5 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Visa
            </Button>
          </div>
        )}

        {/* STEP 4: Review & Confirm */}
        {step === "preview" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Review Documents</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                These documents will be shared with the establishment for your regulatory verification and visit record.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { key: "passport", label: "Passport", icon: <FileText className="w-5 h-5 text-muted-foreground" /> },
                { key: "visa", label: "Visa / Stamp", icon: <FileText className="w-5 h-5 text-muted-foreground" /> },
                { key: "selfie", label: "Selfie", icon: <UserCheck className="w-5 h-5 text-muted-foreground" /> },
              ].map(({ key, label, icon }) => {
                const src = photos[key as keyof typeof photos];
                return (
                  <div key={key} className="flex flex-col items-center gap-1.5">
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center">
                      {src ? (
                        <img src={src} alt={label} className="w-full h-full object-cover" />
                      ) : (
                        icon
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl border border-[var(--iverifi-accent-border)] bg-[var(--iverifi-accent-soft)] flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
              <Lock className="w-4 h-4 text-[var(--iverifi-accent)] shrink-0 mt-0.5" />
              <span>Documents transmitted securely under DPDP Act 2023. Accessible only to the authorized establishment.</span>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Documents…
                </>
              ) : (
                "Submit & Verify →"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("selfie")}
              disabled={saving}
              className="w-full gap-1.5 border-border"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Selfie
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
