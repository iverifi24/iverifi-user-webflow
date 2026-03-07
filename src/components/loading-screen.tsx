import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingVariant = "fullPage" | "cards";

interface LoadingScreenProps {
  /** "fullPage" = centered spinner (auth, route guard). "cards" = skeleton card grid for lists. */
  variant?: LoadingVariant;
  /** Optional message under the spinner (fullPage only). */
  message?: string;
  /** Number of skeleton cards (cards variant only). Default 4. */
  cardCount?: number;
  /** Grid cols: "1" | "2" (cards variant). Default "2". */
  gridCols?: "1" | "2";
  /** Show header row skeletons above the card grid (cards variant). */
  showHeaderSkeletons?: boolean;
  /** Extra class for the wrapper. */
  className?: string;
}

/**
 * Reusable loading widget: full-page spinner or skeleton card grid.
 * Use across auth, protected routes, and data-loading views.
 */
export function LoadingScreen({
  variant = "fullPage",
  message = "Loading...",
  cardCount = 4,
  gridCols = "2",
  showHeaderSkeletons = false,
  className,
}: LoadingScreenProps) {
  if (variant === "fullPage") {
    return (
      <div
        className={cn(
          "flex min-h-svh flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-50 to-white p-6",
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </div>
    );
  }

  // cards variant: skeleton card grid
  const cols = gridCols === "2" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1";
  return (
    <div className={cn("space-y-6", className)} role="status" aria-label="Loading content">
      {showHeaderSkeletons && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      )}
      <div className={cn("grid gap-4", cols)}>
        {Array.from({ length: cardCount }).map((_, i) => (
        <Card key={i} className="rounded-2xl border-2 border-slate-200 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-6 w-24 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
}
