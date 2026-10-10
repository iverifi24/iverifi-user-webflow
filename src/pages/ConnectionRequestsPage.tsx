import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGetConnectionsQuery } from "@/redux/api";
import { format } from "date-fns";
import { LoadingScreen } from "@/components/loading-screen";
import {
  ChevronRight,
  FileCheck,
  CalendarCheck,
  CalendarX,
  Search,
  X,
  ArrowUpDown,
  SlidersHorizontal,
  Building2,
  RotateCcw,
  QrCode,
} from "lucide-react";
import { getBusinessTypeMeta } from "@/utils/businessCategoryUtils";
import { QRScannerModal } from "@/components/qr-scanner-modal";

const cardClass =
  "rounded-2xl border border-[color:var(--iverifi-card-border)] bg-[var(--iverifi-card)]";

type StatusFilter = "all" | "active" | "pending" | "past";
type CategoryFilter = "all" | "hotel" | "corporate" | "healthcare" | "coliving" | "other";
type DocFilter = "all" | "AADHAAR_CARD" | "DRIVING_LICENSE" | "PAN_CARD" | "PASSPORT";
type SortOption = "newest" | "oldest" | "name";

export default function ConnectionRequestsPage() {
  const navigate = useNavigate();
  const { data: connectionsData, isLoading } = useGetConnectionsQuery();
  const [scannerOpen, setScannerOpen] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // All valid requests
  const connectionRequests = useMemo(() => {
    const requests = connectionsData?.data?.requests || [];
    return requests.filter(
      (r: any) =>
        r?.recipient_id &&
        r?.recipients &&
        (r?.type === "Company" || r?.type === "Individual")
    );
  }, [connectionsData]);

  // Helper to get normalized status
  const getStatus = (req: any): { key: "active" | "pending" | "past"; label: string } => {
    if (req.check_out_time) return { key: "past", label: "Checked out" };
    if (req.check_in_time) return { key: "active", label: "Checked in" };
    if (req.check_in_status === "pending") return { key: "pending", label: "Pending approval" };
    return { key: "active", label: "Connected" };
  };

  // Status counts for tabs
  const counts = useMemo(() => {
    let active = 0;
    let pending = 0;
    let past = 0;
    connectionRequests.forEach((req: any) => {
      const s = getStatus(req).key;
      if (s === "pending") pending++;
      else if (s === "past") past++;
      else active++;
    });
    return {
      all: connectionRequests.length,
      active,
      pending,
      past,
    };
  }, [connectionRequests]);

  // Filtered & sorted list
  const filteredRequests = useMemo(() => {
    return connectionRequests
      .filter((req: any) => {
        const recipientName = (
          req.recipients?.name ||
          req.recipients?.firstName ||
          req.recipients?.hotel_name ||
          req.recipients?.businessName ||
          ""
        ).toLowerCase();
        const bType = (req.recipients?.businessType || "").toLowerCase();
        const st = getStatus(req).key;

        // 1. Status Filter
        if (statusFilter !== "all" && st !== statusFilter) {
          return false;
        }

        // 2. Category Filter
        if (categoryFilter !== "all") {
          if (categoryFilter === "hotel") {
            if (!bType.includes("hotel") && !bType.includes("hospitality") && !bType.includes("resort") && !bType.includes("inn") && !bType.includes("stay")) return false;
          } else if (categoryFilter === "corporate") {
            if (!bType.includes("corporate") && !bType.includes("company") && !bType.includes("office") && !bType.includes("tech") && !bType.includes("work")) return false;
          } else if (categoryFilter === "healthcare") {
            if (!bType.includes("health") && !bType.includes("hospital") && !bType.includes("clinic") && !bType.includes("medical")) return false;
          } else if (categoryFilter === "coliving") {
            if (!bType.includes("coliving") && !bType.includes("coworking") && !bType.includes("pg") && !bType.includes("hostel")) return false;
          } else if (categoryFilter === "other") {
            if (
              bType.includes("hotel") ||
              bType.includes("hospitality") ||
              bType.includes("resort") ||
              bType.includes("corporate") ||
              bType.includes("company") ||
              bType.includes("health") ||
              bType.includes("hospital") ||
              bType.includes("coliving") ||
              bType.includes("coworking")
            ) {
              return false;
            }
          }
        }

        // 3. Document Filter
        if (docFilter !== "all") {
          const creds: any[] = req.credentials || [];
          const hasDoc = creds.some((c) => {
            const dt = c.document_type || c.documentType;
            return dt === docFilter;
          }) || req.document_type === docFilter;
          if (!hasDoc) return false;
        }

        // 4. Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          if (!recipientName.includes(q) && !bType.includes(q)) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === "oldest") {
          const timeA = a.check_in_time ? new Date(a.check_in_time).getTime() : 0;
          const timeB = b.check_in_time ? new Date(b.check_in_time).getTime() : 0;
          return timeA - timeB;
        }
        if (sortBy === "name") {
          const nameA = (a.recipients?.name || a.recipients?.hotel_name || a.recipients?.businessName || "").toLowerCase();
          const nameB = (b.recipients?.name || b.recipients?.hotel_name || b.recipients?.businessName || "").toLowerCase();
          return nameA.localeCompare(nameB);
        }
        // newest first (default)
        const timeA = a.check_in_time ? new Date(a.check_in_time).getTime() : 0;
        const timeB = b.check_in_time ? new Date(b.check_in_time).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || "").localeCompare(a.id || "");
      });
  }, [connectionRequests, statusFilter, categoryFilter, docFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    docFilter !== "all" ||
    sortBy !== "newest";

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setDocFilter("all");
    setSortBy("newest");
  };

  const statusBadgeClass = (status: string) => {
    if (status === "Checked out")
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
    if (status === "Checked in")
      return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-[rgba(0,200,150,0.35)] dark:bg-[rgba(0,200,150,0.12)] dark:text-[#5eead4]";
    if (status === "Pending approval")
      return "border-amber-300 bg-amber-50 text-amber-700 dark:border-[rgba(245,166,35,0.35)] dark:bg-[rgba(245,166,35,0.12)] dark:text-amber-200";
    return "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-cyan-300";
  };

  return (
    <div className="min-h-0 flex-1 w-full max-w-2xl mx-auto space-y-4 text-[var(--iverifi-text-primary)]">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 dark:text-cyan-300 uppercase tracking-wider">
            <Building2 className="w-3 h-3 text-teal-600 dark:text-cyan-400" />
            Verified Organizations & Businesses
          </div>
          <h1 className="mt-1.5 text-xl font-black text-foreground">
            Shared With
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Organizations, hotels, hospitals, and offices you have connected with. Tap any connection to review shared credentials or access permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="shrink-0 p-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-cyan-300 hover:bg-teal-500/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          title="Scan QR to Share"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">Scan QR</span>
        </button>
      </div>

      {/* ── Filters Section ── */}
      {connectionRequests.length > 0 && (
        <div className="space-y-3 bg-[var(--iverifi-card)] border border-[color:var(--iverifi-card-border)] p-3 sm:p-3.5 rounded-2xl shadow-sm">
          {/* Search bar + Sort selector */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business or employer..."
                className="w-full h-9 pl-8.5 pr-8 rounded-xl border border-[color:var(--iverifi-icon-border)] bg-[var(--iverifi-muted-surface)] text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort connections"
                className="h-9 px-2.5 pr-6 rounded-xl border border-[color:var(--iverifi-icon-border)] bg-[var(--iverifi-muted-surface)] text-[11px] font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/30 appearance-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name (A-Z)</option>
              </select>
              <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            {/* Toggle More Filters */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={`h-9 px-2.5 rounded-xl border flex items-center gap-1 text-[11px] font-medium transition-all cursor-pointer ${
                showAdvancedFilters || categoryFilter !== "all" || docFilter !== "all"
                  ? "border-teal-500/50 bg-teal-500/10 text-teal-700 dark:text-cyan-300"
                  : "border-[color:var(--iverifi-icon-border)] bg-[var(--iverifi-muted-surface)] text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle category & document filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>

          {/* Status Segmented Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-teal-600 text-white shadow-sm shadow-teal-600/30"
                  : "bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-muted)] hover:text-foreground hover:bg-muted"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                  : "bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-muted)] hover:text-foreground hover:bg-muted"
              }`}
            >
              Active ({counts.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
                  : "bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-muted)] hover:text-foreground hover:bg-muted"
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("past")}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "past"
                  ? "bg-slate-600 text-white shadow-sm shadow-slate-600/30"
                  : "bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-muted)] hover:text-foreground hover:bg-muted"
              }`}
            >
              Past ({counts.past})
            </button>
          </div>

          {/* Advanced Category & Document Filters (Collapsible or visible) */}
          {showAdvancedFilters && (
            <div className="pt-2 border-t border-[color:var(--iverifi-row-divider)] space-y-2.5 animate-in fade-in-50 duration-150">
              {/* Business Categories */}
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Business Category
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "all", label: "All Types" },
                    { id: "hotel", label: "Hospitality" },
                    { id: "corporate", label: "Corporate" },
                    { id: "healthcare", label: "Healthcare" },
                    { id: "coliving", label: "Co-Living" },
                    { id: "other", label: "Other" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id as CategoryFilter)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        categoryFilter === cat.id
                          ? "bg-teal-500/20 text-teal-700 dark:text-cyan-300 border border-teal-500/40"
                          : "bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-muted)] hover:text-foreground border border-transparent"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shared Document Type */}
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Shared Document
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "all", label: "All Documents" },
                    { id: "AADHAAR_CARD", label: "Aadhaar Card" },
                    { id: "DRIVING_LICENSE", label: "Driving Licence" },
                    { id: "PAN_CARD", label: "PAN Card" },
                    { id: "PASSPORT", label: "Passport" },
                  ].map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setDocFilter(doc.id as DocFilter)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        docFilter === doc.id
                          ? "bg-teal-500/20 text-teal-700 dark:text-cyan-300 border border-teal-500/40"
                          : "bg-[var(--iverifi-muted-surface)] text-[var(--iverifi-text-muted)] hover:text-foreground border border-transparent"
                      }`}
                    >
                      {doc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Pill Summary & Reset */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-[color:var(--iverifi-row-divider)] flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground">
                Showing <strong className="text-foreground">{filteredRequests.length}</strong> of {connectionRequests.length} connections
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Connections List or Empty States ── */}
      {isLoading ? (
        <LoadingScreen variant="cards" cardCount={3} gridCols="1" />
      ) : connectionRequests.length === 0 ? (
        <div className={`${cardClass} p-8 text-center space-y-3`}>
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-cyan-400 mx-auto flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">No connections yet</h3>
            <p className="text-[var(--iverifi-text-muted)] text-xs mt-1 leading-relaxed max-w-sm mx-auto">
              Scan a hotel, office, or business QR code to grant verified, privacy-first DPDP access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-500/20 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR to Connect</span>
          </button>
        </div>
      ) : filteredRequests.length === 0 ? (
        /* Empty Filter State */
        <div className={`${cardClass} p-8 text-center space-y-3`}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">No matches found</h3>
            <p className="text-[var(--iverifi-text-muted)] text-xs mt-1">
              No shared connections match your active filter criteria.
            </p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[color:var(--iverifi-icon-border)] bg-[var(--iverifi-muted-surface)] text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear all filters
          </button>
        </div>
      ) : (
        /* Results List */
        <div className="space-y-2">
          {filteredRequests.map((req: any) => {
            const recipientName =
              req.recipients?.name ||
              req.recipients?.firstName ||
              req.recipients?.hotel_name ||
              req.recipients?.businessName ||
              "Organization";
            const isCompany = req.type === "Company";
            const { label: statusLabel } = getStatus(req);
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
            const bMeta = getBusinessTypeMeta(req.recipients?.businessType, isCompany);

            return (
              <div
                key={req.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    navigate(`/connections/${req.recipient_id}`);
                }}
                className={`${cardClass} p-4 cursor-pointer transition-all hover:bg-[var(--iverifi-card-hover)] hover:border-[rgba(0,224,255,0.25)] shadow-xs`}
                onClick={() => navigate(`/connections/${req.recipient_id}`)}
              >
                <div className="flex flex-row items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--iverifi-icon-border)] bg-[var(--iverifi-muted-surface)] ${bMeta.iconClassName}`}>
                    {bMeta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[var(--iverifi-text-primary)] truncate text-sm">
                        {recipientName}
                      </p>
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.2 rounded-full border ${bMeta.badgeClassName}`}>
                        {bMeta.shortLabel}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--iverifi-text-muted)] mt-0.5">
                      {bMeta.categoryLabel}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(statusLabel)}`}
                  >
                    {statusLabel}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[var(--iverifi-text-muted)]" />
                </div>
                <div className="mt-3 pt-3 border-t border-[color:var(--iverifi-row-divider)] flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--iverifi-text-muted)]">
                  <span className="inline-flex items-center gap-1.5 text-[var(--iverifi-text-muted)]">
                    <FileCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-[#00c896]" />
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

      {/* QR Scanner Modal */}
      <QRScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScanSuccess={(code) => {
          setScannerOpen(false);
          navigate(`/connections/${code}`);
        }}
      />
    </div>
  );
}
