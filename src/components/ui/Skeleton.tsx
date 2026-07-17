import { cn } from "@/lib/utils";

/** Loading placeholder block; sized by the caller via className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "motion-safe:animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800",
        className,
      )}
    />
  );
}
