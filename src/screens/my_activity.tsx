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
  Download,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

type FilterType = "all" | "stays" | "verifications" | "revocations";

const MyActivity = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetMyActivityQuery();
  const [filter, setFilter] = useState<FilterType>("all");

  const rawActivities = data?.data?.activity ?? [];

  const filteredActivities = useMemo(() => {
    if (filter === "all") return rawActivities;
    return rawActivities.filter((item: any) => {
      const type = (item.type || "").toLowerCase();
      const msg = (item.message || "").toLowerCase();
      const activityType = (item.activity_type || "").toLowerCase();

      if (filter === "stays") {
        return type.includes("connection") || msg.includes("check-in") || msg.includes("stay");
      }
      if (filter === "verifications") {
        return (
          type.includes("document") &&
          activityType !== "deleted" &&
          !msg.includes("deleted") &&
          !msg.includes("revoked")
        );
      }
      if (filter === "revocations") {
        return (
          activityType === "deleted" ||
          activityType === "revoked" ||
          msg.includes("revoked") ||
          msg.includes("deleted")
        );
      }
      return true;
    });
  }, [rawActivities, filter]);

  const handleDownloadAuditSummary = () => {
    if (!rawActivities.length) {
      toast.error("No activity records available to export.");
      return;
    }
    const auditExport = {
      compliance: "DPDP Act 2023 Tamper-Proof Audit Trail",
      exported_at: new Date().toISOString(),
      total_records: rawActivities.length,
      events: rawActivities.map((act: any) => ({
        id: act.id,
        type: act.type,
        message: act.message,
        date: act.date,
        recipient: act.name || null,
        status: act.activity_type || "completed",
      })),
    };
    const blob = new Blob([JSON.stringify(auditExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iverifi-consent-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Consent audit summary downloaded successfully.");
  };

  return (
    <div className="min-h-0 flex-1 w-full max-w-2xl mx-auto space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 dark:text-cyan-300 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-teal-600 dark:text-cyan-400" />
            DPDP Act 2023 Audit Trail
          </div>
          <h1 className="mt-1.5 text-xl font-black text-foreground">
            Activity & Consent Log
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transparent, tamper-proof record of every document verified, shared, or revoked
          </p>
        </div>

        <Button
          type="button"
          onClick={handleDownloadAuditSummary}
          variant="outline"
          className="self-start sm:self-auto h-9 px-3 rounded-xl text-xs font-semibold border-border gap-1.5 cursor-pointer hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
          <span>Export Summary</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-muted/40 p-1 rounded-xl border border-border/60">
        {[
          { key: "all", label: `All (${rawActivities.length})` },
          { key: "stays", label: "Shared Access" },
          { key: "verifications", label: "Verifications" },
          { key: "revocations", label: "Revocations" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as FilterType)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filter === tab.key
                ? "bg-card text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
            const isConnectionEvent =
              (item.type || "").toLowerCase().includes("connection") ||
              Boolean(item.connection_id);

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

                  {/* Quick-Action: View / Revoke Active Access if connection */}
                  {isConnectionEvent && (
                    <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        DPDP Grant: Auto-expires in 24h
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate("/connections")}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        <span>Manage & Revoke Access</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
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
