import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unansweredDocuments, type QuestionCredential } from "@/lib/document-photo";
import { useConfirmDocumentPhotoMutation, useGetCredentialsQuery, useGetLivePhotoImageQuery, useGetLivePhotoStatusQuery } from "@/redux/api";

const label = (t?: string | null) => (t ? t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "document");

/**
 * "Is this you in the document photo?" - asked when the photo on a document could not be confirmed against the live photo
 * (document photos are often old). The answer is stored with its date; nothing is blocked by it.
 */
export function DocumentPhotoQuestion({ docs, liveImage }: { docs: QuestionCredential[]; liveImage?: string }) {
  const [confirm, { isLoading, originalArgs }] = useConfirmDocumentPhotoMutation();
  if (docs.length === 0) return null;

  const answer = async (id: string, isMe: boolean) => {
    try {
      await confirm({ credential_id: id, is_me: isMe }).unwrap();
      toast.success(isMe ? "Thanks, we noted that this is you." : "Thanks, we noted that this is not you.");
    } catch {
      toast.error("Could not save your answer. Please try again.");
    }
  };

  return (
    <div className="space-y-2">
      {docs.map((d) => {
        const busy = isLoading && originalArgs?.credential_id === d.id;
        return (
          <div key={d.id} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-sm font-semibold text-foreground">Is this you in the {label(d.document_type)} photo?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">We could not tell for sure, often because the photo on a document is old. Your answer is saved with today's date.</p>
            <div className="mt-2 flex items-center gap-3">
              <figure className="text-center">
                <img src={d.face_url ?? ""} alt="Photo on the document" className="h-20 w-20 rounded-xl border border-border object-cover" />
                <figcaption className="mt-1 text-[10px] text-muted-foreground">On the document</figcaption>
              </figure>
              {liveImage && (
                <figure className="text-center">
                  <img src={liveImage} alt="Your live photo" className="h-20 w-20 rounded-xl border border-border object-cover" />
                  <figcaption className="mt-1 text-[10px] text-muted-foreground">Your live photo</figcaption>
                </figure>
              )}
              <div className="ml-auto flex flex-col gap-1.5">
                <Button size="sm" variant="brand" disabled={busy} onClick={() => void answer(d.id, true)}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, it is me"}
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void answer(d.id, false)}>
                  No, it is not me
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** the questions for the signed-in person's own documents (used on the home page) */
export function DocumentPhotoQuestions() {
  const { data: creds } = useGetCredentialsQuery();
  const { data: status } = useGetLivePhotoStatusQuery();
  const has = !!status?.data?.has_live_photo && !status.data.expired;
  const { data: image } = useGetLivePhotoImageQuery(undefined, { skip: !has });
  const docs = has ? unansweredDocuments((creds?.data?.credential ?? []) as QuestionCredential[]) : [];
  return <DocumentPhotoQuestion docs={docs} liveImage={image?.data?.image} />;
}
