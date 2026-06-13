import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AuthHeroHeader } from "@/components/auth-hero-header";
import { savePinToFirestore, verifyPin } from "@/utils/pin";
import { useAuth } from "@/context/auth_context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_BASE_URL
    ? String(import.meta.env.VITE_BASE_URL).replace(/\/$/, "")
    : "";

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen =
  | "lock"
  | "setup"
  | "confirm"
  | "forgot-phone"
  | "forgot-otp"
  | "forgot-reset"
  | "forgot-confirm";

interface Props {
  uid: string;
  mode: "lock" | "setup";
  onUnlocked: () => void;
}

// ─── PIN Dot Row ──────────────────────────────────────────────────────────────

function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="flex items-center justify-center gap-4">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 w-4 rounded-full border-2 transition-all duration-150",
            i < filled
              ? "border-sky-400 bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
              : "border-border bg-transparent"
          )}
        />
      ))}
    </div>
  );
}

// ─── Numeric Keypad ───────────────────────────────────────────────────────────

function Keypad({
  onDigit,
  onDelete,
  disabled,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((k, i) => {
        if (k === "") return <div key={i} />;
        const isDelete = k === "⌫";
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => (isDelete ? onDelete() : onDigit(k))}
            className={cn(
              "flex h-16 items-center justify-center rounded-2xl text-xl font-semibold transition-all duration-150 active:scale-95 disabled:opacity-40",
              isDelete
                ? "bg-muted/70 text-muted-foreground hover:bg-muted"
                : "bg-muted text-foreground hover:bg-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            )}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PinLockScreen({ uid, mode, onUnlocked }: Props) {
  const { pinHash, setPinHash, setPinLocked, setNeedsPinSetup } = useAuth();

  const [screen, setScreen] = useState<Screen>(mode);
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  // Forgot PIN – phone OTP state
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotCountryCode, setForgotCountryCode] = useState("+91");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotSessionId, setForgotSessionId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const PIN_LENGTH = 6;

  useEffect(() => {
    inputRef.current?.focus();
    setPin("");
    setError("");
  }, [screen]);

  // ── Digit entry ──────────────────────────────────────────────────────────

  const addDigit = (d: string) => {
    if (pin.length >= PIN_LENGTH || isLoading) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === PIN_LENGTH) {
      handlePinComplete(next);
    }
  };

  const removeDigit = () => {
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  // ── PIN complete handlers ─────────────────────────────────────────────────

  const handlePinComplete = async (value: string) => {
    if (screen === "lock") {
      await handleUnlock(value);
    } else if (screen === "setup" || screen === "forgot-reset") {
      setFirstPin(value);
      setScreen(screen === "setup" ? "confirm" : "forgot-confirm");
      setPin("");
    } else if (screen === "confirm" || screen === "forgot-confirm") {
      await handleConfirm(value);
    }
  };

  const handleUnlock = async (value: string) => {
    if (!pinHash) return;
    setIsLoading(true);
    try {
      const ok = await verifyPin(pinHash, value);
      if (ok) {
        onUnlocked();
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setError(
          next >= 5
            ? "Too many wrong attempts. Please use Forgot PIN."
            : `Incorrect PIN. ${5 - next} attempt${5 - next === 1 ? "" : "s"} left.`
        );
        setPin("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (value: string) => {
    if (value !== firstPin) {
      setError("PINs don't match. Try again.");
      setScreen(screen === "confirm" ? "setup" : "forgot-reset");
      setPin("");
      return;
    }
    setIsLoading(true);
    try {
      // Save to Firestore — source of truth
      const newHash = await savePinToFirestore(uid, value);
      // Update in-memory context so visibilitychange lock works immediately
      setPinHash(newHash);
      setPinLocked(false);
      setNeedsPinSetup(false);
      toast.success("PIN set successfully");
      onUnlocked();
    } catch (err) {
      console.error("Failed to save PIN:", err);
      setError("Failed to save PIN. Please check your connection and try again.");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Forgot PIN – send OTP ─────────────────────────────────────────────────

  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = `${forgotCountryCode}${forgotPhone.replace(/\D/g, "")}`;
    if (raw.length < 10) {
      setError("Enter a valid phone number");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/users/phone/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: raw }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data?.sessionId) {
        throw new Error(json?.message || "Failed to send OTP. Try again.");
      }
      setForgotSessionId(json.data.sessionId);
      setForgotOtp("");
      setScreen("forgot-otp");
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Forgot PIN – verify OTP ───────────────────────────────────────────────

  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = forgotOtp.replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    const raw = `${forgotCountryCode}${forgotPhone.replace(/\D/g, "")}`;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/users/phone/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: forgotSessionId, otp: code, phone: raw }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data?.token) {
        throw new Error(json?.message || "Invalid or expired code. Request a new one.");
      }
      // Phone verified — allow PIN reset
      setScreen("forgot-reset");
      setPin("");
      setFirstPin("");
    } catch (err: any) {
      setError(err?.message || "Verification failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Keyboard support ──────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= "0" && e.key <= "9") addDigit(e.key);
    else if (e.key === "Backspace") removeDigit();
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const isPinScreen = ["lock", "setup", "confirm", "forgot-reset", "forgot-confirm"].includes(screen);

  const pinScreenTitle: Record<string, string> = {
    lock: "Enter your PIN",
    setup: "Set up a PIN",
    confirm: "Confirm your PIN",
    "forgot-reset": "Enter new PIN",
    "forgot-confirm": "Confirm new PIN",
  };

  const pinScreenSubtitle: Record<string, string> = {
    lock: "Enter your 6-digit PIN to unlock",
    setup: "Choose a 6-digit PIN to secure your wallet",
    confirm: "Re-enter the PIN to confirm",
    "forgot-reset": "Choose a new 6-digit PIN",
    "forgot-confirm": "Re-enter the new PIN",
  };

  const COUNTRY_CODES = [
    { code: "+91", label: "India (+91)" },
    { code: "+1", label: "US / Canada (+1)" },
    { code: "+44", label: "UK (+44)" },
    { code: "+61", label: "Australia (+61)" },
    { code: "+971", label: "UAE (+971)" },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-background px-6 py-8 overflow-y-auto">
      {/* Header */}
      <AuthHeroHeader />

      {/* Content */}
      <div className="flex w-full max-w-sm flex-col items-center gap-5">

        {/* ── PIN screens ── */}
        {isPinScreen && (
          <>
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-xl font-semibold text-foreground">
                {pinScreenTitle[screen]}
              </h1>
              <p className="text-sm text-muted-foreground">{pinScreenSubtitle[screen]}</p>
            </div>

            {/* Hidden input for physical keyboard entry */}
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              className="absolute opacity-0 w-0 h-0"
              onKeyDown={handleKeyDown}
              readOnly
              value=""
              onChange={() => {}}
            />

            <PinDots length={PIN_LENGTH} filled={pin.length} />

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <div className="w-full">
              <Keypad onDigit={addDigit} onDelete={removeDigit} disabled={isLoading || (screen === "lock" && attempts >= 5)} />
            </div>

            {screen === "lock" && (
              <button
                type="button"
                onClick={() => { setScreen("forgot-phone"); setError(""); }}
                className="text-sm text-sky-400 underline underline-offset-4 hover:text-sky-300"
              >
                Forgot PIN?
              </button>
            )}
          </>
        )}

        {/* ── Forgot PIN: enter phone ── */}
        {screen === "forgot-phone" && (
          <form onSubmit={handleForgotSendOtp} className="flex w-full flex-col gap-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-xl font-semibold text-foreground">Reset your PIN</h1>
              <p className="text-sm text-muted-foreground">
                Enter your registered phone number to receive a verification code.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-foreground/90">Mobile number</label>
              <div className="flex gap-2">
                <select
                  value={forgotCountryCode}
                  onChange={(e) => setForgotCountryCode(e.target.value)}
                  disabled={isLoading}
                  className="h-11 w-28 shrink-0 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/70"
                >
                  {COUNTRY_CODES.map(({ code, label }) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
                  disabled={isLoading}
                  className="h-11 flex-1 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/70"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={isLoading || forgotPhone.length < 6}
              className="h-11 w-full bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold shadow-[0_0_18px_rgba(0,224,255,0.35)] hover:from-[#40e8ff] hover:to-[#9274ff]"
            >
              {isLoading ? "Sending…" : "Send OTP →"}
            </Button>

            <button
              type="button"
              onClick={() => { setScreen("lock"); setError(""); }}
              className="text-sm text-muted-foreground hover:text-foreground/70 underline underline-offset-4"
            >
              Back to PIN entry
            </button>
          </form>
        )}

        {/* ── Forgot PIN: enter OTP ── */}
        {screen === "forgot-otp" && (
          <form onSubmit={handleForgotVerifyOtp} className="flex w-full flex-col gap-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-xl font-semibold text-foreground">Enter verification code</h1>
              <p className="text-sm text-muted-foreground">
                A 6-digit code was sent to {forgotCountryCode} {forgotPhone}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-foreground/90">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={forgotOtp}
                onChange={(e) => {
                  setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                disabled={isLoading}
                className="h-11 w-full rounded-xl border border-border bg-card px-4 text-center text-lg tracking-[0.4em] text-foreground placeholder:text-muted-foreground placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-sky-500/70"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={isLoading || forgotOtp.length !== 6}
              className="h-11 w-full bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 font-semibold shadow-[0_0_18px_rgba(0,224,255,0.35)] hover:from-[#40e8ff] hover:to-[#9274ff]"
            >
              {isLoading ? "Verifying…" : "Verify"}
            </Button>

            <button
              type="button"
              onClick={() => { setScreen("forgot-phone"); setError(""); setForgotOtp(""); }}
              className="text-sm text-muted-foreground hover:text-foreground/70 underline underline-offset-4"
            >
              Resend / change number
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-muted-foreground/60 pb-2">
        iVerifi · Data protected under DPDP Act 2023
      </p>
    </div>
  );
}
