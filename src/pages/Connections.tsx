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
  useDeleteCredentialMutation,
} from "@/redux/api";
import { determineConnectionType, isValidQRCode } from "@/utils/qr-code-utils";
import { addDays, format } from "date-fns";
import { collection, getDocs, query, where } from "firebase/firestore";
import { CheckCircle, ExternalLink, Share2, X, Trash2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { clearPendingRecipientId } from "@/utils/connectionFlow";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DigiLockerIcon } from "@/components/digilocker-icon";

const DOCUMENT_TYPES = ["DRIVING_LICENSE", "AADHAAR_CARD", "PAN_CARD", "PASSPORT"] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Backend document_type values for children's Aadhaar (Kwik: XMLM1, XMLM2, XMLM3) */
const CHILD_AADHAAR_TYPES = ["Child 1 Aadhaar", "Child 2 Aadhaar", "Child 3 Aadhaar"] as const;
type ChildAadhaarType = (typeof CHILD_AADHAAR_TYPES)[number];

const PRODUCT_CODE_MAP: Record<DocumentType, string> = {
  AADHAAR_CARD: "KYC",
  PASSPORT: "PP",
  PAN_CARD: "PC",
  DRIVING_LICENSE: "DL",
};

/** Kwik product codes for child Aadhaar (minor XML flow) */
const CHILD_PRODUCT_CODE_MAP: Record<ChildAadhaarType, string> = {
  "Child 1 Aadhaar": "XMLM1",
  "Child 2 Aadhaar": "XMLM2",
  "Child 3 Aadhaar": "XMLM3",
};

const getProductCode = (docType: DocumentType | ChildAadhaarType): string =>
  docType in PRODUCT_CODE_MAP
    ? (PRODUCT_CODE_MAP as Record<string, string>)[docType]
    : (CHILD_PRODUCT_CODE_MAP as Record<string, string>)[docType];

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
  const location = useLocation();
  const navigate = useNavigate();

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
  const [deleteCredential, { isLoading: isDeleting }] = useDeleteCredentialMutation();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; document_type: string } | null>(null);

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

  const handleDeleteDoc = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCredential({ credential_id: deleteTarget.id }).unwrap();
      toast.success("Document deleted successfully");
      setDeleteTarget(null);
      await refetchCredentials();
      if (code) await refetchRecipient();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "Failed to delete document");
    }
  };

  // share credentials (use the derivedConnectionId). Supports main docs and children's Aadhaar.
  const handleShareCredentials = async (documentType: DocumentType | ChildAadhaarType) => {
    if (!derivedConnectionId) {
      toast.error("You need to scan a QR code to share credentials.");
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

  // verify document → open iframe overlay (no popup). Supports main docs and children's Aadhaar.
  const handleVerifyDocument = async (documentType: DocumentType | ChildAadhaarType) => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return toast.error("User not authenticated");

    try {
      const q = query(collection(db, "applicants"), where("email", "==", currentUser.email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return toast.error("User data not found");

      const userId = auth.currentUser?.uid || "";
      const productCode = getProductCode(documentType);
      const origin = window.location.origin;

      const verificationUrl =
        `${IVERIFI_ORIGIN}/user/home?client_id=iverifi&api_key=iverifi&process=U` +
        `&productCode=${encodeURIComponent(productCode)}` +
        `&user_id=${encodeURIComponent(userId)}` +
        `&redirect_origin=${encodeURIComponent(origin)}`;

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

      if (status === "checkin") {
        // Clear connection code from storage and URL so user cannot return to this flow until they scan again
        clearPendingRecipientId();
        navigate(location.pathname, { replace: true });
      }

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
      <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-white p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOCUMENT_TYPES.map((docType) => (
              <Card key={docType} className="p-4 rounded-xl border-teal-100 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-24 rounded" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-slate-50/30 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      {/* <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Connections</h1>
        {code && (
          <Button variant="outline" size="sm" onClick={navigateToCleanConnections}>
            Clear Code
          </Button>
        )}
      </div> */}

      {/* When no venue code: prompt to scan QR */}
      {!code && (
        <div className="py-4 text-center">
          <p className="text-slate-600 text-base">
            Scan a QR at the venue to share your ID document.
          </p>
        </div>
      )}

      {/* Connection Info - Welcome */}
      {code && (
        <div className="py-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            Welcome to{" "}
            <span className="font-bold text-teal-600">
              {recipientData?.data?.requests?.[0]?.recipients?.name ||
                recipientData?.data?.requests?.[0]?.recipients?.firstName ||
                "your stay"}
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            Verify a document below, then tap Check In to request approval.
          </p>
        </div>
      )}

      {/* Check In / Status card */}
      {code && (
        <Card className="rounded-2xl border-teal-100 shadow-md overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            {hasCredentials === false && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-center">
                Verify at least one document to check in at{" "}
                <span className="font-bold text-amber-900">
                  {recipientData?.data?.requests?.[0]?.recipients?.name ||
                    recipientData?.data?.requests?.[0]?.recipients?.firstName ||
                    "this property"}
                </span>
              </p>
            )}
            <div className="flex flex-col gap-3">
              <Button
                className="flex-1 h-12 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-200 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed transition-all"
                onClick={() => handleCheckInOut("checkin")}
                disabled={isCheckInDisabled}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                {isCheckInUpdating
                  ? "Submitting..."
                  : currentConnection?.check_in_time
                  ? "Checked In"
                  : currentConnection?.check_in_status === "pending"
                  ? "Check-in Pending Approval"
                  : hasCredentials === false
                  ? "Check In (Document Required)"
                  : "Check In"}
              </Button>
              {currentConnection?.check_in_status === "pending" && !currentConnection?.check_in_time && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-amber-800">
                    Your check-in is pending. The hotel will approve it shortly.
                  </p>
                </div>
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
          </CardContent>
        </Card>
      )}

      {/* Document cards section label */}
      <div className="pt-2">
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Your documents</h3>
        <p className="text-sm text-slate-500">
          {code ? "Verify and share credentials with the property" : "Scan a QR at the venue to share your ID document."}
        </p>
      </div>

      {/* Document Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOCUMENT_TYPES.map((docType) => {
          const isVerified = !!verifiedCredentialsMap[docType];
          const isShareDisabled = !isVerified || isUpdating;

          return (
            <Card
              key={docType}
              className={`rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
                isVerified
                  ? "border-teal-200 bg-teal-50/30 shadow-sm hover:border-teal-300"
                  : "border-slate-200 bg-white shadow-sm hover:border-teal-200 hover:bg-teal-50/20"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg font-semibold text-slate-800 capitalize">
                    {docType.replace(/_/g, " ").toLowerCase()}
                  </CardTitle>
                  {isVerified && (
                    <Badge className="bg-teal-600 text-white gap-1 border-0 shadow-sm">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Verified</span>
                      <DigiLockerIcon size={9} className="shrink-0 opacity-90" />
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isVerified ? (
                  <div className="flex gap-2">
                    {code ? (
                      <Button
                        className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 font-medium"
                        disabled={isShareDisabled}
                        onClick={() => handleShareCredentials(docType)}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share credentials
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 font-medium"
                        variant="outline"
                        onClick={() => navigate("/documents")}
                      >
                        View documents
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 rounded-xl text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                      onClick={() => {
                        const cred = verifiedCredentialsMap[docType];
                        const id = cred?.credential_id || cred?.id || cred?.credentialId;
                        if (id) setDeleteTarget({ id, document_type: docType });
                      }}
                      aria-label="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full rounded-xl border-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 font-medium"
                    variant="outline"
                    onClick={() => handleVerifyDocument(docType)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Verify Document
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Children's Aadhaar — parent can manage Aadhaar for up to 3 children */}
      <div className="pt-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Children&apos;s Aadhaar</h3>
        <p className="text-sm text-slate-500 mb-4">
          Manage Aadhaar for your children. You can add and verify Aadhaar for up to 3 children.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CHILD_AADHAAR_TYPES.map((docType) => {
            const isVerified = !!verifiedCredentialsMap[docType];
            const isShareDisabled = !isVerified || isUpdating;
            const childLabel = docType.replace(" Aadhaar", ""); // "Child 1", "Child 2", "Child 3"

            return (
              <Card
                key={docType}
                className={`rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
                  isVerified
                    ? "border-teal-200 bg-teal-50/30 shadow-sm hover:border-teal-300"
                    : "border-slate-200 bg-white shadow-sm hover:border-teal-200 hover:bg-teal-50/20"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg font-semibold text-slate-800">
                      {childLabel}&apos;s Aadhaar
                    </CardTitle>
                    {isVerified && (
                      <Badge className="bg-teal-600 text-white gap-1 border-0 shadow-sm">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Verified</span>
                        <DigiLockerIcon size={9} className="shrink-0 opacity-90" />
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isVerified ? (
                    <div className="flex gap-2">
                      {code ? (
                        <Button
                          className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 font-medium"
                          disabled={isShareDisabled}
                          onClick={() => handleShareCredentials(docType)}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share credentials
                        </Button>
                      ) : (
                        <Button
                          className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 font-medium"
                          variant="outline"
                          onClick={() => navigate("/documents")}
                        >
                          View documents
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 rounded-xl text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                        onClick={() => {
                          const cred = verifiedCredentialsMap[docType];
                          const id = cred?.credential_id || cred?.id || cred?.credentialId;
                          if (id) setDeleteTarget({ id, document_type: docType });
                        }}
                        aria-label={`Delete ${childLabel}'s Aadhaar`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full rounded-xl border-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 font-medium"
                      variant="outline"
                      onClick={() => handleVerifyDocument(docType)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Verify Document
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      </div>
      {/* max-w-2xl end */}

      {/* Delete document confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this verified document
            {deleteTarget?.document_type ? ` (${deleteTarget.document_type.replace(/_/g, " ")})` : ""}?
            You can add it again later.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDoc} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Iframe Overlay */}
      {iframeUrl && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2">
          <div className="relative bg-white w-full max-w-3xl h-[88vh] rounded-2xl shadow-xl overflow-hidden">
            <button
              aria-label="Close"
              className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-teal-50 hover:border-teal-200 hover:text-teal-800 transition-colors"
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
