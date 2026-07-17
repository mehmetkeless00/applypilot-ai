import { Skeleton } from "@/components/ui/Skeleton";

// Shape mirrors the dashboard page — header row, stat strip, list rows —
// so the swap to real content doesn't jump the layout.
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
