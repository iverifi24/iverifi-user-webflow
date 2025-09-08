import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth, db } from "@/firebase/firebase_setup";
import {
  useAddConnectionMutation,
  useGetCredentialsQuery,
  useGetRecipientCredentialsQuery,
  useUpdateCredentialsRequestMutation,
  useUpdateCheckInStatusMutation,
} from "@/redux/api";
import { determineConnectionType, isValidQRCode } from "@/utils/qr-code-utils";
import { addDays, format } from "date-fns";
import { collection, getDocs, query, where } from "firebase/firestore";
import { CheckCircle, ExternalLink, FileText, Share2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";

const DOCUMENT_TYPES = ["DRIVING_LICENSE", "AADHAR_CARD", "PAN_CARD", "PASSPORT"] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

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
  details?: { document_type: string };
}
interface RecipientRequest {
  id: string;
  check_in_time?: string;
  check_out_time?: string;
}

const IVERIFI_ORIGIN = "https://iverifi.app.getkwikid.com";

const Connections = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();

  // iframe overlay
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  // const [verifyingDocType, setVerifyingDocType] = useState<DocumentType | null>(
  //   null
  // );

  // track the just-created connection id (to avoid waiting on recipientData)
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

  // run-once guard for adding connection by code
  const processedCodeRef = useRef<string | null>(null);

  // code from query OR path (no normalization)
  const codeFromQuery = searchParams.get("code") || null;
  const codeFromPath = (params.code as string) || null;
  const code = codeFromQuery || codeFromPath || null;

  // api
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    refetch: refetchCredentials,
  } = useGetCredentialsQuery();

  const {
    data: recipientData,
    isLoading: isRecipientLoading,
    refetch: refetchRecipient,
  } = useGetRecipientCredentialsQuery(code || "", { skip: !code });

  const [updateCredentials, { isLoading: isUpdating }] = useUpdateCredentialsRequestMutation();
  const [updateCheckInStatus, { isLoading: isCheckInUpdating }] = useUpdateCheckInStatusMutation();
  const [addConnection] = useAddConnectionMutation();

  // helper to robustly pick connection id from addConnection response
  const pickConnectionId = (res: any): string | null => {
    return res?.data?.request_id ?? res?.data?.id ?? res?.request_id ?? res?.id ?? res?.data?.request?.id ?? null;
  };

  // Add connection once on first load if we have a valid code, and capture its ID
  useEffect(() => {
    if (!isValidQRCode(code)) return;
    if (processedCodeRef.current === code) return;
    processedCodeRef.current = code!;

    (async () => {
      try {
        const type = determineConnectionType(code!);
        const res = await addConnection({ document_id: code!, type }).unwrap();

        const newId = pickConnectionId(res);
        if (newId) {
          setActiveConnectionId(newId);
        } else {
          // fallback: try refetching recipient requests so we can derive the id below
          await refetchRecipient();
        }
      } catch (err: any) {
        console.error("Error adding connection on load:", err);

        // If connection already exists, that's fine - just refetch to get the data
        if (err?.data?.message?.includes("already exists") || err?.status === 409) {
          console.log("Connection already exists, refetching recipient data");
          await refetchRecipient();
        }
        // keep URL as-is; show UI
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, addConnection]);

  // Build a map for verified credentials
  const verifiedCredentialsMap = useMemo(() => {
    if (!credentialsData?.data?.credential) return {};
    const map: Record<string, Credential> = {};
    credentialsData.data.credential.forEach((cred: Credential) => {
      const docType = cred.document_type || cred.details?.document_type;
      if (docType) map[docType] = cred;
    });
    return map;
  }, [credentialsData]);

  // Derive a connectionId (prefer the one we captured from addConnection)
  const derivedConnectionId = useMemo(() => {
    if (activeConnectionId) return activeConnectionId;

    if (!recipientData?.data?.requests?.length) return null;
    const requests = recipientData.data.requests as RecipientRequest[];

    if (code) {
      const byCode = requests.find((r) => r.id.includes(code));
      if (byCode) return byCode.id;
    }
    return requests[0]?.id || null;
  }, [activeConnectionId, recipientData, code]);

  // Get current connection data to check check-in/check-out status
  const currentConnection = useMemo(() => {
    if (!recipientData?.data?.requests?.length) return null;
    const requests = recipientData.data.requests as RecipientRequest[];

    if (code) {
      const byCode = requests.find((r) => r.id.includes(code));
      if (byCode) return byCode;
    }
    return requests[0] || null;
  }, [recipientData, code]);

  // Determine button states based on check-in/check-out times
  const isCheckInDisabled = useMemo(() => {
    return !derivedConnectionId || isCheckInUpdating || !!currentConnection?.check_in_time;
  }, [derivedConnectionId, isCheckInUpdating, currentConnection?.check_in_time]);

  const isCheckOutDisabled = useMemo(() => {
    return !derivedConnectionId || isCheckInUpdating || !!currentConnection?.check_out_time;
  }, [derivedConnectionId, isCheckInUpdating, currentConnection?.check_out_time]);

  // postMessage listener to close iframe and refresh
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (typeof event.origin !== "string" || !event.origin.startsWith(IVERIFI_ORIGIN)) return;
      const data = event.data;
      if (data && typeof data === "object" && data.type === "iverifi" && data.status === "completed") {
        toast.success("Verification completed.");
        setIframeUrl(null);
        // setVerifyingDocType(null);
        await refetchCredentials();
        if (code) await refetchRecipient();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refetchCredentials, refetchRecipient, code]);

  // share credentials (use the derivedConnectionId)
  const handleShareCredentials = async (documentType: DocumentType) => {
    if (!derivedConnectionId) {
      toast.error("No connection found yet. Please wait a moment and try again.");
      // optionally force a refetch to speed things up
      await refetchRecipient();
      return;
    }
    const credential = verifiedCredentialsMap[documentType];
    if (!credential) return toast.error("Credential not found");

    try {
      const credentialId = credential.credential_id || credential.id || credential.credentialId;
      if (!credentialId) return toast.error("Invalid credential ID");

      await updateCredentials({
        credential_request_id: derivedConnectionId,
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
    } catch (error: any) {
      toast.error(error?.data?.message ? String(error.data.message) : "Failed to share credentials");
    }
  };

  // verify document → open iframe overlay (no popup)
  const handleVerifyDocument = async (documentType: DocumentType) => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return toast.error("User not authenticated");

    try {
      const q = query(collection(db, "applicants"), where("email", "==", currentUser.email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return toast.error("User data not found");

      const userId = querySnapshot.docs[0].id;
      const productCode = PRODUCT_CODE_MAP[documentType];
      const origin = window.location.origin;

      const verificationUrl =
        `${IVERIFI_ORIGIN}/user/home?client_id=iverifi&api_key=iverifi&process=U` +
        `&productCode=${encodeURIComponent(productCode)}` +
        `&user_id=${encodeURIComponent(userId)}` +
        `&redirect_origin=${encodeURIComponent(origin)}`;

      // setVerifyingDocType(documentType);
      setIframeUrl(verificationUrl);
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to get user data");
    }
  };

  const navigateToCleanConnections = () => navigate("/connections", { replace: true });

  // Handle Check In/Out actions
  const handleCheckInOut = async (status: "checkin" | "checkout") => {
    if (!derivedConnectionId) {
      toast.error("No connection found yet. Please wait a moment and try again.");
      await refetchRecipient();
      return;
    }

    try {
      await updateCheckInStatus({
        credential_request_id: derivedConnectionId,
        credentials: [],
        status,
      }).unwrap();

      toast.success(`Successfully ${status === "checkin" ? "checked in" : "checked out"}.`);

      // Refresh recipient data to get updated check-in/check-out status
      await refetchRecipient();
    } catch (error: any) {
      toast.error(
        error?.data?.message
          ? String(error.data.message)
          : `Failed to ${status === "checkin" ? "check in" : "check out"}`
      );
    }
  };

  if (isCredentialsLoading || isRecipientLoading) {
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

      {/* Check In/Out Actions */}
      {code && (
        <div className="flex gap-4">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={() => handleCheckInOut("checkin")}
            disabled={isCheckInDisabled}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isCheckInUpdating
              ? "Checking In..."
              : currentConnection?.check_in_time
              ? "Already Checked In"
              : "Check In"}
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={() => handleCheckInOut("checkout")}
            disabled={isCheckOutDisabled}
          >
            <X className="h-4 w-4 mr-2" />
            {isCheckInUpdating
              ? "Checking Out..."
              : currentConnection?.check_out_time
              ? "Already Checked Out"
              : "Check Out"}
          </Button>
        </div>
      )}

      {/* Document Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOCUMENT_TYPES.map((docType) => {
          const isVerified = !!verifiedCredentialsMap[docType];
          const isShareDisabled = !isVerified || isUpdating || !derivedConnectionId;

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
                    {derivedConnectionId ? "Share credentials" : "Preparing connection…"}
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

      {/* Iframe Overlay */}
      {iframeUrl && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2">
          <div className="relative bg-white w-full max-w-3xl h-[88vh] rounded-2xl shadow-xl overflow-hidden">
            <button
              aria-label="Close"
              className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
              onClick={async () => {
                setIframeUrl(null);
                // setVerifyingDocType(null);
                await refetchCredentials();
                if (code) await refetchRecipient();
              }}
            >
              <X className="h-4 w-4" />
              Close
            </button>
            <iframe
              src={iframeUrl}
              title="Document Verification"
              className="w-full h-full"
              allow="camera; microphone; clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Connections;
