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
  useSaveCFormMutation,
  useSaveForeignPassportMutation,
  useCreateCredentialMutation,
  usePatchCredentialTypeMutation,
} from "@/redux/api";
import { CFormDialog } from "@/components/c-form-dialog";
import type { CFormData, CFormPassportData } from "@/components/c-form-dialog";
import { ForeignPassportDialog } from "@/components/foreign-passport-dialog";
import type { ForeignPassportPhotos } from "@/components/foreign-passport-dialog";
import { determineConnectionType, isValidQRCode } from "@/utils/qr-code-utils";
import { addDays, format } from "date-fns";
import { CheckCircle, ChevronRight, Loader2, Lock, Plus, Share2, X } from "lucide-react";
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
import { DocumentTypeIcon } from "@/components/document-type-icon";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { FeedbackModal } from "@/components/feedback-modal";
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

/** Backend document_type values for children's Aadhaar (Kwik: XMLM1, XMLM2, XMLM3) */
const CHILD_AADHAAR_TYPES = ["Child 1 Aadhaar", "Child 2 Aadhaar", "Child 3 Aadhaar"] as const;
type ChildAadhaarType = (typeof CHILD_AADHAAR_TYPES)[number];

const HOME_DOCUMENT_TYPES = ["DRIVING_LICENSE", "AADHAAR_CARD", "PAN_CARD", "PASSPORT"] as const;

/** Derive a 3-char hotel code from the hotel name for C-Form reference numbers. */
function hotelCodeFromName(name: string): string {
  const stops = new Set(["the", "a", "an", "and", "&", "hotel", "inn", "resort", "lodge", "suites", "palace"]);
  const words = name.trim().split(/\s+/).filter((w) => !stops.has(w.toLowerCase()));
  if (words.length === 0) return "HTL";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase().padEnd(3, "X");
  return words.slice(0, 3).map((w) => w[0].toUpperCase()).join("").padEnd(3, "X");
}

/** Generate a sequential C-Form reference: CF-YYYY-XXX-NNN (counter persisted in localStorage). */
function generateCFormRef(hotelName: string): string {
  const code = hotelCodeFromName(hotelName);
  const year = new Date().getFullYear();
  const key = `cf_seq_${code}_${year}`;
  const seq = (parseInt(localStorage.getItem(key) || "0", 10)) + 1;
  localStorage.setItem(key, String(seq));
  return `CF-${year}-${code}-${String(seq).padStart(3, "0")}`;
}

const PRODUCT_CODE_MAP: Record<DocumentType, string> = {
  AADHAAR_CARD: "KYC",
  PASSPORT: "PP",
  PAN_CARD: "PC",
  DRIVING_LICENSE: "DL",
  // C-Form is filled from passport upload in iVerifi flow, so reuse passport productCode.
  "C-Form (Foreign Guest)": "PP",
};

/** Child Aadhaar uses the regular KYC (Aadhaar OTP) flow — same as adult Aadhaar.
 *  The credential is stamped with the correct child document_type after Kwik completes
 *  via the patchCredentialType backend endpoint. */
const CHILD_PRODUCT_CODE_MAP: Record<ChildAadhaarType, string> = {
  "Child 1 Aadhaar": "KYC",
  "Child 2 Aadhaar": "KYC",
  "Child 3 Aadhaar": "KYC",
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
  "C-Form (Foreign Guest)": "Auto-filled from passport · FRRO compliance for hotels",
  "Child 1 Aadhaar": "UIDAI Verified",
  "Child 2 Aadhaar": "UIDAI Verified",
  "Child 3 Aadhaar": "UIDAI Verified",
};

const getDocSubtitle = (docType: string): string =>
  DOC_TYPE_SUBTITLE[docType] ?? "Verified";

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

const IVERIFI_ORIGIN = "https://iverifi.test.getkwikid.com";

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

const flattenSources = (source: Record<string, any> | null | undefined): Record<string, any> => {
  if (!source || typeof source !== "object") return {};
  const nestedKeys = ["details", "display", "data", "payload", "document_data", "parsed_data", "metadata", "response"];
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

const deepFlatten = (value: any, out: Record<string, any> = {}): Record<string, any> => {
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

const extractKwikOcr = (credential: Record<string, any>): Record<string, any> => {
  const step =
    credential?.session_data_array?.extras?.session_data?.summary_data?.data?.[0] ??
    credential?.sessionDataArray?.extras?.session_data?.summary_data?.data?.[0] ??
    null;
  const ocr = step?.ocr && typeof step.ocr === "object" ? step.ocr : {};
  const images = step?.images && typeof step.images === "object" ? step.images : {};
  return { ...ocr, ...images };
};

const parseDob = (raw: unknown): Date | null => {
  if (!raw) return null;
  const s = String(raw).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`);
  // YYYY/MM/DD or YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) return new Date(`${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const pickByIncludes = (obj: Record<string, any>, includes: string[]): any => {
  const entries = Object.entries(obj);
  for (const [key, value] of entries) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (includes.some((part) => normalized.includes(part)) && value != null && value !== "") {
      return value;
    }
  }
  return null;
};

const SHARE_SUMMARY_BY_DOC: Record<string, string[]> = {
  AADHAAR_CARD: ["Photo", "Full name", "Aadhaar (masked)", "Age 18+", "Address", "City", "State", "Pincode"],
  PAN_CARD: ["Photo", "Full name", "PAN number", "Date of birth", "Age 18+"],
  DRIVING_LICENSE: ["Photo", "Full name", "Licence number", "Valid till", "Vehicle class", "City", "State"],
  PASSPORT: ["Photo", "Full name", "Passport No. (masked)", "Nationality", "Valid till"],
  "Child 1 Aadhaar": ["Child photo", "Child name", "Aadhaar (masked)", "Age indicator", "City", "State", "Guardian name"],
  "Child 2 Aadhaar": ["Child photo", "Child name", "Aadhaar (masked)", "Age indicator", "City", "State", "Guardian name"],
  "Child 3 Aadhaar": ["Child photo", "Child name", "Aadhaar (masked)", "Age indicator", "City", "State", "Guardian name"],
  "C-Form (Foreign Guest)": ["Surname", "Given name", "Nationality", "Passport No.", "Date of birth", "Sex", "Arrival date", "Port of arrival", "Visa No.", "Visa type", "Address in India"],
  "Foreign Passport": ["Passport photo", "Visa / immigration stamp", "Selfie"],
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
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

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

  // api
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    refetch: refetchCredentials,
  } = useGetCredentialsQuery();

  const {
    data: connectionsData,
    isLoading: isConnectionsLoading,
  } = useGetConnectionsQuery();

  const {
    data: recipientData,
    isLoading: isRecipientLoading,
    refetch: refetchRecipient,
  } = useGetRecipientCredentialsQuery(code || "", { skip: !code });

  const [updateCredentials] = useUpdateCredentialsRequestMutation();
  const [updateCheckInStatus, { isLoading: isCheckInUpdating }] = useUpdateCheckInStatusMutation();
  const [addConnection] = useAddConnectionMutation();
  const [deleteCredential, { isLoading: isDeleting }] = useDeleteCredentialMutation();
  const [saveCForm] = useSaveCFormMutation();
  const [saveForeignPassport] = useSaveForeignPassportMutation();
  const [createCredential] = useCreateCredentialMutation();
  const [patchCredentialType] = usePatchCredentialTypeMutation();

  /** Tracks which child Aadhaar slot is being verified so we can stamp the correct
   *  document_type after Kwik (KYC flow) completes.
   *  startedAt lets patchCredentialType distinguish the newly created AADHAAR_CARD
   *  credential from the user's pre-existing regular Aadhaar. */
  const pendingChildVerify = useRef<{ sessionId: string; docType: ChildAadhaarType; startedAt: number } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; document_type: string } | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareSelectedDocType, setShareSelectedDocType] = useState<string | null>(null);
  const [shareExpiryHours, setShareExpiryHours] = useState("24");
  const [scannerOpen, setScannerOpen] = useState(false);
  /** Type-to-confirm for delete: user must type "DELETE" to enable the Delete button */
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // C-Form dialog
  const [cformDialogOpen, setCformDialogOpen] = useState(false);
  const [cformRef, setCformRef] = useState("");
  const [foreignPassportDialogOpen, setForeignPassportDialogOpen] = useState(false);

  // Tracks when the user opened the check-in flow (share sheet or C-Form dialog)
  const checkinFlowStartedAt = useRef<number | null>(null);

  // Feedback modal — shown after successful check-in
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRequestId, setFeedbackRequestId] = useState<string | null>(null);

  /** Prevent double-submit: stays true until API settles; only cleared on error so user can retry */
  const [isCheckInOutInFlight, setCheckInOutInFlight] = useState(false);

  /**
   * Child Aadhaar: show 1 slot by default; "+ Add child" reveals up to 3.
   * Auto-expands when a child is verified so the next slot can appear (capped at 3).
   */
  const [childAadhaarSlotsVisible, setChildAadhaarSlotsVisible] = useState(1);

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
      if (!docType) return;
      map[docType] = cred;
    });
    return map;
  }, [credentialsData]);

  useEffect(() => {
    let maxVerifiedChildIndex = 0;
    CHILD_AADHAAR_TYPES.forEach((t, idx) => {
      if (verifiedCredentialsMap[t]) maxVerifiedChildIndex = idx + 1;
    });
    // After a child is verified, reveal the next slot (up to 3). Default stays 1 until user adds or verifies.
    const floor =
      maxVerifiedChildIndex === 0
        ? 1
        : Math.min(3, maxVerifiedChildIndex + 1);
    setChildAadhaarSlotsVisible((prev) => Math.max(prev, floor));
  }, [verifiedCredentialsMap]);

  const selectedCredential = useMemo(() => {
    if (!selectedDocType) return null;
    return verifiedCredentialsMap[selectedDocType] ?? null;
  }, [selectedDocType, verifiedCredentialsMap]);

  const selectedDetails = useMemo(() => {
    if (!selectedCredential) return null;
    const kwikOcr = extractKwikOcr(selectedCredential as Record<string, any>);
    const merged = { ...flattenSources(selectedCredential as Record<string, any>), ...kwikOcr };
    return deepFlatten(merged);
  }, [selectedCredential]);

  const selectedDocTitle = useMemo(() => {
    if (!selectedDocType) return "";
    return selectedDocType.includes("_") ? titleCase(selectedDocType) : selectedDocType;
  }, [selectedDocType]);

  const selectedDocPhoto = useMemo(() => {
    if (!selectedCredential) return null;
    const details = {
      ...flattenSources(selectedCredential as Record<string, any>),
      ...extractKwikOcr(selectedCredential as Record<string, any>),
    };
    const isEncrypted = (v: unknown) => typeof v === "string" && v.startsWith("enc:v1:");
    // Our S3 face_url first (decrypted server-side), then Kwik's ps_face_url as fallback
    const rootFace = pickFirst(details, ["face_url"]);
    if (typeof rootFace === "string" && rootFace.trim() && !isEncrypted(rootFace)) return rootFace;
    const faceSpecific = pickFirst(details, ["ps_face_url", "selfie_url"]);
    if (typeof faceSpecific === "string" && faceSpecific.trim() && !isEncrypted(faceSpecific)) return faceSpecific;
    // Generic photo fields (not image_url — that's usually the document scan)
    const directPhoto = pickFirst(details, ["photo", "profile_photo"]);
    if (typeof directPhoto === "string" && directPhoto.trim() && !isEncrypted(directPhoto)) return directPhoto;
    // Child Aadhaar XML provides photo as base64 — convert to data URI for display
    const photoBase64 = pickFirst(details, ["photo_base64"]);
    if (typeof photoBase64 === "string" && photoBase64.trim() && !isEncrypted(photoBase64)) {
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
      ]) ?? pickByIncludes(selectedDetails, ["fullname", "holdername", "applicantname", "name"]);
    const isAbove18Raw = pickFirst(selectedDetails, ["isAbove18", "is_above_18", "isAbove18Verified", "age_verified"]);
    const dobRaw =
      pickFirst(selectedDetails, ["dob", "dateOfBirth", "date_of_birth", "birth_date", "Dob", "DOB"]) ??
      pickByIncludes(selectedDetails, ["dateofbirth", "birthdate", "dob"]);
    const parsedDob = parseDob(dobRaw);
    const computedAge =
      parsedDob && !Number.isNaN(parsedDob.getTime())
        ? Math.floor((Date.now() - parsedDob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
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

    const explicitLast4 = pickFirst(selectedDetails, [
      "aadhaarLast4",
      "aadhaar_last4",
      "last4",
      "id_last4",
      "last_4",
    ]) ?? pickByIncludes(selectedDetails, ["last4"]);
    const fullId = pickFirst(selectedDetails, [
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
    ]) ?? pickByIncludes(selectedDetails, ["aadhaar", "pan", "passport", "licence", "license", "documentnumber", "idnumber"]);
    const tailFromFull = fullId ? String(fullId).replace(/[^a-zA-Z0-9]/g, "").slice(-4) : "";
    const last4 = explicitLast4 ? String(explicitLast4).replace(/[^a-zA-Z0-9]/g, "").slice(-4) : tailFromFull;

    return {
      name: String(name ?? "—"),
      age: String(age || "—"),
      last4: last4 || "****",
    };
  }, [selectedDetails]);

  const selectedDocFields = useMemo(() => {
    if (!selectedDocType || !selectedDetails) return [] as Array<{ label: string; value: string }>;
    const fallbackEntries = Object.entries(selectedDetails)
      .filter(([key, value]) => {
        if (value == null || value === "") return false;
        if (["photo", "images", "document_type", "id", "credential_id"].includes(key)) return false;
        if (typeof value === "object") return false;
        return true;
      })
      .slice(0, 8)
      .map(([key, value]) => ({
        label: titleCase(key),
        value: String(value),
      }));

    if (selectedDocType === "AADHAAR_CARD" || selectedDocType.startsWith("Child ")) {
      const aadhaarLast4 = pickFirst(selectedDetails, ["aadhaarLast4", "aadhaar_last4"]);
      const aadhaar = pickFirst(selectedDetails, ["aadhaar", "aadhaar_number"]);
      const maskedAadhaar = aadhaarLast4
        ? `XXXX XXXX ${String(aadhaarLast4)}`
        : aadhaar
          ? `XXXX XXXX ${String(aadhaar).slice(-4)}`
          : "XXXX XXXX ****";
      const city = getAddressPart(selectedDetails, ["city"]);
      const state = getAddressPart(selectedDetails, ["state"]);
      const pincode = getAddressPart(selectedDetails, ["pincode", "pinCode", "postalCode"]);
      const guardian = pickFirst(selectedDetails, ["guardianName", "guardian_name"]);
      const base = [
        { label: "Aadhaar", value: String(maskedAadhaar) },
        { label: "City", value: String(city ?? "—") },
        { label: "State", value: String(state ?? "—") },
        { label: "Pincode", value: String(pincode ?? "—") },
        ...(guardian ? [{ label: "Guardian", value: String(guardian) }] : []),
      ];
      return base.filter((field) => field.value !== "—" || field.label === "Aadhaar");
    }

    if (selectedDocType === "PAN_CARD") {
      // Age is already shown in the summary card (selectedIdentityInfo.age), so no extra fields needed
      return [];
    }

    if (selectedDocType === "DRIVING_LICENSE") {
      const number = pickFirst(selectedDetails, ["number", "license_number", "dl_number"]);
      const validTill = pickFirst(selectedDetails, ["validTill", "valid_till", "expiry_date"]);
      const licenseClass = pickFirst(selectedDetails, ["class", "vehicle_class"]);
      const city = getAddressPart(selectedDetails, ["city"]);
      const base = [
        { label: "Licence No.", value: String(number ?? "—") },
        { label: "Valid Till", value: String(validTill ?? "—") },
        { label: "Class", value: String(licenseClass ?? "—") },
        { label: "City", value: String(city ?? "—") },
      ];
      return base.filter((field) => field.value !== "—");
    }

    if (selectedDocType === "PASSPORT") {
      const number = pickFirst(selectedDetails, ["passportNo", "passport_number", "number"]);
      const nationality = pickFirst(selectedDetails, ["nationality"]);
      const validTill = pickFirst(selectedDetails, ["validTill", "valid_till", "expiry_date"]);
      return [
        { label: "Passport No.", value: number ? `${String(number).slice(0, 2)}*****${String(number).slice(-2)}` : "—" },
        { label: "Nationality", value: String(nationality ?? "—") },
        { label: "Valid Till", value: String(validTill ?? "—") },
      ].filter((field) => field.value !== "—");
    }

    if (selectedDocType === "C-Form (Foreign Guest)") {
      const surname = pickFirst(selectedDetails, ["surname"]);
      const givenName = pickFirst(selectedDetails, ["givenName", "given_name", "name"]);
      const nationality = pickFirst(selectedDetails, ["nationality"]);
      const passportNo = pickFirst(selectedDetails, ["passportNo", "passport_number"]);
      const passportExpiry = pickFirst(selectedDetails, ["passportExpiry", "passport_expiry"]);
      const dateOfBirth = pickFirst(selectedDetails, ["dateOfBirth", "dob"]);
      const sex = pickFirst(selectedDetails, ["sex", "gender"]);
      const arrivalDate = pickFirst(selectedDetails, ["arrivalDate", "arrival_date"]);
      const portOfArrival = pickFirst(selectedDetails, ["portOfArrival", "port_of_arrival"]);
      const visaNo = pickFirst(selectedDetails, ["visaNo", "visa_number"]);
      const visaType = pickFirst(selectedDetails, ["visaType", "visa_type"]);
      const address = pickFirst(selectedDetails, ["addressInIndia", "address"]);
      return [
        { label: "Surname", value: String(surname ?? "—") },
        { label: "Given Name", value: String(givenName ?? "—") },
        { label: "Nationality", value: String(nationality ?? "—") },
        { label: "Passport No.", value: String(passportNo ?? "—") },
        { label: "Passport Expiry", value: String(passportExpiry ?? "—") },
        { label: "Age", value: (() => { const d = parseDob(dateOfBirth); if (!d) return "—"; return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) >= 18 ? "Above 18" : "Below 18"; })() },
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

  const isCompanyRecipient = (recipientData?.data?.requests?.[0] as any)?.type === "Company";

  const verifiedDocTypesForShare = useMemo(() => {
    const order = [
      ...HOME_DOCUMENT_TYPES,
      ...CHILD_AADHAAR_TYPES,
    ];
    return order.filter((docType) => {
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

  const shareSummary = useMemo(() => {
    if (!shareSelectedDocType) return [];
    return SHARE_SUMMARY_BY_DOC[shareSelectedDocType] ?? ["Full name"];
  }, [shareSelectedDocType]);

  const connectedRequestorName = useMemo(() => {
    return (
      recipientData?.data?.requests?.[0]?.recipients?.name ||
      recipientData?.data?.requests?.[0]?.recipients?.firstName ||
      null
    );
  }, [recipientData]);

  const connectedRequestorLogo = useMemo(() => {
    return (recipientData?.data?.requests?.[0]?.recipients?.logo as string) || null;
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
    setShareExpiryHours("24");
    setShareSheetOpen(true);
  }, [code, isRecipientLoading, connectedRequestorName, firstShareableDocType]);

  const openHotelShareSheet = (docType?: DocumentType | ChildAadhaarType) => {
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

  // True when user has an approved check-in that hasn't been checked out yet
  const isCurrentlyCheckedIn = useMemo(() => {
    if (!currentConnection) return false;
    const hasCheckIn = !!currentConnection.check_in_time;
    const hasCheckOut = !!currentConnection.check_out_time;
    return hasCheckIn && !hasCheckOut;
  }, [currentConnection]);

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
        // If this was a child Aadhaar verification, stamp the correct document_type.
        // Kwik stores it as AADHAAR_CARD (KYC flow); we override it to e.g. "Child 1 Aadhaar".
        const pending = pendingChildVerify.current;
        pendingChildVerify.current = null;
        if (pending) {
          try {
            await patchCredentialType({ session_id: pending.sessionId, document_type: pending.docType, started_at: pending.startedAt }).unwrap();
          } catch {
            // non-fatal: refetch will still show the credential, worst case as AADHAAR_CARD
          }
        }
        await refetchCredentials();
        if (code) await refetchRecipient();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refetchCredentials, refetchRecipient, code]);

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
      toast.error(e?.data?.message || e?.message || "Failed to delete document");
    }
  };

  /** Reset type-to-confirm when dialog closes */
  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeleteTarget(null);
      setDeleteConfirmText("");
    }
  };

  /** Extract passport data from the verified PASSPORT credential for the C-Form dialog */
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
  }, [verifiedCredentialsMap]);

  /** C-Form: filled fresh per check-in, saves + triggers check-in in one go */
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
  };

  /** Foreign Passport: saves 3 photos + triggers check-in */
  const handleForeignPassportSave = async (data: ForeignPassportPhotos) => {
    if (!derivedConnectionId) {
      toast.error("No connection found. Try scanning the QR again.");
      return;
    }
    if (isCheckInOutInFlight || isCheckInUpdating) return;
    setCheckInOutInFlight(true);
    try {
      await saveForeignPassport({ credential_request_id: derivedConnectionId, foreign_passport_data: data }).unwrap();

      await updateCheckInStatus({
        credential_request_id: derivedConnectionId,
        credentials: [],
        status: "checkin",
        credential_id: null,
        document_type: "FOREIGN_PASSPORT",
        ...(checkinFlowStartedAt.current != null ? { client_started_at: checkinFlowStartedAt.current } : {}),
      }).unwrap();

      setForeignPassportDialogOpen(false);
      setShareSheetOpen(false);
      clearPendingRecipientId();
      processedCodeRef.current = null;
      navigate(location.pathname, { replace: true });
      toast.success("Foreign Passport submitted. Check-in request sent to the property.");
      await refetchCredentials();
      setFeedbackRequestId(derivedConnectionId);
      setFeedbackOpen(true);
    } catch (error: any) {
      toast.error(
        error?.data?.message ? String(error.data.message) : "Could not submit. Please try again."
      );
    } finally {
      setCheckInOutInFlight(false);
    }
  };

  /** Share with a connection only (no check-in) — e.g. vault flow without ?code= */
  const handleShareCredentials = async (documentType: DocumentType | ChildAadhaarType) => {
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
      const credentialId = credential.credential_id || credential.id || credential.credentialId;
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
      toast.error(error?.data?.message ? String(error.data.message) : "Failed to share");
      throw error;
    }
  };

  /**
   * Hotel QR flow: share selected document + request check-in in one step, then clear ?code=
   * and pending storage so the user must scan again for another property.
   */
  const handleShareAndRequestCheckIn = async (documentType: DocumentType | ChildAadhaarType) => {
    if (!derivedConnectionId) {
      toast.error("No connection found. Try scanning the QR again.");
      throw new Error("missing-connection");
    }
    const credential = verifiedCredentialsMap[documentType];
    if (!credential) {
      toast.error("Credential not found");
      throw new Error("missing-credential");
    }

    const credentialId = credential.credential_id || credential.id || credential.credentialId;
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
        ...(checkinFlowStartedAt.current != null ? { client_started_at: checkinFlowStartedAt.current } : {}),
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
          : "Could not share or request check-in. Please try again."
      );
      throw error;
    } finally {
      setCheckInOutInFlight(false);
    }
  };

  // verify document → open iframe overlay (no popup). Supports main docs and children's Aadhaar.
  const handleVerifyDocument = async (documentType: DocumentType | ChildAadhaarType) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return toast.error("User not authenticated");

    const userId = currentUser.uid;
    const productCode = getProductCode(documentType);
    const origin = window.location.origin;

    const sessionId = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // For child Aadhaar we use the KYC (regular Aadhaar) product code.
    // Pre-create a Firestore credential doc with the correct child document_type so the
    // webhook can detect it from the session_id and avoid overwriting AADHAAR_CARD.
    let effectiveSessionId = sessionId;
    if ((CHILD_AADHAAR_TYPES as readonly string[]).includes(documentType)) {
      try {
        const res = await createCredential({ document_type: documentType, verifiers_name: "Kwik" }).unwrap();
        if (res.data?.document_id) effectiveSessionId = res.data.document_id;
      } catch {
        // non-fatal: proceed with generated sessionId; webhook may still work
      }
      pendingChildVerify.current = { sessionId: effectiveSessionId, docType: documentType as ChildAadhaarType, startedAt: Date.now() };
    } else {
      pendingChildVerify.current = null;
    }

    const verificationUrl =
      `${IVERIFI_ORIGIN}/user/home?client_id=iverifi&api_key=iverifi&process=U` +
      `&productCode=${encodeURIComponent(productCode)}` +
      `&user_id=${encodeURIComponent(userId)}` +
      `&session_id=${encodeURIComponent(effectiveSessionId)}` +
      `&redirect_origin=${encodeURIComponent(origin)}`;

    setIframeUrl(verificationUrl);
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
                Select an ID below and tap Share — your check-in request will be sent automatically.
              </p>
            </div>
            <Button
              type="button"
              disabled={currentConnection?.check_in_status === "pending" || isCurrentlyCheckedIn}
              className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] text-white font-semibold px-4 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => {
                void refetchRecipient();
                openHotelShareSheet();
              }}
            >
              Choose document
            </Button>
          </div>
          {isCurrentlyCheckedIn && (
            <p className="text-xs text-emerald-200/90 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              You are currently checked in. Please check out before checking in again.
            </p>
          )}
          {currentConnection?.check_in_status === "pending" && !currentConnection?.check_in_time && (
            <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              Check-in is waiting for the property to approve.
            </p>
          )}
          {hasCredentials === false && (
            <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              Verify a document in your vault below first.
            </p>
          )}
        </div>
      )}

      <div className="space-y-6 pt-2">
          {/* Top stats (iVerifi app style) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[color:var(--iverifi-stat-border)] bg-[var(--iverifi-stat-bg)] p-4">
              <div className="text-center">
                <div className="text-xl font-semibold text-teal-600 dark:text-[#00e0ff]">
                  {
                    HOME_DOCUMENT_TYPES.filter(
                      (t) => !!verifiedCredentialsMap[t]
                    ).length
                  }
                </div>
                <div className="mt-1 text-center text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
                  Verified
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--iverifi-stat-border)] bg-[var(--iverifi-stat-bg)] p-4">
              <div className="text-center">
                <div className="text-xl font-semibold text-teal-600 dark:text-[#00e0ff]">
                  {connectionsData?.data?.requests?.length ?? 0}
                </div>
                <div className="mt-1 text-center text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
                  Stays
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--iverifi-stat-border)] bg-[var(--iverifi-stat-bg)] p-4">
              <div className="text-center">
                <div className="text-xl font-semibold text-teal-600 dark:text-[#00e0ff]">
                  {
                    (connectionsData?.data?.requests ?? []).filter(
                      (r: any) => r?.check_in_status === "pending"
                    ).length
                  }
                </div>
                <div className="mt-1 text-center text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
                  Pending
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
                  DOCUMENTS
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border border-[color:var(--iverifi-border-subtle)] bg-[var(--iverifi-muted-surface)] px-3 text-[var(--iverifi-text-secondary)] hover:bg-[var(--iverifi-card-hover)]"
                onClick={() => navigate("/add-documents")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {HOME_DOCUMENT_TYPES.map((docType) => {
                const isVerified = !!verifiedCredentialsMap[docType];
                const subtitle = getDocSubtitle(docType);
                const title = docType
                  .replace(/_/g, " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div
                    key={docType}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] px-4 py-3"
                    role="button"
                    onClick={() => isVerified ? setSelectedDocType(docType) : handleVerifyDocument(docType)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--iverifi-icon-border)] bg-[var(--iverifi-muted-surface)]">
                        <DocumentTypeIcon documentType={docType} className="text-[var(--iverifi-text-secondary)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--iverifi-text-primary)]">
                          {title}
                        </div>
                        <div className="truncate text-xs text-[var(--iverifi-text-muted)]">
                          {subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isVerified ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-[#00c896]" />
                          <ChevronRight className="h-4 w-4 text-[var(--iverifi-text-muted)]" />
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-xl border border-amber-400 bg-transparent text-amber-600 hover:bg-amber-50 dark:border-[#f5a623] dark:text-[#f5a623] dark:hover:bg-[rgba(245,166,35,0.12)]"
                            onClick={(e) => { e.stopPropagation(); handleVerifyDocument(docType); }}
                          >
                            Verify
                          </Button>
                          <ChevronRight className="h-4 w-4 text-[var(--iverifi-text-muted)]" />
                        </>
                      )}
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
                        <span className="text-lg">🛂</span>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--iverifi-text-primary)]">Foreign Passport</div>
                        <div className="truncate text-xs text-[var(--iverifi-text-muted)]">{qrActive ? "Upload passport, visa & selfie" : "Scan hotel QR to upload & submit"}</div>
                      </div>
                    </div>
                    {qrActive ? <ChevronRight className="h-4 w-4 shrink-0 text-[var(--iverifi-text-muted)]" /> : <Lock className="h-4 w-4 shrink-0 text-[var(--iverifi-text-muted)]" />}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Child Aadhaar — progressive slots (max 3); teal "+ Add child", gold Verify */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
                CHILD AADHAAR (
                {
                  CHILD_AADHAAR_TYPES.filter(
                    (t) => !!verifiedCredentialsMap[t]
                  ).length
                }
                /3)
              </div>
              {childAadhaarSlotsVisible < 3 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1 rounded-full border-0 bg-teal-100 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-200 dark:bg-[rgba(0,200,180,0.22)] dark:text-[#5eead4] dark:hover:bg-[rgba(0,200,180,0.32)]"
                  onClick={() =>
                    setChildAadhaarSlotsVisible((n) => Math.min(3, n + 1))
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add child
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              {CHILD_AADHAAR_TYPES.slice(0, childAadhaarSlotsVisible).map(
                (docType) => {
                  const isVerified = !!verifiedCredentialsMap[docType];
                  const subtitle = getDocSubtitle(docType);
                  const slot =
                    docType.match(/Child (\d+) Aadhaar/)?.[1] ?? "";
                  return (
                    <div
                      key={docType}
                      role="button"
                      onClick={() =>
                        isVerified
                          ? setSelectedDocType(docType)
                          : handleVerifyDocument(docType)
                      }
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-50 dark:border-[rgba(245,166,35,0.35)] dark:bg-[rgba(245,166,35,0.18)]">
                          <DocumentTypeIcon
                            documentType={docType}
                            className="h-6 w-6 text-amber-100"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[var(--iverifi-text-primary)]">
                            Child Aadhaar
                          </div>
                          <div className="truncate text-xs text-[var(--iverifi-text-muted)]">
                            {isVerified
                              ? `${slot ? `Child ${slot}` : docType} · ${subtitle}`
                              : "Tap to verify - DigiLocker"}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {isVerified ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-[#00c896]" />
                            <ChevronRight className="h-4 w-4 text-[var(--iverifi-text-muted)]" />
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-xl border border-amber-400 bg-transparent text-amber-600 hover:bg-amber-50 dark:border-[#f5a623] dark:text-[#f5a623] dark:hover:bg-[rgba(245,166,35,0.12)]"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerifyDocument(docType);
                              }}
                            >
                              Verify
                            </Button>
                            <ChevronRight className="h-4 w-4 text-[var(--iverifi-text-muted)]" />
                          </>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

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
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--iverifi-sheet-handle)", margin: "0 auto 20px" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
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
                <DocumentTypeIcon documentType={selectedDocType} className="text-[var(--iverifi-text-primary)]" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: "var(--iverifi-text-primary)" }}>{selectedDocTitle}</div>
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
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  "👤"
                )}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 4 }}>
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
                        background: isAbove18 ? "var(--iverifi-success-soft)" : "var(--iverifi-warning-soft)",
                        color: isAbove18 ? "var(--iverifi-success)" : "var(--iverifi-warning)",
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
                ...(selectedDocType === "PAN_CARD"
                  ? [{ label: "PAN", value: `******${selectedIdentityInfo.last4}` }]
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
                  <span style={{ fontSize: 14, color: "var(--iverifi-label)" }}>{field.label}</span>
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
                    borderBottom: index === selectedDocFields.length - 1 ? "none" : "1px solid var(--iverifi-row-divider)",
                  }}
                >
                  <span style={{ fontSize: 14, color: "var(--iverifi-label)" }}>{field.label}</span>
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
                  setShareExpiryHours("24");
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

      {shareSheetOpen ? (
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
          onClick={() => setShareSheetOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-sheet-title"
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
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--iverifi-sheet-handle)", margin: "0 auto 20px" }} />

            {verifiedDocTypesForShare.length === 0 && !(code && isValidQRCode(code)) ? (
              <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🪪</div>
                <div id="share-sheet-title" style={{ fontSize: 19, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 8 }}>
                  No verified documents
                </div>
                <div style={{ fontSize: 13, color: "var(--iverifi-label)", marginBottom: 20, lineHeight: 1.5 }}>
                  Verify at least one document before sharing.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShareSheetOpen(false);
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
                  }}
                >
                  Go to Vault →
                </button>
              </div>
            ) : !connectedRequestorName ? (
              code ? (
                isRecipientLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 16 }}>
                    <Loader2 className="h-10 w-10 animate-spin text-teal-600 dark:text-[#00e0ff]" aria-hidden />
                    <div id="share-sheet-title" style={{ fontSize: 15, color: "var(--iverifi-hint-text)", textAlign: "center" }}>
                      Loading property…
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                    <div id="share-sheet-title" style={{ fontSize: 19, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 10 }}>
                      Couldn&apos;t load this stay
                    </div>
                    <p style={{ fontSize: 13, color: "var(--iverifi-label)", marginBottom: 20, lineHeight: 1.5 }}>
                      Check your connection, then try again. Your QR scan is saved in the link.
                    </p>
                    <button
                      type="button"
                      onClick={() => void refetchRecipient()}
                      style={{
                        width: "100%",
                        padding: "15px",
                        borderRadius: 14,
                        background: "rgba(0,200,150,0.12)",
                        border: "1px solid rgba(0,200,150,0.25)",
                        color: "var(--iverifi-success)",
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: "pointer",
                        marginBottom: 10,
                      }}
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareSheetOpen(false)}
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
                )
              ) : (
                <div>
                  <div
                    style={{
                      margin: "0 auto 20px",
                      width: 80,
                      height: 80,
                      borderRadius: 20,
                      border: "1px solid var(--iverifi-accent-border)",
                      background: "linear-gradient(135deg, var(--iverifi-accent-soft), rgba(123,92,245,0.12))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--iverifi-accent)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2" />
                      <rect x="9" y="9" width="6" height="6" rx="1" />
                    </svg>
                  </div>
                  <div id="share-sheet-title" style={{ fontSize: 19, fontWeight: 800, color: "var(--iverifi-text-primary)", marginBottom: 10, textAlign: "center" }}>
                    Scan to connect first
                  </div>
                  <div style={{ fontSize: 13, color: "var(--iverifi-label)", lineHeight: 1.6, marginBottom: 20, textAlign: "center" }}>
                    Scan the hotel&apos;s iVerifi QR (from Vault → Share, or the Scan tab). Then pick a document and confirm in one step.
                  </div>
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid var(--iverifi-border-subtle)",
                      background: "var(--iverifi-surface-1)",
                      padding: 16,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      ["📷", "Scan their QR", "Ask the property to show their iVerifi QR"],
                      ["✓", "Connection verified", "Their identity is confirmed by iVerifi"],
                      ["📤", "Choose & share", "Pick a document and share securely"],
                    ].map(([icon, title, desc]) => (
                      <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: title === "Choose & share" ? 0 : 12 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            flexShrink: 0,
                            borderRadius: 10,
                            border: "1px solid var(--iverifi-accent-border)",
                            background: "var(--iverifi-accent-soft)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                          }}
                        >
                          {icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--iverifi-text-primary)" }}>{title}</div>
                          <div style={{ fontSize: 12, color: "var(--iverifi-label)", marginTop: 2 }}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* C-Form & Foreign Passport — disabled until QR scanned */}
                  {[
                    // { label: "C-Form (Foreign Guest)", subtitle: "Scan hotel QR to fill & submit C-Form", icon: <DocumentTypeIcon documentType="C-Form (Foreign Guest)" className="text-[var(--iverifi-text-primary)] h-5 w-5" /> },
                    { label: "Foreign Passport", subtitle: "Scan hotel QR to upload & submit", icon: <span style={{ fontSize: 18 }}>🛂</span> },
                  ].map((opt) => (
                    <div
                      key={opt.label}
                      style={{ background: "var(--iverifi-surface-1)", borderRadius: 14, padding: "4px 12px", marginBottom: 8, border: "1px solid var(--iverifi-border-subtle)", opacity: 0.45 }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px" }}>
                        <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, border: "1px solid var(--iverifi-accent-border)", background: "var(--iverifi-accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {opt.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--iverifi-text-primary)" }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: "var(--iverifi-label)" }}>{opt.subtitle}</div>
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--iverifi-ring-muted)", flexShrink: 0 }} />
                      </div>
                    </div>
                  ))}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShareSheetOpen(false);
                        setScannerOpen(true);
                      }}
                      style={{
                        width: "100%",
                        padding: "15px",
                        borderRadius: 14,
                        background: "rgba(0,200,150,0.12)",
                        border: "1px solid rgba(0,200,150,0.25)",
                        color: "var(--iverifi-success)",
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Open Scanner
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareSheetOpen(false)}
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
                      Cancel
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 15,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--iverifi-accent-soft)",
                      border: "1px solid var(--iverifi-accent-border)",
                      overflow: "hidden",
                    }}
                  >
                    {connectedRequestorLogo ? (
                      <img
                        src={connectedRequestorLogo}
                        alt="Hotel Logo"
                        style={{ width: "80%", height: "80%", objectFit: "contain" }}
                      />
                    ) : (
                      <Share2 className="h-6 w-6 text-[var(--iverifi-text-primary)]" strokeWidth={2} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      id="share-sheet-title"
                      style={{
                        fontSize: 19,
                        fontWeight: 800,
                        color: "var(--iverifi-text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {code && isValidQRCode(code)
                        ? connectedRequestorName || "Property"
                        : "Share a document"}
                    </div>
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 999,
                          border: "1px solid var(--iverifi-success-border)",
                          background: "var(--iverifi-success-soft)",
                          padding: "2px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--iverifi-success)",
                        }}
                      >
                        {code && isValidQRCode(code) ? "✓ Verified" : `✓ ${connectedRequestorName}`}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--iverifi-label)" }}>
                        {code && isValidQRCode(code) ? "by iVerifi" : "iVerifi verified"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: "var(--iverifi-label)", marginBottom: 14, lineHeight: 1.5 }}>
                  {code && isValidQRCode(code)
                    ? `Select an ID below and tap Share — your check-in request will be sent automatically.`
                    : `Choose which document to share with ${connectedRequestorName}.`}
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--iverifi-label)", marginBottom: 8 }}>
                  Choose document
                </div>

                <div
                  style={{
                    background: "var(--iverifi-surface-1)",
                    borderRadius: 14,
                    padding: "4px 12px",
                    marginBottom: 14,
                    border: "1px solid var(--iverifi-border-subtle)",
                  }}
                >
                  {verifiedDocTypesForShare.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setShareSheetOpen(false)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 4px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          borderRadius: 12,
                          border: "1px solid var(--iverifi-success-border)",
                          background: "var(--iverifi-success-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                        }}
                      >
                        +
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--iverifi-success)" }}>Add a document</div>
                        <div style={{ fontSize: 11, color: "var(--iverifi-label)", marginTop: 2 }}>
                          Verify your Aadhaar, Driving Licence, or Passport to check in
                        </div>
                      </div>
                    </button>
                  )}
                  {verifiedDocTypesForShare.map((docType, idx) => {
                    const selected = shareSelectedDocType === docType;
                    const label = docType.includes("_") ? titleCase(docType) : docType;
                    return (
                      <button
                        key={docType}
                        type="button"
                        onClick={() => setShareSelectedDocType(docType)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 4px",
                          border: "none",
                          borderBottom: idx === verifiedDocTypesForShare.length - 1 ? "none" : "1px solid var(--iverifi-row-divider)",
                          background: selected ? "rgba(0,224,255,0.06)" : "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          borderRadius: selected ? 8 : 0,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            flexShrink: 0,
                            borderRadius: 12,
                            border: "1px solid rgba(0,224,255,0.18)",
                            background: "rgba(0,224,255,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <DocumentTypeIcon documentType={docType} className="text-[var(--iverifi-text-primary)] h-5 w-5" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: selected ? "var(--iverifi-accent)" : "var(--iverifi-text-primary)" }}>{label}</div>
                          <div style={{ fontSize: 11, color: "var(--iverifi-label)" }}>Verified</div>
                        </div>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: selected ? "2px solid var(--iverifi-accent)" : "2px solid var(--iverifi-ring-muted)",
                            background: selected ? "var(--iverifi-accent)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {selected ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#000" }} /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Foreign options — C-Form and Foreign Passport — only enabled when a hotel QR has been scanned */}
                {(() => {
                  const qrActive = !!(code && isValidQRCode(code));
                  const foreignOptions = [
                    // {
                    //   key: "C-Form (Foreign Guest)",
                    //   label: "C-Form (Foreign Guest)",
                    //   subtitle: qrActive ? "FRRO compliance · Fill & submit on check-in" : "Scan a hotel QR to use C-Form",
                    //   icon: <DocumentTypeIcon documentType="C-Form (Foreign Guest)" className="text-[var(--iverifi-text-primary)] h-5 w-5" />,
                    // },
                    {
                      key: "Foreign Passport",
                      label: "Foreign Passport",
                      subtitle: qrActive ? "Upload passport, visa & selfie on check-in" : "Scan a hotel QR to use this option",
                      icon: <span style={{ fontSize: 18 }}>🛂</span>,
                    },
                  ];
                  return foreignOptions.map((opt, idx) => {
                    const isSelected = shareSelectedDocType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={!qrActive}
                        onClick={() => qrActive && setShareSelectedDocType(opt.key)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 4px",
                          border: "none",
                          borderTop: (verifiedDocTypesForShare.length > 0 || idx > 0) ? "1px solid var(--iverifi-row-divider)" : "none",
                          background: isSelected ? "var(--iverifi-accent-soft)" : "transparent",
                          cursor: qrActive ? "pointer" : "not-allowed",
                          textAlign: "left",
                          borderRadius: isSelected ? 8 : 0,
                          opacity: qrActive ? 1 : 0.4,
                        }}
                      >
                        <div
                          style={{
                            width: 40, height: 40, flexShrink: 0, borderRadius: 12,
                            border: "1px solid var(--iverifi-accent-border)",
                            background: "var(--iverifi-accent-soft)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {opt.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? "var(--iverifi-accent)" : "var(--iverifi-text-primary)" }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: "var(--iverifi-label)" }}>{opt.subtitle}</div>
                        </div>
                        <div
                          style={{
                            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                            border: isSelected ? "2px solid var(--iverifi-accent)" : "2px solid var(--iverifi-ring-muted)",
                            background: isSelected ? "var(--iverifi-accent)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {isSelected ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#000" }} /> : null}
                        </div>
                      </button>
                    );
                  });
                })()}

                {shareSelectedDocType ? (
                  <div
                    style={{
                      marginBottom: 14,
                      borderRadius: 14,
                      border: "1px solid var(--iverifi-border-subtle)",
                      background: "var(--iverifi-surface-1)",
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--iverifi-label)", marginBottom: 10 }}>
                      What gets shared
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {shareSummary.map((field) => (
                        <span
                          key={field}
                          style={{
                            borderRadius: 999,
                            border: "1px solid var(--iverifi-accent-border)",
                            background: "var(--iverifi-accent-soft)",
                            padding: "4px 12px",
                            fontSize: 12,
                            color: "var(--iverifi-accent)",
                          }}
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!code || !isValidQRCode(code) ? (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--iverifi-label)", marginTop: 4, marginBottom: 8 }}>
                      Link expires after
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                      {[
                        ["1", "1 hour"],
                        ["24", "24 hours"],
                        ["168", "7 days"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setShareExpiryHours(value)}
                          style={{
                            padding: "10px 8px",
                            borderRadius: 12,
                            border:
                              shareExpiryHours === value
                                ? "1px solid var(--iverifi-accent)"
                                : "1px solid var(--iverifi-ring-muted)",
                            background: shareExpiryHours === value ? "var(--iverifi-accent-soft)" : "var(--iverifi-surface-1)",
                            color: shareExpiryHours === value ? "var(--iverifi-accent)" : "var(--iverifi-hint-text)",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                <div
                  style={{
                    padding: 12,
                    background: "var(--iverifi-accent-soft)",
                    border: "1px solid var(--iverifi-accent-border)",
                    borderRadius: 12,
                    marginBottom: 16,
                    fontSize: 12,
                    color: "var(--iverifi-hint-text)",
                    lineHeight: 1.6,
                  }}
                >
                  ℹ️ Recipient cannot re-share. Revocable from Activity. DPDP Act 2023.
                  {code && isValidQRCode(code) ? (
                    <span style={{ display: "block", marginTop: 6, color: "var(--iverifi-label)" }}>
                      After you confirm, this property link clears — scan again if you need another stay.
                    </span>
                  ) : null}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {isCurrentlyCheckedIn && (
                    <p style={{ fontSize: 12, color: "var(--iverifi-success)", background: "var(--iverifi-success-soft)", border: "1px solid var(--iverifi-success-border)", borderRadius: 8, padding: "8px 12px", marginBottom: 4 }}>
                      You are currently checked in. Please check out before checking in again.
                    </p>
                  )}
                  {currentConnection?.check_in_status === "pending" && (
                    <p style={{ fontSize: 12, color: "var(--iverifi-warning)", background: "var(--iverifi-warning-soft)", border: "1px solid var(--iverifi-warning-border)", borderRadius: 8, padding: "8px 12px", marginBottom: 4 }}>
                      Check-in is waiting for the property to approve.
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={
                      isCurrentlyCheckedIn ||
                      currentConnection?.check_in_status === "pending" ||
                      !shareSelectedDocType ||
                      !connectedRequestorName ||
                      (!!code && isValidQRCode(code) && (isCheckInOutInFlight || isCheckInUpdating))
                    }
                    style={{
                      width: "100%",
                      padding: "15px",
                      borderRadius: 14,
                      background: "rgba(0,200,150,0.12)",
                      border: "1px solid rgba(0,200,150,0.25)",
                      color: "var(--iverifi-success)",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor:
                        isCurrentlyCheckedIn ||
                        currentConnection?.check_in_status === "pending" ||
                        !shareSelectedDocType ||
                        !connectedRequestorName ||
                        (!!code && isValidQRCode(code) && (isCheckInOutInFlight || isCheckInUpdating))
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        isCurrentlyCheckedIn ||
                        currentConnection?.check_in_status === "pending" ||
                        !shareSelectedDocType ||
                        !connectedRequestorName ||
                        (!!code && isValidQRCode(code) && (isCheckInOutInFlight || isCheckInUpdating))
                          ? 0.45
                          : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                    onClick={async () => {
                      if (!shareSelectedDocType) return;
                      // C-Form: open fill dialog
                      if (shareSelectedDocType === "C-Form (Foreign Guest)") {
                        setCformRef(generateCFormRef(connectedRequestorName || "Hotel"));
                        setCformDialogOpen(true);
                        return;
                      }
                      // Foreign Passport: close share sheet first, then open photo upload dialog
                      if (shareSelectedDocType === "Foreign Passport") {
                        setShareSheetOpen(false);
                        setForeignPassportDialogOpen(true);
                        return;
                      }
                      try {
                        if (code && isValidQRCode(code)) {
                          await handleShareAndRequestCheckIn(shareSelectedDocType as DocumentType | ChildAadhaarType);
                        } else {
                          await handleShareCredentials(shareSelectedDocType as DocumentType | ChildAadhaarType);
                        }
                        setShareSheetOpen(false);
                      } catch {
                        /* toast already shown; keep sheet open */
                      }
                    }}
                  >
                    {isCheckInOutInFlight || isCheckInUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        Working…
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 shrink-0" />
                        {shareSelectedDocType === "C-Form (Foreign Guest)"
                          ? "Submit C-Form & Check In →"
                          : shareSelectedDocType === "Foreign Passport"
                          ? "Upload Photos & Check In →"
                          : code && isValidQRCode(code) ? "Share & request check-in →" : "Share now →"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareSheetOpen(false)}
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
            )}
          </div>
        </div>
      ) : null}

      <QRScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        validateCode={isValidQRCode}
        onScanSuccess={(scannedCode) => {
          setScannerOpen(false);
          const path = location.pathname || "/";
          const separator = path.includes("?") ? "&" : "?";
          navigate(`${path}${separator}code=${encodeURIComponent(scannedCode)}`);
        }}
      />

      <Dialog open={!!deleteTarget} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this verified document
            {deleteTarget?.document_type ? ` (${deleteTarget.document_type.replace(/_/g, " ")})` : ""}?
            You can add it again later.
          </p>
          <div className="space-y-2 pt-2">
            <Label htmlFor="delete-confirm" className="text-sm font-medium">
              Type <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">DELETE</kbd> to confirm
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
            <Button variant="outline" onClick={() => handleDeleteDialogOpenChange(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDoc}
              disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
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

      <FeedbackModal
        open={feedbackOpen}
        credentialRequestId={feedbackRequestId ?? ""}
        hotelName={connectedRequestorName ?? "the property"}
        onClose={() => { setFeedbackOpen(false); setFeedbackRequestId(null); }}
      />

      {/* Iframe Overlay */}
      {iframeUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2" style={{ zIndex: 2147483647 }}>
          <div className="relative bg-white w-full max-w-3xl h-[88vh] rounded-lg shadow-lg overflow-hidden">
            <button
              aria-label="Close"
              className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:border-teal-300/40 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              onClick={async () => {
                pendingChildVerify.current = null; // user closed manually — no patch needed
                setIframeUrl(null);
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
