import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      return <FileX className="h-5 w-5 shrink-0 text-red-500" />;
    return <FileCheck className="h-5 w-5 shrink-0 text-teal-600" />;
  }
  if (type.includes("connection")) {
    if (msg.includes("check-in") || msg.includes("check-in"))
      return <CalendarCheck className="h-5 w-5 shrink-0 text-amber-600" />;
    if (msg.includes("check-out") || msg.includes("checked out"))
      return <Calendar className="h-5 w-5 shrink-0 text-slate-600" />;
    return <Link2 className="h-5 w-5 shrink-0 text-teal-600" />;
  }
  return <Shield className="h-5 w-5 shrink-0 text-slate-500" />;
};

const MyActivity = () => {
  const { data, isLoading, isError } = useGetMyActivityQuery();

  const activities = data?.data?.activity ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-slate-50/30 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">My Activity</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit log of your actions on the app. All document and connection
            activity is recorded here.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(6)
              .fill(0)
              .map((_, idx) => (
                <Card key={idx} className="rounded-2xl border-2 border-slate-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : isError ? (
          <Card className="rounded-2xl border-2 border-red-100 bg-red-50/50 p-6">
            <p className="text-sm text-red-700">
              Failed to load activity. Please try again later.
            </p>
          </Card>
        ) : activities.length === 0 ? (
          <Card className="rounded-2xl border-2 border-slate-200 bg-white p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No activity recorded yet.</p>
            <p className="text-slate-400 text-xs mt-1">
              Your document verifications and connection actions will appear
              here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {activities.map((item: any) => (
              <Card
                key={item.id}
                className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    {getActivityIcon(item)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">
                      {item.message || "Activity"}
                    </p>
                    {(item.name || item.type) && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {item.type === "Document" && item.name
                          ? formatDocType(item.name)
                          : item.name || item.type}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyActivity;
