import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Grid3x3, FileText, Send, Lock, ArrowDown, X, CheckCircle } from "lucide-react";
import { useGetRecipientCredentialsQuery } from "@/redux/api";
import { setTermsAccepted } from "@/utils/terms";
import { useAuth } from "@/context/auth_context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase_setup";
import { saveRecipientIdForLater } from "@/utils/connectionFlow";
import iverifiLogo from "../assets/new_no_bg.png";

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
        const profileCompletionLevel = userDoc.data()?.profile_completion_level || 0;
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
    <div className="h-screen flex flex-col overflow-hidden w-full py-3 sm:py-4">
      {/* Scale to fit one screen; on mobile width compensation keeps it full width */}
      <div className="flex-1 min-h-0 flex items-start sm:items-center justify-center overflow-hidden pt-2 sm:pt-0 sm:py-4 w-full">
        <div
          className={`w-full sm:max-w-4xl sm:mx-auto pt-2 sm:pt-12 origin-top sm:origin-center min-w-0 px-4 sm:px-6 ${scale < 1 ? "shrink-0" : ""}`}
          style={{
            transform: `scale(${scale})`,
            ...(scale < 1
              ? { width: `${(1 / scale) * 100}vw`, marginLeft: "auto", marginRight: "auto" }
              : {}),
          }}
        >
          {/* Header - ensure logo is visible on mobile */}
          <div className="text-center mb-4">
            <img
              src={iverifiLogo}
              alt="iVerifi"
              className="w-16 h-16 sm:w-16 sm:h-16 mx-auto object-contain"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
              Welcome to iVerifi
            </h1>
            <p className="text-base text-gray-500">Quick & secure identity verification.</p>
          </div>

          {/* Main Card - reduced side padding on mobile for wider content area */}
          <Card className="w-full bg-white border border-gray-200 shadow-sm">
            <CardContent className="px-2 py-4 sm:p-5 space-y-3 sm:space-y-4">
              {/* How It Works - 3 steps with descriptions */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-900">How It Works</h2>
                <div className="space-y-2">
                  <Card>
                    <CardContent className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="bg-teal-50 p-2 rounded-lg shrink-0">
                          <Grid3x3 className="h-5 w-5 text-teal-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-base text-gray-900">Scan QR Code</h3>
                          <p className="text-sm text-gray-600 mt-0.5">Open verification on your phone.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-4 w-4 text-gray-400" />
                  </div>
                  <Card>
                    <CardContent className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="bg-teal-50 p-2 rounded-lg shrink-0">
                          <FileText className="h-5 w-5 text-teal-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-base text-gray-900">Verify Documents</h3>
                          <p className="text-sm text-gray-600 mt-0.5">Connect to DigiLocker or govt portals.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-4 w-4 text-gray-400" />
                  </div>
                  <Card>
                    <CardContent className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="bg-teal-50 p-2 rounded-lg shrink-0">
                          <Send className="h-5 w-5 text-teal-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-base text-gray-900">Share Verified Result</h3>
                          <p className="text-sm text-gray-600 mt-0.5">
                            Only &apos;verified ✓&apos; status sent to {connectionName}.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator className="my-2" />

              {/* Privacy */}
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                <Lock className="h-4 w-4 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-base text-green-800">Your Documents Stay Private</p>
                  <p className="text-sm text-green-700 mt-0.5">Documents never stored - Verified with govt portals.</p>
                </div>
              </div>

              {/* What They Receive + What They DON'T Get */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <h3 className="font-medium text-base text-gray-900">What {connectionName} Receives:</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
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
                  <h3 className="font-medium text-base text-gray-900">What They DON&apos;T Get:</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
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
                  className="text-sm sm:text-base text-gray-700 leading-snug cursor-pointer"
                >
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/terms")}
                    className="text-teal-600 underline hover:text-teal-700 bg-transparent border-0 p-0 cursor-pointer font-medium"
                  >
                    Terms & Conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/privacy")}
                    className="text-teal-600 underline hover:text-teal-700 bg-transparent border-0 p-0 cursor-pointer font-medium"
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
                className="w-full py-3 text-base font-medium bg-teal-600 hover:bg-teal-700"
              >
                {isSaving ? "Saving..." : "Please Accept to Continue"}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Protected by 256-bit encryption • Takes 30 seconds
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
