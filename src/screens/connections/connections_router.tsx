import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingScreen } from "@/components/loading-screen";
import { useGetConnectionsQuery, useAddConnectionMutation } from "@/redux/api";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { determineConnectionType, isValidQRCode } from "@/utils/qr-code-utils";
import { getBusinessTypeMeta } from "@/utils/businessCategoryUtils";
import {
  Building2,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Zap,
  Search,
  X,
  Filter,
  FileBadge,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import AddConnectionModal from "./add_connection";

type StatusFilter = "all" | "active" | "pending" | "past";
type CategoryFilter = "all" | "hotel" | "corporate" | "healthcare" | "coliving" | "other";
type DocFilter = "all" | "AADHAAR_CARD" | "DRIVING_LICENSE" | "PAN_CARD" | "PASSPORT";
type SortOption = "newest" | "oldest" | "alphabetical";

const ConnectionsRouter = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addConnection] = useAddConnectionMutation();
  const [scannerOpen, setScannerOpen] = useState(false);

  // Filters & sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const { data: connectionData, isLoading: isLoadingConnections } = useGetConnectionsQuery();

  const connections = connectionData?.data?.requests || [];

  // Handle QR code flow
  useEffect(() => {
    const code = searchParams.get("code");

    if (isValidQRCode(code)) {
      const handleQRCodeConnection = async () => {
        try {
          const type = determineConnectionType(code!);

          await addConnection({
            document_id: code!,
            type,
          }).unwrap();

          navigate(`/connections/${code}`);
        } catch (error) {
          console.error("Error adding connection from QR code:", error);
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete("code");
          setSearchParams(newSearchParams);
        }
      };

      handleQRCodeConnection();
    }
  }, [searchParams, addConnection, navigate, setSearchParams]);

  const formatSharedDate = (timestamp: string | number) => {
    try {
      const date = new Date(Number(timestamp));
      return format(date, "MMM d, yyyy · h:mm a");
    } catch {
      return "Recently";
    }
  };

  // Counts for tabs
  const counts = useMemo(() => {
    let active = 0;
    let pending = 0;
    let past = 0;
    connections.forEach((conn: any) => {
      const s = (conn.check_in_status || "").toLowerCase();
      if (s === "pending") pending++;
      else if (s === "approved" || s === "active") active++;
      else if (s === "expired" || s === "rejected" || s === "checked_out") past++;
      else active++;
    });
    return { active, pending, past, all: connections.length };
  }, [connections]);

  // Combined Filter & Sort Pipeline
  const filteredConnections = useMemo(() => {
    return connections
      .filter((conn: any) => {
        const status = (conn.check_in_status || "").toLowerCase();
        const bType = (conn.recipients?.businessType || "").toLowerCase();
        const recipientName = (
          conn.recipients?.name ||
          conn.recipients?.firstName ||
          conn.recipients?.hotel_name ||
          conn.recipients?.businessName ||
          ""
        ).toLowerCase();

        // 1. Status Filter
        if (statusFilter === "active") {
          if (status !== "approved" && status !== "active" && status !== "") return false;
        } else if (statusFilter === "pending") {
          if (status !== "pending") return false;
        } else if (statusFilter === "past") {
          if (status !== "expired" && status !== "rejected" && status !== "checked_out") return false;
        }

        // 2. Category Filter
        if (categoryFilter !== "all") {
          if (categoryFilter === "hotel") {
            if (!bType.includes("hotel") && !bType.includes("hospitality") && !bType.includes("resort") && !bType.includes("inn")) return false;
          } else if (categoryFilter === "corporate") {
            if (!bType.includes("corporate") && !bType.includes("company") && !bType.includes("office") && !bType.includes("tech") && !bType.includes("work")) return false;
          } else if (categoryFilter === "healthcare") {
            if (!bType.includes("health") && !bType.includes("hospital") && !bType.includes("clinic") && !bType.includes("medical")) return false;
          } else if (categoryFilter === "coliving") {
            if (!bType.includes("coliving") && !bType.includes("coworking") && !bType.includes("pg") && !bType.includes("hostel")) return false;
          } else if (categoryFilter === "other") {
            if (
              bType.includes("hotel") ||
              bType.includes("corporate") ||
              bType.includes("company") ||
              bType.includes("health") ||
              bType.includes("coliving") ||
              bType.includes("coworking")
            ) {
              return false;
            }
          }
        }

        // 3. Document Filter
        if (docFilter !== "all") {
          const sharedCreds: any[] = conn.credentials || [];
          const matchesDoc = sharedCreds.some((c) => {
            const dt = c.document_type || c.documentType;
            return dt === docFilter;
          }) || conn.document_type === docFilter;
          if (!matchesDoc && sharedCreds.length > 0) return false;
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
          return (Number(a.created_at_timestamp) || 0) - (Number(b.created_at_timestamp) || 0);
        }
        if (sortBy === "alphabetical") {
          const nameA = (a.recipients?.name || a.recipients?.hotel_name || a.recipients?.businessName || "").toLowerCase();
          const nameB = (b.recipients?.name || b.recipients?.hotel_name || b.recipients?.businessName || "").toLowerCase();
          return nameA.localeCompare(nameB);
        }
        return (Number(b.created_at_timestamp) || 0) - (Number(a.created_at_timestamp) || 0);
      });
  }, [connections, statusFilter, categoryFilter, docFilter, searchQuery, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setDocFilter("all");
    setSortBy("newest");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    docFilter !== "all" ||
    sortBy !== "newest";

  return (
    <div className="min-h-0 flex-1 w-full max-w-4xl mx-auto space-y-6 text-foreground">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 dark:text-cyan-300 uppercase tracking-wider">
            <Building2 className="w-3 h-3 text-teal-600 dark:text-cyan-400" />
            DPDP Verified Access Grants
          </div>
          <h1 className="mt-1.5 text-xl sm:text-2xl font-black text-foreground">
            Shared With
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Monitor, manage, and revoke credentials shared with businesses, employers, hotels, and organizations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="h-9 px-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-500/20 gap-1.5 cursor-pointer"
          >
            <QrCode className="h-4 w-4" />
            <span>Scan QR to Share</span>
          </Button>
          <AddConnectionModal />
        </div>
      </div>

      {/* ── Filters & Search Controls ── */}
      {connections.length > 0 && (
        <div className="space-y-3 bg-muted/20 p-3 sm:p-4 rounded-2xl border border-border/60">
          {/* Top Row: Search Bar + Sort Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business, hotel, employer, or category..."
                className="w-full h-10 pl-10 pr-9 rounded-xl border border-border/80 bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-card border border-border/80 px-2.5 py-1.5 rounded-xl text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-card text-foreground">Newest First</option>
                <option value="oldest" className="bg-card text-foreground">Oldest First</option>
                <option value="alphabetical" className="bg-card text-foreground">Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "all", label: `All (${counts.all})` },
              { key: "active", label: `Active Grants (${counts.active})` },
              { key: "pending", label: `Pending (${counts.pending})` },
              { key: "past", label: `Past History (${counts.past})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key as StatusFilter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-card text-foreground shadow-2xs border border-border/90"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              <span>Category:</span>
            </span>
            {[
              { key: "all", label: "All Types" },
              { key: "hotel", label: "Hotels & Stays" },
              { key: "corporate", label: "Corporate & Offices" },
              { key: "healthcare", label: "Healthcare" },
              { key: "coliving", label: "Co-living & Co-working" },
              { key: "other", label: "Other" },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryFilter(cat.key as CategoryFilter)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  categoryFilter === cat.key
                    ? "bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-200 font-semibold"
                    : "bg-muted/40 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Shared Document Type Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
              <FileBadge className="h-3 w-3" />
              <span>Document:</span>
            </span>
            {[
              { key: "all", label: "All Documents" },
              { key: "AADHAAR_CARD", label: "Aadhaar Card" },
              { key: "DRIVING_LICENSE", label: "Driving Licence" },
              { key: "PAN_CARD", label: "PAN Card" },
              { key: "PASSPORT", label: "Passport" },
            ].map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDocFilter(d.key as DocFilter)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  docFilter === d.key
                    ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-800 dark:text-cyan-200 font-semibold"
                    : "bg-muted/40 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {d.label}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-semibold text-rose-500 hover:underline ml-auto cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── List / Empty States ── */}
      {isLoadingConnections ? (
        <LoadingScreen variant="cards" cardCount={4} gridCols="2" />
      ) : connections.length === 0 ? (
        /* ── Zero-State: User has never shared credentials ── */
        <div className="rounded-3xl border border-border/80 bg-card p-8 sm:p-12 text-center shadow-sm flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-cyan-400">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-bold text-foreground">No Shared Credentials Yet</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              When you scan a QR code at a hotel, office, hospital, or service counter to share your verified credentials, they will appear here with active 24h timers and 1-tap revocation controls.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="mt-2 h-11 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-500/25 flex items-center gap-2 cursor-pointer"
          >
            <Zap className="h-4 w-4" />
            <span>Scan QR to Share →</span>
          </Button>
        </div>
      ) : filteredConnections.length === 0 ? (
        /* ── Filter Empty-State: Filters returned 0 results ── */
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-8 text-center flex flex-col items-center gap-2">
          <Search className="h-8 w-8 text-muted-foreground/40 mb-1" />
          <h4 className="text-sm font-bold text-foreground">No matching records found</h4>
          <p className="text-xs text-muted-foreground max-w-xs">
            No shared credentials match your current search, document, and category filters.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="mt-2 rounded-xl text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredConnections.map((conn: any, idx: number) => {
            const sharedDate = formatSharedDate(conn.created_at_timestamp);
            const isCompany = conn.type === "Company";
            const bMeta = getBusinessTypeMeta(conn.recipients?.businessType, isCompany, "h-4 w-4");
            const recipientName =
              conn.recipients?.name ||
              conn.recipients?.firstName ||
              conn.recipients?.hotel_name ||
              conn.recipients?.businessName ||
              "Verified Partner";

            return (
              <Card
                key={idx}
                className="hover:shadow-md transition cursor-pointer border-border/80 bg-card hover:border-teal-500/40"
                onClick={() => {
                  navigate(`/connections/${conn.recipient_id}`, {
                    state: { connection: conn },
                  });
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={bMeta.iconClassName}>{bMeta.icon}</span>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                        {bMeta.shortLabel}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${bMeta.badgeClassName}`}>
                      {bMeta.categoryLabel}
                    </span>
                  </div>
                  <CardTitle className="text-base font-black mt-2 truncate text-foreground">
                    {recipientName}
                  </CardTitle>
                </CardHeader>

                <Separator />

                <CardContent className="pt-3 text-xs text-muted-foreground space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Documents Shared:</span>
                    <span className="font-bold text-foreground">{conn.shared_documents_count || 1}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-medium">Shared On:</span>
                    <span className="font-mono text-[11px]">{sharedDate}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-border/50 text-[11px]">
                    <span className="text-teal-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      <span>DPDP Protected</span>
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-foreground font-semibold hover:underline">
                      <span>Manage</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* QR Scanner Portal */}
      <QRScannerModal
        open={scannerOpen}
        onOpenChange={(v) => setScannerOpen(v)}
        onScanSuccess={(scannedCode) => navigate(`/connections/${scannedCode}`)}
      />
    </div>
  );
};

export default ConnectionsRouter;
