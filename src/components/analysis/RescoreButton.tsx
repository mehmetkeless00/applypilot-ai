"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function RescoreButton({
  analysisId,
  usesSavedResume,
}: {
  analysisId: string;
  usesSavedResume: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  async function rescore() {
    setRunning(true);
    setError(null);
    setLimitHit(false);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/rescore`, {
        method: "POST",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setLimitHit(res.status === 402);
        setError(payload?.error ?? "Re-score failed. Try again.");
        setRunning(false);
        return;
      }
      router.push(`/dashboard/analysis/${payload.id}`);
    } catch {
      setError("Could not reach the server. Try again.");
      setRunning(false);
    }
  }

  return (
    <div className="text-right">
      <Button variant="secondary" type="button" onClick={rescore} disabled={running}>
        {running && <Spinner />}
        {running ? "Re-scoring…" : "Re-score"}
      </Button>
      <p className="mt-1 text-xs text-slate-400">
        {usesSavedResume
          ? "Uses the latest version of your saved resume."
          : "Re-runs with the same resume."}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}{" "}
          {limitHit && (
            <Link
              href="/dashboard/billing"
              className="font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Upgrade
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
