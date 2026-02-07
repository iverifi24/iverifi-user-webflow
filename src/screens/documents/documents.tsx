import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGetCredentialsQuery, useDeleteCredentialMutation } from "@/redux/api";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const formatDocType = (type: string): string => {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
};

const Documents = () => {
  const navigate = useNavigate();

  const { data: credData, isLoading: isLoadingCreds } =
    useGetCredentialsQuery();
  const [deleteCredential, { isLoading: isDeleting }] = useDeleteCredentialMutation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; document_type?: string } | null>(null);

  const documents = credData?.data?.credential || [];

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

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Documents</h2>
      <div className="flex justify-end">
        <Button onClick={() => navigate("/add-documents")}>Add Document</Button>
      </div>

      {isLoadingCreds ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array(3)
            .fill(0)
            .map((_, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {documents.map((doc: any, idx: number) => (
            <Dialog key={doc.id || idx}>
              <Card className="hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-2 pb-2">
                  <CardTitle className="text-base">
                    {doc.document_type
                      ? formatDocType(doc.document_type)
                      : "Document"}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setDeleteTarget({ id: doc.id, document_type: doc.document_type })
                    }
                    aria-label="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="w-full text-left text-sm text-muted-foreground truncate hover:underline focus:outline-none"
                      onClick={() =>
                        setSelectedImage(doc.images?.[0]?.url_org || null)
                      }
                    >
                      Click to preview
                    </button>
                  </DialogTrigger>
                </CardContent>
              </Card>
              <DialogContent className="max-w-3xl">
                <DialogTitle>{doc.document_type ? formatDocType(doc.document_type) : "Document"}</DialogTitle>
                <img
                  src={selectedImage || ""}
                  alt="Document"
                  className="w-full rounded-md"
                />
              </DialogContent>
            </Dialog>
          ))}
        </div>

        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogTitle>Delete document</DialogTitle>
            <p className="text-sm text-muted-foreground">
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
        </>
      )}
    </div>
  );
};

export default Documents;
