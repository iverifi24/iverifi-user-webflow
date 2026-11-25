import { useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useAnswerConsentMutation, useGetConsentInfoQuery } from "@/redux/api";
import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";

/** the plain names of the checks a consent may cover (the API's own names are for developers) */
const CHECK_LABEL: Record<string, string> = {
  pan: "PAN",
  pan_ocr: "PAN card photo",
  passport: "Passport",
  voter: "Voter ID",
  gstin: "GSTIN",
  gstin_pan: "PAN linked to a GSTIN",
  cin: "Company registration (CIN)",
  bank: "Bank account",
  upi: "UPI ID",
  uan: "EPF account (UAN)",
  mobile_dl: "Driving licence linked to a mobile number",
  gst_contact: "GST contact details",
  cin_gst: "GST details of a company",
  epf_establishment: "EPF establishment",
  esic: "ESIC",
  mobile: "Mobile number (with a code sent to it)",
  aadhaar_request: "Aadhaar",
  dl_request: "Driving licence",
};

const reasonOf = (error: unknown): string => {
  const e = error as { status?: number; data?: { message?: string } } | undefined;
  return e?.data?.message || "Something went wrong. Please try again.";
};

const shell = "min-h-screen flex items-start sm:items-center justify-center px-4 py-8";
const card = "w-full max-w-lg rounded-2xl border border-[color:var(--iverifi-dialog-border)] bg-[var(--iverifi-muted-surface)] p-6 shadow-sm";

/**
 * The page a person reaches from a business's consent link (iVerifi Connect and Suite): /c/<token>. No sign-in: the random token in
 * the link is the credential. It says who is asking and why, shows the exact notice, and records the person's answer.
 */
const ConsentPage = () => {
  const { token = "" } = useParams();
  const info = useGetConsentInfoQuery(token);
  const [answer, { isLoading: sending }] = useAnswerConsentMutation();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"granted" | "declined" | "withdrawn" | null>(null);

  if (info.isLoading) return <LoadingScreen message="Opening your request..." />;

  if (info.isError || !info.data) {
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

  const c = info.data.data;
  const status = done ?? c.status;

  const act = async (action: "grant" | "decline" | "withdraw") => {
    setError(null);
    try {
      await answer({ token, action }).unwrap();
      setDone(action === "grant" ? "granted" : action === "decline" ? "declined" : "withdrawn");
    } catch (e) {
      setError(reasonOf(e));
      void info.refetch();
    }
  };

  const heading: Record<string, string> = {
    granted: "Your permission is recorded",
    declined: "You said no",
    withdrawn: "Your permission has been taken back",
    expired: "This link has expired",
  };
  const detail: Record<string, string> = {
    granted: `${c.business} can now check the details you give them for this purpose. You can take your permission back at any time from this same link.`,
    declined: "Nothing will be checked. You can close this page.",
    withdrawn: "No new check can be made. A check already made is not undone.",
    expired: `Please ask ${c.business} to send you a new link.`,
  };

  return (
    <div className={shell}>
      <div className={card}>
        {c.mode === "test" && <p className="mb-3 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800">Test mode: nothing here is real.</p>}

        {status === "pending" ? (
          <>
            <ShieldCheck className="mb-3 h-8 w-8 text-[#7B5CF5]" aria-hidden />
            <h1 className="text-lg font-semibold text-[var(--iverifi-text-primary)]">{c.notice.title}</h1>
            <p className="mt-1 text-sm text-[var(--iverifi-text-secondary)]">
              <span className="font-medium text-[var(--iverifi-text-primary)]">{c.business}</span> is asking.
            </p>

            <div className="mt-4 whitespace-pre-line rounded-xl border border-[color:var(--iverifi-dialog-border)] p-4 text-sm leading-relaxed text-[var(--iverifi-text-primary)]">{c.notice.text}</div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--iverifi-text-secondary)]">Checks covered</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[var(--iverifi-text-primary)]">
                {c.checks.includes("*") ? <li>Any identity check {c.business} needs for this purpose</li> : c.checks.map((k) => <li key={k}>{CHECK_LABEL[k] || k}</li>)}
              </ul>
            </div>

            {c.link_expires_at && <p className="mt-3 text-xs text-[var(--iverifi-text-secondary)]">This request is open until {c.link_expires_at}.</p>}
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button disabled={sending} onClick={() => void act("grant")} className="h-11 rounded-xl bg-gradient-to-r from-[#00e0ff] to-[#7B5CF5] font-semibold text-white hover:opacity-95">
                I agree
              </Button>
              <Button disabled={sending} variant="outline" onClick={() => void act("decline")} className="h-11 rounded-xl">
                No, thanks
              </Button>
            </div>
            <p className="mt-3 text-center text-[11px] text-[var(--iverifi-text-secondary)]">Notice version {c.notice.version}</p>
          </>
        ) : (
          <>
            {status === "granted" ? <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-500" aria-hidden /> : <XCircle className="mb-3 h-8 w-8 text-slate-400" aria-hidden />}
            <h1 className="text-lg font-semibold text-[var(--iverifi-text-primary)]">{heading[status] || "This request is closed"}</h1>
            <p className="mt-2 text-sm text-[var(--iverifi-text-secondary)]">{detail[status] || "There is nothing more to do here."}</p>
            {status === "granted" && (
              <>
                {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
                <Button disabled={sending} variant="outline" onClick={() => void act("withdraw")} className="mt-5 h-11 w-full rounded-xl">
                  Take my permission back
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConsentPage;
