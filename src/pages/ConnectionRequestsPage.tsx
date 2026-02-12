import { useNavigate } from "react-router-dom";
import { useGetConnectionsQuery } from "@/redux/api";
import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, User, ChevronRight, FileCheck, CalendarCheck, CalendarX } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-slate-50/30 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Your connection requests
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Properties you have connected with. Tap to view details.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(3)
              .fill(0)
              .map((_, idx) => (
                <Card
                  key={idx}
                  className="rounded-2xl border-2 border-slate-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        ) : connectionRequests.length === 0 ? (
          <Card className="rounded-2xl border-2 border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-500 text-sm">
              No connection requests yet. Scan a property&apos;s QR code from the
              home page to connect.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {connectionRequests.map((req: any) => {
              const name =
                req.recipients?.name ||
                req.recipients?.firstName ||
                "Property";
              const isCompany = req.type === "Company";
              const status = req.check_out_time
                ? "Checked out"
                : req.check_in_time
                  ? "Checked in"
                  : req.check_in_status === "pending"
                    ? "Pending approval"
                    : "Connected";
              const statusColor =
                status === "Checked out"
                  ? "bg-slate-100 text-slate-700 border-slate-200"
                  : status === "Checked in"
                    ? "bg-teal-100 text-teal-800 border-teal-200"
                    : status === "Pending approval"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";
              const credCount = req.credentials?.length ?? 0;
              const checkInTs = req.check_in_time ? (typeof req.check_in_time === "number" ? req.check_in_time : new Date(req.check_in_time).getTime()) : null;
              const checkOutTs = req.check_out_time ? (typeof req.check_out_time === "number" ? req.check_out_time : new Date(req.check_out_time).getTime()) : null;
              return (
                <Card
                  key={req.id}
                  className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer"
                  onClick={() =>
                    navigate(`/connections/${req.recipient_id}`)
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex flex-row items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                        {isCompany ? (
                          <Building2 className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 truncate">
                          {name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isCompany ? "Property" : "Individual"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-xs font-medium ${statusColor}`}
                      >
                        {status}
                      </Badge>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <FileCheck className="h-3.5 w-3.5" />
                        {credCount} doc{credCount !== 1 ? "s" : ""} shared
                      </span>
                      {checkInTs && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarCheck className="h-3.5 w-3.5" />
                          In: {format(new Date(checkInTs), "MMM d, yyyy")}
                        </span>
                      )}
                      {checkOutTs && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarX className="h-3.5 w-3.5" />
                          Out: {format(new Date(checkOutTs), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
