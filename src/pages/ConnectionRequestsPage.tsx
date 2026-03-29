import { useNavigate } from "react-router-dom";
import { useGetConnectionsQuery } from "@/redux/api";
import { useMemo } from "react";
import { format } from "date-fns";
import { LoadingScreen } from "@/components/loading-screen";
import {
  Building2,
  User,
  ChevronRight,
  FileCheck,
  CalendarCheck,
  CalendarX,
} from "lucide-react";

const cardClass =
  "rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]";

export default function ConnectionRequestsPage() {
  const navigate = useNavigate();
  const { data: connectionsData, isLoading } = useGetConnectionsQuery();

  const connectionRequests = useMemo(() => {
    const requests = connectionsData?.data?.requests || [];
    const withRecipients = requests.filter(
      (r: any) =>
        r?.recipient_id &&
        r?.recipients &&
        (r?.type === "Company" || r?.type === "Individual")
    );
    return withRecipients.sort((a: any, b: any) => {
      const timeA = a.check_in_time ? new Date(a.check_in_time).getTime() : 0;
      const timeB = b.check_in_time ? new Date(b.check_in_time).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [connectionsData]);

  const statusBadgeClass = (status: string) => {
    if (status === "Checked out")
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
    if (status === "Checked in")
      return "border-[rgba(0,200,150,0.35)] bg-[rgba(0,200,150,0.12)] text-[#5eead4]";
    if (status === "Pending approval")
      return "border-[rgba(245,166,35,0.35)] bg-[rgba(245,166,35,0.12)] text-amber-200";
    return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  };

  return (
    <div className="min-h-0 flex-1 w-full max-w-2xl mx-auto space-y-6 text-[var(--iverifi-text-primary)]">
      <div>
        <div className="text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
          Connections
        </div>
        <h2 className="mt-1 text-lg font-bold text-[var(--iverifi-text-primary)]">
          Your connection requests
        </h2>
        <p className="text-sm text-[var(--iverifi-text-muted)] mt-1 leading-relaxed">
          Properties you have connected with. Tap a row to view details.
        </p>
      </div>

      {isLoading ? (
        <LoadingScreen variant="cards" cardCount={3} gridCols="1" />
      ) : connectionRequests.length === 0 ? (
        <div className={`${cardClass} p-8 text-center`}>
          <p className="text-[var(--iverifi-text-muted)] text-sm leading-relaxed">
            No connection requests yet. Scan a property&apos;s QR code from the
            home page to connect.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {connectionRequests.map((req: any) => {
            const recipientName =
              req.recipients?.name ||
              req.recipients?.firstName ||
              req.recipients?.hotel_name ||
              req.recipients?.businessName ||
              "Property";
            const isCompany = req.type === "Company";
            const status = req.check_out_time
              ? "Checked out"
              : req.check_in_time
                ? "Checked in"
                : req.check_in_status === "pending"
                  ? "Pending approval"
                  : "Connected";
            const credCount = req.credentials?.length ?? 0;
            const checkInTs = req.check_in_time
              ? typeof req.check_in_time === "number"
                ? req.check_in_time
                : new Date(req.check_in_time).getTime()
              : null;
            const checkOutTs = req.check_out_time
              ? typeof req.check_out_time === "number"
                ? req.check_out_time
                : new Date(req.check_out_time).getTime()
              : null;
            return (
              <div
                key={req.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    navigate(`/connections/${req.recipient_id}`);
                }}
                className={`${cardClass} p-4 cursor-pointer transition-colors hover:bg-[var(--iverifi-card-hover)] hover:border-[rgba(0,224,255,0.25)]`}
                onClick={() => navigate(`/connections/${req.recipient_id}`)}
              >
                <div className="flex flex-row items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--iverifi-icon-border)] bg-[var(--iverifi-muted-surface)] text-[#00e0ff]">
                    {isCompany ? (
                      <Building2 className="h-5 w-5" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                      Recipient
                    </p>
                    <p className="font-semibold text-[var(--iverifi-text-primary)] truncate mt-0.5 text-sm">
                      {recipientName}
                    </p>
                    <p className="text-xs text-[var(--iverifi-text-muted)] mt-0.5">
                      {isCompany ? "Property" : "Individual"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(status)}`}
                  >
                    {status}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[var(--iverifi-text-muted)]" />
                </div>
                <div className="mt-3 pt-3 border-t border-[color:var(--iverifi-row-divider)] flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--iverifi-text-muted)]">
                  <span className="inline-flex items-center gap-1.5 text-[var(--iverifi-text-muted)]">
                    <FileCheck className="h-3.5 w-3.5 text-[#00c896]" />
                    {credCount} doc{credCount !== 1 ? "s" : ""} shared
                  </span>
                  {checkInTs && (
                    <span className="inline-flex items-center gap-1.5">
                          <CalendarCheck className="h-3.5 w-3.5 text-[var(--iverifi-text-muted)]" />
                      In: {format(new Date(checkInTs), "MMM d, yyyy")}
                    </span>
                  )}
                  {checkOutTs && (
                    <span className="inline-flex items-center gap-1.5">
                          <CalendarX className="h-3.5 w-3.5 text-[var(--iverifi-text-muted)]" />
                      Out: {format(new Date(checkOutTs), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
