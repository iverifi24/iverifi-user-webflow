import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Grid3x3,
  FileText,
  Send,
  Lock,
  ArrowDown,
  X,
  CheckCircle,
} from "lucide-react";
import { useGetRecipientCredentialsQuery } from "@/redux/api";
import { setTermsAccepted } from "@/utils/terms";
import { useAuth } from "@/context/auth_context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase_setup";
import { saveRecipientIdForLater } from "@/utils/connectionFlow";
import { AuthHeroHeader } from "@/components/auth-hero-header";

export default function TermsAcceptance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const code = searchParams.get("code");

  const { data: recipientData } = useGetRecipientCredentialsQuery(
    code || "",
    { skip: !code }
  );

  const connectionName =
    recipientData?.data?.requests?.[0]?.recipients?.name ||
    recipientData?.data?.requests?.[0]?.recipients?.firstName ||
    "Hotel";

  // Mobile: scale to fit one screen + width compensation so it stays full width. Desktop: scale to fit one screen.
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const updateScale = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const mobile = vw < 640;
      const contentHeight = mobile ? 1200 : 1000;
      const padding = mobile ? 20 : 48;
      const s = Math.min(1, (vh - padding) / contentHeight);
      setScale(s);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const handleAccept = async () => {
    if (!acceptedTerms) return;
    if (!user?.uid) return;

    setIsSaving(true);
    const getRedirectPath = async () => {
      try {
        const userDocRef = doc(db, "applicants", user.uid);
        const userDoc = await getDoc(userDocRef);
        const profileCompletionLevel =
          userDoc.data()?.profile_completion_level || 0;
        if (profileCompletionLevel < 10) {
          if (code) saveRecipientIdForLater(code);
          return "/complete-profile";
        }
        return code ? `/?code=${code}` : "/";
      } catch {
        if (code) saveRecipientIdForLater(code);
        return code ? "/complete-profile" : "/";
      }
    };

    try {
      await setTermsAccepted(true, user.uid);
      const { isTermsAccepted: checkTerms } = await import("@/utils/terms");
      let verified = false;
      let retries = 0;
      while (!verified && retries < 5) {
        await new Promise((r) => setTimeout(r, 300));
        verified = await checkTerms(user.uid);
        if (verified) break;
        retries++;
      }
      const redirectPath = await getRedirectPath();
      navigate(redirectPath);
    } catch {
      const redirectPath = await getRedirectPath();
      navigate(redirectPath);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden w-full py-3 sm:py-4 bg-[var(--iverifi-page)] text-[var(--iverifi-text-primary)]">
      {/* Scale to fit one screen; on mobile width compensation keeps it full width */}
      <div className="flex-1 min-h-0 flex items-start sm:items-center justify-center overflow-hidden pt-2 sm:pt-0 sm:py-4 w-full">
        <div
          className={`w-full sm:max-w-4xl sm:mx-auto pt-2 sm:pt-12 origin-top sm:origin-center min-w-0 px-4 sm:px-6 ${
            scale < 1 ? "shrink-0" : ""
          }`}
          style={{
            transform: `scale(${scale})`,
            ...(scale < 1
              ? {
                  width: `${(1 / scale) * 100}vw`,
                  marginLeft: "auto",
                  marginRight: "auto",
                }
              : {}),
          }}
        >
          <div className="mb-6 sm:mb-8">
            <AuthHeroHeader />
          </div>

          {/* Main Card - reduced side padding on mobile for wider content area */}
          <Card className="w-full bg-[var(--iverifi-card)] border border-[color:var(--iverifi-card-border)] shadow-lg dark:shadow-[0_18px_45px_rgba(0,0,0,0.85)]">
            <CardContent className="px-2 py-4 sm:p-5 space-y-3 sm:space-y-4">
              {/* How It Works - compact 3-step row with arrows */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-[var(--iverifi-text-primary)]">
                  How It Works
                </h2>
                {/* Desktop: cards in a row with horizontal arrows (right → left). Mobile: stacked with vertical arrows (bottom → top). */}
                <div className="hidden sm:flex items-stretch justify-between gap-3">
                  <Card className="flex-1 bg-[var(--iverifi-muted-surface)] border border-[color:var(--iverifi-card-border)]">
                    <CardContent className="px-3 py-2 flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-[var(--iverifi-icon-box-bg)] border border-[color:var(--iverifi-icon-box-border)] p-1.5 rounded-lg shrink-0">
                          <Grid3x3 className="h-4 w-4 text-sky-400" />
                        </div>
                        <h3 className="font-medium text-sm text-[var(--iverifi-text-primary)]">
                          Scan QR Code
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Open verification on your phone.
                      </p>
                    </CardContent>
                  </Card>
                  <div className="flex items-center">
                    <ArrowDown className="h-4 w-4 -rotate-90 text-slate-500" />
                  </div>
                  <Card className="flex-1 bg-[var(--iverifi-muted-surface)] border border-[color:var(--iverifi-card-border)]">
                    <CardContent className="px-3 py-2 flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-[var(--iverifi-icon-box-bg)] border border-[color:var(--iverifi-icon-box-border)] p-1.5 rounded-lg shrink-0">
                          <FileText className="h-4 w-4 text-sky-400" />
                        </div>
                        <h3 className="font-medium text-sm text-[var(--iverifi-text-primary)]">
                          Verify Documents
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Connect to DigiLocker or govt portals.
                      </p>
                    </CardContent>
                  </Card>
                  <div className="flex items-center">
                    <ArrowDown className="h-4 w-4 -rotate-90 text-slate-500" />
                  </div>
                  <Card className="flex-1 bg-[var(--iverifi-muted-surface)] border border-[color:var(--iverifi-card-border)]">
                    <CardContent className="px-3 py-2 flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-[var(--iverifi-icon-box-bg)] border border-[color:var(--iverifi-icon-box-border)] p-1.5 rounded-lg shrink-0">
                          <Send className="h-4 w-4 text-sky-400" />
                        </div>
                        <h3 className="font-medium text-sm text-[var(--iverifi-text-primary)]">
                          Share Verified Result
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Only &apos;verified ✓&apos; status sent to{" "}
                        {connectionName}.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Mobile layout (top-down arrows) */}
                <div className="sm:hidden space-y-2">
                  <Card className="bg-[var(--iverifi-muted-surface)] border border-[color:var(--iverifi-card-border)]">
                    <CardContent className="px-3 py-2 flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-[var(--iverifi-icon-box-bg)] border border-[color:var(--iverifi-icon-box-border)] p-1.5 rounded-lg shrink-0">
                          <Grid3x3 className="h-4 w-4 text-sky-400" />
                        </div>
                        <h3 className="font-medium text-sm text-[var(--iverifi-text-primary)]">
                          Scan QR Code
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Open verification on your phone.
                      </p>
                    </CardContent>
                  </Card>
                  <div className="flex justify-center">
                    <ArrowDown className="h-4 w-4 text-slate-500" />
                  </div>
                  <Card className="bg-[var(--iverifi-muted-surface)] border border-[color:var(--iverifi-card-border)]">
                    <CardContent className="px-3 py-2 flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-[var(--iverifi-icon-box-bg)] border border-[color:var(--iverifi-icon-box-border)] p-1.5 rounded-lg shrink-0">
                          <FileText className="h-4 w-4 text-sky-400" />
                        </div>
                        <h3 className="font-medium text-sm text-[var(--iverifi-text-primary)]">
                          Verify Documents
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Connect to DigiLocker or govt portals.
                      </p>
                    </CardContent>
                  </Card>
                  <div className="flex justify-center">
                    <ArrowDown className="h-4 w-4 text-slate-500" />
                  </div>
                  <Card className="bg-[var(--iverifi-muted-surface)] border border-[color:var(--iverifi-card-border)]">
                    <CardContent className="px-3 py-2 flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-[var(--iverifi-icon-box-bg)] border border-[color:var(--iverifi-icon-box-border)] p-1.5 rounded-lg shrink-0">
                          <Send className="h-4 w-4 text-sky-400" />
                        </div>
                        <h3 className="font-medium text-sm text-[var(--iverifi-text-primary)]">
                          Share Verified Result
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Only &apos;verified ✓&apos; status sent to{" "}
                        {connectionName}.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator className="my-2" />

              {/* Privacy */}
              <div className="flex items-center gap-3 bg-[var(--iverifi-success-soft)] border border-[color:var(--iverifi-success-border)] rounded-lg px-3 py-2.5">
                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-200 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-base text-emerald-700 dark:text-emerald-50">
                    Your Documents Stay Private
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-100 mt-0.5">
                    Documents never stored - Verified with govt portals.
                  </p>
                </div>
              </div>

              {/* What They Receive + What They DON'T Get */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <h3 className="font-medium text-base text-[var(--iverifi-text-primary)]">
                    What {connectionName} Receives:
                  </h3>
                  <ul className="space-y-1 text-sm text-[var(--iverifi-text-secondary)]">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      Verification status: &quot;Verified&quot;
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      Document type: &quot;Aadhaar Card&quot;
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      Timestamp: {new Date().toLocaleString()}
                    </li>
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-medium text-base text-[var(--iverifi-text-primary)]">
                    What They DON&apos;T Get:
                  </h3>
                  <ul className="space-y-1 text-sm text-[var(--iverifi-text-secondary)]">
                    <li className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-500 shrink-0" />
                      Your document numbers
                    </li>
                    <li className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-500 shrink-0" />
                      Your photographs
                    </li>
                    <li className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-500 shrink-0" />
                      Your personal details
                    </li>
                  </ul>
                </div>
              </div>

              <Separator className="my-2" />

              {/* Terms checkbox */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(c) => setAcceptedTerms(c === true)}
                  className="mt-0.5 shrink-0"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm sm:text-base text-[var(--iverifi-text-secondary)] leading-snug cursor-pointer"
                >
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/terms")}
                    className="text-sky-400 underline underline-offset-4 hover:text-sky-300 bg-transparent border-0 p-0 cursor-pointer font-medium"
                  >
                    Terms &amp; Conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/privacy")}
                    className="text-sky-400 underline underline-offset-4 hover:text-sky-300 bg-transparent border-0 p-0 cursor-pointer font-medium"
                  >
                    Privacy Policy
                  </button>
                  .
                </Label>
              </div>

              {/* Button */}
              <Button
                onClick={handleAccept}
                disabled={!acceptedTerms || isSaving}
                className="w-full py-3 text-base font-medium bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-slate-950 shadow-[0_0_40px_rgba(0,224,255,0.45)] hover:from-[#40e8ff] hover:to-[#9274ff] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Please Accept to Continue"}
              </Button>

              <p className="text-center text-sm text-[var(--iverifi-text-muted)]">
                Protected by 256-bit encryption • Takes 30 seconds
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
