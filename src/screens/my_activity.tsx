import { LoadingScreen } from "@/components/loading-screen";
import { useGetMyActivityQuery } from "@/redux/api";
import { format } from "date-fns";
import {
  FileCheck,
  FileX,
  Link2,
  CalendarCheck,
  Calendar,
  Shield,
  FileText,
} from "lucide-react";

const formatDocType = (type: string): string => {
  if (!type) return "Document";
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const getActivityIcon = (item: {
  type?: string;
  activity_type?: string;
  message?: string;
}) => {
  const type = (item.type || "").toLowerCase();
  const msg = (item.message || "").toLowerCase();
  const activityType = (item.activity_type || "").toLowerCase();
  if (type.includes("document")) {
    if (activityType === "deleted" || msg.includes("deleted"))
      return <FileX className="h-5 w-5 shrink-0 text-red-400" />;
    return <FileCheck className="h-5 w-5 shrink-0 text-[#00c896]" />;
  }
  if (type.includes("connection")) {
    if (msg.includes("check-in") || msg.includes("check-in"))
      return <CalendarCheck className="h-5 w-5 shrink-0 text-[#f5a623]" />;
    if (msg.includes("check-out") || msg.includes("checked out"))
      return <Calendar className="h-5 w-5 shrink-0 text-slate-400" />;
    return <Link2 className="h-5 w-5 shrink-0 text-[#00e0ff]" />;
  }
  return <Shield className="h-5 w-5 shrink-0 text-slate-500" />;
};

const cardClass =
  "rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)] px-4 py-4";

const MyActivity = () => {
  const { data, isLoading, isError } = useGetMyActivityQuery();

  const activities = data?.data?.activity ?? [];

  return (
    <div className="min-h-0 flex-1 w-full max-w-2xl mx-auto space-y-6 text-[var(--iverifi-text-primary)]">
      <div>
        <div className="text-[11px] font-semibold tracking-widest uppercase text-[var(--iverifi-text-muted)]">
          Activity
        </div>
        <h2 className="mt-1 text-lg font-bold text-[var(--iverifi-text-primary)]">My activity</h2>
        <p className="text-sm text-[var(--iverifi-text-muted)] mt-1 leading-relaxed">
          Audit log of your actions on the app. Document and connection events
          appear here.
        </p>
      </div>

      {isLoading ? (
        <LoadingScreen variant="cards" cardCount={6} gridCols="1" />
      ) : isError ? (
        <div
          className={`${cardClass} border-red-500/25 bg-red-500/[0.08]`}
        >
          <p className="text-sm text-red-200">
            Failed to load activity. Please try again later.
          </p>
        </div>
      ) : activities.length === 0 ? (
        <div className={`${cardClass} text-center py-10`}>
          <FileText className="h-12 w-12 mx-auto text-slate-600 mb-3" />
          <p className="text-[var(--iverifi-text-secondary)] text-sm font-medium">
            No activity recorded yet
          </p>
          <p className="text-[var(--iverifi-text-muted)] text-xs mt-1 max-w-xs mx-auto leading-relaxed">
            Your document verifications and connection actions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((item: any) => (
            <div
              key={item.id}
              className={`${cardClass} flex items-start gap-3 transition-colors hover:bg-[var(--iverifi-card-hover)]`}
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--iverifi-icon-border)] bg-[var(--iverifi-muted-surface)]">
                {getActivityIcon(item)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--iverifi-text-primary)] text-sm">
                  {item.message || "Activity"}
                </p>
                {(item.name || item.type) && (
                  <p className="text-sm text-[var(--iverifi-text-muted)] mt-0.5">
                    {item.type === "Document" && item.name
                      ? formatDocType(item.name)
                      : item.name || item.type}
                  </p>
                )}
                <p className="text-xs text-[var(--iverifi-label)] mt-1.5 font-medium">
                  {item.date
                    ? format(
                        new Date(
                          typeof item.date === "number"
                            ? item.date
                            : item.date
                        ),
                        "MMM d, yyyy · h:mm a"
                      )
                    : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyActivity;
