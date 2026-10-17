import { useState } from "react";
import { format } from "date-fns";
import { Camera, Loader2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LiveCapture } from "@/components/live-capture";
import { useDeleteLivePhotoMutation, useGetCredentialsQuery, useGetLivePhotoImageQuery, useGetLivePhotoStatusQuery } from "@/redux/api";

const day = (ms: number | null | undefined) => (ms ? format(new Date(ms), "dd-MM-yyyy") : "—");

interface CredentialLike {
  verification_status?: string;
  state?: string;
}

/** Shows the person's live photo, when it was taken and until when it is valid, with Retake and Delete. */
export function LivePhotoCard() {
  const { data: creds } = useGetCredentialsQuery();
  const hasVerified = ((creds?.data?.credential ?? []) as CredentialLike[]).some((c) => c.verification_status === "auto_approved" || c.state === "auto_approved");
  const { data: status } = useGetLivePhotoStatusQuery();
  const info = status?.data;
  const has = !!info?.has_live_photo;
  const { data: image } = useGetLivePhotoImageQuery(undefined, { skip: !has });
  const [remove, { isLoading: removing }] = useDeleteLivePhotoMutation();
  const [capturing, setCapturing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const checks = ((creds?.data?.credential ?? []) as { photo_check?: string | null }[]).map((x) => x.photo_check);
  const noMatch = checks.filter((x) => x === "no_match").length;
  const needsReview = checks.filter((x) => x === "second_check").length;

  if (!info || (!hasVerified && !has)) return null;

  const onDelete = async () => {
    try {
      await remove().unwrap();
      toast.success("Your live photo was deleted.");
      setConfirmDelete(false);
    } catch {
      toast.error("Could not delete your live photo. Please try again.");
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
          {image?.data?.image ? <img src={image.data.image} alt="Your live photo" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Live photo</p>
          {has ? (
            <p className="text-xs text-muted-foreground">
              Taken {day(info.captured_at)} · {info.expired ? <span className="text-amber-500">expired {day(info.expires_at)}</span> : <>valid until {day(info.expires_at)}</>}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Needed to finish verifying your documents.</p>
          )}
          {has && noMatch > 0 && (
            <p className="mt-1 text-xs text-red-500">
              {noMatch === 1 ? "The photo on one of your documents does not look like your live photo." : `The photos on ${noMatch} of your documents do not look like your live photo.`} If it is you, retake your live photo in good light.
            </p>
          )}
          {has && noMatch === 0 && needsReview > 0 && (
            <p className="mt-1 text-xs text-amber-500">A document photo looks different from your live photo (often because it is old). A staff member may compare it in person.</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant={has && !info.expired ? "outline" : "brand"} onClick={() => setCapturing(true)}>
            <Camera className="h-3.5 w-3.5" /> {has ? "Retake" : "Add"}
          </Button>
          {has && (
            <Button size="icon" variant="ghost" aria-label="Delete live photo" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={capturing} onOpenChange={(o) => !o && setCapturing(false)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{has ? "Retake your live photo" : "Add your live photo"}</DialogTitle>
            <DialogDescription>Your new photo replaces the old one.</DialogDescription>
          </DialogHeader>
          {capturing && <LiveCapture onDone={() => setCapturing(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={(o) => !removing && setConfirmDelete(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your live photo?</DialogTitle>
            <DialogDescription>Your photo and face template are deleted. You will be asked for a new live photo next time.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={removing} onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" disabled={removing} onClick={() => void onDelete()}>
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
