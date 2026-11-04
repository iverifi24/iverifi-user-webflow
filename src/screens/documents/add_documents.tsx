import { useState } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { TypedIdDialog } from "@/components/typed-id-dialog";
import { Button } from "@/components/ui/button";
import { useGetCredentialsQuery, useGetVerificationRoutesQuery } from "@/redux/api";
import { startDigilockerFlow } from "@/utils/digilockerStart";
import { methodsFor, providerLabel } from "@/utils/verificationSource";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink, FileText } from "lucide-react";

const formatDocType = (type: string): string => {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const DOC_TYPES = ["AADHAAR_CARD", "PAN_CARD", "DRIVING_LICENSE", "PASSPORT"] as const;
/** listed only while the server offers a way to verify them */
// Aadhaar is the root the other typed documents are checked against; Aadhaar itself and PAN (DigiLocker) can be added first
const OPEN_WITHOUT_AADHAAR = new Set<string>(["AADHAAR_CARD", "PAN_CARD"]);
const OPTIONAL_DOC_TYPES =["VOTER_ID", "MOBILE_NUMBER"] as const;

const cardClass =
  "rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]";

const AddDocuments = () => {
  const navigate = useNavigate();
  const { data: credData, isLoading: isLoadingCreds } = useGetCredentialsQuery();
  const { data: routesData } = useGetVerificationRoutesQuery();
  const routes = routesData?.data?.routes;
  const [typedDoc, setTypedDoc] = useState<string | null>(null);

  // the server decides how each document is verified; this screen follows it
  const openVerify = async (docType: string) => {
    if (!OPEN_WITHOUT_AADHAAR.has(docType) && !aadhaarVerified) return toast.error("Verify your Aadhaar first. Your other documents are checked against it.");
    const methods = methodsFor(routes, docType);
    if (!methods.length) return toast.error("This document cannot be verified right now. Please try again later.");
    if (methods[0] === "vsign") {
      setTypedDoc(docType);
      return;
    }
    if (methods[0] === "digilocker") {
      const ticketDoc = docType === "AADHAAR_CARD" ? "AADHAAR_APP" : docType === "PAN_CARD" ? "PAN_APP" : docType === "DRIVING_LICENSE" ? "DL" : null;
      if (ticketDoc) {
        try {
          await startDigilockerFlow({ docType: ticketDoc });
        } catch (e) {
          toast.error((e as Error)?.message || "Could not start DigiLocker verification");
        }
        return;
      }
    }
    // camera scan (Kwik) lives on the home screen, where the document cards are
    toast.info("Open this document from your vault to verify it with the camera scan.");
    navigate("/");
  };

  const verifiedDocs = credData?.data?.credential || [];
  const verifiedTypes = verifiedDocs.map((doc: any) => doc.document_type);
  const listedTypes: string[] = [...DOC_TYPES, ...OPTIONAL_DOC_TYPES.filter((type) => routes?.[type]?.length)];
  const unverifiedTypes = listedTypes.filter((type) => !verifiedTypes.includes(type));
  // Aadhaar is the root: every other document is checked against it, so none can be added until it is verified
  const aadhaarVerified = verifiedTypes.includes("AADHAAR_CARD") || verifiedTypes.includes("DIGILOCKER");

  return (
    <div className="min-h-0 flex-1 w-full max-w-2xl mx-auto space-y-6 text-[var(--iverifi-text-primary)]">
      <div>
        <div className="text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
          Vault
        </div>
        <h2 className="mt-1 text-lg font-bold text-[var(--iverifi-text-primary)]">Upload missing documents</h2>
        <p className="text-sm text-[var(--iverifi-text-muted)] mt-0.5">
          Verify the documents below to use them when sharing credentials.
        </p>
      </div>

      {isLoadingCreds ? (
        <LoadingScreen variant="cards" cardCount={4} />
      ) : unverifiedTypes.length === 0 ? (
        <div className={`${cardClass} p-6 text-center`}>
          <p className="text-[var(--iverifi-text-primary)] font-medium">All required documents are verified</p>
          <p className="text-sm text-[var(--iverifi-text-muted)] mt-1">
            You can use them when sharing credentials with an organization.
          </p>
          <Button
            className="mt-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white"
            onClick={() => navigate("/documents")}
          >
            <FileText className="h-4 w-4 mr-2" />
            View documents
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {unverifiedTypes.map((docType) => {
            const locked = !OPEN_WITHOUT_AADHAAR.has(docType) && !aadhaarVerified;
            return (
              <div
                key={docType}
                className={`${cardClass} p-4 transition-all duration-200 ${locked ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--iverifi-card-hover)] cursor-pointer"}`}
                aria-disabled={locked}
                onClick={() => openVerify(docType)}
              >
                <p className="text-base font-semibold text-[var(--iverifi-text-primary)] mb-3">
                  {formatDocType(docType)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked}
                  className="w-full rounded-xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-primary)] hover:bg-[var(--iverifi-card-hover)] font-medium justify-start disabled:cursor-not-allowed"
                  onClick={(e) => {
                    e.stopPropagation();
                    openVerify(docType);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2 shrink-0" />
                  {locked
                    ? "Verify your Aadhaar first"
                    : `Verify ${formatDocType(docType)}${providerLabel(methodsFor(routes, docType), docType) ? ` via ${providerLabel(methodsFor(routes, docType), docType)}` : ""}`}
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <TypedIdDialog
        documentType={typedDoc}
        onClose={() => setTypedDoc(null)}
        alternate={(() => {
          const other = typedDoc ? methodsFor(routes, typedDoc).find((m) => m !== "vsign") : undefined;
          if (!typedDoc || !other) return undefined;
          return {
            label: other === "digilocker" ? "Use DigiLocker instead" : "Use the camera scan instead",
            run: () => {
              const doc = typedDoc;
              setTypedDoc(null);
              if (other === "digilocker") {
                const ticketDoc = doc === "AADHAAR_CARD" ? "AADHAAR_APP" : doc === "PAN_CARD" ? "PAN_APP" : doc === "DRIVING_LICENSE" ? "DL" : null;
                if (ticketDoc) startDigilockerFlow({ docType: ticketDoc }).catch((e: Error) => toast.error(e?.message || "Could not start DigiLocker verification"));
                return;
              }
              navigate("/"); // the camera scan lives on the home screen, where the document cards are
            },
          };
        })()}
      />
    </div>
  );
};

export default AddDocuments;
