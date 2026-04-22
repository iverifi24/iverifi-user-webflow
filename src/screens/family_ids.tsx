import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetCredentialsQuery,
  useGetFamilyCredentialsQuery,
  useDeleteFamilyCredentialMutation,
  useCreateCredentialMutation,
} from "@/redux/api";
import { useAuth } from "@/context/auth_context";
import { LoadingScreen } from "@/components/loading-screen";
import { VerifierBadge } from "@/components/verifier-badge";
import { UserPlus, Trash2, Loader2, Eye, Users, X } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/firebase/firebase_setup";

const IVERIFI_ORIGIN = "https://iverifi.test.getkwikid.com";

const cardClass =
  "rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]";

// const formatDocType = (type: string): string =>
//   type
//     .toLowerCase()
//     .replace(/_/g, " ")
//     .replace(/\b\w/g, (c) => c.toUpperCase());

const getPreviewImageUrl = (credential: any): string | null => {
  if (credential?.face_url) return credential.face_url;
  const images = credential?.images;
  if (!Array.isArray(images)) return null;
  for (const item of images) {
    if (!item) continue;
    if (typeof item === "string") return item;
    if (item.ps_face_url) return item.ps_face_url;
    if (item.url_org) return item.url_org;
    if (item.url_original) return item.url_original;
  }
  return null;
};

const FamilyIds = () => {
  // const { user } = useAuth();

  const { data: credData, isLoading: isLoadingCreds } = useGetCredentialsQuery();
  const {
    data: familyData,
    isLoading: isLoadingFamily,
    refetch: refetchFamily,
  } = useGetFamilyCredentialsQuery();
  const [deleteFamilyCredential, { isLoading: isDeleting }] = useDeleteFamilyCredentialMutation();
  const [createCredential] = useCreateCredentialMutation();

  // Add family member dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  // Kwik iframe
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nickname: string } | null>(null);

  // Preview
  const [previewTarget, setPreviewTarget] = useState<{ nickname: string; imageUrl: string } | null>(null);

  // postMessage listener — same pattern as Connections.tsx
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (typeof event.origin !== "string" || !event.origin.startsWith(IVERIFI_ORIGIN)) return;
      const data = event.data;
      if (data && typeof data === "object" && data.type === "iverifi" && data.status === "completed") {
        toast.success("Family member Aadhaar verified successfully.");
        setIframeUrl(null);
        await refetchFamily();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refetchFamily]);

  const myAadhaar = (credData?.data?.credential || []).find(
    (doc: any) => doc.document_type === "AADHAAR_CARD"
  );

  const familyMembers: Array<{
    id: string;
    nickname: string;
    member_nickname: string;
    document_type: string;
    state: string;
    face_url?: string;
    images?: any[];
    session_data_array?: any;
    aadhaar_xml_data?: any;
  }> = familyData?.data?.family_members || [];

  const handleAddOpen = () => {
    setNickname("");
    setNicknameError("");
    setAddDialogOpen(true);
  };

  const handleStartVerification = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNicknameError("Please enter a nickname.");
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("You must be logged in.");
      return;
    }

    setIsStarting(true);
    try {
      const res = await createCredential({
        document_type: "FAMILY_AADHAAR",
        verifiers_name: "Kwik",
        // @ts-ignore — backend accepts these extra fields
        is_family_member: true,
        member_nickname: trimmed,
      }).unwrap();

      const sessionId = res?.data?.document_id;
      if (!sessionId) throw new Error("No session ID returned from server.");

      setAddDialogOpen(false);
      setNickname("");

      const origin = window.location.origin;
      const url =
        `${IVERIFI_ORIGIN}/user/home?client_id=iverifi&api_key=iverifi&process=U` +
        `&productCode=KYC` +
        `&user_id=${encodeURIComponent(currentUser.uid)}` +
        `&session_id=${encodeURIComponent(sessionId)}` +
        `&redirect_origin=${encodeURIComponent(origin)}`;

      setIframeUrl(url);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "Failed to start verification.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFamilyCredential({ member_id: deleteTarget.id }).unwrap();
      toast.success(`${deleteTarget.nickname} removed.`);
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "Failed to remove family member.");
    }
  };

  const isLoading = isLoadingCreds || isLoadingFamily;

  return (
    <>
      <div className="min-h-0 flex-1 w-full max-w-2xl mx-auto space-y-8 text-[var(--iverifi-text-primary)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
              Family
            </div>
            <h2 className="mt-1 text-lg font-bold text-[var(--iverifi-text-primary)]">Family IDs</h2>
            <p className="text-sm text-[var(--iverifi-text-muted)] mt-0.5">
              Your Aadhaar and verified Aadhaar of your family members.
            </p>
          </div>
          <Button
            className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium shrink-0"
            onClick={handleAddOpen}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Family Member
          </Button>
        </div>

        {isLoading ? (
          <LoadingScreen variant="cards" cardCount={3} />
        ) : (
          <>
            {/* Your Aadhaar */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--iverifi-text-muted)] uppercase tracking-wider">
                Your Aadhaar
              </h3>
              {myAadhaar ? (
                <div className={`${cardClass} p-4`}>
                  <div className="flex items-center justify-between gap-2 min-w-0 mb-3">
                    <span className="text-base font-semibold text-[var(--iverifi-text-primary)]">
                      Aadhaar Card
                    </span>
                    <VerifierBadge documentType="AADHAAR_CARD" className="shrink-0" />
                  </div>
                  {getPreviewImageUrl(myAadhaar) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-primary)] hover:bg-[var(--iverifi-card-hover)] font-medium justify-start"
                      onClick={() =>
                        setPreviewTarget({
                          nickname: "Your Aadhaar",
                          imageUrl: getPreviewImageUrl(myAadhaar)!,
                        })
                      }
                    >
                      <Eye className="h-4 w-4 mr-2 shrink-0" />
                      Click to preview
                    </Button>
                  )}
                </div>
              ) : (
                <div className={`${cardClass} p-6 text-center`}>
                  <p className="text-sm text-[var(--iverifi-text-muted)]">
                    Your Aadhaar is not verified yet. Verify it from the Vault.
                  </p>
                </div>
              )}
            </section>

            {/* Family Members */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--iverifi-text-muted)] uppercase tracking-wider">
                Family Members
              </h3>

              {familyMembers.length === 0 ? (
                <div className={`${cardClass} p-8 text-center`}>
                  <Users className="h-8 w-8 mx-auto mb-3 text-[var(--iverifi-text-muted)] opacity-50" />
                  <p className="text-sm text-[var(--iverifi-text-muted)]">
                    No family members added yet.
                  </p>
                  <Button
                    className="mt-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white"
                    onClick={handleAddOpen}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Family Member
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {familyMembers.map((member) => {
                    const imgUrl = getPreviewImageUrl(member);
                    const displayName = member.member_nickname || member.nickname || "Family member";
                    const isPending = member.state !== "auto_approved";
                    return (
                      <div
                        key={member.id}
                        className={`${cardClass} p-4 transition-all duration-200 hover:bg-[var(--iverifi-card-hover)]`}
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0 mb-1">
                          <span className="text-base font-semibold text-[var(--iverifi-text-primary)] truncate">
                            {displayName}
                          </span>
                          {isPending ? (
                            <span className="text-xs text-amber-500 font-medium shrink-0">Pending</span>
                          ) : (
                            <VerifierBadge documentType="AADHAAR_CARD" className="shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--iverifi-text-muted)] mb-3">Aadhaar Card</p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 rounded-xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-primary)] hover:bg-[var(--iverifi-card-hover)] font-medium justify-start"
                            disabled={!imgUrl || isPending}
                            onClick={() =>
                              imgUrl &&
                              setPreviewTarget({ nickname: displayName, imageUrl: imgUrl })
                            }
                          >
                            <Eye className="h-4 w-4 mr-2 shrink-0" />
                            {isPending ? "Verification pending" : imgUrl ? "Click to preview" : "No preview"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-xl border border-[color:var(--iverifi-card-border)] text-[var(--iverifi-text-muted)] hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10"
                            onClick={() => setDeleteTarget({ id: member.id, nickname: displayName })}
                            aria-label="Remove family member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* Add Family Member dialog */}
        <Dialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (!open) setNicknameError("");
          }}
        >
          <DialogContent
            className="rounded-2xl"
            style={{ background: "var(--iverifi-dialog-bg)", borderColor: "var(--iverifi-dialog-border)" }}
          >
            <DialogHeader>
              <DialogTitle className="text-[var(--iverifi-text-primary)]">
                Add Family Member
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-[var(--iverifi-text-muted)]">
              Enter a nickname, then the family member completes Aadhaar verification on this device.
            </p>
            <div className="space-y-2 py-1">
              <Label htmlFor="member-nickname" className="text-[var(--iverifi-text-primary)]">
                Nickname
              </Label>
              <Input
                id="member-nickname"
                placeholder="e.g. Mom, Dad, Brother"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setNicknameError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleStartVerification()}
                className="rounded-xl"
                autoComplete="off"
              />
              {nicknameError && <p className="text-xs text-red-500">{nicknameError}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setAddDialogOpen(false)}
                disabled={isStarting}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white"
                onClick={handleStartVerification}
                disabled={isStarting}
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {isStarting ? "Starting…" : "Start Verification"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove confirmation dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent
            className="rounded-2xl"
            style={{ background: "var(--iverifi-dialog-bg)", borderColor: "var(--iverifi-dialog-border)" }}
          >
            <DialogTitle className="text-[var(--iverifi-text-primary)]">Remove family member</DialogTitle>
            <p className="text-sm text-[var(--iverifi-text-muted)]">
              Remove{" "}
              <strong className="text-[var(--iverifi-text-primary)]">{deleteTarget?.nickname}</strong>?
              Their verified Aadhaar data will be deleted from your account.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image preview dialog */}
        <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
          <DialogContent
            className="max-w-3xl rounded-2xl"
            style={{ background: "var(--iverifi-dialog-bg)", borderColor: "var(--iverifi-dialog-border)" }}
          >
            <DialogHeader>
              <DialogTitle className="text-[var(--iverifi-text-primary)]">
                {previewTarget?.nickname}
              </DialogTitle>
            </DialogHeader>
            {previewTarget?.imageUrl && (
              <img
                src={previewTarget.imageUrl}
                alt={`${previewTarget.nickname} Aadhaar preview`}
                className="w-full rounded-xl border border-[color:var(--iverifi-card-border)]"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Kwik KYC iframe overlay — matches Connections.tsx style exactly */}
      {iframeUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2" style={{ zIndex: 2147483647 }}>
          <div className="relative bg-white w-full max-w-3xl h-[88vh] rounded-lg shadow-lg overflow-hidden">
            <button
              aria-label="Close"
              className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:border-teal-300/40 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              onClick={() => setIframeUrl(null)}
            >
              <X className="h-4 w-4" />
              Close
            </button>
            <iframe
              src={iframeUrl}
              title="Aadhaar Verification"
              className="w-full h-full"
              allow="camera; microphone; clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default FamilyIds;
