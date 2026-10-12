import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/auth_context";
import {
  useGetFamilyCredentialsQuery,
  useCreateCredentialMutation,
} from "@/redux/api";
import { toast } from "sonner";
import { startDigilockerFlow } from "@/utils/digilockerStart";
import { X, Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IverifiLogo } from "@/components/iverifi-logo";
import { HotelBadge } from "@/components/hotel-badge";
import { StepPill } from "./checkin-steps";

const IVERIFI_ORIGIN = import.meta.env.VITE_KWIK_ORIGIN || "https://iverifi.app.getkwikid.com";
const KWIK_CLIENT_ID = import.meta.env.VITE_KWIK_CLIENT_ID || "iverifi";
const POLL_INTERVAL_MS = 2000;

const FAMILY_DOC_OPTIONS = [
  { type: "FAMILY_AADHAAR",  label: "Aadhaar",        productCode: "KYC" },
  { type: "FAMILY_PASSPORT", label: "Passport",        productCode: "PP"  },
  { type: "FAMILY_DL",       label: "Driving Licence", productCode: "DL"  },
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
        `${IVERIFI_ORIGIN}/user/home?client_id=${KWIK_CLIENT_ID}&api_key=${KWIK_CLIENT_ID}&process=U` +
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
  const handleDLDigiLocker = useCallback(async () => {
    const trimmed = nickname.trim();
    sessionStorage.setItem("pendingFamilyDLNickname", trimmed);
    setDlChoiceOpen(false);
    setNickname("");
    try {
      await startDigilockerFlow({
        docType: "DL",
        isFamilyMember: true,
        memberNickname: trimmed,
        returnUrl: `${window.location.origin}/checkin`,
      });
    } catch (e: any) {
      toast.error(e?.message || "Could not start DigiLocker verification");
    }
  }, [nickname]);

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
      <div className="w-full max-w-sm flex flex-col items-center gap-4 mb-6 pt-8">
        <IverifiLogo />
        <HotelBadge name={hotelName} logoUrl={hotelLogoUrl} />
        <div className="text-center">
          <StepPill />
          <h1 className="text-2xl font-bold text-foreground">Visiting with companions?</h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Add the people with you so{" "}
            <span className="font-semibold text-foreground">{hotelName}</span> can verify everyone together.
            You can skip this if you are on your own.
          </p>
        </div>
      </div>

      {/* Family member list */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-4">
        {familyMembers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No verified companions yet.</p>
        )}
        {familyMembers.map((member) => {
          const docLabel = FAMILY_DOC_OPTIONS.find((o) => o.type === member.document_type)?.label ?? "Document";
          const isSelected = selectedIds.has(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggleMember(member.id)}
              aria-pressed={isSelected}
              className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-[var(--iverifi-accent)] bg-[var(--iverifi-accent-soft)]"
                  : "border-border bg-card/60 hover:border-foreground/30"
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                  isSelected
                    ? "border-[var(--iverifi-accent)] bg-[var(--iverifi-accent)] text-slate-950"
                    : "border-muted-foreground/40"
                }`}
              >
                {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
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
        type="button"
        onClick={() => { setAddDialogOpen(true); setNickname(""); setNicknameError(""); setDocType("FAMILY_AADHAAR"); }}
        className="w-full max-w-sm inline-flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors mb-8"
      >
        <UserPlus className="w-4 h-4" /> Add a companion
      </button>

      {/* Footer buttons */}
      <div className="w-full max-w-sm flex flex-col gap-3 mt-auto">
        <Button
          variant="brand"
          onClick={handleContinue}
          disabled={selectedIds.size === 0}
          className="w-full h-12 rounded-2xl text-base font-bold"
        >
          Continue with {selectedIds.size > 0 ? `${selectedIds.size} companion${selectedIds.size > 1 ? "s" : ""}` : "selected"}
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          className="w-full h-11 rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Skip, I'm on my own
        </Button>
      </div>

      {/* Add-member dialog */}
      {addDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-t-3xl border border-border bg-background p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Add a companion</h2>
              <button type="button" aria-label="Close" onClick={() => setAddDialogOpen(false)}>
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
                  aria-pressed={docType === opt.type}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold text-left transition-colors ${
                    docType === opt.type
                      ? "border-[var(--iverifi-accent)] bg-[var(--iverifi-accent-soft)] text-[var(--iverifi-accent)]"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="companion-name" className="text-xs text-muted-foreground font-medium">Name / Nickname</label>
              <input
                id="companion-name"
                className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--iverifi-accent)]"
                placeholder="e.g. Spouse, Parent, Colleague"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setNicknameError(""); }}
                maxLength={32}
                autoFocus
              />
              {nicknameError && <p className="text-xs text-red-500 mt-1">{nicknameError}</p>}
            </div>
            <Button
              variant="brand"
              onClick={handleStartVerification}
              disabled={isStarting}
              className="w-full h-12 rounded-2xl text-base font-bold"
            >
              {isStarting ? "Starting…" : `Start ${FAMILY_DOC_OPTIONS.find((o) => o.type === docType)?.label ?? ""} Verification`}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We'll open a secure verification window.
            </p>
          </div>
        </div>
      )}

      {/* DL choice modal */}
      {dlChoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-t-3xl border border-border bg-background p-6 flex flex-col gap-4 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground">Verify Driving Licence</h2>
            <p className="text-sm text-muted-foreground">
              Does <strong className="text-foreground">{nickname || "this companion"}</strong> have a DigiLocker account with their Driving Licence on it?
            </p>
            <Button
              variant="brand"
              onClick={handleDLDigiLocker}
              className="w-full h-12 rounded-2xl text-base font-bold"
            >
              Yes, use DigiLocker
            </Button>
            <Button
              variant="outline"
              onClick={handleDLKwik}
              disabled={isStarting}
              className="w-full h-11 rounded-2xl text-sm font-semibold"
            >
              {isStarting ? "Starting…" : "No, use camera scan"}
            </Button>
            <button type="button" onClick={() => setDlChoiceOpen(false)} className="text-xs text-muted-foreground text-center">
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
              type="button"
              className="absolute -top-9 right-0 flex items-center gap-1 text-xs text-white/70 hover:text-white"
              onClick={() => {
                setIframeUrl(null);
                setPollInterval(0);
                pendingNicknameRef.current = null;
                toast.info("Verification not completed. You can add companions later from the Family IDs screen.");
              }}
            >
              <X className="w-4 h-4" /> Close
            </button>
            <iframe
              src={iframeUrl}
              className="w-full h-full rounded-2xl border-0"
              allow="camera; microphone"
              title="Companion ID verification"
            />
          </div>
        </div>
      )}
    </div>
  );
}
