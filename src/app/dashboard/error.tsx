"use client";

import { Button } from "@/components/ui/Button";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-24 text-center">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        An unexpected error occurred while loading this page.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
