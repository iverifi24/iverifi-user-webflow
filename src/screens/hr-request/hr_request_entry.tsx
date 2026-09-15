import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAddConnectionMutation } from "@/redux/api";
import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";

/**
 * Entry point for a non-hotel business (e.g. an employer's HR system)
 * requesting a candidate's verified identity documents.
 *
 * Deliberately separate from the QR/guest-checkin funnel
 * (components/qr-code-handler.tsx, screens/guest-checkin/*) - that funnel
 * is hotel-specific (per-stay check-in limits tied to a paid subscription,
 * "property"/"front desk" copy) and is left completely untouched. This
 * screen establishes a connection via the same generic, quota-free
 * addConnection endpoint every other connection type already uses, then
 * hands off to the existing generic ConnectionDetails screen
 * (/connections/:id) for the actual document-picking UI - that screen
 * already shows the requesting business by name and has no hotel-specific
 * logic in its sharing path.
 */
export default function HrRequestEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [addConnection] = useAddConnectionMutation();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) {
      setError("Missing request code.");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        await addConnection({ document_id: code, type: "Company" }).unwrap();
        // /connections/:id expects the recipient_id (this `code`), not the
        // credential_request_id addConnection returns - confirmed by how
        // ConnectionRequestsPage links into this same screen
        // (navigate(`/connections/${req.recipient_id}`)). ConnectionDetails
        // then resolves the specific request for the logged-in user via
        // getRecipientCredentials(recipient_id).
        navigate(`/connections/${code}`, { replace: true });
      } catch (err: any) {
        setError(err?.data?.message || "Could not start this request. Please try again.");
      }
    })();
  }, [code, addConnection, navigate]);

  if (error) {
    return (
      <div className="min-h-0 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-sm text-[var(--iverifi-text-muted)]">{error}</p>
          <Button type="button" onClick={() => navigate("/", { replace: true })}>
            Go to your vault
          </Button>
        </div>
      </div>
    );
  }

  return <LoadingScreen variant="fullPage" />;
}
