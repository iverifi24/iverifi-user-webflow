import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LiveCapture } from "@/components/live-capture";
import { useGetCredentialsQuery, useGetLivePhotoStatusQuery } from "@/redux/api";

interface CredentialLike {
  verification_status?: string;
  state?: string;
}

/**
 * The live photo is a required step once any document has been verified, whichever way it was verified (DigiLocker, Kwik...).
 * This sits on the pages where documents are verified and opens by itself while a verified document exists and the person has no
 * valid live photo. It cannot be closed or skipped. The one exception is a camera that cannot be used (blocked, missing): then
 * "Do this later" closes it until the page is opened again, so nobody is trapped. Nothing is enforced on the server yet.
 */
export function LivePhotoGate() {
  const { data: creds } = useGetCredentialsQuery();
  const hasVerified = ((creds?.data?.credential ?? []) as CredentialLike[]).some((c) => c.verification_status === "auto_approved" || c.state === "auto_approved");
  const { data: status } = useGetLivePhotoStatusQuery(undefined, { skip: !hasVerified });
  const [later, setLater] = useState(false);

  const open = hasVerified && !!status?.data?.required && !later;

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-h-[92vh] overflow-y-auto sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Add your live photo</DialogTitle>
          <DialogDescription>One last step to finish verifying your documents.</DialogDescription>
        </DialogHeader>
        {/* saving the photo refreshes the status, which closes this dialog by itself */}
        <LiveCapture onDone={() => undefined} onLater={() => setLater(true)} />
      </DialogContent>
    </Dialog>
  );
}
