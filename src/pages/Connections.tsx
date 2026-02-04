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
import { CheckCircle, ExternalLink, Share2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { DigiLockerIcon } from "@/components/digilocker-icon";

const DOCUMENT_TYPES = ["DRIVING_LICENSE", "AADHAAR_CARD", "PAN_CARD", "PASSPORT"] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

const PRODUCT_CODE_MAP: Record<DocumentType, string> = {
  AADHAAR_CARD: "KYC",
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
  check_in_status?: string; // 'pending' when awaiting hotel approval
  credentials?: Array<{
    credential_id?: string;
    document_type?: string;
    status?: string;
    expiry_date?: string;
  }>;
}

const IVERIFI_ORIGIN = "https://iverifi.app.getkwikid.com";

const Connections = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();

  // iframe overlay
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  // const [verifyingDocType, setVerifyingDocType] = useState<DocumentType | null>(
  //   null
  // );

  // track the just-created connection id (to avoid waiting on recipientData)
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

  // track if credentials are available for check-in/out
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);

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
      } catch (err) {
        console.error("Error adding connection on load:", err);
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

  // Check credentials availability from API response instead of Firestore
  const hasCredentialsFromAPI = useMemo(() => {
    if (!currentConnection) return null;
    
    // Check if credentials array exists and has at least one active credential
    const credentials = currentConnection.credentials;
    if (!credentials || !Array.isArray(credentials)) return false;
    
    // Check if there's at least one credential with status "Active"
    const hasActiveCredential = credentials.some(
      (cred: any) => cred?.status === "Active" && cred?.document_type
    );
    
    return hasActiveCredential;
  }, [currentConnection]);

  // Use API data if available, otherwise fallback to null (loading state)
  useEffect(() => {
    if (hasCredentialsFromAPI !== null) {
      setHasCredentials(hasCredentialsFromAPI);
    } else {
      // If we don't have connection data yet, set to null (loading)
      setHasCredentials(null);
    }
  }, [hasCredentialsFromAPI]);

  // Determine button states: disable if no connection, updating, no credentials, already checked in, or pending approval
  const isCheckInDisabled = useMemo(() => {
    return (
      !derivedConnectionId ||
      isCheckInUpdating ||
      hasCredentials === false ||
      !!currentConnection?.check_in_time || // Disable if already checked in
      currentConnection?.check_in_status === "pending" // Disable if pending hotel approval
    );
  }, [derivedConnectionId, isCheckInUpdating, hasCredentials, currentConnection?.check_in_time, currentConnection?.check_in_status]);

  // const isCheckOutDisabled = useMemo(() => {
  //   return !derivedConnectionId || isCheckInUpdating || !!currentConnection?.check_out_time;
  // }, [derivedConnectionId, isCheckInUpdating, currentConnection?.check_out_time]);

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
      
      // Refetch recipient data to update credentials state
      await refetchRecipient();
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

      // const userId = querySnapshot.docs[0].data().firebase_user_id;
      const userId = auth.currentUser?.uid || "";
      console.log("Fetched userId:", userId);
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

  // const navigateToCleanConnections = () => navigate("/connections", { replace: true });

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

      toast.success(
        status === "checkin"
          ? "Check-in request submitted. Waiting for hotel approval."
          : "Successfully checked out."
      );

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
      {/* <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Connections</h1>
        {code && (
          <Button variant="outline" size="sm" onClick={navigateToCleanConnections}>
            Clear Code
          </Button>
        )}
      </div> */}

      {/* Connection Info */}
      {code && (
        <div className="py-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            Welcome to the{" "}
            <span>
                {recipientData?.data?.requests?.[0]?.recipients?.name ||
                  recipientData?.data?.requests?.[0]?.recipients?.firstName ||
                  "Connection"}
              </span>
          </h2>
            </div>
      )}

      {/* Check In/Out Actions */}
      {code && (
        <div className="space-y-2">
          {hasCredentials === false && (
            <p className="text-sm text-muted-foreground text-center">
              Please verify at least one document to complete check-in at{" "}
              <span className="font-semibold">
                {recipientData?.data?.requests?.[0]?.recipients?.name ||
                  recipientData?.data?.requests?.[0]?.recipients?.firstName ||
                  "Connection"}
              </span>
            </p>
          )}
        <div className="flex flex-col gap-2">
          <div className="flex gap-4">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={() => handleCheckInOut("checkin")}
              disabled={isCheckInDisabled}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isCheckInUpdating
                ? "Submitting..."
                : currentConnection?.check_in_time
                ? "Already Checked In"
                : currentConnection?.check_in_status === "pending"
                ? "Check-in Pending Approval"
                : hasCredentials === false
                ? "Check In (Document Required)"
                : "Check In"}
            </Button>
          </div>
          {currentConnection?.check_in_status === "pending" && !currentConnection?.check_in_time && (
            <p className="text-sm text-amber-600 text-center">
              Your check-in is pending. The hotel will approve it shortly.
            </p>
          )}
          {/* <Button
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
          </Button> */}
          </div>
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
                    <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Verified by</span>
                      <DigiLockerIcon size={9} className="shrink-0" />
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
