import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DigiLockerIcon } from "@/components/digilocker-icon";
import { useAuth } from "@/context/auth_context";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const AadhaarDigiLockerTest = () => {
  const { user } = useAuth();
  const query = useQuery();
  const [result, setResult] = useState<any>(null);
  const [resultJson, setResultJson] = useState<string | null>(null);

  useEffect(() => {
    const raw = query.get("result");
    if (raw) {
      try {
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(decoded);
        setResult(parsed);
        setResultJson(JSON.stringify(parsed, null, 2));
      } catch {
        setResultJson(raw);
      }
    }
  }, [query]);

  const applicantId = user?.uid || (user as any)?.id || "";

  const handleStartFlow = () => {
    const apiBase =
      (import.meta as any).env.VITE_BASE_URL || 'http://localhost:9000/api/v1';
    const url = `${apiBase}/webhook/digilocker-aadhaar-oauth-start?applicant_id=${encodeURIComponent(applicantId || "test")}`;
    window.location.assign(url);
  };

  const apiBase = (import.meta as any).env.VITE_BASE_URL || 'http://localhost:9000/api/v1';
  const docs: any[] = result?.other_doc_files ?? [];
  const fetchedDocs = docs.filter((d: any) => d.doc_token);
  const errorDocs = docs.filter((d: any) => d.error_status);
  const photoUrl = result?.user_photo_token
    ? `${apiBase}/webhook/digilocker-doc/${result.user_photo_token}`
    : null;

  const openDoc = (token: string) => {
    window.open(`${apiBase}/webhook/digilocker-doc/${token}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-slate-50/30 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="rounded-2xl border-2 border-teal-200 bg-white/90 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DigiLockerIcon size={20} />
              <span>DigiLocker Verification (Test)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Opens DigiLocker OAuth flow. After completion, shows the raw response and any fetched documents.
            </p>
            <Button
              type="button"
              className="rounded-xl bg-teal-600 hover:bg-teal-700 w-full"
              onClick={handleStartFlow}
            >
              <DigiLockerIcon size={18} className="mr-2" />
              Verify via DigiLocker
            </Button>
          </CardContent>
        </Card>

        {/* User photo */}
        {photoUrl && (
          <Card className="rounded-2xl border-2 border-blue-200 bg-white/90 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-blue-700">Profile Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <img src={photoUrl} alt="DigiLocker profile" className="rounded-xl max-h-48 object-contain" />
            </CardContent>
          </Card>
        )}

        {/* Retrieved documents */}
        {fetchedDocs.length > 0 && (
          <Card className="rounded-2xl border-2 border-green-200 bg-white/90 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-green-700">Documents Retrieved</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {fetchedDocs.map((d: any, i: number) => (
                <Button
                  key={i}
                  variant="outline"
                  className="justify-start gap-2 border-green-300 text-green-700"
                  onClick={() => openDoc(d.doc_token)}
                >
                  📄 View {d.contentType?.includes("pdf") ? "PDF" : "Document"} — {d.doc_uri}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Errors on doc fetch */}
        {errorDocs.map((d: any, i: number) => (
          <Card key={i} className="rounded-2xl border border-red-300 bg-red-50 shadow-inner">
            <CardContent className="pt-4 text-sm text-red-700">
              <strong>{d.doc_uri}</strong> — fetch failed with {d.error_status}
              {d.error_data && <pre className="text-xs mt-1 whitespace-pre-wrap">{d.error_data}</pre>}
            </CardContent>
          </Card>
        ))}

        {/* Raw JSON response */}
        {resultJson && (
          <Card className="rounded-2xl border border-slate-200 bg-slate-950 text-slate-50 shadow-inner">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Raw response</CardTitle>
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
