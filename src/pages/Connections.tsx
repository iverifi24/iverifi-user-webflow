import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/loading-screen";
import { auth } from "@/firebase/firebase_setup";
import {
  useAddConnectionMutation,
  useGetCredentialsQuery,
  useGetConnectionsQuery,
  useGetRecipientCredentialsQuery,
  useUpdateCredentialsRequestMutation,
  useUpdateCheckInStatusMutation,
  useDeleteCredentialMutation,
  // useSaveCFormMutation,
  useSaveForeignPassportMutation,
  useCreateCredentialMutation,
  useGetFamilyCredentialsQuery,
  useDeleteFamilyCredentialMutation,
  useUpdateCredentialHotelMutation,
} from "@/redux/api";
// import { CFormDialog } from "@/components/c-form-dialog";
// import type { CFormData, CFormPassportData } from "@/components/c-form-dialog";
import { ForeignPassportDialog } from "@/components/foreign-passport-dialog";
import type { ForeignPassportPhotos } from "@/components/foreign-passport-dialog";
import { determineConnectionType, isValidQRCode } from "@/utils/qr-code-utils";
import { addDays, format } from "date-fns";
import {
  CheckCircle,
  ChevronRight,
  Globe2,
  Loader2,
  Lock,
  Plus,
  Share2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  clearPendingRecipientId,
  saveRecipientIdForLater,
  getRecipientIdFromStorage,
} from "@/utils/connectionFlow";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VerifierBadge } from "@/components/verifier-badge";
import { DocumentTypeIcon } from "@/components/document-type-icon";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { FeedbackModal } from "@/components/feedback-modal";
import { VenueRecognitionModal } from "@/components/venue-recognition-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DOCUMENT_TYPES = [
  "DRIVING_LICENSE",
  "AADHAAR_CARD",
  "PAN_CARD",
  "PASSPORT",
  "C-Form (Foreign Guest)",
] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

const HOME_DOCUMENT_TYPES = [
  "DRIVING_LICENSE",
  "AADHAAR_CARD",
  "PAN_CARD",
  "PASSPORT",
] as const;

/* Derive a 3-char hotel code from the hotel name for C-Form reference numbers.
function hotelCodeFromName(name: string): string {
  const stops = new Set(["the", "a", "an", "and", "&", "hotel", "inn", "resort", "lodge", "suites", "palace"]);
  const words = name.trim().split(/\s+/).filter((w) => !stops.has(w.toLowerCase()));
  if (words.length === 0) return "HTL";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase().padEnd(3, "X");
  return words.slice(0, 3).map((w) => w[0].toUpperCase()).join("").padEnd(3, "X");
} */

/* Generate a sequential C-Form reference: CF-YYYY-XXX-NNN (counter persisted in localStorage).
function generateCFormRef(hotelName: string): string {
  const code = hotelCodeFromName(hotelName);
  const year = new Date().getFullYear();
  const key = `cf_seq_${code}_${year}`;
  const seq = (parseInt(localStorage.getItem(key) || "0", 10)) + 1;
  localStorage.setItem(key, String(seq));
  return `CF-${year}-${code}-${String(seq).padStart(3, "0")}`;
} */

const PRODUCT_CODE_MAP: Record<DocumentType, string> = {
  AADHAAR_CARD: "KYC",
  PASSPORT: "PP",
  PAN_CARD: "PC",
  DRIVING_LICENSE: "DL",
  // C-Form is filled from passport upload in iVerifi flow, so reuse passport productCode.
  "C-Form (Foreign Guest)": "PP",
};

const getProductCode = (docType: DocumentType): string =>
  (PRODUCT_CODE_MAP as Record<string, string>)[docType] ?? "KYC";

const FAMILY_DOC_OPTIONS = [
  { type: "FAMILY_AADHAAR",   label: "Aadhaar",         subtitle: "UIDAI Verified",          productCode: "KYC", iconType: "AADHAAR_CARD"      },
  { type: "FAMILY_PASSPORT",  label: "Passport",        subtitle: "Passport Seva",            productCode: "PP",  iconType: "PASSPORT"          },
  { type: "FAMILY_DL",        label: "Driving License", subtitle: "State RTO Verified",       productCode: "DL",  iconType: "DRIVING_LICENSE"   },
  { type: "FAMILY_PAN",       label: "PAN Card",        subtitle: "Income Tax Department",    productCode: "PC",  iconType: "PAN_CARD"          },
] as const;
const FAMILY_DOC_UNKNOWN = { type: "UNKNOWN", label: "ID Document", subtitle: "Verified", productCode: "KYC", iconType: "AADHAAR_CARD" } as const;
type FamilyDocType = (typeof FAMILY_DOC_OPTIONS)[number]["type"];





const SMART_CARD_META: Record<
  string,
  {
    issuer: string;
    unverifiedTime: string;
    unverifiedProvider: string;
    gradient: string;
  }
> = {
  AADHAAR_CARD: {
    issuer: "UIDAI · Govt of India",
    unverifiedTime: "30s",
    unverifiedProvider: "DigiLocker",
    gradient: "from-slate-900/90 via-slate-800 to-indigo-950/70",
  },
  DRIVING_LICENSE: {
    issuer: "MoRTH · State Transport",
    unverifiedTime: "45s",
    unverifiedProvider: "Parivahan",
    gradient: "from-slate-900/90 via-slate-800 to-teal-950/70",
  },
  PAN_CARD: {
    issuer: "Income Tax Dept · Govt of India",
    unverifiedTime: "30s",
    unverifiedProvider: "NSDL / DigiLocker",
    gradient: "from-slate-900/90 via-slate-800 to-sky-950/70",
  },
  PASSPORT: {
    issuer: "Ministry of External Affairs",
    unverifiedTime: "60s",
    unverifiedProvider: "Passport Seva",
    gradient: "from-slate-900/90 via-slate-800 to-amber-950/60",
  },
};

interface Credential {
  id?: string;
  credential_id?: string;
  credentialId?: string;
  document_type: string;
  details?: Record<string, any> & { document_type?: string };
  [key: string]: any;
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

const IVERIFI_ORIGIN = import.meta.env.VITE_KWIK_ORIGIN || "https://iverifi.app.getkwikid.com";
const KWIK_CLIENT_ID = import.meta.env.VITE_KWIK_CLIENT_ID || "iverifi";

const titleCase = (value: string): string =>
  value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const pickFirst = (obj: any, keys: string[]): any => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

const getAddressPart = (details: Record<string, any>, keys: string[]) => {
  const direct = pickFirst(details, keys);
  if (direct != null) return direct;
  const addressObj = details?.address;
  if (addressObj && typeof addressObj === "object") {
    return pickFirst(addressObj, keys);
  }
  return null;
};

const flattenSources = (
  source: Record<string, any> | null | undefined,
): Record<string, any> => {
  if (!source || typeof source !== "object") return {};
  const nestedKeys = [
    "details",
    "display",
    "data",
    "payload",
    "document_data",
    "parsed_data",
    "metadata",
    "response",
  ];
  const merged: Record<string, any> = { ...source };
  nestedKeys.forEach((key) => {
    let value = source[key];
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        // not json
      }
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(merged, value as Record<string, any>);
    }
  });
  return merged;
};

const deepFlatten = (
  value: any,
  out: Record<string, any> = {},
): Record<string, any> => {
  if (!value || typeof value !== "object") return out;
  Object.entries(value).forEach(([k, v]) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      v.forEach((item) => {
        if (item && typeof item === "object") deepFlatten(item, out);
      });
      return;
    }
    if (typeof v === "object") {
      deepFlatten(v, out);
      return;
    }
    out[k] = v;
  });
  return out;
};

const extractKwikOcr = (
  credential: Record<string, any>,
): Record<string, any> => {
  const step =
    credential?.session_data_array?.extras?.session_data?.summary_data
      ?.data?.[0] ??
    credential?.sessionDataArray?.extras?.session_data?.summary_data
      ?.data?.[0] ??
    null;
  const ocr = step?.ocr && typeof step.ocr === "object" ? step.ocr : {};
  const images =
    step?.images && typeof step.images === "object" ? step.images : {};

  // DigiLocker flow — data lives in digilocker_data[0].data
  const digilockerRaw = step?.digilocker_data?.[0]?.data;
  const digilockerData =
    digilockerRaw && typeof digilockerRaw === "object" ? digilockerRaw : {};
  // Derive aadhaar last 4 from masked number like "xxxxxxxx4080"
  const maskedNumber = digilockerData.number
    ? String(digilockerData.number)
    : "";
  const derivedLast4 = maskedNumber
    ? maskedNumber.replace(/[^0-9]/g, "").slice(-4)
    : undefined;
  const digilockerExtras: Record<string, any> = { ...digilockerData };
  if (derivedLast4) digilockerExtras.aadhaarLast4 = derivedLast4;
  // Map user_photo (base64) so existing photo extraction finds it
  if (digilockerData.user_photo)
    digilockerExtras.photo_base64 = digilockerData.user_photo;

  return { ...ocr, ...images, ...digilockerExtras };
};

const parseDob = (raw: unknown): Date | null => {
  if (!raw) return null;
  const s = String(raw).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy)
    return new Date(
      `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`,
    );
  // YYYY/MM/DD or YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd)
    return new Date(
      `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`,
    );
  // DDMMYYYY (8 digits, no separator) — DigiLocker DL format e.g. "06061999"
  const ddmmyyyy = s.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (ddmmyyyy)
    return new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const pickByIncludes = (obj: Record<string, any>, includes: string[]): any => {
  const entries = Object.entries(obj);
  for (const [key, value] of entries) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (
      includes.some((part) => normalized.includes(part)) &&
      value != null &&
      value !== ""
    ) {
      return value;
    }
  }
  return null;
};



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
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(
    null,
  );

  // track if credentials are available for check-in/out
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);

  // run-once guard for adding connection by code
  const processedCodeRef = useRef<string | null>(null);
  /** After QR scan (in-app or camera), open the share sheet once per venue code */
  const autoShareSheetOpenedForCodeRef = useRef<string | null>(null);

  // code from query OR path (no normalization)
  const codeFromQuery = searchParams.get("code") || null;
  const codeFromPath = (params.code as string) || null;
  const code = codeFromQuery || codeFromPath || null;

  // Poll credentials after verification until new credential appears (max 15 s)
  const [verifyPollingMs, setVerifyPollingMs] = useState(0);
  const verifyPollStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const credCountBeforeVerifyRef = useRef(0);
  // IDs of credentials before KYC started — used to find the newly-created credential doc
  const credIdsBeforeVerifyRef = useRef<Set<string>>(new Set());
  // When user verifies via hotel QR (first-time, doc doesn't exist yet), remember the
  // credential_request_id so we can link once the new credential appears in polling
  const pendingHotelLinkRef = useRef<string | null>(null);
  // Always-current mirror of credentialsData — avoids stale closure in onMessage handler
  const latestCredentialsRef = useRef<any>(null);

  // api
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    refetch: refetchCredentials,
  } = useGetCredentialsQuery(undefined, { pollingInterval: verifyPollingMs });

  const { data: connectionsData, isLoading: isConnectionsLoading } =
    useGetConnectionsQuery();

  const {
    data: recipientData,
    isLoading: isRecipientLoading,
    refetch: refetchRecipient,
  } = useGetRecipientCredentialsQuery(code || "", { skip: !code });

  const [updateCredentials] = useUpdateCredentialsRequestMutation();
  const [updateCheckInStatus, { isLoading: isCheckInUpdating }] =
    useUpdateCheckInStatusMutation();
  const [addConnection] = useAddConnectionMutation();
  const [deleteCredential, { isLoading: isDeleting }] =
    useDeleteCredentialMutation();
  // const [saveCForm] = useSaveCFormMutation();
  const [saveForeignPassport] = useSaveForeignPassportMutation();
  const [createCredential] = useCreateCredentialMutation();
  const [deleteFamilyCredential] = useDeleteFamilyCredentialMutation();
  const [updateCredentialHotel] = useUpdateCredentialHotelMutation();

  const { data: familyData, refetch: refetchFamily } =
    useGetFamilyCredentialsQuery();

  const pendingFamilyVerify = useRef(false);
  const pendingFamilyCredentialId = useRef<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    document_type: string;
  } | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareSelectedDocType, setShareSelectedDocType] = useState<
    string | null
  >(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  /** Type-to-confirm for delete: user must type "DELETE" to enable the Delete button */
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // C-Form dialog
  // const [cformDialogOpen, setCformDialogOpen] = useState(false);
  // const [cformRef, setCformRef] = useState("");
  const [foreignPassportDialogOpen, setForeignPassportDialogOpen] =
    useState(false);

  // Tracks when the user opened the check-in flow (share sheet or C-Form dialog)
  const checkinFlowStartedAt = useRef<number | null>(null);

  // Feedback modal — shown after successful check-in
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRequestId, setFeedbackRequestId] = useState<string | null>(
    null,
  );

  /** Prevent double-submit: stays true until API settles; only cleared on error so user can retry */
  const [isCheckInOutInFlight, setCheckInOutInFlight] = useState(false);

  // Family member state
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [familyDocType, setFamilyDocType] = useState<FamilyDocType>("FAMILY_AADHAAR");
  const [familyNickname, setFamilyNickname] = useState("");
  const [familyNicknameError, setFamilyNicknameError] = useState("");
  const [isStartingFamilyVerify, setIsStartingFamilyVerify] = useState(false);
  const [familyDeleteTarget, setFamilyDeleteTarget] = useState<{
    id: string;
    nickname: string;
  } | null>(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<any | null>(
    null,
  );

  // DL choice modal + selfie
  const [dlDigilockerModalOpen, setDlDigilockerModalOpen] = useState(false);
  const [dlSelfieModalOpen, setDlSelfieModalOpen] = useState(false);
  const dlSelfieStreamRef = useRef<MediaStream | null>(null);
  const dlSelfieVideoRef = useRef<HTMLVideoElement | null>(null);
  const dlSelfieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dlSelfieCaptured, setDlSelfieCaptured] = useState<string | null>(null);
  const [dlSelfieUploading, setDlSelfieUploading] = useState(false);

  // helper to robustly pick connection id from addConnection response
  const pickConnectionId = (res: any): string | null => {
    return (
      res?.data?.credential_request_id ??
      res?.data?.request_id ??
      res?.data?.id ??
      res?.request_id ??
      res?.id ??
      res?.data?.request?.id ??
      null
    );
  };

  // Start/stop camera when selfie modal opens/closes
  useEffect(() => {
    if (dlSelfieModalOpen) {
      startDLSelfieCamera();
    } else {
      stopDLSelfieCamera();
      setDlSelfieCaptured(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlSelfieModalOpen]);

  // Detect DigiLocker DL redirect on mount (?dl_verified=1 or ?dl_error=...)
  useEffect(() => {
    const dlVerified = searchParams.get("dl_verified");
    const dlError = searchParams.get("dl_error");
    if (!dlVerified && !dlError) return;
    if (dlVerified === "1") {
      setDlSelfieModalOpen(true); // selfie first; polling starts after selfie submit
    }
    if (dlError) {
      toast.error("DigiLocker verification was cancelled. You can use camera scan instead.");
    }
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const rawDocType = cred.document_type || cred.details?.document_type;
      if (!rawDocType) return;
      // DigiLocker Aadhaar arrives as "DIGILOCKER" — normalise to AADHAAR_CARD
      const docType = rawDocType === "DIGILOCKER" ? "AADHAAR_CARD" : rawDocType;
      map[docType] = cred;
    });
    return map;
  }, [credentialsData]);

  // Keep latestCredentialsRef in sync so onMessage always reads current data
  useEffect(() => { latestCredentialsRef.current = credentialsData; }, [credentialsData]);

  // Stop polling when a new credential appears; link it to the hotel if applicable
  useEffect(() => {
    if (verifyPollingMs === 0) return;
    const creds: any[] = credentialsData?.data?.credential ?? [];
    const count = creds.length;
    if (count > credCountBeforeVerifyRef.current) {
      setVerifyPollingMs(0);
      if (verifyPollStopRef.current) { clearTimeout(verifyPollStopRef.current); verifyPollStopRef.current = null; }
      // Find the new credential doc (one that wasn't there before KYC)
      const credReqId = pendingHotelLinkRef.current;
      if (credReqId) {
        pendingHotelLinkRef.current = null;
        const newCred = creds.find((c: any) => !credIdsBeforeVerifyRef.current.has(c.id));
        if (newCred?.id) {
          updateCredentialHotel({
            credential_id: newCred.id,
            credential_request_id: credReqId,
          });
        }
      }
    }
  }, [credentialsData, verifyPollingMs, updateCredentialHotel]);

  const selectedCredential = useMemo(() => {
    if (!selectedDocType) return null;
    return verifiedCredentialsMap[selectedDocType] ?? null;
  }, [selectedDocType, verifiedCredentialsMap]);

  const selectedDetails = useMemo(() => {
    if (!selectedCredential) return null;
    const kwikOcr = extractKwikOcr(selectedCredential as Record<string, any>);
    const merged = {
      ...flattenSources(selectedCredential as Record<string, any>),
      ...kwikOcr,
    };
    return deepFlatten(merged);
  }, [selectedCredential]);

  const selectedDocTitle = useMemo(() => {
    if (!selectedDocType) return "";
    return selectedDocType.includes("_")
      ? titleCase(selectedDocType)
      : selectedDocType;
  }, [selectedDocType]);

  const selectedDocPhoto = useMemo(() => {
    if (!selectedCredential) return null;
    const details = {
      ...flattenSources(selectedCredential as Record<string, any>),
      ...extractKwikOcr(selectedCredential as Record<string, any>),
    };
    const isEncrypted = (v: unknown) =>
      typeof v === "string" && v.startsWith("enc:v1:");
    // Our S3 face_url first (decrypted server-side), then Kwik's ps_face_url as fallback
    const rootFace = pickFirst(details, ["face_url"]);
    if (
      typeof rootFace === "string" &&
      rootFace.trim() &&
      !isEncrypted(rootFace)
    )
      return rootFace;
    const faceSpecific = pickFirst(details, ["ps_face_url", "selfie_url"]);
    if (
      typeof faceSpecific === "string" &&
      faceSpecific.trim() &&
      !isEncrypted(faceSpecific)
    )
      return faceSpecific;
    // Generic photo fields (not image_url — that's usually the document scan)
    const directPhoto = pickFirst(details, ["photo", "profile_photo"]);
    if (
      typeof directPhoto === "string" &&
      directPhoto.trim() &&
      !isEncrypted(directPhoto)
    )
      return directPhoto;
    // Child Aadhaar XML provides photo as base64 — convert to data URI for display
    const photoBase64 = pickFirst(details, ["photo_base64"]);
    if (
      typeof photoBase64 === "string" &&
      photoBase64.trim() &&
      !isEncrypted(photoBase64)
    ) {
      return `data:image/jpeg;base64,${photoBase64}`;
    }
    return null;
  }, [selectedCredential]);

  const selectedIdentityInfo = useMemo(() => {
    if (!selectedDetails) return { name: "—", age: "—", last4: "****" };
    const name =
      pickFirst(selectedDetails, [
        "name",
        "Name",
        "full_name",
        "fullName",
        "givenName",
        "given_name",
        "applicant_name",
        "holder_name",
      ]) ??
      pickByIncludes(selectedDetails, [
        "fullname",
        "holdername",
        "applicantname",
        "name",
      ]);
    const isAbove18Raw = pickFirst(selectedDetails, [
      "isAbove18",
      "is_above_18",
      "isAbove18Verified",
      "age_verified",
    ]);
    const dobRaw =
      pickFirst(selectedDetails, [
        "dob",
        "dateOfBirth",
        "date_of_birth",
        "birth_date",
        "Dob",
        "DOB",
      ]) ??
      pickByIncludes(selectedDetails, ["dateofbirth", "birthdate", "dob"]);
    const parsedDob = parseDob(dobRaw);
    const computedAge =
      parsedDob && !Number.isNaN(parsedDob.getTime())
        ? Math.floor(
            (Date.now() - parsedDob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
          )
        : null;
    const age =
      computedAge != null
        ? computedAge >= 18
          ? "Above 18 ✓"
          : "Below 18 ✗"
        : typeof isAbove18Raw === "boolean"
          ? isAbove18Raw
            ? "Above 18 ✓"
            : "Below 18 ✗"
          : String(isAbove18Raw || "").toLowerCase() === "true"
            ? "Above 18 ✓"
            : "—";

    const explicitLast4 =
      pickFirst(selectedDetails, [
        "aadhaarLast4",
        "aadhaar_last4",
        "last4",
        "id_last4",
        "last_4",
      ]) ?? pickByIncludes(selectedDetails, ["last4"]);
    const fullId =
      pickFirst(selectedDetails, [
        "aadhaar",
        "aadhaar_number",
        "id_number",
        "document_number",
        "number",
        "pan",
        "pa_number",
        "Pa Number",
        "pan_number",
        "passportNo",
        "passport_number",
        "license_number",
        "dl_number",
      ]) ??
      pickByIncludes(selectedDetails, [
        "aadhaar",
        "pan",
        "passport",
        "licence",
        "license",
        "documentnumber",
        "idnumber",
      ]);
    const tailFromFull = fullId
      ? String(fullId)
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(-4)
      : "";
    const last4 = explicitLast4
      ? String(explicitLast4)
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(-4)
      : tailFromFull;

    return {
      name: String(name ?? "—"),
      age: String(age || "—"),
      last4: last4 || "****",
    };
  }, [selectedDetails]);

  const selectedDocFields = useMemo(() => {
    if (!selectedDocType || !selectedDetails)
      return [] as Array<{ label: string; value: string }>;
    const fallbackEntries = Object.entries(selectedDetails)
      .filter(([key, value]) => {
        if (value == null || value === "") return false;
        if (
          ["photo", "images", "document_type", "id", "credential_id"].includes(
            key,
          )
        )
          return false;
        if (typeof value === "object") return false;
        return true;
      })
      .slice(0, 8)
      .map(([key, value]) => ({
        label: titleCase(key),
        value: String(value),
      }));

    if (
      selectedDocType === "AADHAAR_CARD" ||
      selectedDocType.startsWith("Child ")
    ) {
      const aadhaarLast4 = pickFirst(selectedDetails, [
        "aadhaarLast4",
        "aadhaar_last4",
      ]);
      const aadhaar = pickFirst(selectedDetails, ["aadhaar", "aadhaar_number"]);
      const maskedAadhaar = aadhaarLast4
        ? `XXXX XXXX ${String(aadhaarLast4)}`
        : aadhaar
          ? `XXXX XXXX ${String(aadhaar).slice(-4)}`
          : "XXXX XXXX ****";
      const city = getAddressPart(selectedDetails, ["city"]);
      const state = getAddressPart(selectedDetails, ["state"]);
      const pincode = getAddressPart(selectedDetails, [
        "pincode",
        "pinCode",
        "postalCode",
      ]);
      const guardian = pickFirst(selectedDetails, [
        "guardianName",
        "guardian_name",
      ]);
      const base = [
        { label: "Aadhaar", value: String(maskedAadhaar) },
        { label: "City", value: String(city ?? "—") },
        { label: "State", value: String(state ?? "—") },
        { label: "Pincode", value: String(pincode ?? "—") },
        ...(guardian ? [{ label: "Guardian", value: String(guardian) }] : []),
      ];
      return base.filter(
        (field) => field.value !== "—" || field.label === "Aadhaar",
      );
    }

    if (selectedDocType === "PAN_CARD") {
      // Age is already shown in the summary card (selectedIdentityInfo.age), so no extra fields needed
      return [];
    }

    if (selectedDocType === "DRIVING_LICENSE") {
      const number = pickFirst(selectedDetails, [
        "number",
        "license_number",
        "dl_number",
      ]);
      const last4 = number ? String(number).replace(/[^a-zA-Z0-9]/g, "").slice(-4) : null;
      const maskedNumber = last4 ? `XXXXXXXX${last4}` : null;
      const validTill = pickFirst(selectedDetails, [
        "validTill",
        "valid_till",
        "expiry_date",
      ]);
      const licenseClass = pickFirst(selectedDetails, [
        "class",
        "vehicle_class",
      ]);
      const city = getAddressPart(selectedDetails, ["city"]);
      const base = [
        { label: "Licence No.", value: String(maskedNumber ?? "—") },
        { label: "Valid Till", value: String(validTill ?? "—") },
        { label: "Class", value: String(licenseClass ?? "—") },
        { label: "City", value: String(city ?? "—") },
      ];
      return base.filter((field) => field.value !== "—");
    }

    if (selectedDocType === "PASSPORT") {
      const number = pickFirst(selectedDetails, [
        "passportNo",
        "passport_number",
        "number",
      ]);
      const nationality = pickFirst(selectedDetails, ["nationality"]);
      const validTill = pickFirst(selectedDetails, [
        "validTill",
        "valid_till",
        "expiry_date",
      ]);
      return [
        {
          label: "Passport No.",
          value: number
            ? `${String(number).slice(0, 2)}*****${String(number).slice(-2)}`
            : "—",
        },
        { label: "Nationality", value: String(nationality ?? "—") },
        { label: "Valid Till", value: String(validTill ?? "—") },
      ].filter((field) => field.value !== "—");
    }

    if (selectedDocType === "C-Form (Foreign Guest)") {
      const surname = pickFirst(selectedDetails, ["surname"]);
      const givenName = pickFirst(selectedDetails, [
        "givenName",
        "given_name",
        "name",
      ]);
      const nationality = pickFirst(selectedDetails, ["nationality"]);
      const passportNo = pickFirst(selectedDetails, [
        "passportNo",
        "passport_number",
      ]);
      const passportExpiry = pickFirst(selectedDetails, [
        "passportExpiry",
        "passport_expiry",
      ]);
      const dateOfBirth = pickFirst(selectedDetails, ["dateOfBirth", "dob"]);
      const sex = pickFirst(selectedDetails, ["sex", "gender"]);
      const arrivalDate = pickFirst(selectedDetails, [
        "arrivalDate",
        "arrival_date",
      ]);
      const portOfArrival = pickFirst(selectedDetails, [
        "portOfArrival",
        "port_of_arrival",
      ]);
      const visaNo = pickFirst(selectedDetails, ["visaNo", "visa_number"]);
      const visaType = pickFirst(selectedDetails, ["visaType", "visa_type"]);
      const address = pickFirst(selectedDetails, ["addressInIndia", "address"]);
      return [
        { label: "Surname", value: String(surname ?? "—") },
        { label: "Given Name", value: String(givenName ?? "—") },
        { label: "Nationality", value: String(nationality ?? "—") },
        { label: "Passport No.", value: String(passportNo ?? "—") },
        { label: "Passport Expiry", value: String(passportExpiry ?? "—") },
        {
          label: "Age",
          value: (() => {
            const d = parseDob(dateOfBirth);
            if (!d) return "—";
            return Math.floor(
              (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
            ) >= 18
              ? "Above 18"
              : "Below 18";
          })(),
        },
        { label: "Sex", value: String(sex ?? "—") },
        { label: "Arrival Date", value: String(arrivalDate ?? "—") },
        { label: "Port of Arrival", value: String(portOfArrival ?? "—") },
        { label: "Visa No.", value: String(visaNo ?? "—") },
        { label: "Visa Type", value: String(visaType ?? "—") },
        { label: "Address in India", value: String(address ?? "—") },
      ].filter((field) => field.value !== "—");
    }

    return fallbackEntries;
  }, [selectedDocType, selectedDetails]);

  const isCompanyRecipient =
    (recipientData?.data?.requests?.[0] as any)?.type === "Company";

  const verifiedDocTypesForShare = useMemo(() => {
    return [...HOME_DOCUMENT_TYPES].filter((docType) => {
      if (!verifiedCredentialsMap[docType]) return false;
      // Hotels (Company) don't accept PAN as valid ID proof
      if (isCompanyRecipient && docType === "PAN_CARD") return false;
      return true;
    });
  }, [verifiedCredentialsMap, isCompanyRecipient]);

  const firstShareableDocType = verifiedDocTypesForShare[0] ?? null;

  useEffect(() => {
    if (!code) {
      autoShareSheetOpenedForCodeRef.current = null;
      processedCodeRef.current = null;
    }
  }, [code]);

  const connectedRequestorName = useMemo(() => {
    return (
      recipientData?.data?.requests?.[0]?.recipients?.name ||
      recipientData?.data?.requests?.[0]?.recipients?.firstName ||
      null
    );
  }, [recipientData]);

  const connectedRequestorLogo = useMemo(() => {
    return (
      (recipientData?.data?.requests?.[0]?.recipients?.logo as string) || null
    );
  }, [recipientData]);

  const connectedRequestorType = useMemo(() => {
    return (
      (recipientData?.data?.requests?.[0]?.recipients?.businessType as string) || null
    );
  }, [recipientData]);

  const connectedRequestorAddress = useMemo(() => {
    const r = recipientData?.data?.requests?.[0]?.recipients;
    if (!r) return null;
    if (r.address) return String(r.address);
    if (r.location) return String(r.location);
    const parts = [r.city, r.state].filter(Boolean);
    if (parts.length) return parts.join(", ");
    return null;
  }, [recipientData]);

  // QR scan / deep link: show the same "Share now" sheet as vault share, without extra taps
  useEffect(() => {
    if (!code || !isValidQRCode(code)) return;
    if (isRecipientLoading) return;
    if (!connectedRequestorName) return;
    if (autoShareSheetOpenedForCodeRef.current === code) return;
    autoShareSheetOpenedForCodeRef.current = code;
    checkinFlowStartedAt.current = Date.now();
    setShareSelectedDocType(firstShareableDocType);
    setShareSheetOpen(true);
  }, [code, isRecipientLoading, connectedRequestorName, firstShareableDocType]);

  const openHotelShareSheet = (docType?: DocumentType) => {
    checkinFlowStartedAt.current = Date.now();
    if (
      docType &&
      docType !== "C-Form (Foreign Guest)" &&
      verifiedDocTypesForShare.includes(docType)
    ) {
      setShareSelectedDocType(docType);
    } else {
      setShareSelectedDocType(firstShareableDocType);
    }
    setShareSheetOpen(true);
  };

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
      (cred: any) => cred?.status === "Active" && cred?.document_type,
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

  // const isCheckOutDisabled = useMemo(() => {
  //   return !derivedConnectionId || isCheckInUpdating || !!currentConnection?.check_out_time;
  // }, [derivedConnectionId, isCheckInUpdating, currentConnection?.check_out_time]);

  // postMessage listener to close iframe and refresh
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (
        typeof event.origin !== "string" ||
        !event.origin.startsWith(IVERIFI_ORIGIN)
      )
        return;
      const data = event.data;
      if (
        data &&
        typeof data === "object" &&
        data.type === "iverifi" &&
        data.status === "completed"
      ) {
        // Check if this was a DL Kwik verification before clearing iframeUrl
        const wasDLKwik = (iframeUrl || "").includes("productCode=DL");
        toast.success("Verification completed.");
        setIframeUrl(null);
        if (pendingFamilyVerify.current) {
          pendingFamilyVerify.current = false;
          pendingFamilyCredentialId.current = null;
          await refetchFamily();
        } else if (wasDLKwik) {
          // DL Kwik path: open selfie modal; polling starts after selfie submit
          setDlSelfieModalOpen(true);
        } else {
          // Snapshot credential IDs + count before polling so we can find the new doc.
          // Use latestCredentialsRef (not closure value) so a delete-then-reverify scenario
          // sees the post-delete count, not the stale pre-delete count.
          const currentCreds: any[] = latestCredentialsRef.current?.data?.credential ?? [];
          credCountBeforeVerifyRef.current = currentCreds.length;
          credIdsBeforeVerifyRef.current = new Set(currentCreds.map((c: any) => c.id));
          // Immediate refetch, then poll every 2 s until a new credential appears (max 15 s)
          await refetchCredentials();
          if (verifyPollStopRef.current) clearTimeout(verifyPollStopRef.current);
          setVerifyPollingMs(2000);
          verifyPollStopRef.current = setTimeout(() => { setVerifyPollingMs(0); verifyPollStopRef.current = null; }, 15000);
          // Restore hotel code if Kwik navigation cleared it from the URL
          const currentCode = new URLSearchParams(window.location.search).get("code");
          if (currentCode) {
            await refetchRecipient();
            // Allow share sheet to re-open now that user has a verified document
            autoShareSheetOpenedForCodeRef.current = null;
          } else {
            const savedCode = getRecipientIdFromStorage();
            if (savedCode) {
              autoShareSheetOpenedForCodeRef.current = null;
              processedCodeRef.current = null;
              navigate(`/?code=${savedCode}`, { replace: true });
            }
          }
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refetchCredentials, refetchRecipient, code, navigate, iframeUrl]);

  const handleDeleteDoc = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;
    try {
      await deleteCredential({ credential_id: deleteTarget.id }).unwrap();
      toast.success("Document deleted successfully");
      setDeleteTarget(null);
      setDeleteConfirmText("");
      await refetchCredentials();
      if (code) await refetchRecipient();
    } catch (e: any) {
      toast.error(
        e?.data?.message || e?.message || "Failed to delete document",
      );
    }
  };

  /** Reset type-to-confirm when dialog closes */
  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeleteTarget(null);
      setDeleteConfirmText("");
    }
  };

  /* Extract passport data from the verified PASSPORT credential for the C-Form dialog
  const passportDataForCform = useMemo((): CFormPassportData => {
    const passportCred = verifiedCredentialsMap["PASSPORT"];
    if (!passportCred) return { surname: "", givenName: "", nationality: "", passportNo: "", passportExpiry: "", dateOfBirth: "" };
    const kwikOcr = extractKwikOcr(passportCred as Record<string, any>);
    const flat = deepFlatten({ ...flattenSources(passportCred as Record<string, any>), ...kwikOcr });
    return {
      surname: String(pickFirst(flat, ["surname", "last_name", "family_name", "lnm"]) ?? ""),
      givenName: String(pickFirst(flat, ["givenName", "given_name", "first_name", "fnm", "name"]) ?? ""),
      nationality: String(pickFirst(flat, ["nationality", "country"]) ?? ""),
      passportNo: String(pickFirst(flat, ["passportNo", "passport_number", "number", "doc_num"]) ?? ""),
      passportExpiry: String(pickFirst(flat, ["passportExpiry", "expiry_date", "doe", "date_of_expiry", "valid_upto"]) ?? ""),
      dateOfBirth: String(pickFirst(flat, ["dateOfBirth", "dob", "date_of_birth"]) ?? ""),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedCredentialsMap]); */

  /* C-Form: filled fresh per check-in, saves + triggers check-in in one go
  const handleCFormSave = async (data: CFormData) => {
    if (!derivedConnectionId) {
      toast.error("No connection found. Try scanning the QR again.");
      return;
    }
    if (isCheckInOutInFlight || isCheckInUpdating) return;
    setCheckInOutInFlight(true);
    try {
      await saveCForm({ credential_request_id: derivedConnectionId, cform_data: { ...data, ref_number: cformRef } }).unwrap();

      // Use passport credential for check-in if available
      const passportCred = verifiedCredentialsMap["PASSPORT"];
      const credentialId = passportCred?.credential_id || passportCred?.id || passportCred?.credentialId || null;

      if (credentialId) {
        await updateCredentials({
          credential_request_id: derivedConnectionId,
          credentials: [{ credential_id: credentialId, document_type: "PASSPORT", status: "Active", expiry_date: format(addDays(new Date(), 30), "yyyy-MM-dd") }],
        }).unwrap();
      }

      await updateCheckInStatus({
        credential_request_id: derivedConnectionId,
        credentials: [],
        status: "checkin",
        credential_id: credentialId,
        cform_data: { ...data, ref_number: cformRef },
        ...(checkinFlowStartedAt.current != null ? { client_started_at: checkinFlowStartedAt.current } : {}),
      }).unwrap();

      setCformDialogOpen(false);
      setShareSheetOpen(false);
      clearPendingRecipientId();
      processedCodeRef.current = null;
      navigate(location.pathname, { replace: true });
      toast.success("C-Form submitted. Check-in request sent to the property.");
      await refetchCredentials();
      setFeedbackRequestId(derivedConnectionId);
      setFeedbackOpen(true);
    } catch (error: any) {
      toast.error(
        error?.data?.message ? String(error.data.message) : "Could not submit C-Form. Please try again."
      );
    } finally {
      setCheckInOutInFlight(false);
    }
  }; */

  /** Foreign Passport: saves 3 photos + triggers check-in */
  const handleForeignPassportSave = async (data: ForeignPassportPhotos) => {
    if (!derivedConnectionId) {
      toast.error("No connection found. Try scanning the QR again.");
      return;
    }
    if (isCheckInOutInFlight || isCheckInUpdating) return;
    setCheckInOutInFlight(true);
    try {
      await saveForeignPassport({
        credential_request_id: derivedConnectionId,
        foreign_passport_data: data,
      }).unwrap();

      await updateCheckInStatus({
        credential_request_id: derivedConnectionId,
        credentials: [],
        status: "checkin",
        credential_id: null,
        document_type: "FOREIGN_PASSPORT",
        ...(checkinFlowStartedAt.current != null
          ? { client_started_at: checkinFlowStartedAt.current }
          : {}),
      }).unwrap();

      setForeignPassportDialogOpen(false);
      setShareSheetOpen(false);
      clearPendingRecipientId();
      processedCodeRef.current = null;
      navigate(location.pathname, { replace: true });
      toast.success(
        "Foreign Passport submitted. Check-in request sent to the property.",
      );
      await refetchCredentials();
      setFeedbackRequestId(derivedConnectionId);
      setFeedbackOpen(true);
    } catch (error: any) {
      toast.error(
        error?.data?.message
          ? String(error.data.message)
          : "Could not submit. Please try again.",
      );
    } finally {
      setCheckInOutInFlight(false);
    }
  };

  /** Share with a connection only (no check-in) — e.g. vault flow without ?code= */
  const handleShareCredentials = async (
    documentType: DocumentType,
  ) => {
    if (!derivedConnectionId) {
      toast.error("You need to scan a QR code to share.");
      throw new Error("missing-connection");
    }
    const credential = verifiedCredentialsMap[documentType];
    if (!credential) {
      toast.error("Credential not found");
      throw new Error("missing-credential");
    }

    try {
      const credentialId =
        credential.credential_id || credential.id || credential.credentialId;
      if (!credentialId) {
        toast.error("Invalid credential ID");
        throw new Error("invalid-credential-id");
      }

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

      await refetchRecipient();
    } catch (error: any) {
      toast.error(
        error?.data?.message ? String(error.data.message) : "Failed to share",
      );
      throw error;
    }
  };

  /**
   * Hotel QR flow: share selected document + request check-in in one step, then clear ?code=
   * and pending storage so the user must scan again for another property.
   */
  const handleShareAndRequestCheckIn = async (
    documentType: DocumentType,
  ) => {
    if (!derivedConnectionId) {
      toast.error("No connection found. Try scanning the QR again.");
      throw new Error("missing-connection");
    }
    const credential = verifiedCredentialsMap[documentType];
    if (!credential) {
      toast.error("Credential not found");
      throw new Error("missing-credential");
    }

    const credentialId =
      credential.credential_id || credential.id || credential.credentialId;
    if (!credentialId) {
      toast.error("Invalid credential ID");
      throw new Error("invalid-credential-id");
    }

    if (isCheckInOutInFlight || isCheckInUpdating) return;
    setCheckInOutInFlight(true);

    try {
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

      await updateCheckInStatus({
        credential_request_id: derivedConnectionId,
        credentials: [],
        status: "checkin",
        credential_id: credentialId,
        ...(checkinFlowStartedAt.current != null
          ? { client_started_at: checkinFlowStartedAt.current }
          : {}),
      }).unwrap();

      clearPendingRecipientId();
      processedCodeRef.current = null;
      navigate(location.pathname, { replace: true });

      toast.success("Document shared. Check-in request sent to the property.");

      await refetchCredentials();
      setFeedbackRequestId(derivedConnectionId);
      setFeedbackOpen(true);
    } catch (error: any) {
      toast.error(
        error?.data?.message
          ? String(error.data.message)
          : "Could not share or request check-in. Please try again.",
      );
      throw error;
    } finally {
      setCheckInOutInFlight(false);
    }
  };

  const handleExpressCheckIn = async () => {
    if (!shareSelectedDocType) {
      toast.error("Please select a document to share.");
      return;
    }
    if (shareSelectedDocType === "Foreign Passport") {
      setShareSheetOpen(false);
      setForeignPassportDialogOpen(true);
      return;
    }
    if (shareSelectedDocType.startsWith("FAMILY:")) {
      if (!derivedConnectionId) {
        toast.error("No connection found. Scan a QR first.");
        return;
      }
      const memberId = shareSelectedDocType.slice(7);
      const member = (familyData?.data?.family_members || []).find(
        (m: any) => m.id === memberId
      );
      if (!member) {
        toast.error("Family member credential not found.");
        return;
      }
      const credentialId =
        member.credential_id || member.id || member.credentialId;
      if (!credentialId) {
        toast.error("Invalid credential ID.");
        return;
      }
      if (isCheckInOutInFlight || isCheckInUpdating) return;
      setCheckInOutInFlight(true);
      try {
        await updateCredentials({
          credential_request_id: derivedConnectionId,
          credentials: [
            {
              credential_id: credentialId,
              document_type: "AADHAAR_CARD",
              status: "Active",
              expiry_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
            },
          ],
        }).unwrap();
        if (code && isValidQRCode(code)) {
          await updateCheckInStatus({
            credential_request_id: derivedConnectionId,
            credentials: [],
            status: "checkin",
            credential_id: credentialId,
            ...(checkinFlowStartedAt.current != null
              ? { client_started_at: checkinFlowStartedAt.current }
              : {}),
          }).unwrap();
          clearPendingRecipientId();
          processedCodeRef.current = null;
          navigate(location.pathname, { replace: true });
          toast.success(
            "Family member Aadhaar shared. Check-in request sent."
          );
          await refetchCredentials();
          setFeedbackRequestId(derivedConnectionId);
          setFeedbackOpen(true);
        } else {
          toast.success("Family member Aadhaar shared successfully.");
          await refetchRecipient();
        }
        setShareSheetOpen(false);
      } catch (err: any) {
        toast.error(
          err?.data?.message
            ? String(err.data.message)
            : "Failed to share. Please try again."
        );
      } finally {
        setCheckInOutInFlight(false);
      }
      return;
    }
    try {
      if (code && isValidQRCode(code)) {
        await handleShareAndRequestCheckIn(
          shareSelectedDocType as DocumentType
        );
      } else {
        await handleShareCredentials(
          shareSelectedDocType as DocumentType
        );
      }
      setShareSheetOpen(false);
    } catch {
      /* toast already shown */
    }
  };

  // verify document via Kwik iframe — the original path, now called directly for non-DL docs
  // and by the DL choice modal "No — Use Camera Scan" button.
  const handleVerifyDocumentKwik = async (
    documentType: DocumentType,
  ) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return toast.error("User not authenticated");

    const userId = currentUser.uid;
    const productCode = getProductCode(documentType);
    const origin = window.location.origin;

    const sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const effectiveSessionId = sessionId;

    const verificationUrl =
      `${IVERIFI_ORIGIN}/user/home?client_id=${KWIK_CLIENT_ID}&api_key=${KWIK_CLIENT_ID}&process=U` +
      `&productCode=${encodeURIComponent(productCode)}` +
      `&user_id=${encodeURIComponent(userId)}` +
      `&session_id=${encodeURIComponent(effectiveSessionId)}` +
      `&redirect_origin=${encodeURIComponent(origin)}`;

    // Save hotel code before opening iframe in case Kwik navigation clears the URL param
    if (code) saveRecipientIdForLater(code);

    // Link this verification to the hotel so the hotel name appears in the super-admin
    // verifications table even if the user never shares the document.
    if (code && derivedConnectionId) {
      const existingCred = verifiedCredentialsMap[documentType as string];
      if (existingCred?.id) {
        // Re-verification: credential already exists — stamp hotel_id directly on it
        updateCredentialHotel({
          credential_id: existingCred.id,
          credential_request_id: derivedConnectionId,
        });
      } else {
        // First verification: credential will be created by webhook — find it via polling
        pendingHotelLinkRef.current = derivedConnectionId;
      }
    }

    setIframeUrl(verificationUrl);
  };

  // Slim wrapper: DL → show choice modal; all other doc types → straight to Kwik
  const handleVerifyDocument = async (
    documentType: DocumentType,
  ) => {
    if (documentType === "DRIVING_LICENSE") {
      setDlDigilockerModalOpen(true);
      return;
    }
    return handleVerifyDocumentKwik(documentType);
  };

  const handleVerifyDLWithDigiLocker = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return toast.error("User not authenticated");
    if (code) saveRecipientIdForLater(code);
    const apiBase = ((import.meta as any).env.VITE_BASE_URL as string || "").replace(/\/$/, "");
    window.location.assign(
      `${apiBase}/webhook/digilocker-aadhaar-oauth-start` +
      `?applicant_id=${encodeURIComponent(currentUser.uid)}&doc_type=DL`,
    );
  };

  const startDLSelfieCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      dlSelfieStreamRef.current = stream;
      if (dlSelfieVideoRef.current) dlSelfieVideoRef.current.srcObject = stream;
      setDlSelfieCaptured(null);
    } catch {
      toast.error("Could not access camera. Please allow camera permission.");
    }
  };

  const stopDLSelfieCamera = () => {
    dlSelfieStreamRef.current?.getTracks().forEach((t) => t.stop());
    dlSelfieStreamRef.current = null;
  };

  const captureDLSelfie = () => {
    const video = dlSelfieVideoRef.current;
    const canvas = dlSelfieCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setDlSelfieCaptured(canvas.toDataURL("image/jpeg", 0.85));
    stopDLSelfieCamera();
  };

  const startDLPolling = async () => {
    const currentCreds: any[] = latestCredentialsRef.current?.data?.credential ?? [];
    credCountBeforeVerifyRef.current = currentCreds.length;
    credIdsBeforeVerifyRef.current = new Set(currentCreds.map((c: any) => c.id));
    await refetchCredentials();
    if (verifyPollStopRef.current) clearTimeout(verifyPollStopRef.current);
    setVerifyPollingMs(2000);
    verifyPollStopRef.current = setTimeout(() => {
      setVerifyPollingMs(0);
      verifyPollStopRef.current = null;
    }, 15000);
    const savedCode = getRecipientIdFromStorage();
    if (savedCode && !new URLSearchParams(window.location.search).get("code")) {
      autoShareSheetOpenedForCodeRef.current = null;
      processedCodeRef.current = null;
      navigate(`/?code=${savedCode}`, { replace: true });
    }
  };

  const handleDLSelfieSubmit = async () => {
    setDlSelfieUploading(true);
    try {
      const currentUser = auth.currentUser;
      if (dlSelfieCaptured && currentUser) {
        const res = await fetch(dlSelfieCaptured);
        const blob = await res.blob();
        const file = new File([blob], "dl_selfie.jpg", { type: "image/jpeg" });
        const apiBase = ((import.meta as any).env.VITE_BASE_URL as string || "").replace(/\/$/, "");
        const form = new FormData();
        form.append("file", file);
        form.append("fileType", "dl_selfie");
        const uploadRes = await fetch(`${apiBase}/users/uploadImage`, {
          method: "POST",
          headers: { Authorization: `Bearer ${await currentUser.getIdToken()}` },
          body: form,
        });
        const uploadJson = await uploadRes.json();
        const s3url: string = uploadJson?.data?.s3url;
        if (s3url) {
          await fetch(`${apiBase}/users/updateDLSelfie`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await currentUser.getIdToken()}`,
            },
            body: JSON.stringify({ face_url: s3url }),
          });
        }
      }
      toast.success("Driving License verified.");
    } catch {
      toast.error("Could not save selfie. Continuing anyway.");
    } finally {
      setDlSelfieUploading(false);
      setDlSelfieModalOpen(false);
      setDlSelfieCaptured(null);
      stopDLSelfieCamera();
      await startDLPolling();
    }
  };

  const handleStartFamilyVerification = async () => {
    const trimmed = familyNickname.trim();
    if (!trimmed) {
      setFamilyNicknameError("Please enter a nickname.");
      return;
    }
    const existingMembers: any[] = familyData?.data?.family_members || [];
    const isDuplicate = existingMembers.some(
      (m) => (m.member_nickname || m.nickname || "").trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setFamilyNicknameError(`"${trimmed}" is already used. Please choose a different nickname.`);
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const selectedDoc = FAMILY_DOC_OPTIONS.find((o) => o.type === familyDocType) ?? FAMILY_DOC_OPTIONS[0];
    setIsStartingFamilyVerify(true);
    try {
      const res = await createCredential({
        document_type: familyDocType,
        verifiers_name: "Kwik",
        // @ts-ignore — backend accepts these extra fields for family member credentials
        is_family_member: true,
        member_nickname: trimmed,
      }).unwrap();
      const sessionId = res?.data?.document_id;
      if (!sessionId) throw new Error("No session ID returned.");
      setFamilyDialogOpen(false);
      setFamilyNickname("");
      pendingFamilyVerify.current = true;
      pendingFamilyCredentialId.current = sessionId;
      const origin = window.location.origin;
      setIframeUrl(
        `${IVERIFI_ORIGIN}/user/home?client_id=${KWIK_CLIENT_ID}&api_key=${KWIK_CLIENT_ID}&process=U` +
          `&productCode=${selectedDoc.productCode}&user_id=${encodeURIComponent(currentUser.uid)}` +
          `&session_id=${encodeURIComponent(sessionId)}&redirect_origin=${encodeURIComponent(origin)}`,
      );
    } catch (e: any) {
      toast.error(
        e?.data?.message || e?.message || "Failed to start verification.",
      );
    } finally {
      setIsStartingFamilyVerify(false);
    }
  };

  const handleDeleteFamilyMember = async () => {
    if (!familyDeleteTarget) return;
    try {
      await deleteFamilyCredential({
        member_id: familyDeleteTarget.id,
      }).unwrap();
      toast.success(`${familyDeleteTarget.nickname} removed.`);
      setFamilyDeleteTarget(null);
      await refetchFamily();
    } catch (e: any) {
      toast.error(
        e?.data?.message || e?.message || "Failed to remove family member.",
      );
    }
  };

  // Don’t block the vault home on recipient fetch when ?code= — share sheet + banner handle loading
  if (isCredentialsLoading || (!code && isConnectionsLoading)) {
    return (
      <div className="min-h-0 flex-1 bg-[var(--iverifi-page)] text-[var(--iverifi-text-primary)] overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <LoadingScreen variant="cards" cardCount={4} showHeaderSkeletons />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 bg-[var(--iverifi-page)] text-[var(--iverifi-text-primary)] overflow-hidden">
      <div className="w-full max-w-5xl mx-auto space-y-6 overflow-y-auto pr-1">
        {/* Header */}
        {/* <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Connections</h1>
        {code && (
          <Button variant="outline" size="sm" onClick={navigateToCleanConnections}>
            Clear Code
          </Button>
        )}
      </div> */}

        {/* Vault home always; QR scan only adds this strip + share popup */}
        {code && isValidQRCode(code) && (
          <div className="rounded-2xl border border-[var(--iverifi-accent-border)] bg-[var(--iverifi-accent-soft)] px-4 py-3 space-y-3 mb-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-teal-600/80 dark:text-[#00e0ff]/80">
                  Active property
                </div>
                <div className="truncate text-sm font-semibold text-[var(--iverifi-text-primary)]">
                  {isRecipientLoading
                    ? "Loading…"
                    : connectedRequestorName || "Property"}
                </div>
                <p className="text-xs text-[var(--iverifi-text-muted)] mt-1">
                  Select an ID below and tap Share — your check-in request will
                  be sent automatically.
                </p>
              </div>
              <Button
                type="button"
                className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-white font-semibold px-4 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => {
                  void refetchRecipient();
                  openHotelShareSheet();
                }}
              >
                Choose document
              </Button>
            </div>
            {hasCredentials === false && (
              <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                Verify a document in your vault below first.
              </p>
            )}
          </div>
        )}

        <div className="space-y-6 pt-2">
          {/* Top interactive stats */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("wallet-documents-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/70 p-3.5 sm:p-4 text-center shadow-xs transition-all duration-200 hover:border-teal-500/40 hover:bg-card hover:shadow-md active:scale-95 cursor-pointer backdrop-blur-xs"
            >
              <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-cyan-400 transition-transform group-hover:scale-105">
                {
                  HOME_DOCUMENT_TYPES.filter(
                    (t) => !!verifiedCredentialsMap[t],
                  ).length
                }
                <span className="text-xs font-normal text-muted-foreground ml-0.5">/{HOME_DOCUMENT_TYPES.length}</span>
              </div>
              <div className="mt-1 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-foreground">
                Verified IDs
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/connections")}
              className="group flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/70 p-3.5 sm:p-4 text-center shadow-xs transition-all duration-200 hover:border-teal-500/40 hover:bg-card hover:shadow-md active:scale-95 cursor-pointer backdrop-blur-xs"
            >
              <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-cyan-400 transition-transform group-hover:scale-105">
                {connectionsData?.data?.requests?.length ?? 0}
              </div>
              <div className="mt-1 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-foreground">
                Shared With
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/connections")}
              className="group flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/70 p-3.5 sm:p-4 text-center shadow-xs transition-all duration-200 hover:border-amber-500/40 hover:bg-card hover:shadow-md active:scale-95 cursor-pointer backdrop-blur-xs"
            >
              <div className="text-xl sm:text-2xl font-black text-amber-500 dark:text-amber-400 transition-transform group-hover:scale-105">
                {
                  (connectionsData?.data?.requests ?? []).filter(
                    (r: any) => r?.check_in_status === "pending",
                  ).length
                }
              </div>
              <div className="mt-1 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-muted-foreground group-hover:text-foreground">
                Pending
              </div>
            </button>
          </div>

          {/* Documents */}
          <div id="wallet-documents-section" className="space-y-3 scroll-mt-20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
                  DIGITAL CREDENTIALS
                </div>
                <p className="text-xs text-muted-foreground/80 mt-0.5">
                  Govt-verified digital identities secured under DPDP Act 2023
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-8.5 rounded-xl border border-border bg-card/80 px-3 text-xs font-semibold text-foreground hover:bg-accent hover:border-teal-500/40 transition-all shadow-2xs"
                onClick={() => navigate("/add-documents")}
              >
                <Plus className="h-3.5 w-3.5 mr-1 text-teal-600 dark:text-cyan-400" />
                Add Document
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {HOME_DOCUMENT_TYPES.map((docType) => {
                const isVerified = !!verifiedCredentialsMap[docType];
                const meta = SMART_CARD_META[docType] || {
                  issuer: "Govt of India",
                  unverifiedTime: "30s",
                  unverifiedProvider: "DigiLocker",
                  gradient: "from-slate-900/90 via-slate-800 to-slate-900/80",
                };
                const title = docType
                  .replace(/_/g, " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                
                return isVerified ? (
                  /* ── Verified Physical Smart-Card (Apple Wallet Aesthetic) ── */
                  <div
                    key={docType}
                    className={`group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-gradient-to-br ${meta.gradient} p-4 sm:p-5 text-white shadow-md hover:shadow-xl hover:border-teal-400/50 transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-md`}
                    role="button"
                    onClick={() => setSelectedDocType(docType)}
                  >
                    {/* Top Smart-Card Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-semibold truncate">
                        {meta.issuer}
                      </span>
                      {/* Micro-Holographic Gold Chip */}
                      <div className="flex h-5 w-7 shrink-0 items-center justify-center rounded-sm border border-amber-300/40 bg-gradient-to-tr from-amber-400/30 via-amber-200/50 to-amber-500/20 shadow-xs">
                        <div className="h-2 w-3 rounded-2xs border border-amber-300/60 bg-amber-300/20" />
                      </div>
                    </div>

                    {/* Card Center: Document Title & Icon */}
                    <div className="my-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 backdrop-blur-md text-white shadow-inner group-hover:scale-105 transition-transform">
                        <DocumentTypeIcon
                          documentType={docType}
                          className="text-white"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-black tracking-tight text-white">
                          {title}
                        </div>
                        <div className="text-[10px] text-teal-300 font-medium flex items-center gap-1 mt-0.5">
                          <Lock className="h-3 w-3" />
                          <span>Zero-Knowledge Protected</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Status & Action */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-white/15 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        <CheckCircle className="h-3 w-3" />
                        DigiLocker Verified
                      </span>
                      <span className="inline-flex items-center text-[11px] font-semibold text-teal-300 group-hover:translate-x-1 transition-transform">
                        Inspect Card <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </span>
                    </div>
                  </div>
                ) : (
                  /* ── Unverified "Add to Vault" Slot ── */
                  <div
                    key={docType}
                    className="group relative flex flex-col justify-between rounded-2xl border-2 border-dashed border-border/80 bg-card/40 p-4 sm:p-5 hover:border-teal-500/50 hover:bg-muted/30 transition-all duration-200 cursor-pointer shadow-xs"
                    role="button"
                    onClick={() => handleVerifyDocument(docType)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                        {meta.issuer}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[9px] font-bold text-teal-700 dark:text-cyan-400">
                        ⚡ {meta.unverifiedProvider} (~{meta.unverifiedTime})
                      </span>
                    </div>

                    <div className="my-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/40 text-muted-foreground group-hover:border-teal-500/40 group-hover:text-teal-600 transition-colors">
                        <DocumentTypeIcon
                          documentType={docType}
                          className="opacity-70"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-foreground">
                          {title}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Not added to vault
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-border/50 text-xs">
                      <span className="text-[10px] text-muted-foreground">
                        Requires 1-time verification
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold px-3 shadow-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerifyDocument(docType);
                        }}
                      >
                        + Add to Vault
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {(() => {
              const qrActive = !!(code && isValidQRCode(code));
              return (
                <>
                  {/* C-Form card — hidden */}
                  {/* <div
                    className={`flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] px-4 py-3 ${qrActive ? "cursor-pointer hover:bg-[var(--iverifi-card-hover)]" : "opacity-50"}`}
                    role={qrActive ? "button" : undefined}
                    onClick={() => {
                      if (!qrActive) return;
                      checkinFlowStartedAt.current = Date.now();
                      setShareSelectedDocType("C-Form (Foreign Guest)");
                      setShareSheetOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--iverifi-icon-border)] bg-[var(--iverifi-muted-surface)]">
                        <DocumentTypeIcon documentType="C-Form (Foreign Guest)" className="text-[var(--iverifi-text-secondary)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--iverifi-text-primary)]">{"C-Form (Foreign Guest)"}</div>
                        <div className="truncate text-xs text-[var(--iverifi-text-muted)]">{qrActive ? "Fill & submit on check-in" : "Scan hotel QR to fill & submit"}</div>
                      </div>
                    </div>
                    {qrActive ? <ChevronRight className="h-4 w-4 shrink-0 text-[var(--iverifi-text-muted)]" /> : <Lock className="h-4 w-4 shrink-0 text-[var(--iverifi-text-muted)]" />}
                  </div> */}

                  {/* Foreign Passport card */}
                  <div
                    className={`flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] px-4 py-3 ${qrActive ? "cursor-pointer hover:bg-[var(--iverifi-card-hover)]" : "opacity-50"}`}
                    role={qrActive ? "button" : undefined}
                    onClick={() => {
                      if (!qrActive) return;
                      checkinFlowStartedAt.current = Date.now();
                      setShareSelectedDocType("Foreign Passport");
                      setShareSheetOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--iverifi-icon-border)] bg-[var(--iverifi-muted-surface)]">
                        <Globe2 className="h-5 w-5 text-[var(--iverifi-accent)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--iverifi-text-primary)]">
                          Foreign Passport
                        </div>
                        <div className="truncate text-xs text-[var(--iverifi-text-muted)]">
                          {qrActive
                            ? "Upload passport, visa & selfie"
                            : "Scan business QR to upload & submit"}
                        </div>
                      </div>
                    </div>
                    {qrActive ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--iverifi-text-muted)]" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-[var(--iverifi-text-muted)]" />
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Family Member IDs */}
          {(() => {
            const members: any[] = familyData?.data?.family_members || [];
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
                    FAMILY IDS ({members.length})
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1 rounded-full border-0 bg-teal-100 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-200 dark:bg-[rgba(0,200,180,0.22)] dark:text-[#5eead4] dark:hover:bg-[rgba(0,200,180,0.32)]"
                    onClick={() => {
                      setFamilyDocType("FAMILY_AADHAAR");
                      setFamilyNickname("");
                      setFamilyNicknameError("");
                      setFamilyDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add member
                  </Button>
                </div>

                <div className="space-y-2">
                  {members.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] px-4 py-4 text-center text-xs text-[var(--iverifi-text-muted)]">
                      No family members added yet — tap Add member to verify a
                      family member's ID.
                    </div>
                  )}
                  {members.map((member: any) => {
                    const displayName =
                      member.member_nickname ||
                      member.nickname ||
                      "Family member";
                    const isPending = member.verification_status !== "auto_approved" && member.state !== "auto_approved";
                    const memberDoc = FAMILY_DOC_OPTIONS.find((o) => o.type === member.document_type) ?? FAMILY_DOC_UNKNOWN;
                    return (
                      <div
                        key={member.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] px-4 py-3"
                        role="button"
                        onClick={() =>
                          !isPending && setSelectedFamilyMember(member)
                        }
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-teal-300 bg-teal-50 dark:border-[rgba(0,200,180,0.35)] dark:bg-[rgba(0,200,180,0.14)]">
                            <DocumentTypeIcon
                              documentType={memberDoc.iconType}
                              className="h-6 w-6 text-teal-600 dark:text-[#00c896]"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[var(--iverifi-text-primary)]">
                              {displayName}
                            </div>
                            <div className="truncate text-xs text-[var(--iverifi-text-muted)]">
                              {isPending
                                ? "Verification pending"
                                : `${memberDoc.label} · ${memberDoc.subtitle}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {!isPending && (
                            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-[#00c896]" />
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-[var(--iverifi-text-muted)] hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFamilyDeleteTarget({
                                id: member.id,
                                nickname: displayName,
                              });
                            }}
                            aria-label="Remove family member"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      {/* max-w-2xl end */}

      {/* Delete document confirmation — type DELETE to confirm */}
      {!!selectedDocType && !!selectedCredential && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--iverifi-overlay)",
            backdropFilter: "blur(4px)",
            zIndex: 10050,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setSelectedDocType(null)}
        >
          <div
            style={{
              width: "100%",
              maxHeight: "96dvh",
              background: "var(--iverifi-sheet)",
              borderRadius: "24px 24px 0 0",
              border: "1px solid var(--iverifi-sheet-border)",
              borderBottom: "none",
              overflowY: "auto",
              padding: "8px 20px calc(88px + env(safe-area-inset-bottom,0px))",
              animation: "slide-up .3s cubic-bezier(.34,1.56,.64,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: "var(--iverifi-sheet-handle)",
                margin: "0 auto 20px",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 15,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--iverifi-icon-box-bg)",
                  border: "1px solid var(--iverifi-icon-box-border)",
                }}
              >
                <DocumentTypeIcon
                  documentType={selectedDocType}
                  className="text-[var(--iverifi-text-primary)]"
                />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    color: "var(--iverifi-text-primary)",
                  }}
                >
                  {selectedDocTitle}
                </div>
                <div style={{ marginTop: 5 }}>
                  <VerifierBadge documentType={selectedDocType} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 14,
                padding: 14,
                background: "var(--iverifi-surface-1)",
                border: "1px solid var(--iverifi-border-subtle)",
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 14,
                  flexShrink: 0,
                  overflow: "hidden",
                  background: "var(--iverifi-surface-2)",
                  border: "1px solid var(--iverifi-border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--iverifi-hint-text)",
                  fontSize: 28,
                }}
              >
                {selectedDocPhoto ? (
                  <img
                    src={selectedDocPhoto}
                    alt="Document holder"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  "👤"
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--iverifi-text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {selectedIdentityInfo.name}
                </div>
                {(() => {
                  const ageValue = selectedIdentityInfo.age;
                  const isAbove18 = ageValue.toLowerCase().includes("above 18");
                  const isUnder18 = ageValue.toLowerCase().includes("below 18");
                  if (!isAbove18 && !isUnder18) return null;
                  return (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        background: isAbove18
                          ? "var(--iverifi-success-soft)"
                          : "var(--iverifi-warning-soft)",
                        color: isAbove18
                          ? "var(--iverifi-success)"
                          : "var(--iverifi-warning)",
                        border: `1px solid ${isAbove18 ? "var(--iverifi-success-border)" : "var(--iverifi-warning-border)"}`,
                      }}
                    >
                      {isAbove18 ? "✓ Age 18+" : "Under 18"}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div
              style={{
                background: "var(--iverifi-surface-1)",
                borderRadius: 14,
                padding: "0 16px",
                marginBottom: 14,
                border: "1px solid var(--iverifi-border-subtle)",
              }}
            >
              {[
                { label: "Name", value: selectedIdentityInfo.name },
                { label: "Age", value: selectedIdentityInfo.age },
                ...(selectedIdentityInfo.last4 && selectedIdentityInfo.last4 !== "****" && selectedDocType !== "AADHAAR_CARD"
                  ? [
                      {
                        label:
                          selectedDocType === "DRIVING_LICENSE" ? "DL No."
                          : selectedDocType === "PAN_CARD" ? "PAN"
                          : selectedDocType === "PASSPORT" ? "Passport"
                          : "ID",
                        value: `******${selectedIdentityInfo.last4}`,
                      },
                    ]
                  : []),
              ].map((field) => (
                <div
                  key={`identity-${field.label}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--iverifi-row-divider)",
                  }}
                >
                  <span style={{ fontSize: 14, color: "var(--iverifi-label)" }}>
                    {field.label}
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      color: "var(--iverifi-text-primary)",
                      fontFamily: "monospace",
                      textAlign: "right",
                      maxWidth: "60%",
                    }}
                  >
                    {field.value}
                  </span>
                </div>
              ))}
              {selectedDocFields.map((field, index) => (
                <div
                  key={`${field.label}-${index}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom:
                      index === selectedDocFields.length - 1
                        ? "none"
                        : "1px solid var(--iverifi-row-divider)",
                  }}
                >
                  <span style={{ fontSize: 14, color: "var(--iverifi-label)" }}>
                    {field.label}
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      color: "var(--iverifi-text-primary)",
                      fontFamily: "monospace",
                      textAlign: "right",
                      maxWidth: "60%",
                    }}
                  >
                    {field.value}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: 12,
                background: "var(--iverifi-hint-bg)",
                border: "1px solid var(--iverifi-hint-border)",
                borderRadius: 12,
                marginBottom: 16,
                fontSize: 12,
                color: "var(--iverifi-hint-text)",
                lineHeight: 1.6,
              }}
            >
              {selectedDocType === "C-Form (Foreign Guest)"
                ? "🔒 Only share with registered hotels for FRRO compliance."
                : "🔒 Full document number never stored. DPDP Act 2023."}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  checkinFlowStartedAt.current = Date.now();
                  setShareSelectedDocType(selectedDocType);
                  setSelectedDocType(null);
                  setShareSheetOpen(true);
                }}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: 14,
                  background: "var(--iverifi-success-soft)",
                  border: "1px solid var(--iverifi-success-border)",
                  color: "var(--iverifi-success)",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Share2 className="h-4 w-4" />
                Share this document
              </button>
              <button
                type="button"
                onClick={() => {
                  const id =
                    selectedCredential.credential_id ||
                    selectedCredential.id ||
                    selectedCredential.credentialId;
                  if (id) {
                    setDeleteTarget({ id, document_type: selectedDocType });
                    setSelectedDocType(null);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: 14,
                  background: "rgba(255,77,109,0.08)",
                  border: "1px solid rgba(255,77,109,0.2)",
                  color: "var(--iverifi-danger)",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Delete document
              </button>
              <button
                type="button"
                onClick={() => setSelectedDocType(null)}
                style={{
                  width: "100%",
                  marginTop: 2,
                  padding: "14px",
                  borderRadius: 12,
                  background: "var(--iverifi-muted-surface)",
                  border: "1px solid var(--iverifi-border-subtle)",
                  color: "var(--iverifi-label)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Family member view sheet */}
      {!!selectedFamilyMember &&
        (() => {
          const member = selectedFamilyMember;
          const nickname =
            member.member_nickname || member.nickname || "Family member";
          const kwikOcr = extractKwikOcr(member as Record<string, any>);
          const flat = deepFlatten({
            ...flattenSources(member as Record<string, any>),
            ...kwikOcr,
          });
          const isEncrypted = (v: unknown) =>
            typeof v === "string" && v.startsWith("enc:v1:");
          const name = String(
            pickFirst(flat, [
              "name",
              "Name",
              "full_name",
              "fullName",
              "givenName",
              "given_name",
              "applicant_name",
              "holder_name",
            ]) ?? "—",
          );
          const dobRaw = pickFirst(flat, [
            "dob",
            "dateOfBirth",
            "date_of_birth",
            "birth_date",
            "Dob",
            "DOB",
          ]);
          const parsedDob = parseDob(dobRaw);
          const computedAge =
            parsedDob && !Number.isNaN(parsedDob.getTime())
              ? Math.floor(
                  (Date.now() - parsedDob.getTime()) /
                    (365.25 * 24 * 60 * 60 * 1000),
                )
              : null;
          // Backend computes isAbove18 server-side and never sends raw DOB; use it as fallback.
          const isAbove18 =
            computedAge != null
              ? computedAge >= 18
              : (flat.isAbove18 ?? member.isAbove18 ?? null);
          const ageLabel =
            isAbove18 != null
              ? isAbove18
                ? "Above 18 ✓"
                : "Below 18 ✗"
              : "—";
          const docType = member.document_type || "FAMILY_AADHAAR";
          const memberDoc = FAMILY_DOC_OPTIONS.find((o) => o.type === docType) ?? FAMILY_DOC_UNKNOWN;
          const isAadhaarFamily = docType === "FAMILY_AADHAAR";
          const last4 = String(
            pickFirst(flat, ["id_last4", "aadhaarLast4", "aadhaar_last4", "last4"]) ??
              "****",
          );
          const idLabel =
            docType === "FAMILY_DL" ? "DL Number"
            : docType === "FAMILY_PASSPORT" ? "Passport No."
            : docType === "FAMILY_PAN" ? "PAN No."
            : "Aadhaar";
          const privacyNote = isAadhaarFamily
            ? "🔒 Full Aadhaar number never stored. DPDP Act 2023."
            : `🔒 Full ${memberDoc.label} number never stored. DPDP Act 2023.`;
          let photo: string | null = null;
          const rootFace = pickFirst(flat, ["face_url"]);
          if (
            typeof rootFace === "string" &&
            rootFace.trim() &&
            !isEncrypted(rootFace)
          )
            photo = rootFace;
          else {
            const ps = pickFirst(flat, [
              "ps_face_url",
              "selfie_url",
              "photo",
              "profile_photo",
            ]);
            if (typeof ps === "string" && ps.trim() && !isEncrypted(ps))
              photo = ps;
            else {
              const b64 = pickFirst(flat, ["photo_base64"]);
              if (typeof b64 === "string" && b64.trim() && !isEncrypted(b64))
                photo = `data:image/jpeg;base64,${b64}`;
            }
          }
          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "var(--iverifi-overlay)",
                backdropFilter: "blur(4px)",
                zIndex: 10050,
                display: "flex",
                alignItems: "flex-end",
              }}
              onClick={() => setSelectedFamilyMember(null)}
            >
              <div
                style={{
                  width: "100%",
                  maxHeight: "96dvh",
                  background: "var(--iverifi-sheet)",
                  borderRadius: "24px 24px 0 0",
                  border: "1px solid var(--iverifi-sheet-border)",
                  borderBottom: "none",
                  overflowY: "auto",
                  padding:
                    "8px 20px calc(88px + env(safe-area-inset-bottom,0px))",
                  animation: "slide-up .3s cubic-bezier(.34,1.56,.64,1)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: "var(--iverifi-sheet-handle)",
                    margin: "0 auto 20px",
                  }}
                />
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 15,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--iverifi-icon-box-bg)",
                      border: "1px solid var(--iverifi-icon-box-border)",
                    }}
                  >
                    <DocumentTypeIcon
                      documentType={memberDoc.iconType}
                      className="text-[var(--iverifi-text-primary)]"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 19,
                        fontWeight: 800,
                        color: "var(--iverifi-text-primary)",
                      }}
                    >
                      {nickname}
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <VerifierBadge documentType={memberDoc.iconType} />
                    </div>
                  </div>
                </div>
                {/* Photo + name + age */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 14,
                    padding: 14,
                    background: "var(--iverifi-surface-1)",
                    border: "1px solid var(--iverifi-border-subtle)",
                    borderRadius: 16,
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 14,
                      flexShrink: 0,
                      overflow: "hidden",
                      background: "var(--iverifi-surface-2)",
                      border: "1px solid var(--iverifi-border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--iverifi-hint-text)",
                      fontSize: 28,
                    }}
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt="Member photo"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "var(--iverifi-text-primary)",
                        marginBottom: 4,
                      }}
                    >
                      {name}
                    </div>
                    {isAbove18 != null && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          background: isAbove18
                            ? "var(--iverifi-success-soft)"
                            : "var(--iverifi-warning-soft)",
                          color: isAbove18
                            ? "var(--iverifi-success)"
                            : "var(--iverifi-warning)",
                          border: `1px solid ${isAbove18 ? "var(--iverifi-success-border)" : "var(--iverifi-warning-border)"}`,
                        }}
                      >
                        {ageLabel}
                      </div>
                    )}
                  </div>
                </div>
                {/* Fields */}
                <div
                  style={{
                    background: "var(--iverifi-surface-1)",
                    borderRadius: 14,
                    padding: "0 16px",
                    marginBottom: 14,
                    border: "1px solid var(--iverifi-border-subtle)",
                  }}
                >
                  {[
                    { label: "Name", value: name },
                    { label: "Age", value: ageLabel },
                    { label: idLabel, value: `*****${last4}` },
                  ].map((field, idx, arr) => (
                    <div
                      key={field.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 0",
                        borderBottom:
                          idx === arr.length - 1
                            ? "none"
                            : "1px solid var(--iverifi-row-divider)",
                      }}
                    >
                      <span
                        style={{ fontSize: 14, color: "var(--iverifi-label)" }}
                      >
                        {field.label}
                      </span>
                      <span
                        style={{
                          fontSize: 15,
                          color: "var(--iverifi-text-primary)",
                          fontFamily: "monospace",
                          textAlign: "right",
                          maxWidth: "60%",
                        }}
                      >
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: 12,
                    background: "var(--iverifi-hint-bg)",
                    border: "1px solid var(--iverifi-hint-border)",
                    borderRadius: 12,
                    marginBottom: 16,
                    fontSize: 12,
                    color: "var(--iverifi-hint-text)",
                    lineHeight: 1.6,
                  }}
                >
                  {privacyNote}
                </div>
                {/* Actions */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      checkinFlowStartedAt.current = Date.now();
                      setShareSelectedDocType(`FAMILY:${member.id}`);
                      setSelectedFamilyMember(null);
                      setShareSheetOpen(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "15px",
                      borderRadius: 14,
                      background: "var(--iverifi-success-soft)",
                      border: "1px solid var(--iverifi-success-border)",
                      color: "var(--iverifi-success)",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    Share this document
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFamilyMember(null);
                      setFamilyDeleteTarget({ id: member.id, nickname });
                    }}
                    style={{
                      width: "100%",
                      padding: "15px",
                      borderRadius: 14,
                      background: "rgba(255,77,109,0.08)",
                      border: "1px solid rgba(255,77,109,0.2)",
                      color: "var(--iverifi-danger)",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Remove member
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFamilyMember(null)}
                    style={{
                      width: "100%",
                      marginTop: 2,
                      padding: "14px",
                      borderRadius: 12,
                      background: "var(--iverifi-muted-surface)",
                      border: "1px solid var(--iverifi-border-subtle)",
                      color: "var(--iverifi-label)",
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      <VenueRecognitionModal
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        businessName={connectedRequestorName}
        businessLogo={connectedRequestorLogo}
        businessType={connectedRequestorType}
        businessAddress={connectedRequestorAddress}
        isCompany={isCompanyRecipient}
        code={code}
        verifiedDocTypes={verifiedDocTypesForShare}
        selectedDocType={shareSelectedDocType}
        onSelectDocType={setShareSelectedDocType}
        selectedIdentityInfo={selectedIdentityInfo}
        selectedDetails={selectedDetails}
        familyMembers={
          familyData?.data?.family_members?.filter(
            (m: any) =>
              m.verification_status === "auto_approved" ||
              m.state === "auto_approved"
          ) || []
        }
        isLoading={isRecipientLoading}
        isSubmitting={isCheckInOutInFlight || isCheckInUpdating}
        onConfirmCheckIn={handleExpressCheckIn}
        onVerifyNewDoc={() => {
          setShareSheetOpen(false);
          handleVerifyDocument("AADHAAR_CARD");
        }}
        onOpenScanner={() => {
          setShareSheetOpen(false);
          setScannerOpen(true);
        }}
      />

      <QRScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        validateCode={isValidQRCode}
        onScanSuccess={(scannedCode) => {
          setScannerOpen(false);
          const path = location.pathname || "/";
          const separator = path.includes("?") ? "&" : "?";
          navigate(
            `${path}${separator}code=${encodeURIComponent(scannedCode)}`,
          );
        }}
      />

      <Dialog open={!!deleteTarget} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this verified document
            {deleteTarget?.document_type
              ? ` (${deleteTarget.document_type.replace(/_/g, " ")})`
              : ""}
            ? You can add it again later.
          </p>
          <div className="space-y-2 pt-2">
            <Label htmlFor="delete-confirm" className="text-sm font-medium">
              Type{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                DELETE
              </kbd>{" "}
              to confirm
            </Label>
            <Input
              id="delete-confirm"
              type="text"
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="font-mono"
              autoComplete="off"
              disabled={isDeleting}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => handleDeleteDialogOpenChange(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDoc}
              disabled={
                isDeleting ||
                deleteConfirmText.trim().toUpperCase() !== "DELETE"
              }
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* C-Form Dialog — hidden */}
      {/* <CFormDialog
        open={cformDialogOpen}
        passportData={passportDataForCform}
        onSave={handleCFormSave}
        onClose={() => setCformDialogOpen(false)}
        mode={verifiedCredentialsMap["PASSPORT"] ? "kwik" : "manual"}
        referenceNumber={cformRef}
      /> */}

      {/* Foreign Passport Dialog */}
      <ForeignPassportDialog
        open={foreignPassportDialogOpen}
        onSave={handleForeignPassportSave}
        onClose={() => setForeignPassportDialogOpen(false)}
      />

      {/* DL: DigiLocker vs Camera Scan choice modal */}
      <Dialog open={dlDigilockerModalOpen} onOpenChange={setDlDigilockerModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Verify Driving License</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm" style={{ color: "var(--iverifi-text-muted)" }}>
              Do you have a DigiLocker account with your Driving License already on it?
            </p>
            <Button
              className="w-full rounded-xl"
              style={{ background: "var(--iverifi-accent)", color: "var(--iverifi-nav-bg)" }}
              onClick={() => { setDlDigilockerModalOpen(false); handleVerifyDLWithDigiLocker(); }}
            >
              Yes — Use DigiLocker
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => { setDlDigilockerModalOpen(false); handleVerifyDocumentKwik("DRIVING_LICENSE"); }}
            >
              No — Use Camera Scan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DL: Selfie capture modal (shown after both DigiLocker and Kwik DL paths) */}
      <Dialog
        open={dlSelfieModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            stopDLSelfieCamera();
            setDlSelfieCaptured(null);
            // If user dismisses via X without submitting, still start polling
            if (dlSelfieModalOpen) startDLPolling();
          }
          setDlSelfieModalOpen(open);
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Take a Selfie</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1 text-center">
            <p className="text-sm" style={{ color: "var(--iverifi-text-muted)" }}>
              Please take a quick selfie to complete your DL verification.
            </p>
            {!dlSelfieCaptured ? (
              <>
                <video
                  ref={dlSelfieVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-xl"
                  style={{ maxHeight: 260, background: "#000" }}
                />
                <canvas ref={dlSelfieCanvasRef} className="hidden" />
                <Button
                  className="w-full rounded-xl"
                  style={{ background: "var(--iverifi-accent)", color: "var(--iverifi-nav-bg)" }}
                  onClick={captureDLSelfie}
                >
                  Capture
                </Button>
              </>
            ) : (
              <>
                <img src={dlSelfieCaptured} alt="selfie preview" className="w-full rounded-xl" />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => { setDlSelfieCaptured(null); startDLSelfieCamera(); }}
                  >
                    Retake
                  </Button>
                  <Button
                    className="flex-1 rounded-xl"
                    style={{ background: "var(--iverifi-accent)", color: "var(--iverifi-nav-bg)" }}
                    disabled={dlSelfieUploading}
                    onClick={handleDLSelfieSubmit}
                  >
                    {dlSelfieUploading ? "Saving..." : "Submit"}
                  </Button>
                </div>
              </>
            )}
            <Button
              variant="ghost"
              className="w-full text-sm"
              disabled={dlSelfieUploading}
              onClick={() => {
                stopDLSelfieCamera();
                setDlSelfieModalOpen(false);
                setDlSelfieCaptured(null);
                startDLPolling();
              }}
            >
              Skip
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedbackOpen}
        credentialRequestId={feedbackRequestId ?? ""}
        hotelName={connectedRequestorName ?? "the property"}
        onClose={() => {
          setFeedbackOpen(false);
          setFeedbackRequestId(null);
        }}
      />

      {/* Add Family Member dialog */}
      <Dialog
        open={familyDialogOpen}
        onOpenChange={(open) => {
          setFamilyDialogOpen(open);
          if (!open) setFamilyNicknameError("");
        }}
      >
        <DialogContent
          className="rounded-2xl"
          style={{
            background: "var(--iverifi-dialog-bg)",
            borderColor: "var(--iverifi-dialog-border)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-[var(--iverifi-text-primary)]">
              Add Family Member
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--iverifi-text-muted)]">
            Choose the ID type and enter a nickname. The verification will open
            on this device.
          </p>

          {/* Doc type picker */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {FAMILY_DOC_OPTIONS.map((opt) => {
              const isSelected = familyDocType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setFamilyDocType(opt.type)}
                  className={`flex items-center gap-1.5 rounded-xl border px-2 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-[rgba(0,200,180,0.14)]"
                      : "border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] hover:border-teal-300"
                  }`}
                >
                  <DocumentTypeIcon
                    documentType={opt.iconType}
                    size={12}
                    className={`shrink-0 ${isSelected ? "text-teal-600 dark:text-teal-400" : "text-[var(--iverifi-text-muted)]"}`}
                  />
                  <span className={`text-xs font-semibold leading-tight ${isSelected ? "text-teal-700 dark:text-teal-300" : "text-[var(--iverifi-text-primary)]"}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-1">
            <Label
              htmlFor="family-nickname"
              className="text-[var(--iverifi-text-primary)]"
            >
              Nickname
            </Label>
            <Input
              id="family-nickname"
              placeholder="e.g. Mom, Dad, Brother"
              value={familyNickname}
              onChange={(e) => {
                setFamilyNickname(e.target.value);
                setFamilyNicknameError("");
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && handleStartFamilyVerification()
              }
              className="rounded-xl"
              autoComplete="off"
            />
            {familyNicknameError && (
              <p className="text-xs text-red-500">{familyNicknameError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setFamilyDialogOpen(false)}
              disabled={isStartingFamilyVerify}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white"
              onClick={handleStartFamilyVerification}
              disabled={isStartingFamilyVerify}
            >
              {isStartingFamilyVerify ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isStartingFamilyVerify ? "Starting…" : "Start Verification"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove family member confirmation */}
      <Dialog
        open={!!familyDeleteTarget}
        onOpenChange={(open) => !open && setFamilyDeleteTarget(null)}
      >
        <DialogContent
          className="rounded-2xl"
          style={{
            background: "var(--iverifi-dialog-bg)",
            borderColor: "var(--iverifi-dialog-border)",
          }}
        >
          <DialogTitle className="text-[var(--iverifi-text-primary)]">
            Remove family member
          </DialogTitle>
          <p className="text-sm text-[var(--iverifi-text-muted)]">
            Remove{" "}
            <strong className="text-[var(--iverifi-text-primary)]">
              {familyDeleteTarget?.nickname}
            </strong>
            ? Their verified Aadhaar data will be deleted.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setFamilyDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFamilyMember}>
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Iframe Overlay */}
      {iframeUrl && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2"
          style={{ zIndex: 2147483647 }}
        >
          <div className="relative bg-white w-full max-w-3xl h-[88vh] rounded-lg shadow-lg overflow-hidden">
            <button
              aria-label="Close"
              className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:border-teal-300/40 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              onClick={async () => {
                // Delete any pre-created ONGOING family credential if the user closed without completing
                const closedFamilyId = pendingFamilyCredentialId.current;
                pendingFamilyVerify.current = false;
                pendingFamilyCredentialId.current = null;
                if (closedFamilyId) {
                  try { await deleteCredential({ credential_id: closedFamilyId }).unwrap(); } catch { /* non-fatal */ }
                }
                setIframeUrl(null);
                await refetchCredentials();
                const currentCode = new URLSearchParams(
                  window.location.search,
                ).get("code");
                if (currentCode) {
                  await refetchRecipient();
                  autoShareSheetOpenedForCodeRef.current = null;
                } else {
                  const savedCode = getRecipientIdFromStorage();
                  if (savedCode) {
                    autoShareSheetOpenedForCodeRef.current = null;
                    processedCodeRef.current = null;
                    navigate(`/?code=${savedCode}`, { replace: true });
                  }
                }
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
