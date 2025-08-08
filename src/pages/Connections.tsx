import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Share2, CheckCircle, FileText, ExternalLink } from "lucide-react";
import {
  useGetCredentialsQuery,
  useGetRecipientCredentialsQuery,
  useUpdateCredentialsRequestMutation,
} from "@/redux/api";
import { auth, db } from "@/firebase/firebase_setup";
import { collection, getDocs, query, where } from "firebase/firestore";

// Document types that should be displayed
const DOCUMENT_TYPES = ["DRIVING_LICENSE", "AADHAR_CARD", "PAN_CARD", "PASSPORT"] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Product code mapping for verification URLs
const PRODUCT_CODE_MAP: Record<DocumentType, string> = {
  AADHAR_CARD: "KYC",
  PASSPORT: "PP",
  PAN_CARD: "PC",
  DRIVING_LICENSE: "DL",
};

interface Credential {
  id?: string;
  credential_id?: string;
  credentialId?: string;
  document_type: string;
  details?: {
    document_type: string;
  };
}

interface RecipientRequest {
  id: string;
}

const Connections = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams();

  // State for URL normalization
  const [isNormalizing, setIsNormalizing] = useState(false);

  // Get code from URL (prefer query param over path param)
  const codeFromQuery = searchParams.get("code");
  const codeFromPath = params.code;
  const code = codeFromQuery || codeFromPath;

  // URL normalization: convert path param to query param
  useEffect(() => {
    if (codeFromPath && !codeFromQuery && !isNormalizing) {
      setIsNormalizing(true);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("code", codeFromPath);
      setSearchParams(newSearchParams);
      // Navigate to clean URL without path param
      navigate(`/connections?${newSearchParams.toString()}`, { replace: true });
      setIsNormalizing(false);
    }
  }, [codeFromPath, codeFromQuery, searchParams, setSearchParams, navigate, isNormalizing]);

  // API calls
  const { data: credentialsData, isLoading: isCredentialsLoading } = useGetCredentialsQuery();
  const { data: recipientData, isLoading: isRecipientLoading } = useGetRecipientCredentialsQuery(code || "", {
    skip: !code,
  });
  const [updateCredentials, { isLoading: isUpdating }] = useUpdateCredentialsRequestMutation();

  // Create lookup map for verified credentials
  const verifiedCredentialsMap = useMemo(() => {
    if (!credentialsData?.data?.credential) return {};

    const map: Record<string, Credential> = {};
    credentialsData.data.credential.forEach((cred: Credential) => {
      const docType = cred.document_type || cred.details?.document_type;
      if (docType) {
        map[docType] = cred;
      }
    });
    return map;
  }, [credentialsData]);

  // Find connection ID from recipient data
  const connectionId = useMemo(() => {
    if (!recipientData?.data?.requests?.length) return null;

    const requests = recipientData.data.requests;

    // If we have a code, find request that contains it
    if (code) {
      const matchingRequest = requests.find((request: RecipientRequest) => request.id.includes(code));
      if (matchingRequest) return matchingRequest.id;
    }

    // Fallback to first request
    return requests[0]?.id || null;
  }, [recipientData, code]);

  // Handle share credentials
  const handleShareCredentials = async (documentType: DocumentType) => {
    if (!connectionId) {
      toast.error("No connection found");
      return;
    }

    const credential = verifiedCredentialsMap[documentType];
    if (!credential) {
      toast.error("Credential not found");
      return;
    }

    try {
      const credentialId = credential.credential_id || credential.id || credential.credentialId;
      if (!credentialId) {
        toast.error("Invalid credential ID");
        return;
      }

      await updateCredentials({
        credential_request_id: connectionId,
        credentials: [
          {
            credential_id: credentialId,
            document_type: documentType,
            status: "Active",
            expiry_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
          },
        ],
      }).unwrap();

      toast.success("Your verified credential was shared successfully with this connection.");
    } catch (error: unknown) {
      const errorMessage =
        error &&
        typeof error === "object" &&
        "data" in error &&
        error.data &&
        typeof error.data === "object" &&
        "message" in error.data
          ? String(error.data.message)
          : "Failed to share credentials";
      toast.error(errorMessage);
    }
  };

  // Handle verify document
  const handleVerifyDocument = async (documentType: DocumentType) => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      toast.error("User not authenticated");
      return;
    }

    try {
      // Query Firestore to get the applicant data
      const q = query(collection(db, "applicants"), where("email", "==", currentUser.email));

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast.error("User data not found");
        return;
      }

      const doc = querySnapshot.docs[0];
      const userId = doc.id; // Use the document ID as the user ID

      const productCode = PRODUCT_CODE_MAP[documentType];
      const verificationUrl = `https://iverifi.app.getkwikid.com/user/home?client_id=iverifi&api_key=iverifi&process=U&productCode=${productCode}&user_id=${userId}`;

      // Open verification URL in new tab
      window.open(verificationUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to get user data");
    }
  };

  // Helper to navigate to clean URL
  const navigateToCleanConnections = () => {
    navigate("/connections", { replace: true });
  };

  // Loading state
  if (isCredentialsLoading || isRecipientLoading || isNormalizing) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DOCUMENT_TYPES.map((docType) => (
            <Card key={docType} className="p-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Connections</h1>
        {code && (
          <Button variant="outline" size="sm" onClick={navigateToCleanConnections}>
            Clear Code
          </Button>
        )}
      </div>

      {/* Connection Info */}
      {code && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">QR Code: {code}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOCUMENT_TYPES.map((docType) => {
          const isVerified = !!verifiedCredentialsMap[docType];
          const isShareDisabled = !isVerified || isUpdating;

          return (
            <Card key={docType} className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg capitalize">{docType.replace(/_/g, " ").toLowerCase()}</CardTitle>
                  {isVerified && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isVerified ? (
                  <Button className="w-full" disabled={isShareDisabled} onClick={() => handleShareCredentials(docType)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share credentials
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" onClick={() => handleVerifyDocument(docType)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Verify Document
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {!code && (
        <Card className="bg-gray-50">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No QR Code Detected</h3>
            <p className="text-gray-500">Scan a QR code to share credentials with a connection.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Connections;
