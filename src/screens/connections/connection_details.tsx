import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/loading-screen";
import { isAfter, parseISO, format, addDays } from "date-fns";
import { Eye, Trash2, Loader2, CalendarCheck, CalendarX, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import {
  useGetRecipientCredentialsQuery,
  useUpdateCredentialsRequestMutation,
  useGetCredentialsQuery,
  useDeleteCredentialMutation,
} from "@/redux/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const shell =
  "min-h-0 w-full max-w-5xl mx-auto space-y-5 text-[var(--iverifi-text-primary)]";
const panel =
  "rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]";
const dlgSurface =
  "border border-[color:var(--iverifi-dialog-border)] bg-[var(--iverifi-dialog-bg)] text-[var(--iverifi-text-primary)] [&_[data-slot=dialog-close]]:text-[var(--iverifi-text-muted)] [&_[data-slot=dialog-close]]:hover:bg-white/10";
const shareBtnClass =
  "h-10 shrink-0 rounded-xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] px-4 font-semibold text-white hover:opacity-95";
const selectTriggerThemed =
  "w-full border-[color:var(--iverifi-dialog-border)] !bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-primary)]";

const ConnectionDetails = () => {
  const { id } = useParams();
  const {
    data: connectionData,
    isLoading,
    isError,
    refetch: refetchConnection,
  } = useGetRecipientCredentialsQuery(id || "", { skip: !id });

  const [updateCredentials, { isLoading: isUpdating }] =
    useUpdateCredentialsRequestMutation();

  const { data: credsData, isLoading: isCredsLoading } =
    useGetCredentialsQuery();
  const [deleteCredential, { isLoading: isDeleting }] = useDeleteCredentialMutation();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; document_type?: string } | null>(null);
  const [activityOpen, setActivityOpen] = useState(true);
  /* Extend option commented for now
  const [extendDialog, setExtendDialog] = useState<{
    open: boolean;
    cred: any | null;
  }>({
    open: false,
    cred: null,
  });
  const [selectedDays, setSelectedDays] = useState<string>("");
  */

  const [addDocsDialogOpen, setAddDocsDialogOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [sharePeriod, setSharePeriod] = useState<string>("");

  const connection = connectionData?.data?.requests?.[0];
  const externalIntegration = connection?.recipients?.externalIntegration === true;
  const verifiedDocs = credsData?.data?.credential || [];

  // IDs of credentials already shared with this connection and still active (not expired)
  const activeSharedCredentialIds = new Set(
    (connection?.credentials || [])
      .filter((cred: any) => {
        const expiry = cred?.expiry_date;
        return expiry && isAfter(parseISO(expiry), new Date());
      })
      .map((cred: any) => cred.credential_id)
  );

  // Documents that can be selected to share (exclude already shared + active)
  const docsAvailableToShare = verifiedDocs.filter(
    (doc: any) => !activeSharedCredentialIds.has(doc.id)
  );

  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  /* Extend option commented for now
  const handleExtendConfirm = async () => {
    if (!selectedDays || !extendDialog.cred) {
      toast.error("Please select duration");
      return;
    }
    try {
      const newExpiry = addDays(new Date(), parseInt(selectedDays));
      await updateCredentials({
        credential_request_id: connection.id,
        credentials: [
          {
            credential_id: extendDialog.cred.credential_id,
            document_type: extendDialog.cred.details?.document_type,
            status: "Active",
            expiry_date: format(newExpiry, "yyyy-MM-dd"),
          },
        ],
        action: "extend",
      }).unwrap();
      toast.success("Access extended successfully");
      setExtendDialog({ open: false, cred: null });
      setSelectedDays("");
      await refetchConnection();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to extend access");
    }
  };
  */

  const handleRevoke = async (cred: any) => {
    try {
      await updateCredentials({
        credential_request_id: connection.id,
        credentials: [
          {
            credential_id: cred.credential_id,
            document_type: cred.details?.document_type,
            status: "Revoked",
            expiry_date: format(new Date(), "yyyy-MM-dd"),
          },
        ],
      }).unwrap();
      toast.success("Access revoked successfully");
      await refetchConnection();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to revoke access");
    }
  };

  const handleDeleteDoc = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCredential({ credential_id: deleteTarget.id }).unwrap();
      toast.success("Document deleted successfully");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "Failed to delete document");
    }
  };

  const formatDocType = (type: string) =>
    type ? type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "Document";

  const handleShareDocs = async () => {
    if (!selectedDocs.length || !sharePeriod) {
      toast.error("Select at least one document and share period");
      return;
    }
    const expiry = addDays(new Date(), parseInt(sharePeriod));
    const payload = verifiedDocs
      .filter((doc: any) => selectedDocs.includes(doc.id))
      .map((doc: any) => ({
        credential_id: doc.id,
        document_type: doc.document_type,
        status: "Active",
        expiry_date: format(expiry, "yyyy-MM-dd"),
      }));

    try {
      await updateCredentials({
        credential_request_id: connection.id,
        credentials: payload,
      }).unwrap();
      toast.success("Documents shared successfully");
      setSelectedDocs([]);
      setSharePeriod("");
      setAddDocsDialogOpen(false);
      await refetchConnection();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to share documents");
    }
  };

  // External integration: header + share documents + documents shared + activity (activity shows only doc shared)
  if (externalIntegration) {
    const activities = connectionData?.data?.activities ?? [];
    return (
      <div className={shell}>
        {/* Header + Share Documents */}
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--iverifi-text-muted)]">
              Recipient
            </p>
            <h2 className="text-xl font-bold text-[var(--iverifi-text-primary)] truncate">
              {connection?.recipients?.name ||
                connection?.recipients?.firstName ||
                connection?.recipients?.hotel_name ||
                connection?.recipients?.businessName ||
                "Connection Details"}
            </h2>
          </div>
          {connection?.id && (
            <Dialog open={addDocsDialogOpen} onOpenChange={setAddDocsDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" className={shareBtnClass}>
                  Share Documents
                </Button>
              </DialogTrigger>
              <DialogContent className={cn("max-w-md", dlgSurface)}>
                <DialogHeader>
                  <DialogTitle className="text-[var(--iverifi-text-primary)]">
                    Select documents to share
                  </DialogTitle>
                </DialogHeader>

                {isCredsLoading ? (
                  <p className="text-sm text-[var(--iverifi-text-muted)]">Loading your verified documents…</p>
                ) : docsAvailableToShare.length === 0 ? (
                  <p className="text-sm text-[var(--iverifi-text-muted)]">
                    {verifiedDocs.length === 0
                      ? "No verified documents found"
                      : "All your verified documents are already shared with this connection."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {docsAvailableToShare.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedDocs.includes(doc.id)}
                            onCheckedChange={() => toggleDoc(doc.id)}
                          />
                          <Label className="truncate text-[var(--iverifi-text-secondary)]">
                            {formatDocType(doc.document_type)}
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-[var(--iverifi-text-muted)] hover:bg-red-500/15 hover:text-red-300"
                          onClick={() => setDeleteTarget({ id: doc.id, document_type: doc.document_type })}
                          aria-label="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <Label className="text-[var(--iverifi-text-secondary)]">Share period</Label>
                  <Select onValueChange={setSharePeriod} value={sharePeriod}>
                    <SelectTrigger className={selectTriggerThemed}>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent className="border border-[color:var(--iverifi-dialog-border)] bg-[var(--iverifi-select-content)] text-[var(--iverifi-text-primary)]">
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/15 bg-transparent text-[var(--iverifi-text-secondary)] hover:bg-white/10"
                    onClick={() => setAddDocsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className={shareBtnClass}
                    onClick={handleShareDocs}
                    disabled={isUpdating}
                  >
                    Share
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Separator className="bg-[color:var(--iverifi-row-divider)]" />

        {isLoading ? (
          <LoadingScreen variant="cards" cardCount={3} gridCols="2" />
        ) : isError ? (
          <p className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Failed to load connection details.
          </p>
        ) : !connection ? (
          <p className={`${panel} p-4 text-sm text-[var(--iverifi-text-muted)]`}>Connection not found.</p>
        ) : !connection.credentials || connection.credentials.length === 0 ? (
          <p className={`${panel} p-4 text-sm text-[var(--iverifi-text-muted)]`}>
            No documents shared with this connection.
          </p>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--iverifi-text-primary)]">
              Documents you&apos;ve shared with{" "}
              {connection?.recipients?.name ||
                connection?.recipients?.firstName ||
                connection?.recipients?.hotel_name ||
                connection?.recipients?.businessName ||
                "this connection"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {connection.credentials.map((cred: any) => {
                const expiry = cred?.expiry_date;
                const isActive = expiry && isAfter(parseISO(expiry), new Date());
                const imageUrl = cred.details?.images?.[0]?.url_original;
                const isDeleted = !cred.details;

                return (
                  <div
                    key={cred.details?.id ?? cred.credential_id ?? cred.document_type}
                    className={`${panel} overflow-hidden transition-colors hover:bg-[var(--iverifi-card-hover)]`}
                  >
                    <div className="flex justify-between items-start gap-2 border-b border-[color:var(--iverifi-row-divider)] px-4 py-3">
                      <h4 className="text-base font-semibold capitalize text-[var(--iverifi-text-primary)]">
                        {isDeleted
                          ? "Document deleted"
                          : cred.details?.document_type?.replace(/_/g, " ") ||
                            "Document"}
                      </h4>
                      {!isDeleted && imageUrl && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-[var(--iverifi-text-muted)] hover:bg-white/10 hover:text-[var(--iverifi-text-primary)]"
                          onClick={() => setSelectedImage(imageUrl)}
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 px-4 py-3 text-sm text-[var(--iverifi-text-muted)]">
                      <div className="flex justify-between gap-2">
                        <span>Expiry date</span>
                        <span className="text-right text-[var(--iverifi-text-secondary)]">
                          {expiry
                            ? format(parseISO(expiry), "MMM dd, yyyy")
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Status</span>
                        <span
                          className={
                            isDeleted
                              ? "font-medium text-amber-300"
                              : isActive
                                ? "font-medium text-[#5eead4]"
                                : "font-medium text-red-400"
                          }
                        >
                          {isDeleted ? "Document deleted" : isActive ? "Active" : "Expired"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity: only document shared per activity (external integration) */}
        {connection && (
          <div className={panel}>
            <div
              className="cursor-pointer select-none border-b border-[color:var(--iverifi-row-divider)] px-4 py-3"
              onClick={() => setActivityOpen((o) => !o)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {activityOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[var(--iverifi-label)]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--iverifi-label)]" />
                  )}
                  <span className="text-base font-semibold text-[var(--iverifi-text-primary)]">
                    Activity with this connection
                  </span>
                </div>
                <p className="text-sm font-normal text-[var(--iverifi-label)]">
                  {activities.length} stay{activities.length !== 1 ? "s" : ""} at this property
                </p>
              </div>
            </div>
            {activityOpen && (
              <div className="space-y-3 px-4 py-4">
                {activities.length === 0 ? (
                  <p className="text-sm text-[var(--iverifi-label)]">No stays or check-ins yet.</p>
                ) : (
                  activities.map((act: any, index: number) => {
                    const checkInTs = act.check_in_time
                      ? typeof act.check_in_time === "number"
                        ? act.check_in_time
                        : new Date(act.check_in_time).getTime()
                      : null;
                    return (
                      <div
                        key={act.id || index}
                        className="space-y-1 rounded-xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-muted-surface)] p-3 text-sm"
                      >
                        {checkInTs != null && (
                          <div className="flex items-center gap-2 text-[var(--iverifi-text-muted)]">
                            <CalendarCheck className="h-4 w-4 shrink-0 text-[#00c896]" />
                            <span>
                              Check-in: {format(new Date(checkInTs), "MMM d, yyyy · h:mm a")}
                            </span>
                          </div>
                        )}
                        {act.document ? (
                          <span className="text-[var(--iverifi-text-muted)]">
                            Document shared:{" "}
                            <span className="font-medium text-[var(--iverifi-text-secondary)]">
                              {formatDocType(act.document)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--iverifi-label)]">Document shared: —</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className={cn("max-w-3xl", dlgSurface)}>
            <DialogHeader>
              <DialogTitle className="text-[var(--iverifi-text-primary)]">Document preview</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <img src={selectedImage} alt="Document" className="w-full rounded-md" />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete document confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className={cn("max-w-md", dlgSurface)}>
            <DialogHeader>
              <DialogTitle className="text-[var(--iverifi-text-primary)]">Delete document</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-[var(--iverifi-text-muted)]">
              Are you sure you want to delete this verified document
              {deleteTarget?.document_type ? ` (${formatDocType(deleteTarget.document_type)})` : ""}?
              You can add it again later.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-transparent text-[var(--iverifi-text-secondary)] hover:bg-white/10"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDeleteDoc}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={shell}>
      {/* Header */}
      <div className="flex justify-between items-center gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--iverifi-text-muted)]">
            Recipient
          </p>
          <h2 className="text-xl font-bold text-[var(--iverifi-text-primary)] truncate">
            {connection?.recipients?.name ||
              connection?.recipients?.firstName ||
              connection?.recipients?.hotel_name ||
              connection?.recipients?.businessName ||
              "Connection Details"}
          </h2>
        </div>
        {connection?.id && (
          <Dialog open={addDocsDialogOpen} onOpenChange={setAddDocsDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" className={shareBtnClass}>
                Share Documents
              </Button>
            </DialogTrigger>
            <DialogContent className={cn("max-w-md", dlgSurface)}>
              <DialogHeader>
                <DialogTitle className="text-[var(--iverifi-text-primary)]">
                  Select documents to share
                </DialogTitle>
              </DialogHeader>

              {isCredsLoading ? (
                <p className="text-sm text-[var(--iverifi-text-muted)]">Loading your verified documents…</p>
              ) : docsAvailableToShare.length === 0 ? (
                <p className="text-sm text-[var(--iverifi-text-muted)]">
                  {verifiedDocs.length === 0
                    ? "No verified documents found"
                    : "All your verified documents are already shared with this connection."}
                </p>
              ) : (
                <div className="space-y-3">
                  {docsAvailableToShare.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedDocs.includes(doc.id)}
                          onCheckedChange={() => toggleDoc(doc.id)}
                        />
                        <Label className="truncate text-[var(--iverifi-text-secondary)]">
                          {formatDocType(doc.document_type)}
                        </Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-[var(--iverifi-text-muted)] hover:bg-red-500/15 hover:text-red-300"
                        onClick={() => setDeleteTarget({ id: doc.id, document_type: doc.document_type })}
                        aria-label="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-2">
                <Label className="text-[var(--iverifi-text-secondary)]">Share period</Label>
                <Select onValueChange={setSharePeriod} value={sharePeriod}>
                  <SelectTrigger className={selectTriggerThemed}>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent className="border border-[color:var(--iverifi-dialog-border)] bg-[var(--iverifi-select-content)] text-[var(--iverifi-text-primary)]">
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-transparent text-[var(--iverifi-text-secondary)] hover:bg-white/10"
                  onClick={() => setAddDocsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className={shareBtnClass}
                  onClick={handleShareDocs}
                  disabled={isUpdating}
                >
                  Share
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Separator className="bg-[color:var(--iverifi-row-divider)]" />

      {/* Documents shared with this connection */}
      {isLoading ? (
        <LoadingScreen variant="cards" cardCount={3} gridCols="2" />
      ) : isError ? (
        <p className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Failed to load connection details.
        </p>
      ) : !connection ? (
        <p className={`${panel} p-4 text-sm text-[var(--iverifi-text-muted)]`}>Connection not found.</p>
      ) : !connection.credentials || connection.credentials.length === 0 ? (
        <p className={`${panel} p-4 text-sm text-[var(--iverifi-text-muted)]`}>
          No documents shared with this connection.
        </p>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--iverifi-text-primary)]">
            Documents you&apos;ve shared with{" "}
            {connection?.recipients?.name ||
              connection?.recipients?.firstName ||
              connection?.recipients?.hotel_name ||
              connection?.recipients?.businessName ||
              "this connection"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {connection.credentials.map((cred: any) => {
            const expiry = cred?.expiry_date;
            const isActive = expiry && isAfter(parseISO(expiry), new Date());
            const imageUrl = cred.details?.images?.[0]?.url_original;
            const isDeleted = !cred.details;

            return (
              <div
                key={cred.details?.id ?? cred.credential_id ?? cred.document_type}
                className={`${panel} overflow-hidden transition-colors hover:bg-[var(--iverifi-card-hover)]`}
              >
                <div className="flex justify-between items-start gap-2 border-b border-[color:var(--iverifi-row-divider)] px-4 py-3">
                  <h4 className="text-base font-semibold capitalize text-[var(--iverifi-text-primary)]">
                    {isDeleted
                      ? "Document deleted"
                      : cred.details?.document_type?.replace(/_/g, " ") ||
                        "Document"}
                  </h4>
                  {!isDeleted && imageUrl && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-[var(--iverifi-text-muted)] hover:bg-white/10 hover:text-[var(--iverifi-text-primary)]"
                      onClick={() => setSelectedImage(imageUrl)}
                    >
                      <Eye className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2 px-4 py-3 text-sm text-[var(--iverifi-text-muted)]">
                  <div className="flex justify-between gap-2">
                    <span>Expiry date</span>
                    <span className="text-right text-[var(--iverifi-text-secondary)]">
                      {expiry
                        ? format(parseISO(expiry), "MMM dd, yyyy")
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Status</span>
                    <span
                      className={
                        isDeleted
                          ? "font-medium text-amber-300"
                          : isActive
                            ? "font-medium text-[#5eead4]"
                            : "font-medium text-red-400"
                      }
                    >
                      {isDeleted ? "Document deleted" : isActive ? "Active" : "Expired"}
                    </span>
                  </div>
                  {!isDeleted && (
                    <div className="flex justify-end gap-2 border-t border-[color:var(--iverifi-row-divider)] pt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                        disabled={isUpdating}
                        onClick={() => handleRevoke(cred)}
                      >
                        Revoke
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      <Separator className="bg-[color:var(--iverifi-row-divider)]" />

      {/* Activity with this connection */}
      {connection && (() => {
        const activities = connectionData?.data?.activities ?? [];
        return (
          <div className={panel}>
            <div
              className="cursor-pointer select-none border-b border-[color:var(--iverifi-row-divider)] px-4 py-3"
              onClick={() => setActivityOpen((o) => !o)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {activityOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[var(--iverifi-label)]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--iverifi-label)]" />
                  )}
                  <span className="text-base font-semibold text-[var(--iverifi-text-primary)]">
                    Activity with this connection
                  </span>
                </div>
                <p className="text-sm font-normal text-[var(--iverifi-label)]">
                  {activities.length} stay{activities.length !== 1 ? "s" : ""} at this property
                </p>
              </div>
            </div>
            {activityOpen && (
            <div className="space-y-3 px-4 py-4">
              {activities.length === 0 ? (
                <p className="text-sm text-[var(--iverifi-label)]">No stays or check-ins yet.</p>
              ) : (
                activities.map((act: any, index: number) => {
                  const checkInTs = act.check_in_time ? (typeof act.check_in_time === "number" ? act.check_in_time : new Date(act.check_in_time).getTime()) : null;
                  const checkOutTs = act.check_out_time ? (typeof act.check_out_time === "number" ? act.check_out_time : new Date(act.check_out_time).getTime()) : null;
                  const status = checkOutTs
                    ? "Checked out"
                    : checkInTs
                      ? "Checked in"
                      : "—";
                  const statusCls =
                    status === "Checked out"
                      ? "text-[var(--iverifi-text-muted)]"
                      : status === "Checked in"
                        ? "text-[#5eead4]"
                        : "text-[var(--iverifi-label)]";
                  return (
                    <div
                      key={act.id || index}
                      className="rounded-xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-muted-surface)] p-3 text-sm"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-[var(--iverifi-text-muted)]">
                          <CalendarCheck className="h-4 w-4 shrink-0 text-[#00c896]" />
                          <span>
                            Check-in:{" "}
                            {checkInTs ? format(new Date(checkInTs), "MMM d, yyyy · h:mm a") : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--iverifi-text-muted)]">
                          <CalendarX className="h-4 w-4 shrink-0 text-[var(--iverifi-label)]" />
                          <span>
                            Check-out:{" "}
                            {checkOutTs ? format(new Date(checkOutTs), "MMM d, yyyy · h:mm a") : "—"}
                          </span>
                        </div>
                        {(act.room_number || act.booking_ref || act.document) && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--iverifi-label)] sm:col-span-2">
                            {act.room_number && <span>Room: {act.room_number}</span>}
                            {act.booking_ref && <span>Ref: {act.booking_ref}</span>}
                            {act.document && <span>Doc: {formatDocType(act.document)}</span>}
                          </div>
                        )}
                      </div>
                      <div className="pt-1.5">
                        <span className="text-[var(--iverifi-label)]">Status: </span>
                        <span className={`font-medium ${statusCls}`}>{status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            )}
          </div>
        );
      })()}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className={cn("max-w-3xl", dlgSurface)}>
          <DialogHeader>
            <DialogTitle className="text-[var(--iverifi-text-primary)]">Document preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Document"
              className="w-full rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete document confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className={cn("max-w-md", dlgSurface)}>
          <DialogHeader>
            <DialogTitle className="text-[var(--iverifi-text-primary)]">Delete document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--iverifi-text-muted)]">
            Are you sure you want to delete this verified document
            {deleteTarget?.document_type ? ` (${formatDocType(deleteTarget.document_type)})` : ""}?
            You can add it again later.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-transparent text-[var(--iverifi-text-secondary)] hover:bg-white/10"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteDoc}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog - commented for now
      <Dialog
        open={extendDialog.open}
        onOpenChange={() => setExtendDialog({ open: false, cred: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Extension Duration</DialogTitle>
          </DialogHeader>
          <Select onValueChange={setSelectedDays} value={selectedDays}>
            <SelectTrigger>
              <SelectValue placeholder="Select days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="180">180 Days</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setExtendDialog({ open: false, cred: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleExtendConfirm} disabled={isUpdating}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      */}
    </div>
  );
};

export default ConnectionDetails;
