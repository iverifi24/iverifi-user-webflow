import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Grid3x3, FileText, Send, Lock, ArrowDown, X, CheckCircle } from "lucide-react";
import { useGetRecipientCredentialsQuery } from "@/redux/api";
import { Separator } from "@/components/ui/separator";
import { setTermsAccepted } from "@/utils/terms";
import { useAuth } from "@/context/auth_context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase_setup";
import { saveRecipientIdForLater } from "@/utils/connectionFlow";
import iverifiLogo from "../assets/new_no_bg.png"

export default function TermsAcceptance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const code = searchParams.get("code");

  // Fetch recipient data to get connection name
  const { data: recipientData } = useGetRecipientCredentialsQuery(
    code || "",
    { skip: !code }
  );

  const connectionName =
    recipientData?.data?.requests?.[0]?.recipients?.name ||
    recipientData?.data?.requests?.[0]?.recipients?.firstName ||
    "Hotel";

  const handleAccept = async () => {
    if (!acceptedTerms) return;

    if (!user?.uid) {
      console.error("User not authenticated");
      return;
    }

    setIsSaving(true);

    // Helper function to determine redirect based on profile completion
    const getRedirectPath = async () => {
      try {
        const userDocRef = doc(db, "applicants", user.uid);
        const userDoc = await getDoc(userDocRef);
        const profileCompletionLevel = userDoc.data()?.profile_completion_level || 0;

        if (profileCompletionLevel < 10) {
          // Profile not complete - save code and redirect to complete-profile
          if (code) {
            saveRecipientIdForLater(code);
          }
          return "/complete-profile";
        } else {
          // Profile complete - redirect to connections with code or home
          return code ? `/?code=${code}` : "/";
        }
      } catch (error) {
        console.error("Error checking profile completion:", error);
        // Fallback: save code if exists and go to complete-profile
        if (code) {
          saveRecipientIdForLater(code);
        }
        return code ? "/complete-profile" : "/";
      }
    };

    try {
      // Store acceptance in database (source of truth)
      await setTermsAccepted(true, user.uid);

      // Verify the save completed by reading it back (Firestore eventual consistency)
      const { isTermsAccepted: checkTerms } = await import("@/utils/terms");
      let verified = false;
      let retries = 0;
      const maxRetries = 5;

      while (!verified && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        verified = await checkTerms(user.uid);
        if (verified) break;
        retries++;
      }

      // Get redirect path and navigate
      const redirectPath = await getRedirectPath();
      navigate(redirectPath);
    } catch (error) {
      console.error("Error saving terms acceptance:", error);
      // On error, still try to redirect appropriately
      const redirectPath = await getRedirectPath();
      navigate(redirectPath);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="w-full max-w-2xl space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header */}
        <div className="text-center space-y-1 sm:space-y-2">
        <div className="flex justify-center mb-0 sm:mb-0">
          <div className="text-primary-foreground p-2 sm:p-3 md:p-4 rounded-full">
            <img 
              src={iverifiLogo} 
              alt="Iverifi Icon"
              className="w-24 h-24 md:w-24 md:h-24 object-contain" 
            />
          </div>
        </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground px-2">
            Welcome to iVerifi
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground px-2">
            Quick & secure identity verification.
          </p>
        </div>

        {/* Main Card */}
        <Card className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
          <CardContent className="p-0 space-y-3 sm:space-y-4 md:space-y-6">
            {/* How It Works Section */}
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                How It Works
              </h2>

              <div className="space-y-2 sm:space-y-3 md:space-y-4">
                {/* Step 1 */}
                <Card>
                  <CardContent className="px-3 py-2 sm:px-4">
                    <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                      <div className="bg-primary/10 p-2 sm:p-2.5 md:p-3 rounded-lg shrink-0">
                        <Grid3x3 className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base text-foreground">
                          Scan QR Code
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          Open verification on your phone.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center py-0.5">
                  <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>

                {/* Step 2 */}
                <Card>
                  <CardContent className="px-3 py-2 sm:px-4">
                    <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                      <div className="bg-primary/10 p-2 sm:p-2.5 md:p-3 rounded-lg shrink-0">
                        <FileText className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base text-foreground">
                          Verify Documents
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          Connect to DigiLocker or govt portals.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center py-0.5">
                  <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>

                {/* Step 3 */}
                <Card>
                  <CardContent className="px-3 py-2 sm:px-4">
                    <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                      <div className="bg-primary/10 p-2 sm:p-2.5 md:p-3 rounded-lg shrink-0">
                        <Send className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base text-foreground">
                          Share Verified Result
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          Only 'verified ✓' status sent to {connectionName}.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Privacy Section */}
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4 flex items-start sm:items-center gap-2 sm:gap-3">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base text-green-700 dark:text-green-400">
                  Your Documents Stay Private
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Documents never stored - Verified with govt portals.
                </p>
              </div>
            </div>

            {/* What They Receive Section */}
            <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div>
                <h3 className="font-medium text-sm sm:text-base text-foreground mb-1.5 sm:mb-2">
                  What {connectionName} Receives:
                </h3>
                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="flex-1">Verification status: "Verified"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="flex-1">Document type: "Aadhaar Card"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="flex-1">Timestamp: {new Date().toLocaleString()}</span>
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium text-sm sm:text-base text-foreground mb-1.5 sm:mb-2">
                  What They DON'T Get:
                </h3>
                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive shrink-0 mt-0.5" />
                    <span className="flex-1">Your document numbers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive shrink-0 mt-0.5" />
                    <span className="flex-1">Your photographs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive shrink-0 mt-0.5" />
                    <span className="flex-1">Your personal details</span>
                  </li>
                </ul>
              </div>
            </div>

            <Separator />

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-2 sm:space-x-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-0.5 sm:mt-1 shrink-0"
              />
              <Label
                htmlFor="terms"
                className="text-xs sm:text-sm text-foreground leading-relaxed cursor-pointer flex-1"
              >
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => navigate("/terms")}
                  className="text-primary underline hover:text-primary/80 break-words bg-transparent border-0 p-0 cursor-pointer"
                >
                  Terms & Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => navigate("/privacy")}
                  className="text-primary underline hover:text-primary/80 break-words bg-transparent border-0 p-0 cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </Label>
            </div>

            {/* Accept Button */}
            <Button
              onClick={handleAccept}
              disabled={!acceptedTerms || isSaving}
              className="w-full py-4 sm:py-5 md:py-6 text-base sm:text-lg font-medium touch-manipulation"
            >
              {isSaving ? "Saving..." : "Please Accept to Continue"}
            </Button>

            <p className="text-center text-xs text-muted-foreground px-2">
              Protected by 256-bit encryption • Takes 30 seconds
            </p>
          </CardContent>
        </Card>

        {/* Go Back Link */}
        {/* <button
          onClick={handleGoBack}
          className="text-muted-foreground hover:text-foreground text-xs sm:text-sm flex items-center gap-2 mx-auto py-2 touch-manipulation"
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Go Back
        </button> */}
      </div>
    </div>
  );
}