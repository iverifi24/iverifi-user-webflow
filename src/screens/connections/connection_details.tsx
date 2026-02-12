import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { isAfter, parseISO, format, addDays } from "date-fns";
import { Eye, Trash2, Loader2, CalendarCheck, CalendarX } from "lucide-react";
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
  const [extendDialog, setExtendDialog] = useState<{
    open: boolean;
    cred: any | null;
  }>({
    open: false,
    cred: null,
  });
  const [selectedDays, setSelectedDays] = useState<string>("");

  const [addDocsDialogOpen, setAddDocsDialogOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [sharePeriod, setSharePeriod] = useState<string>("");

  const connection = connectionData?.data?.requests?.[0];
  const verifiedDocs = credsData?.data?.credential || [];

  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

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
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to share documents");
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {connection?.recipients?.name || "Connection Details"}
        </h2>
        {connection?.id && (
          <Dialog open={addDocsDialogOpen} onOpenChange={setAddDocsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Documents</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Select Documents to Share</DialogTitle>
              </DialogHeader>

              {isCredsLoading ? (
                <p>Loading your verified documents...</p>
              ) : verifiedDocs.length === 0 ? (
                <p className="text-muted-foreground">
                  No verified documents found
                </p>
              ) : (
                <div className="space-y-4">
                  {verifiedDocs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedDocs.includes(doc.id)}
                          onCheckedChange={() => toggleDoc(doc.id)}
                        />
                        <Label className="truncate">{formatDocType(doc.document_type)}</Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: doc.id, document_type: doc.document_type })}
                        aria-label="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <Label>Share Period</Label>
                <Select onValueChange={setSharePeriod} value={sharePeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setAddDocsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleShareDocs} disabled={isUpdating}>
                  Share
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Separator />

      {/* Documents shared with this connection */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array(3)
            .fill(0)
            .map((_, idx) => (
              <Card key={idx} className="p-4">
                <Skeleton className="h-6 w-1/2 mb-3" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </Card>
            ))}
        </div>
      ) : isError ? (
        <p className="text-red-500">Failed to load connection details.</p>
      ) : !connection ? (
        <p className="text-muted-foreground text-sm border p-4 rounded-md bg-muted/50">
          Connection not found.
        </p>
      ) : !connection.credentials || connection.credentials.length === 0 ? (
        <p className="text-muted-foreground text-sm border p-4 rounded-md bg-muted/50">
          No documents shared with this connection.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {connection.credentials.map((cred: any) => {
            const expiry = cred?.expiry_date;
            const isActive = expiry && isAfter(parseISO(expiry), new Date());
            const imageUrl = cred.details?.images?.[0]?.url_original;

            return (
              <Card
                key={cred.details?.id}
                className="hover:shadow-md transition"
              >
                <CardHeader className="flex justify-between items-start">
                  <CardTitle className="capitalize">
                    {cred.details?.document_type?.replace(/_/g, " ") ||
                      "Document"}
                  </CardTitle>
                  {imageUrl && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setSelectedImage(imageUrl)}
                    >
                      <Eye className="h-5 w-5" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Expiry Date:</span>
                    <span>
                      {expiry
                        ? format(parseISO(expiry), "MMM dd, yyyy")
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span
                      className={
                        isActive
                          ? "text-green-600 font-medium"
                          : "text-red-500 font-medium"
                      }
                    >
                      {isActive ? "Active" : "Expired"}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => setExtendDialog({ open: true, cred })}
                    >
                      Extend
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isUpdating}
                      onClick={() => handleRevoke(cred)}
                    >
                      Revoke
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Separator />

      {/* Activity with this connection */}
      {connection && (() => {
        const activities = connectionData?.data?.activities ?? [];
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Activity with this connection</CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                {activities.length} stay{activities.length !== 1 ? "s" : ""} at this property
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stays or check-ins yet.</p>
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
                      ? "text-slate-600"
                      : status === "Checked in"
                        ? "text-teal-600"
                        : "text-slate-600";
                  return (
                    <div
                      key={act.id || index}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarCheck className="h-4 w-4 shrink-0" />
                          <span>
                            Check-in:{" "}
                            {checkInTs ? format(new Date(checkInTs), "MMM d, yyyy · h:mm a") : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarX className="h-4 w-4 shrink-0" />
                          <span>
                            Check-out:{" "}
                            {checkOutTs ? format(new Date(checkOutTs), "MMM d, yyyy · h:mm a") : "—"}
                          </span>
                        </div>
                        {(act.room_number || act.booking_ref || act.document) && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground sm:col-span-2">
                            {act.room_number && <span>Room: {act.room_number}</span>}
                            {act.booking_ref && <span>Ref: {act.booking_ref}</span>}
                            {act.document && <span>Doc: {formatDocType(act.document)}</span>}
                          </div>
                        )}
                      </div>
                      <div className="pt-1.5">
                        <span className="text-muted-foreground">Status: </span>
                        <span className={`font-medium ${statusCls}`}>{status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this verified document
            {deleteTarget?.document_type ? ` (${formatDocType(deleteTarget.document_type)})` : ""}?
            You can add it again later.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDoc} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
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
    </div>
  );
};

export default ConnectionDetails;
