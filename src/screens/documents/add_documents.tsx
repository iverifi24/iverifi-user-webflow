import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { useGetCredentialsQuery } from "@/redux/api";
import { useNavigate } from "react-router-dom";
import { ExternalLink, FileText } from "lucide-react";

const formatDocType = (type: string): string => {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const DOC_TYPES = ["AADHAAR_CARD", "PAN_CARD", "DRIVING_LICENSE", "PASSPORT"] as const;

const cardClass =
  "rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]";

const AddDocuments = () => {
  const navigate = useNavigate();
  const { data: credData, isLoading: isLoadingCreds } = useGetCredentialsQuery();

  const verifiedDocs = credData?.data?.credential || [];
  const verifiedTypes = verifiedDocs.map((doc: any) => doc.document_type);
  const unverifiedTypes = DOC_TYPES.filter((type) => !verifiedTypes.includes(type));

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
            You can use them when sharing credentials with a property.
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
          {unverifiedTypes.map((docType) => (
            <div
              key={docType}
              className={`${cardClass} p-4 transition-all duration-200 hover:bg-[var(--iverifi-card-hover)] cursor-pointer`}
              onClick={() => navigate(`/upload?docType=${docType}`)}
            >
              <p className="text-base font-semibold text-[var(--iverifi-text-primary)] mb-3">
                {formatDocType(docType)}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-primary)] hover:bg-[var(--iverifi-card-hover)] font-medium justify-start"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/upload?docType=${docType}`);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2 shrink-0" />
                Verify {formatDocType(docType)}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddDocuments;
