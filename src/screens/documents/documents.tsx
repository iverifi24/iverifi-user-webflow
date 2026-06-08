import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetCredentialsQuery, useDeleteCredentialMutation } from "@/redux/api";
import { useState } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { VerifierBadge } from "@/components/verifier-badge";

const formatDocType = (type: string): string => {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const getPreviewImageUrl = (doc: any): string | null => {
  if (!doc?.images?.length) return null;
  const first = doc.images[0];
  if (typeof first === "string") return first;
  return first?.url_org || first?.url_original || null;
};

const cardClass =
  "rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]";

const Documents = () => {
  const navigate = useNavigate();

  const { data: credData, isLoading: isLoadingCreds } = useGetCredentialsQuery();
  const [deleteCredential, { isLoading: isDeleting }] = useDeleteCredentialMutation();
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; document_type?: string } | null>(null);

  const documents = credData?.data?.credential || [];
  const previewImageUrl = previewDoc ? getPreviewImageUrl(previewDoc) : null;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCredential({ credential_id: deleteTarget.id }).unwrap();
      toast.success("Document deleted successfully");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "Failed to delete document");
    }
  };

  const openPreview = (doc: any) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  return (
    <div className="min-h-0 flex-1 w-full max-w-2xl mx-auto space-y-6 text-[var(--iverifi-text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
            Vault
          </div>
          <h2 className="mt-1 text-lg font-bold text-[var(--iverifi-text-primary)]">Documents</h2>
          <p className="text-sm text-[var(--iverifi-text-muted)] mt-0.5">
            Your verified credentials. Add or preview documents.
          </p>
        </div>
        <Button
          className="rounded-xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-primary)] hover:bg-[var(--iverifi-card-hover)] font-medium shrink-0"
          variant="outline"
          onClick={() => navigate("/add-documents")}
        >
          <FileText className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      {isLoadingCreds ? (
        <LoadingScreen variant="cards" cardCount={4} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc: any, idx: number) => {
              const hasPreview = !!getPreviewImageUrl(doc);
              return (
                <div
                  key={doc.id || idx}
                  className={`${cardClass} p-4 transition-all duration-200 hover:bg-[var(--iverifi-card-hover)]`}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0 mb-3">
                    <span className="text-base font-semibold text-[var(--iverifi-text-primary)] min-w-0 truncate">
                      {doc.document_type ? formatDocType(doc.document_type) : "Document"}
                    </span>
                    <VerifierBadge documentType={doc.document_type || "Document"} className="shrink-0" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-primary)] hover:bg-[var(--iverifi-card-hover)] font-medium justify-start"
                      onClick={() => openPreview(doc)}
                      disabled={!hasPreview}
                    >
                      <Eye className="h-4 w-4 mr-2 shrink-0" />
                      {hasPreview ? "Click to preview" : "No preview"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-xl border border-[color:var(--iverifi-card-border)] text-[var(--iverifi-text-muted)] hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10"
                      onClick={() => setDeleteTarget({ id: doc.id, document_type: doc.document_type })}
                      aria-label="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {documents.length === 0 && !isLoadingCreds && (
            <div className={`${cardClass} p-8 text-center`}>
              <p className="text-[var(--iverifi-text-muted)] text-sm">No verified documents yet.</p>
              <Button
                className="mt-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white"
                onClick={() => navigate("/")}
              >
                Verify documents on home
              </Button>
            </div>
          )}
        </>
      )}

      {/* Preview dialog */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewDoc(null);
        }}
      >
        <DialogContent
          className="max-w-3xl rounded-2xl"
          style={{ background: "var(--iverifi-dialog-bg)", borderColor: "var(--iverifi-dialog-border)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-[var(--iverifi-text-primary)]">
              {previewDoc?.document_type ? formatDocType(previewDoc.document_type) : "Document"}
            </DialogTitle>
          </DialogHeader>
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt="Document preview"
              className="w-full rounded-xl border border-[color:var(--iverifi-card-border)]"
            />
          ) : (
            <p className="text-sm text-[var(--iverifi-text-muted)] py-8 text-center">
              No preview available for this document.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent
          className="rounded-2xl"
          style={{ background: "var(--iverifi-dialog-bg)", borderColor: "var(--iverifi-dialog-border)" }}
        >
          <DialogTitle className="text-[var(--iverifi-text-primary)]">Delete document</DialogTitle>
          <p className="text-sm text-[var(--iverifi-text-muted)]">
            Are you sure you want to delete this verified document
            {deleteTarget?.document_type ? ` (${formatDocType(deleteTarget.document_type)})` : ""}?
            You can add it again later.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
