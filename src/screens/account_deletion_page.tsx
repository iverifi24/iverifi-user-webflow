import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import iverifiLogo from "../assets/new_no_bg.png"

export default function AccountDeletionPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-background shadow-md sticky top-0 z-10">
        <div
          className="h-1"
          style={{
            background: "linear-gradient(to right, #FF9933 0%, #FFFFFF 50%, #138808 100%)",
          }}
        />
        <div className="max-w-4xl mx-auto px-4 py-2 sm:py-0">
          <div className="flex items-center justify-between">
            <div className="flex justify-center items-center mb-0 sm:mb-0">
              <div className="text-primary-foreground p-2 sm:p-3 md:p-4 rounded-full">
                <img
                  src={iverifiLogo}
                  alt="Iverifi Icon"
                  className="w-12 h-12 md:w-12 md:h-12 object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">iVerifi</h1>
                <p className="text-xs text-muted-foreground">Account & Data Deletion</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to home
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6 pb-20 sm:pb-24">
        <Card className="p-4 sm:p-6 md:p-8">
          <div className="max-w-none">
            <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-600 p-3 sm:p-4 mb-4 sm:mb-6 rounded">
              <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100 font-semibold mb-1">
                Last Updated: July 25, 2026
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                Applies to: iVerifi mobile app (iVerifi IAM Private Limited)
              </p>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              1. How to Request Account Deletion
            </h2>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              Option A — In the App (recommended)
            </h3>
            <ol className="list-decimal list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Open the iVerifi app and log in to your account</li>
              <li>Go to your <strong>Profile</strong> screen</li>
              <li>Tap <strong>Delete Profile</strong></li>
              <li>Confirm the deletion when prompted</li>
            </ol>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Your account and associated data are deleted immediately upon confirmation. You will
              be signed out automatically once the process completes.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              Option B — By Email (if you can't log in)
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              If you no longer have access to your account, you can request deletion by emailing{" "}
              <a href="mailto:admin@iverifi.io" className="text-primary underline">
                admin@iverifi.io
              </a>{" "}
              with:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>The email address or phone number registered on your account</li>
              <li>A statement that you are requesting deletion of your account and data</li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              We verify the request and complete deletion within 30 days.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              2. What Gets Deleted
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              When you delete your account, the following are permanently removed:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Your profile (name, date of birth, nationality, phone number, email, national ID number, address, profile photo)</li>
              <li>Your login/authentication account</li>
              <li>Uploaded identity documents and verification (KYC) records, including face photos</li>
              <li>Pending verification requests and OTP sessions</li>
              <li>In-app notifications</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              3. What May Be Retained
            </h2>
            <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-3 sm:p-4 my-3 sm:my-4 rounded">
              <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 text-xs sm:text-sm space-y-1">
                <li>
                  <strong>Shared connection records:</strong> If you had shared a verified ID with
                  another user or organization, that counterparty's copy of the record is not
                  deleted — it is marked as belonging to a deleted user, with no personal details
                  restored or accessible to them beyond what was already shared.
                </li>
                <li>
                  <strong>Legal/compliance retention:</strong> Where a verification was performed
                  for a partner subject to statutory record-keeping obligations (e.g. hotel guest
                  registration, FRRO, or tax compliance), verification metadata may be retained by
                  that partner or by iVerifi for the period required by applicable law, separately
                  from your deleted profile.
                </li>
              </ul>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Aside from the above, no personal data is retained after account deletion.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              4. Questions
            </h2>
            <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 p-4 sm:p-6 rounded-lg my-3 sm:my-4">
              <h3 className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">
                iVerifi IAM Private Limited
              </h3>
              <div className="space-y-2 text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                <p>
                  <strong>Email:</strong>{" "}
                  <a href="mailto:admin@iverifi.io" className="underline">
                    admin@iverifi.io
                  </a>
                </p>
                <p>
                  <strong>Website:</strong>{" "}
                  <a href="https://iverifi.io" className="underline" target="_blank" rel="noopener noreferrer">
                    https://iverifi.io
                  </a>
                </p>
              </div>
            </div>

            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              See our{" "}
              <a href="/privacy" className="text-primary underline">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/terms" className="text-primary underline">
                Terms & Conditions
              </a>{" "}
              for further detail on data collection and retention.
            </p>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-3 sm:py-4 fixed bottom-0 left-0 right-0 z-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Button onClick={handleClose} className="w-full sm:w-auto">
            Back to Home
          </Button>
        </div>
      </footer>
    </div>
  );
}
