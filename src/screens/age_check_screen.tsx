import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetCredentialsQuery } from "@/redux/api";
import { LoadingScreen } from "@/components/loading-screen";
import { getApplicantProfileFromBackend } from "@/utils/syncApplicantProfile";
import { resolveAgeCheckFromCredentials } from "@/utils/credentialAge";

export default function AgeCheckScreen() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetCredentialsQuery();

  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const profile = await getApplicantProfileFromBackend();
        if (!mounted) return;
        const name =
          (profile as any)?.name ||
          [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
          "";
        setDisplayName(name);
      } catch (e) {
        console.warn("Failed to fetch applicant name:", e);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const credentials = useMemo(() => data?.data?.credential ?? [], [data]);

  const resolution = useMemo(
    () => resolveAgeCheckFromCredentials(credentials as unknown[]),
    [credentials]
  );

  const ok = resolution.outcome === "above18";
  const under18 = resolution.outcome === "under18";

  if (isLoading) return <LoadingScreen variant="fullPage" />;

  return (
    <div className="min-h-0 flex-1 bg-[var(--iverifi-page)] text-[var(--iverifi-text-primary)] flex items-center justify-center px-4 overflow-hidden">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-5 min-h-0">
        <div
          className={`w-[132px] h-[132px] rounded-full flex items-center justify-center ${
            ok
              ? "bg-[var(--iverifi-success-soft)] border-[4px] border-[var(--iverifi-success-border)]"
              : under18
                ? "bg-[var(--iverifi-danger-soft)] border-[4px] border-[rgba(220,38,38,0.5)] dark:border-[rgba(255,77,109,0.5)]"
                : "bg-[var(--iverifi-warning-soft)] border-[4px] border-[var(--iverifi-warning-border)]"
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            <div
              className="text-[42px] leading-none"
              style={{
                color: ok
                  ? "var(--iverifi-success)"
                  : under18
                    ? "var(--iverifi-danger)"
                    : "var(--iverifi-warning)",
              }}
            >
              {ok ? "✓" : under18 ? "✗" : "!"}
            </div>
            <div
              className="text-[34px] font-extrabold tracking-tight"
              style={{
                color: ok
                  ? "var(--iverifi-success)"
                  : under18
                    ? "var(--iverifi-danger)"
                    : "var(--iverifi-warning)",
                marginTop: -4,
              }}
            >
              {ok ? "18+" : under18 ? "<18" : "—"}
            </div>
          </div>
        </div>

        {displayName ? (
          <div className="text-[22px] font-extrabold text-[var(--iverifi-text-primary)]">{displayName}</div>
        ) : null}

        {ok ? (
          <div className="w-full">
            <div
              className="inline-block rounded-full px-6 py-2 text-[13px] font-extrabold"
              style={{
                background: "var(--iverifi-success-soft)",
                border: "1px solid var(--iverifi-success-border)",
                color: "var(--iverifi-success)",
              }}
            >
              Confirmed above 18 years
            </div>
            <div className="mt-4 text-[13px] leading-relaxed text-[var(--iverifi-text-secondary)]">
              {resolution.outcome === "above18" && resolution.source === "dob" ? (
                <>
                  Based on date of birth from your verified{" "}
                  <span className="text-[var(--iverifi-text-primary)] font-semibold">
                    {formatDocLabel(resolution.documentType)}
                  </span>
                  .
                </>
              ) : resolution.outcome === "above18" ? (
                <>
                  Based on age verification from your{" "}
                  <span className="text-[var(--iverifi-text-primary)] font-semibold">
                    {formatDocLabel(resolution.documentType)}
                  </span>
                  .
                </>
              ) : null}
              <div className="mt-1 text-[12px] text-[var(--iverifi-text-muted)]">
                Powered by iVerifi · DPDP Act 2023.
              </div>
            </div>
          </div>
        ) : under18 ? (
          <div
            className="w-full px-4 py-4 rounded-2xl border"
            style={{
              background: "var(--iverifi-danger-soft)",
              borderColor: "rgba(220,38,38,0.25)",
            }}
          >
            <div className="text-[15px] font-extrabold text-[var(--iverifi-text-primary)] mb-2">Under 18</div>
            <p className="text-[13px] leading-relaxed text-[var(--iverifi-text-secondary)]">
              {resolution.outcome === "under18" && resolution.source === "dob"
                ? `Date of birth on your ${formatDocLabel(resolution.documentType)} indicates you are under 18.`
                : resolution.outcome === "under18"
                  ? `Your verified ${formatDocLabel(resolution.documentType)} indicates you are under 18.`
                  : null}
            </p>
          </div>
        ) : resolution.outcome === "no_dob" ? (
          <div
            className="w-full px-4 py-4 rounded-2xl border"
            style={{
              background: "var(--iverifi-warning-soft)",
              borderColor: "var(--iverifi-warning-border)",
              color: "var(--iverifi-warning)",
            }}
          >
            We found a verified ID but couldn&apos;t read a date of birth. Add or re-verify a document
            that includes DOB (PAN, passport, driving licence, or Aadhaar with full extraction).
            <div className="mt-3">
              <button
                type="button"
                onClick={() => navigate("/add-documents")}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-[13px] font-bold"
                style={{
                  background: "var(--iverifi-accent-soft)",
                  border: "1px solid var(--iverifi-accent-border)",
                  color: "var(--iverifi-accent)",
                }}
              >
                Add / verify document
              </button>
            </div>
          </div>
        ) : (
          <div
            className="w-full px-4 py-4 rounded-2xl border"
            style={{
              background: "var(--iverifi-warning-soft)",
              borderColor: "var(--iverifi-warning-border)",
              color: "var(--iverifi-warning)",
            }}
          >
            Verify at least one ID (Aadhaar, PAN, passport, or driving licence) to check age.
            <div className="mt-3">
              <button
                type="button"
                onClick={() => navigate("/add-documents")}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-[13px] font-bold"
                style={{
                  background: "var(--iverifi-accent-soft)",
                  border: "1px solid var(--iverifi-accent-border)",
                  color: "var(--iverifi-accent)",
                }}
              >
                Verify document
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDocLabel(documentType: string): string {
  if (!documentType) return "ID";
  if (documentType.includes("_")) {
    return documentType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return documentType;
}
