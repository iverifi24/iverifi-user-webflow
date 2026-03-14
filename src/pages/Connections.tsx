import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/loading-screen";
import { auth } from "@/firebase/firebase_setup";
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
import { CheckCircle, Share2, Trash2, Loader2, IdCard, FileText, Briefcase, Globe, X } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { clearPendingRecipientId } from "@/utils/connectionFlow";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VerifierBadge } from "@/components/verifier-badge";
import { WelcomeCard } from "@/components/welcome-card";
import { getApplicantProfileFromBackend } from "@/utils/syncApplicantProfile";
import { Badge } from "@/components/ui/badge";

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

/** Subtitle under document name (e.g. "UIDAI Verified") */
const DOC_TYPE_SUBTITLE: Record<string, string> = {
  DRIVING_LICENSE: "State RTO Verified",
  AADHAAR_CARD: "UIDAI Verified",
  PAN_CARD: "Income Tax Department",
  PASSPORT: "Passport Seva",
  "Child 1 Aadhaar": "UIDAI Verified",
  "Child 2 Aadhaar": "UIDAI Verified",
  "Child 3 Aadhaar": "UIDAI Verified",
};

const getDocSubtitle = (docType: string): string =>
  DOC_TYPE_SUBTITLE[docType] ?? "Verified";

/** Icon component per document type for card left-side icon */
const DOC_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  DRIVING_LICENSE: Briefcase,
  AADHAAR_CARD: IdCard,
  PAN_CARD: FileText,
  PASSPORT: Globe,
  "Child 1 Aadhaar": IdCard,
  "Child 2 Aadhaar": IdCard,
  "Child 3 Aadhaar": IdCard,
};

/** Background color for document icon box (Tailwind classes) */
const DOC_ICON_BG: Record<string, string> = {
  DRIVING_LICENSE: "bg-blue-100 text-blue-700",
  AADHAAR_CARD: "bg-rose-100 text-rose-700",
  PAN_CARD: "bg-emerald-100 text-emerald-700",
  PASSPORT: "bg-amber-100 text-amber-700",
  "Child 1 Aadhaar": "bg-rose-100 text-rose-700",
  "Child 2 Aadhaar": "bg-rose-100 text-rose-700",
  "Child 3 Aadhaar": "bg-rose-100 text-rose-700",
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

  // welcome card: first name for "Welcome back, {name}!"
  const [welcomeFirstName, setWelcomeFirstName] = useState<string>("");

  // code from query OR path (no normalization)
  const codeFromQuery = searchParams.get("code") || null;
  const codeFromPath = (params.code as string) || null;
  const code = codeFromQuery || codeFromPath || null;

  // Fetch profile for welcome greeting when no venue code
  useEffect(() => {
    if (code) return;
    getApplicantProfileFromBackend()
      .then((p) => {
        const first = (p.firstName as string) || "";
        if (first) setWelcomeFirstName(first);
      })
      .catch(() => {});
  }, [code]);

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

  /** Prevent double-submit: stays true until API settles; only cleared on error so user can retry */
  const [isCheckInOutInFlight, setCheckInOutInFlight] = useState(false);

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

  // Determine button states: disable if no connection, updating, in-flight, no credentials, already checked in, or pending approval
  const isCheckInDisabled = useMemo(() => {
    return (
      !derivedConnectionId ||
      isCheckInUpdating ||
      isCheckInOutInFlight ||
      hasCredentials === false ||
      !!currentConnection?.check_in_time || // Disable if already checked in
      currentConnection?.check_in_status === "pending" // Disable if pending hotel approval
    );
  }, [derivedConnectionId, isCheckInUpdating, isCheckInOutInFlight, hasCredentials, currentConnection?.check_in_time, currentConnection?.check_in_status]);

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

  // upload credentials (use the derivedConnectionId). Supports main docs and children's Aadhaar.
  const handleShareCredentials = async (documentType: DocumentType | ChildAadhaarType) => {
    if (!derivedConnectionId) {
      toast.error("You need to scan a QR code to share.");
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

      toast.success("Your verified credential was shared successfully.");
      
      // Refetch recipient data to update credentials state
      await refetchRecipient();
    } catch (error: any) {
      toast.error(error?.data?.message ? String(error.data.message) : "Failed to share");
    }
  };

  // verify document → open iframe overlay (no popup). Supports main docs and children's Aadhaar.
  const handleVerifyDocument = async (documentType: DocumentType | ChildAadhaarType) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return toast.error("User not authenticated");

    const userId = currentUser.uid;
    const productCode = getProductCode(documentType);
    const origin = window.location.origin;

    const verificationUrl =
      `${IVERIFI_ORIGIN}/user/home?client_id=iverifi&api_key=iverifi&process=U` +
      `&productCode=${encodeURIComponent(productCode)}` +
      `&user_id=${encodeURIComponent(userId)}` +
      `&redirect_origin=${encodeURIComponent(origin)}`;

    setIframeUrl(verificationUrl);
  };

  // const navigateToCleanConnections = () => navigate("/connections", { replace: true });

  // Handle Check In/Out actions
  const handleCheckInOut = async (status: "checkin" | "checkout") => {
    if (isCheckInOutInFlight || isCheckInUpdating) return;

    if (!derivedConnectionId) {
      toast.error("No connection found yet. Please wait a moment and try again.");
      await refetchRecipient();
      return;
    }

    setCheckInOutInFlight(true);

    // For check-in, send the credential_id of the first active shared credential so the hotel sees the correct document
    const credentials = currentConnection?.credentials ?? [];
    const firstActiveCredential = Array.isArray(credentials)
      ? credentials.find(
          (c: { status?: string; credential_id?: string }) => c?.status === "Active" && c?.credential_id
        )
      : undefined;
    const credentialIdForCheckIn =
      firstActiveCredential && typeof firstActiveCredential === "object" && "credential_id" in firstActiveCredential
        ? firstActiveCredential.credential_id
        : undefined;

    try {
      await updateCheckInStatus({
        credential_request_id: derivedConnectionId,
        credentials: [],
        status,
        ...(status === "checkin" && credentialIdForCheckIn && { credential_id: credentialIdForCheckIn }),
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
      setCheckInOutInFlight(false);
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
        <div className="max-w-2xl mx-auto">
          <LoadingScreen variant="cards" cardCount={4} showHeaderSkeletons />
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

      {/* Welcome hero when no venue code (mobile-style) */}
      {!code && (
        <WelcomeCard
          userName={welcomeFirstName || undefined}
          onScanQR={() => navigate("/connections")}
          onAddDocument={() => navigate("/documents")}
        />
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
        {code && (
          <p className="text-sm text-slate-500">
            Verify and share to the property
          </p>
        )}
      </div>

      {/* Document Cards — mobile-style: icon, subtitle, status badge, actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOCUMENT_TYPES.map((docType) => {
          const isVerified = !!verifiedCredentialsMap[docType];
          const isShareDisabled = !isVerified || isUpdating;
          const DocIcon = DOC_ICON_MAP[docType] ?? FileText;
          const iconBg = DOC_ICON_BG[docType] ?? "bg-slate-100 text-slate-600";
          const title = docType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
          const subtitle = getDocSubtitle(docType);

          return (
            <Card
              key={docType}
              className={`rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
                isVerified
                  ? "border-teal-200 bg-white shadow-sm hover:border-teal-300"
                  : "border-slate-200 bg-white shadow-sm hover:border-slate-300"
              } ${code && isVerified && !isShareDisabled ? "cursor-pointer" : ""}`}
              onClick={code && isVerified && !isShareDisabled ? () => handleShareCredentials(docType) : undefined}
              role={code && isVerified && !isShareDisabled ? "button" : undefined}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                    <DocIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold text-slate-800">
                      {title}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
                    <div className="mt-2">
                      {isVerified ? (
                        <VerifierBadge documentType={docType} className="shrink-0" />
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-0">
                          Not Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {isVerified ? (
                    <>
                      {code ? (
                        <Button
                          size="sm"
                          className="rounded-xl bg-teal-600 hover:bg-teal-700"
                          disabled={isShareDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareCredentials(docType);
                          }}
                        >
                          <Share2 className="h-4 w-4 mr-1.5" />
                          Share
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-teal-300 text-teal-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/documents");
                          }}
                        >
                          View
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cred = verifiedCredentialsMap[docType];
                          const id = cred?.credential_id || cred?.id || cred?.credentialId;
                          if (id) setDeleteTarget({ id, document_type: docType });
                        }}
                        aria-label="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerifyDocument(docType);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Document
                    </Button>
                  )}
                </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHILD_AADHAAR_TYPES.map((docType) => {
            const isVerified = !!verifiedCredentialsMap[docType];
            const isShareDisabled = !isVerified || isUpdating;
            const childLabel = docType.replace(" Aadhaar", "");
            const DocIcon = DOC_ICON_MAP[docType] ?? IdCard;
            const iconBg = DOC_ICON_BG[docType] ?? "bg-rose-100 text-rose-700";
            const subtitle = getDocSubtitle(docType);

            return (
              <Card
                key={docType}
                className={`rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
                  isVerified
                    ? "border-teal-200 bg-white shadow-sm hover:border-teal-300"
                    : "border-slate-200 bg-white shadow-sm hover:border-slate-300"
                } ${code && isVerified && !isShareDisabled ? "cursor-pointer" : ""}`}
                onClick={code && isVerified && !isShareDisabled ? () => handleShareCredentials(docType) : undefined}
                role={code && isVerified && !isShareDisabled ? "button" : undefined}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                      <DocIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-semibold text-slate-800">
                        {childLabel}&apos;s Aadhaar
                      </CardTitle>
                      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
                      <div className="mt-2">
                        {isVerified ? (
                          <VerifierBadge documentType={docType} className="shrink-0" />
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-0">
                            Not Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {isVerified ? (
                      <>
                        {code ? (
                          <Button
                            size="sm"
                            className="rounded-xl bg-teal-600 hover:bg-teal-700"
                            disabled={isShareDisabled}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareCredentials(docType);
                            }}
                          >
                            <Share2 className="h-4 w-4 mr-1.5" />
                            Share
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-teal-300 text-teal-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/documents");
                            }}
                          >
                            View
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            const cred = verifiedCredentialsMap[docType];
                            const id = cred?.credential_id || cred?.id || cred?.credentialId;
                            if (id) setDeleteTarget({ id, document_type: docType });
                          }}
                          aria-label={`Delete ${childLabel}'s Aadhaar`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerifyDocument(docType);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify Document
                      </Button>
                    )}
                  </div>
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
