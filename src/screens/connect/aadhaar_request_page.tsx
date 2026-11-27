import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { useGetAadhaarRequestQuery, useLazyAadhaarRequestStatusQuery, useStartAadhaarRequestMutation } from "@/redux/api";
import { LoadingScreen } from "@/components/loading-screen";
import { aadhaarAppLaunchLink, aadhaarAppLink } from "@/utils/aadhaarApp";
import { Button } from "@/components/ui/button";

const shell = "min-h-screen flex items-start sm:items-center justify-center px-4 py-8";
const card = "w-full max-w-md rounded-2xl border border-[color:var(--iverifi-dialog-border)] bg-[var(--iverifi-muted-surface)] p-6 shadow-sm";
const primary = "h-11 w-full rounded-xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] font-semibold text-white hover:opacity-95";
const POLL_MS = 2500;

const reasonOf = (error: unknown): string => (error as { data?: { message?: string } } | undefined)?.data?.message || "Something went wrong. Please try again.";

/**
 * The page a person reaches from a business's Aadhaar link: /a/<token>. No sign-in and no iVerifi app: the random token in the link is the credential.
 * It says who is asking and what is shared, then the person scans a QR (or opens the link on their phone) with the Aadhaar App. The server does every
 * check; this page only starts it and waits for the result. What the person shared goes to the business, never back to this page.
 */
const AadhaarRequestPage = () => {
  const { token = "" } = useParams();
  const info = useGetAadhaarRequestQuery(token);
  const [start, { isLoading: starting }] = useStartAadhaarRequestMutation();
  const [readStatus] = useLazyAadhaarRequestStatusQuery();
  const [image, setImage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [state, setState] = useState<"ready" | "waiting" | "shared" | "failed" | "expired">("ready");
  const [message, setMessage] = useState<string | null>(null);
  const run = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      run.current += 1;
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const poll = useCallback(
    (mine: number) => {
      const tick = async () => {
        if (run.current !== mine) return;
        try {
          const r = await readStatus(token).unwrap();
          if (run.current !== mine) return;
          if (r.data.state === "shared") return setState("shared");
          if (r.data.state === "failed") {
            setMessage(r.data.message || "This could not be completed. Please try again.");
            return setState("failed");
          }
          if (r.data.state === "expired" || r.data.state === "cancelled") return setState("expired");
        } catch {
          // a short network gap: the next look will see the result
        }
        timer.current = setTimeout(tick, POLL_MS);
      };
      timer.current = setTimeout(tick, POLL_MS);
    },
    [readStatus, token]
  );

  const begin = async () => {
    run.current += 1;
    const mine = run.current;
    setMessage(null);
    try {
      const r = await start(token).unwrap();
      if (run.current !== mine) return;
      setLink(aadhaarAppLink(r.data.qr_url));
      setImage(r.data.qr_image ? `data:image/png;base64,${r.data.qr_image}` : null);
      setState("waiting");
      poll(mine);
    } catch (e) {
      if (run.current !== mine) return;
      setMessage(reasonOf(e));
      setState("failed");
    }
  };

  if (info.isLoading) return <LoadingScreen message="Opening your request..." />;
  const v = info.data?.data;
  if (!v) {
    return (
      <div className={shell}>
        <div className={`${card} text-center`}>
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h1 className="text-lg font-semibold">This link is not valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please ask the business for a new link.</p>
        </div>
      </div>
    );
  }

  const done = state === "shared" || v.state === "shared";
  const gone = state === "expired" || (v.state !== "pending" && v.state !== "failed" && !done);

  return (
    <div className={shell}>
      <div className={card}>
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ShieldCheck className="h-5 w-5 text-[#7B5CF5]" /> iVerifi
        </div>
        <h1 className="text-xl font-semibold">{v.business_name || "A business"} asks you to share your Aadhaar</h1>

        {done && (
          <div className="mt-6 space-y-2 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <p className="font-medium">Shared. Thank you.</p>
            <p className="text-sm text-muted-foreground">You can close this page.</p>
          </div>
        )}

        {gone && !done && (
          <div className="mt-6 space-y-2 text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <p className="font-medium">This link is no longer active</p>
            <p className="text-sm text-muted-foreground">Please ask the business for a new one.</p>
          </div>
        )}

        {!done && !gone && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">{v.notice}</p>

            {state === "waiting" ? (
              <div className="mt-6">
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
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {(state === "failed" || v.state === "failed") && message && <p className="text-sm text-red-600">{message}</p>}
                <Button className={primary} disabled={starting} onClick={begin}>
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "failed" ? "Try again" : "Share from the Aadhaar App"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AadhaarRequestPage;
