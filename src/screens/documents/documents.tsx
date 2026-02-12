import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetCredentialsQuery, useDeleteCredentialMutation } from "@/redux/api";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DigiLockerIcon } from "@/components/digilocker-icon";

const formatDocType = (type: string): string => {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Get first previewable image URL from credential (backend may use url_org or url_original) */
const getPreviewImageUrl = (doc: any): string | null => {
  if (!doc?.images?.length) return null;
  const first = doc.images[0];
  if (typeof first === "string") return first;
  return first?.url_org || first?.url_original || null;
};

const Documents = () => {
  const navigate = useNavigate();

  const { data: credData, isLoading: isLoadingCreds } =
    useGetCredentialsQuery();
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
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-slate-50/30 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Section label - align with home page */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Documents</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Your verified credentials. Add or preview documents.
            </p>
          </div>
          <Button
            className="rounded-xl border-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 font-medium shrink-0"
            variant="outline"
            onClick={() => navigate("/add-documents")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>

        {isLoadingCreds ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array(4)
              .fill(0)
              .map((_, idx) => (
                <Card key={idx} className="rounded-2xl border-2 border-slate-200">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-32 rounded" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documents.map((doc: any, idx: number) => {
                const hasPreview = !!getPreviewImageUrl(doc);
                return (
                  <Card
                    key={doc.id || idx}
                    className="rounded-2xl border-2 transition-all duration-200 hover:shadow-lg border-teal-200 bg-teal-50/30 shadow-sm hover:border-teal-300"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg font-semibold text-slate-800">
                          {doc.document_type
                            ? formatDocType(doc.document_type)
                            : "Document"}
                        </CardTitle>
                        <Badge className="bg-teal-600 text-white gap-1 border-0 shadow-sm">
                          <DigiLockerIcon size={9} className="shrink-0 opacity-90" />
                          <span>Verified</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 rounded-xl border-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 font-medium justify-start"
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
                          className="h-10 w-10 shrink-0 rounded-xl text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                          onClick={() =>
                            setDeleteTarget({ id: doc.id, document_type: doc.document_type })
                          }
                          aria-label="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {documents.length === 0 && !isLoadingCreds && (
              <Card className="rounded-2xl border-2 border-slate-200 bg-white p-8 text-center">
                <p className="text-slate-500 text-sm">No verified documents yet.</p>
                <Button
                  className="mt-4 rounded-xl bg-teal-600 hover:bg-teal-700"
                  onClick={() => navigate("/")}
                >
                  Verify documents on home
                </Button>
              </Card>
            )}
          </>
        )}

        {/* Single preview dialog - controlled so correct image shows */}
        <Dialog
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) setPreviewDoc(null);
          }}
        >
          <DialogContent className="max-w-3xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>
                {previewDoc?.document_type
                  ? formatDocType(previewDoc.document_type)
                  : "Document"}
              </DialogTitle>
            </DialogHeader>
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt="Document preview"
                className="w-full rounded-xl border border-slate-200"
              />
            ) : (
              <p className="text-sm text-slate-500 py-8 text-center">
                No preview available for this document.
              </p>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="rounded-2xl">
            <DialogTitle>Delete document</DialogTitle>
            <p className="text-sm text-slate-500">
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
    </div>
  );
};

export default Documents;
