import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCredentialsQuery } from "@/redux/api";
import { useNavigate } from "react-router-dom";

const formatDocType = (type: string): string => {
  return type
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
};

const AddDocuments = () => {
  const navigate = useNavigate();
  const { data: credData, isLoading: isLoadingCreds } =
    useGetCredentialsQuery();

  const verifiedDocs = credData?.data?.credential || [];

  const allDocTypes = [
    "AADHAR_CARD",
    "PAN_CARD",
    "DRIVING_LICENSE",
    "PASSPORT",
  ];
  const verifiedTypes = verifiedDocs.map((doc: any) => doc.document_type);
  const unverifiedTypes = allDocTypes.filter(
    (type) => !verifiedTypes.includes(type)
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Upload Missing Documents</h2>

      {isLoadingCreds ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array(4)
            .fill(0)
            .map((_, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
        </div>
      ) : unverifiedTypes.length === 0 ? (
        <p className="text-muted-foreground text-sm border p-4 rounded-md bg-muted/50">
          All required documents are verified 🎉
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {unverifiedTypes.map((docType) => (
            <Card
              key={docType}
              className="cursor-pointer hover:shadow-md transition"
              onClick={() => navigate(`/upload?docType=${docType}`)}
            >
              <CardHeader>
                <CardTitle>{formatDocType(docType)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click to upload your {formatDocType(docType)}.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddDocuments;
