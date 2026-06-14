import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/auth_context";
import {
  useGetFamilyCredentialsQuery,
  useCreateCredentialMutation,
} from "@/redux/api";
import { toast } from "sonner";
import { X } from "lucide-react";

const IVERIFI_ORIGIN = "https://iverifi.test.getkwikid.com";
const POLL_INTERVAL_MS = 2000;

const FAMILY_DOC_OPTIONS = [
  { type: "FAMILY_AADHAAR",  label: "Aadhaar",        productCode: "KYC" },
  { type: "FAMILY_PASSPORT", label: "Passport",        productCode: "PP"  },
  { type: "FAMILY_DL",       label: "Driving License", productCode: "DL"  },
  { type: "FAMILY_PAN",      label: "PAN Card",        productCode: "PC"  },
] as const;
type FamilyDocType = (typeof FAMILY_DOC_OPTIONS)[number]["type"];

interface Props {
  hotelName: string;
  hotelLogoUrl?: string | null;
  onContinue: (selectedFamilyCredentials: FamilyCredential[]) => void;
  onSkip: () => void;
}

export interface FamilyCredential {
  id: string;
  member_nickname: string;
  document_type: string;
  state: string;
}

export default function GuestFamilySelect({ hotelName, hotelLogoUrl, onContinue, onSkip }: Props) {
  const { user } = useAuth();

  // Family member list
  const [pollInterval, setPollInterval] = useState(0);
  const { data: familyData, refetch: refetchFamily } = useGetFamilyCredentialsQuery(undefined, {
    pollingInterval: pollInterval,
  });
  const familyMembers: FamilyCredential[] = (familyData?.data?.family_members ?? []).filter(
    (m: any) => m.verification_status === "auto_approved" || m.state === "auto_approved"
  ).map((m: any) => ({
    id: m.id,
    member_nickname: m.member_nickname || m.nickname || "Family Member",
    document_type: m.document_type || "FAMILY_AADHAAR",
    state: m.verification_status || m.state,
  }));

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Track the nickname of a just-added member so we can auto-select it
  const pendingNicknameRef = useRef<string | null>(null);

  // Auto-select newly verified member when it appears in the list
  useEffect(() => {
    if (!pendingNicknameRef.current) return;
    const newMember = familyMembers.find(
      (m) => m.member_nickname.toLowerCase() === pendingNicknameRef.current!.toLowerCase()
    );
    if (newMember) {
      setSelectedIds((prev) => new Set([...prev, newMember.id]));
      pendingNicknameRef.current = null;
      setPollInterval(0);
    }
  }, [familyMembers]);

  // Detect DigiLocker family DL return (?dl_family_verified=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dl_family_verified") !== "1") return;
    window.history.replaceState({}, "", window.location.pathname);
    const savedNickname = sessionStorage.getItem("pendingFamilyDLNickname");
    sessionStorage.removeItem("pendingFamilyDLNickname");
    if (savedNickname) pendingNicknameRef.current = savedNickname;
    setPollInterval(POLL_INTERVAL_MS);
    refetchFamily();
  }, [refetchFamily]);

  // Add-member dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [docType, setDocType] = useState<FamilyDocType>("FAMILY_AADHAAR");
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [createCredential] = useCreateCredentialMutation();

  // DL choice modal state
  const [dlChoiceOpen, setDlChoiceOpen] = useState(false);

  // KYC iframe state
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // postMessage listener for KYC completion
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (typeof event.origin !== "string" || !event.origin.startsWith(IVERIFI_ORIGIN)) return;
      const data = event.data;
      if (!data || typeof data !== "object" || data.type !== "iverifi") return;
      if (data.status === "completed") {
        setIframeUrl(null);
        setPollInterval(POLL_INTERVAL_MS);
        await refetchFamily();
      } else if (data.status === "failed" || data.status === "rejected" || data.status === "error") {
        setIframeUrl(null);
        setPollInterval(0);
        pendingNicknameRef.current = null;
        toast.error("Verification failed. Please try again.");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refetchFamily]);

  // Shared Kwik verification flow (for all doc types including FAMILY_DL Camera Scan)
  const handleStartKwikVerification = useCallback(async (selectedDocType: FamilyDocType, productCode: string, nicknameTrimmed: string) => {
    if (!user) {
      toast.error("Please log in to continue.");
      return;
    }
    setIsStarting(true);
    try {
      const res = await createCredential({
        document_type: selectedDocType,
        verifiers_name: "Kwik",
        // @ts-ignore — extra fields accepted by backend
        is_family_member: true,
        member_nickname: nicknameTrimmed,
      } as any).unwrap();
      const sessionId = res?.data?.document_id;
      if (!sessionId) throw new Error("No session ID returned from server.");
      const url =
        `${IVERIFI_ORIGIN}/user/home?client_id=iverifi&api_key=iverifi&process=U` +
        `&productCode=${encodeURIComponent(productCode)}` +
        `&user_id=${encodeURIComponent(user.uid)}` +
        `&session_id=${encodeURIComponent(sessionId)}` +
        `&redirect_origin=${encodeURIComponent(window.location.origin)}`;
      pendingNicknameRef.current = nicknameTrimmed;
      setIframeUrl(url);
      setPollInterval(POLL_INTERVAL_MS);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "Failed to start verification.");
    } finally {
      setIsStarting(false);
    }
  }, [user, createCredential]);

  const handleStartVerification = useCallback(async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNicknameError("Please enter a name for this family member.");
      return;
    }
    if (!user) {
      toast.error("Please log in to continue.");
      return;
    }
    setNicknameError("");

    if (docType === "FAMILY_DL") {
      // Show DL choice modal (DigiLocker vs Camera Scan)
      setAddDialogOpen(false);
      setDlChoiceOpen(true);
      return;
    }

    const selectedDoc = FAMILY_DOC_OPTIONS.find((o) => o.type === docType)!;
    setAddDialogOpen(false);
    setNickname("");
    await handleStartKwikVerification(docType, selectedDoc.productCode, trimmed);
  }, [nickname, user, docType, handleStartKwikVerification]);

  // DL: Camera Scan (Kwik)
  const handleDLKwik = useCallback(async () => {
    setDlChoiceOpen(false);
    const trimmed = nickname.trim();
    setNickname("");
    await handleStartKwikVerification("FAMILY_DL", "DL", trimmed);
  }, [nickname, handleStartKwikVerification]);

  // DL: DigiLocker redirect
  const handleDLDigiLocker = useCallback(() => {
    const trimmed = nickname.trim();
    sessionStorage.setItem("pendingFamilyDLNickname", trimmed);
    setDlChoiceOpen(false);
    setNickname("");
    const apiBase = ((import.meta as any).env.VITE_BASE_URL as string || "").replace(/\/$/, "");
    const returnUrl = `${window.location.origin}/checkin`;
    window.location.assign(
      `${apiBase}/webhook/digilocker-aadhaar-oauth-start` +
      `?applicant_id=${encodeURIComponent(user!.uid)}` +
      `&doc_type=DL&is_family_member=true` +
      `&member_nickname=${encodeURIComponent(trimmed)}` +
      `&return_url=${encodeURIComponent(returnUrl)}`
    );
  }, [nickname, user]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = () => {
    const selected = familyMembers.filter((m) => selectedIds.has(m.id));
    onContinue(selected);
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-sm flex flex-col items-center gap-4 mb-6">
        {hotelLogoUrl && (
          <img src={hotelLogoUrl} alt={hotelName} className="w-16 h-16 rounded-2xl object-cover" />
        )}
        <h1 className="text-2xl font-extrabold text-foreground text-center">Travelling with family?</h1>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Add family members' IDs so{" "}
          <span className="font-semibold text-foreground">{hotelName}</span> can check everyone in together.
        </p>
      </div>

      {/* Family member list */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-4">
        {familyMembers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No verified family members yet.</p>
        )}
        {familyMembers.map((member) => {
          const docLabel = FAMILY_DOC_OPTIONS.find((o) => o.type === member.document_type)?.label ?? "Document";
          return (
            <button
              key={member.id}
              onClick={() => toggleMember(member.id)}
              className="w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors"
              style={{
                borderColor: selectedIds.has(member.id) ? "var(--iverifi-accent)" : "rgba(255,255,255,0.1)",
                background: selectedIds.has(member.id) ? "var(--iverifi-accent-soft)" : "var(--iverifi-card-bg, rgba(255,255,255,0.04))",
              }}
            >
              {/* Checkbox */}
              <div
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: selectedIds.has(member.id) ? "var(--iverifi-accent)" : "rgba(255,255,255,0.3)",
                  background: selectedIds.has(member.id) ? "var(--iverifi-accent)" : "transparent",
                }}
              >
                {selectedIds.has(member.id) && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{member.member_nickname}</p>
                <p className="text-xs text-muted-foreground">{docLabel} · Verified</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Add family member button */}
      <button
        onClick={() => { setAddDialogOpen(true); setNickname(""); setNicknameError(""); setDocType("FAMILY_AADHAAR"); }}
        className="w-full max-w-sm rounded-2xl border border-dashed py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-8"
        style={{ borderColor: "rgba(255,255,255,0.2)" }}
      >
        + Add family member
      </button>

      {/* Footer buttons */}
      <div className="w-full max-w-sm flex flex-col gap-3 mt-auto">
        <button
          onClick={handleContinue}
          disabled={selectedIds.size === 0}
          className="w-full py-4 rounded-2xl font-extrabold text-base transition-opacity"
          style={{
            background: "linear-gradient(135deg,#00e0ff,#7B5CF5)",
            color: "#0a0a0a",
            opacity: selectedIds.size === 0 ? 0.5 : 1,
          }}
        >
          Continue with {selectedIds.size > 0 ? `${selectedIds.size} family member${selectedIds.size > 1 ? "s" : ""}` : "family"}
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip — check in alone
        </button>
      </div>

      {/* Add-member dialog */}
      {addDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-t-3xl bg-[var(--iverifi-bg,#0d0d0d)] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-foreground">Add family member</h2>
              <button onClick={() => setAddDialogOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Document type picker */}
            <div className="grid grid-cols-2 gap-2">
              {FAMILY_DOC_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setDocType(opt.type)}
                  className="rounded-xl border px-3 py-2.5 text-sm font-semibold text-left transition-colors"
                  style={{
                    borderColor: docType === opt.type ? "var(--iverifi-accent)" : "rgba(255,255,255,0.1)",
                    background: docType === opt.type ? "var(--iverifi-accent-soft)" : "rgba(255,255,255,0.04)",
                    color: docType === opt.type ? "var(--iverifi-accent)" : "rgba(255,255,255,0.6)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Name / Nickname</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--iverifi-accent)]"
                placeholder="e.g. Spouse, Mom, Child 1"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setNicknameError(""); }}
                maxLength={32}
                autoFocus
              />
              {nicknameError && <p className="text-xs text-red-400 mt-1">{nicknameError}</p>}
            </div>
            <button
              onClick={handleStartVerification}
              disabled={isStarting}
              className="w-full py-4 rounded-2xl font-extrabold text-base"
              style={{ background: "linear-gradient(135deg,#00e0ff,#7B5CF5)", color: "#0a0a0a", opacity: isStarting ? 0.6 : 1 }}
            >
              {isStarting ? "Starting…" : `Start ${FAMILY_DOC_OPTIONS.find((o) => o.type === docType)?.label ?? ""} Verification`}
            </button>
            <p className="text-xs text-muted-foreground text-center">
              We'll open a secure KYC verification window.
            </p>
          </div>
        </div>
      )}

      {/* DL choice modal */}
      {dlChoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-t-3xl bg-[var(--iverifi-bg,#0d0d0d)] p-6 flex flex-col gap-4">
            <h2 className="text-lg font-extrabold text-foreground">Verify Driving License</h2>
            <p className="text-sm text-muted-foreground">
              Does <strong className="text-foreground">{nickname || "this family member"}</strong> have a DigiLocker account with their Driving License on it?
            </p>
            <button
              onClick={handleDLDigiLocker}
              className="w-full py-4 rounded-2xl font-extrabold text-base"
              style={{ background: "linear-gradient(135deg,#00e0ff,#7B5CF5)", color: "#0a0a0a" }}
            >
              Yes — Use DigiLocker
            </button>
            <button
              onClick={handleDLKwik}
              disabled={isStarting}
              className="w-full py-3 rounded-2xl text-sm font-semibold border text-foreground transition-colors hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.2)", opacity: isStarting ? 0.6 : 1 }}
            >
              {isStarting ? "Starting…" : "No — Use Camera Scan"}
            </button>
            <button onClick={() => setDlChoiceOpen(false)} className="text-xs text-muted-foreground text-center">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* KYC iframe overlay */}
      {iframeUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl mx-4 flex flex-col" style={{ height: "88vh" }}>
            <button
              className="absolute -top-9 right-0 flex items-center gap-1 text-xs text-white/70 hover:text-white"
              onClick={() => {
                setIframeUrl(null);
                setPollInterval(0);
                pendingNicknameRef.current = null;
                toast.info("Verification not completed — you can add family members later from the Family IDs screen.");
              }}
            >
              <X className="w-4 h-4" /> Close
            </button>
            <iframe
              src={iframeUrl}
              className="w-full h-full rounded-2xl border-0"
              allow="camera; microphone"
              title="Family member KYC verification"
            />
          </div>
        </div>
      )}
    </div>
  );
}
