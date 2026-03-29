import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DigiLockerIcon } from "@/components/digilocker-icon";
import { useAuth } from "@/context/auth_context";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

/**
 * Simple Aadhaar via DigiLocker test screen.
 *
 * Flow:
 * - User opens this route (e.g. /aadhaar-test)
 * - Clicks "Verify Aadhaar via DigiLocker"
 * - We call backend OAuth-start endpoint which redirects to DigiLocker
 * - DigiLocker redirects back to backend callback, which returns JSON
 * - Frontend then shows the returned JSON in a prettified viewer when redirected back via `result` query param.
 *
 * NOTE: For now, Aadhaar number is entered inside DigiLocker, not here.
 */
const AadhaarDigiLockerTest = () => {
  const { user } = useAuth();
  const query = useQuery();
  const [resultJson, setResultJson] = useState<string | null>(null);

  useEffect(() => {
    const raw = query.get("result");
    if (raw) {
      try {
        const decoded = decodeURIComponent(raw);
        setResultJson(JSON.stringify(JSON.parse(decoded), null, 2));
      } catch {
        setResultJson(raw);
      }
    }
  }, [query]);

  const applicantId = user?.uid || (user as any)?.id || "";

  const handleStartFlow = () => {
    if (!applicantId) {
      alert("You must be logged in to start Aadhaar verification.");
      return;
    }
    const apiBase =
      (import.meta as any).env.VITE_BASE_URL || 'http://localhost:9000/api/v1';
    const url = `${apiBase}/webhook/digilocker-aadhaar-oauth-start?applicant_id=${encodeURIComponent(
      applicantId
    )}`;

    console.log(url);
    // Use full-page navigation so React Router doesn't intercept it.
    window.location.assign(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-slate-50/30 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="rounded-2xl border-2 border-teal-200 bg-white/90 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DigiLockerIcon size={20} />
              <span>Verify Aadhaar via DigiLocker (Test)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              This test flow will open DigiLocker, let you sign in and select your Aadhaar.
              After completing the flow, we print the raw response that we get from DigiLocker
              so you can verify the integration.
            </p>
            <Button
              type="button"
              className="rounded-xl bg-teal-600 hover:bg-teal-700 w-full"
              onClick={handleStartFlow}
            >
              <DigiLockerIcon size={18} className="mr-2" />
              Verify Aadhaar via DigiLocker
            </Button>
          </CardContent>
        </Card>

        {resultJson && (
          <Card className="rounded-2xl border border-slate-200 bg-slate-950 text-slate-50 shadow-inner">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                DigiLocker token / verification response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto max-h-[320px] whitespace-pre-wrap">
                {resultJson}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AadhaarDigiLockerTest;

