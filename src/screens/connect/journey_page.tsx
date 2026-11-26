import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useAnswerJourneyMutation, useGetJourneyQuery, useSubmitJourneyStepMutation, type JourneyView } from "@/redux/api";
import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const shell = "min-h-screen flex items-start sm:items-center justify-center px-4 py-8";
const card = "w-full max-w-lg rounded-2xl border border-[color:var(--iverifi-dialog-border)] bg-[var(--iverifi-muted-surface)] p-6 shadow-sm";
const primary = "h-11 w-full rounded-xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] font-semibold text-white hover:opacity-95";

const reasonOf = (error: unknown): string => {
  const e = error as { data?: { message?: string } } | undefined;
  return e?.data?.message || "Something went wrong. Please try again.";
};

const Progress = ({ journey }: { journey: JourneyView }) => (
  <ol className="mb-4 flex flex-wrap gap-2" aria-label="Steps">
    {journey.steps.map((s, i) => (
      <li
        key={s.check}
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          s.status === "done" ? "bg-emerald-100 text-emerald-800" : journey.current_step?.index === i ? "bg-[#7B5CF5] text-white" : "bg-slate-200 text-slate-600"
        }`}
      >
        {i + 1}. {s.label}
      </li>
    ))}
  </ol>
);

/**
 * The page a person reaches from a business's journey link (iVerifi Suite): /j/<token>. No sign-in: the random token in the link is the
 * credential. It says who is asking and why, records agreement to the notice, then walks the person through each step and sends them
 * back to the business at the end.
 */
const JourneyPage = () => {
  const { token = "" } = useParams();
  const info = useGetJourneyQuery(token);
  const [answer, { isLoading: answering }] = useAnswerJourneyMutation();
  const [submit, { isLoading: submitting }] = useSubmitJourneyStepMutation();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<JourneyView | null>(null);
  const [appLink, setAppLink] = useState<string | null>(null);

  const journey: JourneyView | null = live ?? info.data?.data ?? null;
  const redirect = journey?.status === "completed" || journey?.status === "declined" ? journey.redirect : null;

  // after the last step the person is sent back to the business, after a moment to read the confirmation
  useEffect(() => {
    if (!redirect) return undefined;
    const t = window.setTimeout(() => window.location.assign(redirect), 4000);
    return () => window.clearTimeout(t);
  }, [redirect]);

  if (info.isLoading) return <LoadingScreen message="Opening your request..." />;

  if (info.isError || !journey) {
    return (
      <div className={shell}>
        <div className={card}>
          <XCircle className="mb-3 h-8 w-8 text-red-500" aria-hidden />
          <h1 className="text-lg font-semibold text-[var(--iverifi-text-primary)]">This link is not valid</h1>
          <p className="mt-2 text-sm text-[var(--iverifi-text-secondary)]">It may have been copied wrongly. Please ask the business to send it again.</p>
        </div>
      </div>
    );
  }

  const testBanner = journey.mode === "test" && <p className="mb-3 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800">Test mode: nothing here is real.</p>;

  const decide = async (action: "grant" | "decline") => {
    setError(null);
    try {
      await answer({ token, action }).unwrap();
      setLive(null);
      await info.refetch();
    } catch (e) {
      setError(reasonOf(e));
      void info.refetch();
    }
  };

  const send = async () => {
    setError(null);
    try {
      const r = await submit({ token, fields }).unwrap();
      setLive(r.data.journey);
      setAppLink(r.data.progress === "waiting_for_app" ? r.data.link || r.data.journey.current_step?.link || null : null);
      if (r.data.progress !== "waiting_for_app") setFields({});
    } catch (e) {
      setError(reasonOf(e));
    }
  };

  // ---- finished (or closed) ----
  if (journey.status !== "created" && journey.status !== "in_progress") {
    const done = journey.status === "completed";
    const text: Record<string, [string, string]> = {
      completed: ["All done", `${journey.business} has what it needs. You do not have to do anything else.`],
      declined: ["You said no", "Nothing was checked. You can close this page."],
      expired: ["This link has expired", `Please ask ${journey.business} to send you a new one.`],
      cancelled: ["This request was cancelled", `Please contact ${journey.business} if you still need to do this.`],
    };
    return (
      <div className={shell}>
        <div className={card}>
          {testBanner}
          {done ? <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-500" aria-hidden /> : <XCircle className="mb-3 h-8 w-8 text-slate-400" aria-hidden />}
          <h1 className="text-lg font-semibold text-[var(--iverifi-text-primary)]">{text[journey.status][0]}</h1>
          <p className="mt-2 text-sm text-[var(--iverifi-text-secondary)]">{text[journey.status][1]}</p>
          {redirect && (
            <Button className={`${primary} mt-5`} onClick={() => window.location.assign(redirect)}>
              Back to {journey.business}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ---- the notice ----
  if (journey.consent.status !== "granted") {
    return (
      <div className={shell}>
        <div className={card}>
          {testBanner}
          <ShieldCheck className="mb-3 h-8 w-8 text-[#7B5CF5]" aria-hidden />
          <h1 className="text-lg font-semibold text-[var(--iverifi-text-primary)]">{journey.consent.notice.title}</h1>
          <p className="mt-1 text-sm text-[var(--iverifi-text-secondary)]">
            <span className="font-medium text-[var(--iverifi-text-primary)]">{journey.business}</span> is asking.
          </p>
          <div className="mt-4 whitespace-pre-line rounded-xl border border-[color:var(--iverifi-dialog-border)] p-4 text-sm leading-relaxed text-[var(--iverifi-text-primary)]">{journey.consent.notice.text}</div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--iverifi-text-secondary)]">What you will be asked for</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-[var(--iverifi-text-primary)]">
              {journey.steps.map((s) => (
                <li key={s.check}>{s.label}</li>
              ))}
            </ul>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button disabled={answering} onClick={() => void decide("grant")} className={primary}>
              I agree
            </Button>
            <Button disabled={answering} variant="outline" onClick={() => void decide("decline")} className="h-11 rounded-xl">
              No, thanks
            </Button>
          </div>
          <p className="mt-3 text-center text-[11px] text-[var(--iverifi-text-secondary)]">Notice version {journey.consent.notice.version}</p>
        </div>
      </div>
    );
  }

  // ---- a step ----
  const cur = journey.current_step;
  return (
    <div className={shell}>
      <div className={card}>
        {testBanner}
        <Progress journey={journey} />
        {cur ? (
          <>
            <h1 className="text-lg font-semibold text-[var(--iverifi-text-primary)]">{cur.label}</h1>
            <p className="mt-1 text-sm text-[var(--iverifi-text-secondary)]">For {journey.business}: {journey.purpose}</p>

            {cur.kind === "app" && cur.waiting_for_app ? (
              <div className="mt-4 space-y-3 text-sm text-[var(--iverifi-text-primary)]">
                <p>Open the iVerifi app to verify and share. When you have shared, come back to this page and press the button below.</p>
                {(appLink || cur.link) && (
                  <a href={appLink || cur.link || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#7B5CF5] underline">
                    Open the iVerifi app <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                )}
              </div>
            ) : (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                {cur.fields.map((f) => (
                  <div key={f.name}>
                    <Label htmlFor={`jf-${f.name}`} className="text-sm font-medium">
                      {f.label}
                    </Label>
                    <Input
                      id={`jf-${f.name}`}
                      className="mt-1"
                      value={fields[f.name] ?? ""}
                      placeholder={f.placeholder}
                      inputMode={f.inputMode}
                      maxLength={f.maxLength}
                      autoComplete="off"
                      onChange={(e) => {
                        setError(null);
                        setFields((v) => ({ ...v, [f.name]: f.upper ? e.target.value.toUpperCase() : e.target.value }));
                      }}
                    />
                    {f.hint && <p className="mt-1 text-xs text-[var(--iverifi-text-secondary)]">{f.hint}</p>}
                  </div>
                ))}
              </form>
            )}

            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <Button
              className={`${primary} mt-5`}
              disabled={submitting || (!(cur.kind === "app" && cur.waiting_for_app) && cur.fields.some((f) => !(fields[f.name] ?? "").trim()))}
              onClick={() => void send()}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {cur.kind === "app" && cur.waiting_for_app ? "I have shared" : "Continue"}
            </Button>
            <p className="mt-3 text-center text-[11px] text-[var(--iverifi-text-secondary)]">Some checks can take up to half a minute. Please keep this page open.</p>
          </>
        ) : (
          <p className="text-sm text-[var(--iverifi-text-secondary)]">Finishing up...</p>
        )}
      </div>
    </div>
  );
};

export default JourneyPage;
