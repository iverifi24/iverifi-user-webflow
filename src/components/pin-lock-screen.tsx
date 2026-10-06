import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { IverifiLogo } from "@/components/iverifi-logo";
import { savePinToFirestore, verifyPin } from "@/utils/pin";
import { useAuth } from "@/context/auth_context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Lock, Delete, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";

const BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_BASE_URL
    ? String(import.meta.env.VITE_BASE_URL).replace(/\/$/, "")
    : "";

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
    <div className="flex items-center justify-center gap-3 my-1">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-3 w-3 rounded-full transition-all duration-200",
            i < filled
              ? "bg-teal-400 scale-125 shadow-md shadow-teal-400/50 ring-2 ring-teal-400/30"
              : "bg-slate-700/80 border border-slate-600/50 scale-100"
          )}
        />
      ))}
    </div>
  );
}

// ─── Numeric Keypad ───────────────────────────────────────────────────────────

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

function Keypad({
  onDigit,
  onDelete,
  disabled,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-y-3 gap-x-4 w-full max-w-[240px] mx-auto">
      {KEYPAD_KEYS.map((k, i) => {
        if (k === "") return <div key={i} className="h-13 w-13" />;
        const isDelete = k === "delete";
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => (isDelete ? onDelete() : onDigit(k))}
            className={cn(
              "flex h-13 w-13 sm:h-14 sm:w-14 mx-auto items-center justify-center rounded-full transition-all duration-150 select-none cursor-pointer active:scale-90 disabled:opacity-40 text-xl font-bold",
              isDelete
                ? "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/60"
                : "border border-slate-700/70 bg-slate-800/80 text-white hover:bg-slate-700/90 hover:border-teal-400/60 hover:text-teal-300 shadow-sm active:scale-95"
            )}
          >
            {isDelete ? <Delete className="h-5 w-5" /> : k}
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

  // Lock body scroll completely when the PIN screen is open to eliminate dual scrollbars
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

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
            ? "Too many attempts. Please use Forgot PIN."
            : `Incorrect PIN (${5 - next} left)`
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
      const newHash = await savePinToFirestore(uid, value);
      setPinHash(newHash);
      setPinLocked(false);
      setNeedsPinSetup(false);
      toast.success("PIN set successfully");
      onUnlocked();
    } catch (err) {
      console.error("Failed to save PIN:", err);
      setError("Failed to save PIN. Please try again.");
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
      setScreen("forgot-reset");
      setPin("");
    } catch (err: any) {
      setError(err?.message || "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Keyboard support ──────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= "0" && e.key <= "9") {
      addDigit(e.key);
    } else if (e.key === "Backspace") {
      removeDigit();
    }
  };

  const isPinScreen =
    screen === "lock" ||
    screen === "setup" ||
    screen === "confirm" ||
    screen === "forgot-reset" ||
    screen === "forgot-confirm";

  const pinScreenTitle: Record<string, string> = {
    lock: "Enter your PIN",
    setup: "Set a Security PIN",
    confirm: "Confirm your PIN",
    "forgot-reset": "Enter new PIN",
    "forgot-confirm": "Confirm new PIN",
  };

  const pinScreenSubtitle: Record<string, string> = {
    lock: "Enter your 6-digit PIN to unlock your vault",
    setup: "Choose a 6-digit PIN to protect your digital identity",
    confirm: "Re-enter the 6-digit PIN to confirm",
    "forgot-reset": "Choose a new 6-digit PIN",
    "forgot-confirm": "Re-enter your new PIN",
  };

  const COUNTRY_CODES = [
    { code: "+91", label: "+91 (IN)" },
    { code: "+1", label: "+1 (US)" },
    { code: "+44", label: "+44 (UK)" },
    { code: "+61", label: "+61 (AU)" },
    { code: "+971", label: "+971 (AE)" },
  ];

  return (
    <div className="dark fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4">
      {/* Centered Glass Security Vault Card */}
      <div className="relative w-full max-w-[340px] rounded-3xl border border-slate-800/90 bg-slate-900/95 p-6 shadow-2xl shadow-black/80 backdrop-blur-2xl flex flex-col items-center gap-4 text-center my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-1.5">
          <IverifiLogo className="h-7 w-auto object-contain" />
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400 shadow-sm mt-0.5">
            <Lock className="h-4 w-4" />
          </div>
        </div>

        {/* ── PIN screens ── */}
        {isPinScreen && (
          <div className="flex flex-col items-center w-full gap-3">
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                {pinScreenTitle[screen]}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {pinScreenSubtitle[screen]}
              </p>
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
              <p className="text-[11px] text-rose-400 font-semibold text-center animate-in fade-in duration-200">
                {error}
              </p>
            )}

            <div className="w-full mt-1">
              <Keypad
                onDigit={addDigit}
                onDelete={removeDigit}
                disabled={isLoading || (screen === "lock" && attempts >= 5)}
              />
            </div>

            {screen === "lock" && (
              <button
                type="button"
                onClick={() => { setScreen("forgot-phone"); setError(""); }}
                className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 hover:underline pt-0.5 transition-colors cursor-pointer"
              >
                Forgot PIN?
              </button>
            )}
          </div>
        )}

        {/* ── Forgot PIN: enter phone ── */}
        {screen === "forgot-phone" && (
          <form onSubmit={handleForgotSendOtp} className="flex w-full flex-col gap-3.5 text-left">
            <div className="text-center">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Reset your PIN
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Enter your registered mobile number for an OTP.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-200">Mobile number</label>
              <div className="flex gap-1.5">
                <select
                  value={forgotCountryCode}
                  onChange={(e) => setForgotCountryCode(e.target.value)}
                  disabled={isLoading}
                  className="h-9 w-24 shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-2 text-xs text-white focus:outline-hidden focus:border-teal-500"
                >
                  {COUNTRY_CODES.map(({ code, label }) => (
                    <option key={code} value={code} className="bg-slate-900 text-white">{label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
                  disabled={isLoading}
                  className="h-9 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            {error && <p className="text-[11px] text-rose-400 font-semibold">{error}</p>}

            <Button
              type="submit"
              disabled={isLoading || forgotPhone.length < 6}
              className="h-9 w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl text-xs shadow-md shadow-teal-500/20 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {isLoading ? "Sending OTP…" : "Send Verification OTP →"}
            </Button>

            <button
              type="button"
              onClick={() => { setScreen("lock"); setError(""); }}
              className="text-[11px] text-center text-slate-400 hover:text-slate-200 font-medium hover:underline flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> Back to PIN entry
            </button>
          </form>
        )}

        {/* ── Forgot PIN: enter OTP ── */}
        {screen === "forgot-otp" && (
          <form onSubmit={handleForgotVerifyOtp} className="flex w-full flex-col gap-3.5 text-left">
            <div className="text-center">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Enter Verification OTP
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sent to {forgotCountryCode} {forgotPhone}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-200">6-Digit Code</label>
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
                className="h-10 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-center text-base font-bold tracking-[0.3em] text-white placeholder:text-slate-500 placeholder:tracking-normal focus:outline-hidden focus:border-teal-500"
              />
            </div>

            {error && <p className="text-[11px] text-rose-400 font-semibold">{error}</p>}

            <Button
              type="submit"
              disabled={isLoading || forgotOtp.length !== 6}
              className="h-9 w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl text-xs shadow-md shadow-teal-500/20 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {isLoading ? "Verifying…" : "Verify & Reset PIN"}
            </Button>

            <button
              type="button"
              onClick={() => { setScreen("forgot-phone"); setError(""); setForgotOtp(""); }}
              className="text-[11px] text-center text-slate-400 hover:text-slate-200 font-medium hover:underline flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> Change mobile number
            </button>
          </form>
        )}

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-800/80 w-full">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>Protected under DPDP Act 2023</span>
        </div>
      </div>
    </div>
  );
}
