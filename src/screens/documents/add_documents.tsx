import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

const AddDocuments = () => {
  const navigate = useNavigate();
  const { data: credData, isLoading: isLoadingCreds } =
    useGetCredentialsQuery();

  const verifiedDocs = credData?.data?.credential || [];
  const verifiedTypes = verifiedDocs.map((doc: any) => doc.document_type);
  const unverifiedTypes = DOC_TYPES.filter(
    (type) => !verifiedTypes.includes(type)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-slate-50/30 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Upload missing documents</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Verify the documents below to use them when sharing credentials.
          </p>
        </div>

        {isLoadingCreds ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array(4)
              .fill(0)
              .map((_, idx) => (
                <Card key={idx} className="rounded-2xl border-2 border-slate-200">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-32 rounded" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Skeleton className="h-14 w-full rounded-xl" />
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : unverifiedTypes.length === 0 ? (
          <Card className="rounded-2xl border-2 border-teal-200 bg-teal-50/30 p-6 text-center">
            <p className="text-slate-700 font-medium">All required documents are verified</p>
            <p className="text-sm text-slate-500 mt-1">You can use them when sharing credentials with a property.</p>
            <Button
              className="mt-4 rounded-xl bg-teal-600 hover:bg-teal-700"
              onClick={() => navigate("/documents")}
            >
              <FileText className="h-4 w-4 mr-2" />
              View documents
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {unverifiedTypes.map((docType) => (
              <Card
                key={docType}
                className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-teal-200 transition-all cursor-pointer"
                onClick={() => navigate(`/upload?docType=${docType}`)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    {formatDocType(docType)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl border-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 font-medium justify-start"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/upload?docType=${docType}`);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2 shrink-0" />
                    Verify {formatDocType(docType)}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddDocuments;
