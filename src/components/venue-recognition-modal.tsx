import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  Share2,
  MapPin,
  AlertCircle,
  Loader2,
  X,
  Users,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentTypeIcon } from "@/components/document-type-icon";
import {
  getBusinessTypeMeta,
  getBusinessPurposeMeta,
} from "@/utils/businessCategoryUtils";

export type DocumentType =
  | "DRIVING_LICENSE"
  | "AADHAAR_CARD"
  | "PAN_CARD"
  | "PASSPORT"
  | "C-Form (Foreign Guest)"
  | "Foreign Passport";

interface VenueRecognitionModalProps {
  open: boolean;
  onClose: () => void;

  // Business info
  businessName?: string | null;
  businessLogo?: string | null;
  businessType?: string | null;
  businessAddress?: string | null;
  isCompany?: boolean;
  code?: string | null;

  // Document selection
  verifiedDocTypes: DocumentType[];
  selectedDocType: string | null;
  onSelectDocType: (docType: string) => void;

  // Granular details for selected document
  selectedIdentityInfo?: { name: string; age: string; last4: string };
  selectedDetails?: Record<string, any> | null;

  // Family IDs
  familyMembers?: any[];

  // Loading & submit states
  isLoading?: boolean;
  isSubmitting?: boolean;

  // Handlers
  onConfirmCheckIn: () => Promise<void>;
  onVerifyNewDoc?: () => void;
  onOpenScanner?: () => void;
}

export function VenueRecognitionModal({
  open,
  onClose,
  businessName,
  businessLogo,
  businessType,
  businessAddress,
  isCompany = true,
  code,
  verifiedDocTypes,
  selectedDocType,
  onSelectDocType,
  selectedIdentityInfo,
  familyMembers = [],
  isLoading = false,
  isSubmitting = false,
  onConfirmCheckIn,
  onVerifyNewDoc,
  onOpenScanner,
}: VenueRecognitionModalProps) {
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [showGranularDetails, setShowGranularDetails] = useState(false);

  // Derive business category & purpose
  const businessMeta = useMemo(
    () => getBusinessTypeMeta(businessType, isCompany, "h-5 w-5"),
    [businessType, isCompany]
  );
  const purposeMeta = useMemo(
    () => getBusinessPurposeMeta(businessType, isCompany),
    [businessType, isCompany]
  );

  const displayName = businessName || "Verified Organization";
  const hasVerifiedDocs = verifiedDocTypes.length > 0;

  // Selected doc title
  const currentDocLabel = useMemo(() => {
    if (!selectedDocType) return "Select Document";
    if (selectedDocType.startsWith("FAMILY:")) {
      const memberId = selectedDocType.slice(7);
      const m = familyMembers.find((f: any) => f.id === memberId);
      return m?.member_nickname || m?.nickname || "Family Member ID";
    }
    return selectedDocType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [selectedDocType, familyMembers]);

  // Granular consent attributes
  const consentAttributes = useMemo(() => {
    if (!selectedDocType) return [];
    const isAadhaar =
      selectedDocType === "AADHAAR_CARD" || selectedDocType.startsWith("FAMILY:");

    if (isAadhaar) {
      return [
        {
          label: "Full Legal Name",
          value: selectedIdentityInfo?.name || "Verified Name",
          masked: false,
          note: "Official name as per UIDAI records",
        },
        {
          label: "Identity Number",
          value: selectedIdentityInfo?.last4
            ? `XXXX XXXX ${selectedIdentityInfo.last4}`
            : "XXXX XXXX ****",
          masked: true,
          note: "Sensitive digits encrypted & masked",
        },
        {
          label: "Age Verification",
          value: selectedIdentityInfo?.age || "Above 18 ✓",
          masked: true,
          note: "Zero-Knowledge Proof (actual DOB concealed)",
        },
        {
          label: "Live KYC Match Photo",
          value: "Verified Profile Face",
          masked: false,
          note: "Biometrically verified identity",
        },
        {
          label: "State / Jurisdiction",
          value: "Regional State Only",
          masked: false,
          note: "Detailed street address hidden",
        },
      ];
    }

    if (selectedDocType === "DRIVING_LICENSE") {
      return [
        {
          label: "Full Name",
          value: selectedIdentityInfo?.name || "Verified Holder",
          masked: false,
          note: "As registered in MoRTH",
        },
        {
          label: "Licence Number",
          value: selectedIdentityInfo?.last4
            ? `XXXXXXXX${selectedIdentityInfo.last4}`
            : "XXXXXXXX****",
          masked: true,
          note: "Last 4 digits only",
        },
        {
          label: "Validity & Vehicle Class",
          value: "Active & Verified",
          masked: false,
          note: "Confirmed valid licence",
        },
      ];
    }

    if (selectedDocType === "PASSPORT") {
      return [
        {
          label: "Full Name",
          value: selectedIdentityInfo?.name || "Passport Holder",
          masked: false,
          note: "Passport official name",
        },
        {
          label: "Passport Number",
          value: selectedIdentityInfo?.last4
            ? `XX*****${selectedIdentityInfo.last4}`
            : "XX*********",
          masked: true,
          note: "Masked passport identifier",
        },
        {
          label: "Nationality & Expiry",
          value: "Verified",
          masked: false,
          note: "Valid international proof",
        },
      ];
    }

    return [
      {
        label: "Full Name",
        value: selectedIdentityInfo?.name || "Verified Holder",
        masked: false,
        note: "Official identifier",
      },
      {
        label: "Masked Identifier",
        value: `•••• •••• ${selectedIdentityInfo?.last4 || "****"}`,
        masked: true,
        note: "Cryptographically protected",
      },
    ];
  }, [selectedDocType, selectedIdentityInfo]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-preview-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-border/80 bg-card text-foreground shadow-2xl backdrop-blur-2xl p-5 sm:p-6 flex flex-col gap-5 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        {/* Handle for mobile touch */}
        <div className="sm:hidden w-10 h-1.5 rounded-full bg-muted-foreground/30 mx-auto -mt-1" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
              {code ? "Live Venue Recognition" : "Share Identity Credential"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!code ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center flex flex-col items-center gap-4 my-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-cyan-400 border border-teal-500/25">
              <Share2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Scan Venue QR to Connect</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                Scan the iVerifi QR code at the hotel front desk, office lobby, hospital admission, or facility entrance to preview the venue and check in instantly.
              </p>
            </div>
            {onOpenScanner ? (
              <Button
                type="button"
                onClick={onOpenScanner}
                className="h-11 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-500/20 cursor-pointer"
              >
                Open QR Scanner →
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {/* ── 1. Verified Business Card ── */}
            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50 dark:from-slate-900/90 dark:via-teal-950/20 dark:to-slate-900/90 p-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            {/* Logo or Icon Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
              {businessLogo ? (
                <img
                  src={businessLogo}
                  alt={displayName}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <div className={businessMeta.iconClassName}>
                  {businessMeta.icon}
                </div>
              )}
            </div>

            {/* Business Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${businessMeta.badgeClassName}`}
                >
                  {businessMeta.shortLabel}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  <ShieldCheck className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                  iVerifi Partner
                </span>
              </div>

              <h2
                id="venue-preview-title"
                className="mt-1 text-base sm:text-lg font-black tracking-tight text-foreground truncate"
              >
                {displayName}
              </h2>

              {businessAddress ? (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate">{businessAddress}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Purpose & Compliance Banner */}
          <div className="mt-3.5 pt-3 border-t border-border/50 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>{purposeMeta.purposeTitle}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Authorized
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {purposeMeta.purposeDescription}
            </p>
          </div>
        </div>

        {/* ── 2. Zero-Friction Express Check-In Card (If user has verified IDs) ── */}
        {hasVerifiedDocs ? (
          <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 dark:bg-teal-500/10 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300">
                <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span>Express 1-Tap Verification</span>
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">
                Verified via DigiLocker
              </span>
            </div>

            {/* Currently Selected ID preview */}
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25">
                  <DocumentTypeIcon
                    documentType={
                      selectedDocType?.startsWith("FAMILY:")
                        ? "AADHAAR_CARD"
                        : (selectedDocType as any) || "AADHAAR_CARD"
                    }
                    className="h-5 w-5"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">
                    {currentDocLabel}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {selectedIdentityInfo?.last4
                      ? `Masked ending in ${selectedIdentityInfo.last4}`
                      : "Verified & Ready"}
                  </div>
                </div>
              </div>

              {/* Toggle to switch document */}
              <button
                type="button"
                onClick={() => setShowDocPicker(!showDocPicker)}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer px-2 py-1 rounded-lg hover:bg-teal-500/10"
              >
                <span>{showDocPicker ? "Hide" : "Change ID"}</span>
                {showDocPicker ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Expandable Document Selector */}
            {showDocPicker && (
              <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Choose alternate document
                </div>

                {verifiedDocTypes.map((dt) => {
                  const isSelected = selectedDocType === dt;
                  return (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => {
                        onSelectDocType(dt);
                        setShowDocPicker(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "border-teal-500 bg-teal-500/10 text-teal-800 dark:text-teal-200"
                          : "border-border/60 bg-card hover:bg-accent text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <DocumentTypeIcon
                          documentType={dt}
                          className="h-4 w-4 text-teal-600 dark:text-teal-400"
                        />
                        <span>
                          {dt
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </div>
                      {isSelected ? (
                        <Check className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      ) : null}
                    </button>
                  );
                })}

                {/* Family Members */}
                {familyMembers.length > 0 && (
                  <>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-2">
                      Family Members
                    </div>
                    {familyMembers.map((m: any) => {
                      const key = `FAMILY:${m.id}`;
                      const isSelected = selectedDocType === key;
                      const nick =
                        m.member_nickname || m.nickname || "Family Member";
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            onSelectDocType(key);
                            setShowDocPicker(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "border-teal-500 bg-teal-500/10 text-teal-800 dark:text-teal-200"
                              : "border-border/60 bg-card hover:bg-accent text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Users className="h-4 w-4 text-teal-600" />
                            <span>{nick} (Aadhaar)</span>
                          </div>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-teal-600" />
                          ) : null}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Express Check-In Primary Action Button */}
            <Button
              type="button"
              disabled={isSubmitting || isLoading}
              onClick={onConfirmCheckIn}
              className="h-12 w-full bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 text-white font-bold rounded-xl text-sm shadow-md shadow-teal-500/25 transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Securing & Checking In…</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-white" />
                  <span>
                    {purposeMeta.actionLabel} ({currentDocLabel})
                  </span>
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Empty state: No verified documents */
          <div className="rounded-2xl border border-dashed border-border p-5 text-center flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                No Verified Document in Vault
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Verify your Aadhaar or Driving Licence via DigiLocker in 30
                seconds to complete this check-in.
              </p>
            </div>
            {onVerifyNewDoc ? (
              <Button
                type="button"
                onClick={onVerifyNewDoc}
                className="h-10 px-5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs shadow-xs"
              >
                Verify with DigiLocker Now →
              </Button>
            ) : null}
          </div>
        )}

        {/* ── 3. Granular Consent Transparency (DPDP Act 2023) ── */}
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-3.5 space-y-2.5">
          <button
            type="button"
            onClick={() => setShowGranularDetails(!showGranularDetails)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-foreground">
                  Granular Consent & Data Disclosed
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {consentAttributes.length} protected attributes requested
                </div>
              </div>
            </div>
            <div className="text-xs text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
              <span>{showGranularDetails ? "Hide" : "Review"}</span>
              {showGranularDetails ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </div>
          </button>

          {/* Granular Attribute Checklist */}
          {showGranularDetails && (
            <div className="pt-2 border-t border-border/50 space-y-2 animate-in fade-in duration-150">
              {consentAttributes.map((attr, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between text-xs py-1 border-b border-border/30 last:border-b-0"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{attr.label}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground ml-5">
                      {attr.note}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-[11px] shrink-0 font-medium px-2 py-0.5 rounded-md ${
                      attr.masked
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {attr.value}
                  </span>
                </div>
              ))}
              <div className="text-[10px] text-muted-foreground/80 leading-relaxed pt-1">
                🔒 <strong>DPDP Act 2023 Selective Disclosure:</strong> Your raw
                full identity number and exact date of birth remain encrypted.
                The recipient receives cryptographic proof only.
              </div>
            </div>
          )}
        </div>

        {/* ── 4. Prominent Auto-Revocation Timer & Security Assurance ── */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Auto-Revocation Timer: 24 Hours
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Self-Destructing
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              Access terminates automatically in 24 hours. Cannot be re-shared.
              Revocable anytime in 1 tap from your Activity Log.
            </p>
          </div>
        </div>
        </>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
          <span>Protected under DPDP Act 2023</span>
          <button
            type="button"
            onClick={onClose}
            className="hover:underline text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
