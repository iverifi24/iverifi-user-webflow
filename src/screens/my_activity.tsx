import { useMemo, useState } from "react";
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
  XCircle,
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
  if (activityType === "rejected" || msg.includes("rejected"))
    return <XCircle className="h-5 w-5 shrink-0 text-rose-500" />;
  if (type.includes("document")) {
    if (activityType === "deleted" || msg.includes("deleted"))
      return <FileX className="h-5 w-5 shrink-0 text-rose-500" />;
    return <FileCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-cyan-400" />;
  }
  if (type.includes("connection")) {
    if (msg.includes("check-in") || msg.includes("checked in"))
      return <CalendarCheck className="h-5 w-5 shrink-0 text-amber-500" />;
    if (msg.includes("check-out") || msg.includes("checked out"))
      return <Calendar className="h-5 w-5 shrink-0 text-slate-400" />;
    return <Link2 className="h-5 w-5 shrink-0 text-teal-600 dark:text-cyan-400" />;
  }
  return <Shield className="h-5 w-5 shrink-0 text-slate-500" />;
};

const MyActivity = () => {
  const { data, isLoading, isError } = useGetMyActivityQuery();
  const [filter, setFilter] = useState<"all" | "document" | "connection">("all");

  const rawActivities = data?.data?.activity ?? [];

  const filteredActivities = useMemo(() => {
    if (filter === "all") return rawActivities;
    return rawActivities.filter((item: any) => {
      const type = (item.type || "").toLowerCase();
      if (filter === "document") return type.includes("document");
      if (filter === "connection") return type.includes("connection");
      return true;
    });
  }, [rawActivities, filter]);

  return (
    <div className="min-h-0 flex-1 w-full max-w-2xl mx-auto space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 dark:text-cyan-300 uppercase tracking-wider">
            DPDP Act 2023 Audit Trail
          </div>
          <h1 className="mt-1.5 text-xl font-black text-foreground">
            Activity & Consent Log
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transparent, tamper-proof record of every document verified, shared, or revoked
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted/40 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === "all"
                ? "bg-card text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({rawActivities.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("document")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === "document"
                ? "bg-card text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Documents
          </button>
          <button
            type="button"
            onClick={() => setFilter("connection")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === "connection"
                ? "bg-card text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Connections
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingScreen variant="cards" cardCount={6} gridCols="1" />
      ) : isError ? (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-500 font-medium">
            Failed to load activity log. Please try again later.
          </p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-10 text-center shadow-xs">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-semibold text-foreground">
            No activity recorded
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Your document verifications and check-in events will appear here in chronological order.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredActivities.map((item: any) => {
            const isRejected =
              (item.activity_type || "").toLowerCase() === "rejected" ||
              (item.message || "").toLowerCase().includes("rejected");
            return (
              <div
                key={item.id}
                className={`group flex items-start gap-3 rounded-2xl border bg-card p-4 transition-all duration-200 hover:border-teal-500/30 hover:shadow-xs shadow-2xs ${
                  isRejected ? "border-rose-500/30 bg-rose-500/5" : "border-border/70"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${
                    isRejected
                      ? "border-rose-500/30 bg-rose-500/10"
                      : "border-border/80 bg-muted/30"
                  }`}
                >
                  {getActivityIcon(item)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-bold text-sm ${isRejected ? "text-rose-500" : "text-foreground"}`}>
                      {item.message || "Activity"}
                    </p>
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                      {item.date
                        ? format(
                            new Date(typeof item.date === "number" ? item.date : item.date),
                            "MMM d · h:mm a"
                          )
                        : "—"}
                    </span>
                  </div>

                  {(item.name || item.type) && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      {item.type === "Document" && item.name
                        ? formatDocType(item.name)
                        : item.name || item.type}
                    </p>
                  )}
                  {isRejected && item.rejection_reason && (
                    <p className="text-xs text-rose-500/90 mt-1 italic">
                      Reason: {item.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyActivity;
