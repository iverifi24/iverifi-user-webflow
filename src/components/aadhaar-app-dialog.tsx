import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LiveCapture } from "@/components/live-capture";
import { useDispatch } from "react-redux";
import { api, useOvseStartMutation, useLazyOvseStatusQuery } from "@/redux/api";
import { AADHAAR_APP_EVENT, aadhaarAppLaunchLink, aadhaarAppLink, type AadhaarAppRequest } from "@/utils/aadhaarApp";

type Phase = "starting" | "photo" | "waiting" | "done" | "failed";

const POLL_MS = 2500;

/** the server wants the live photo first (it checks the Aadhaar photo against it) */
const needsPhoto = (e: unknown): boolean => {
  const code = (e as { data?: { data?: { code?: string } } })?.data?.data?.code;
  return code === "NO_LIVE_PHOTO" || code === "LIVE_PHOTO_EXPIRED";
};

const messageOf = (e: unknown): string => (e as { data?: { message?: string } })?.data?.message || "We could not start the Aadhaar App check. Please try again.";

/**
 * Shares Aadhaar from the Aadhaar App. The server makes a short, single-use session tied to this sign-in; the person opens the Aadhaar App (this button on a phone,
 * or the picture scanned from another screen), agrees, and the server saves the document. This dialog only starts it and waits: every check (the name, the
 * photo) is the server's, and a failure shows the server's own sentence.
 */
export function AadhaarAppDialog() {
  const [request, setRequest] = useState<AadhaarAppRequest | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [image, setImage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null); // opens the Aadhaar App on this Android phone (never VSign's own address: see utils/aadhaarApp.ts)
  const [message, setMessage] = useState<string | null>(null);
  const dispatch = useDispatch();
  const [start] = useOvseStartMutation();
  const [readStatus] = useLazyOvseStatusQuery();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const run = useRef(0); // a newer attempt (or closing) makes an older poll stop

  const stop = useCallback(() => {
    run.current += 1;
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const poll = useCallback(
    (sessionId: string, mine: number, req: AadhaarAppRequest) => {
      const tick = async () => {
        if (run.current !== mine) return;
        try {
          const r = await readStatus(sessionId).unwrap();
          if (run.current !== mine) return;
          const s = r.data.status;
          if (s === "completed") {
            setPhase("done");
            dispatch(api.util.invalidateTags(["credentials", "activity", "connections"])); // the new document shows up everywhere
            toast.success("Aadhaar verified.");
            req.onVerified?.();
            return;
          }
          if (s === "failed" || s === "expired") {
            setMessage(r.data.message || "This could not be completed. Please try again.");
            setPhase("failed");
            return;
          }
        } catch {
          // a short network gap: keep waiting, the next look will see the result
        }
        timer.current = setTimeout(tick, POLL_MS);
      };
      timer.current = setTimeout(tick, POLL_MS);
    },
    [readStatus, dispatch]
  );

  const begin = useCallback(
    async (req: AadhaarAppRequest) => {
      stop();
      const mine = run.current;
      setPhase("starting");
      setMessage(null);
      setImage(null);
      setLink(null);
      try {
        const r = await start().unwrap();
        if (run.current !== mine) return;
        setLink(aadhaarAppLink(r.data.qr_url));
        setImage(r.data.qr_image ? `data:image/png;base64,${r.data.qr_image}` : null);
        setPhase("waiting");
        poll(r.data.session_id, mine, req);
      } catch (e) {
        if (run.current !== mine) return;
        if (needsPhoto(e)) return setPhase("photo");
        setMessage(messageOf(e));
        setPhase("failed");
      }
    },
    [start, poll, stop]
  );

  useEffect(() => {
    const onOpen = (e: Event) => {
      const req = (e as CustomEvent<AadhaarAppRequest>).detail || {};
      setRequest(req);
      void begin(req);
    };
    window.addEventListener(AADHAAR_APP_EVENT, onOpen);
    return () => {
      window.removeEventListener(AADHAAR_APP_EVENT, onOpen);
      stop();
    };
  }, [begin, stop]);

  const close = () => {
    stop();
    setRequest(null);
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify your Aadhaar</DialogTitle>
          <DialogDescription>You share it from the Aadhaar App. iVerifi never asks for your Aadhaar number.</DialogDescription>
        </DialogHeader>

        {phase === "starting" && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Getting ready…
          </div>
        )}

        {phase === "photo" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">First, a quick live photo. It lets us check that the Aadhaar you share is yours.</p>
            {/* saving the photo continues straight to the Aadhaar App */}
            <LiveCapture onDone={() => request && void begin(request)} onLater={close} />
          </div>
        )}

        {phase === "waiting" && (
          <div className="space-y-4">
            {/* VSign's own address (maadhaar.com/getIntent) is never used as a link: that domain is parked for sale. On Android the button opens the app by its package; elsewhere the QR is the way in. */}
            {link ? (
              <>
                <Button asChild className="w-full">
                  <a href={link}>
                    <Smartphone className="mr-2 h-4 w-4" /> Open the Aadhaar App
                  </a>
                </Button>
                <p className="text-center text-xs text-muted-foreground">Agree to share in the Aadhaar App, then come back to this page. If it opens but does not show the request, <a className="underline" href={aadhaarAppLaunchLink() || '#'}>open the app on its own</a>, tap Scan QR and scan the code below from another screen.</p>
              </>
            ) : (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Open the Aadhaar App and tap Scan QR.</li>
                <li>Scan the code below, then agree to share.</li>
              </ol>
            )}
            {image ? (
              <img src={image} alt="QR code for the Aadhaar App" className="mx-auto h-52 w-52 rounded-lg border bg-white p-1" />
            ) : (
              <p className="text-sm text-red-600">The code could not be shown. Please try again.</p>
            )}
            {!link && <p className="text-center text-xs text-muted-foreground">Using this phone? Open this page on a computer or another phone to scan the code.</p>}
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for you to share. This stays open for 10 minutes.
            </p>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <p className="text-sm font-medium">Your Aadhaar is verified.</p>
            <Button className="w-full" onClick={close}>
              Done
            </Button>
          </div>
        )}

        {phase === "failed" && (
          <div className="space-y-3">
            <p className="text-sm text-red-600">{message}</p>
            <Button className="w-full" onClick={() => request && void begin(request)}>
              Try again
            </Button>
            {request?.alternate && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const alt = request.alternate;
                  close();
                  alt?.run();
                }}
              >
                {request.alternate.label}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
