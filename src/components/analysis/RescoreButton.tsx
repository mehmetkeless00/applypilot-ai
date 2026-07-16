"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { getMessages, type Locale } from "@/lib/i18n";

export function RescoreButton({
  analysisId,
  usesSavedResume,
  locale = "en",
}: {
  analysisId: string;
  usesSavedResume: boolean;
  locale?: Locale;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const t = getMessages(locale).analysis;

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
        setError(payload?.error ?? t.rescoreFailed);
        setRunning(false);
        return;
      }
      router.push(`/dashboard/analysis/${payload.id}`);
    } catch {
      setError(getMessages(locale).billing.unreachable);
      setRunning(false);
    }
  }

  return (
    <div className="text-right">
      <Button variant="secondary" type="button" onClick={rescore} disabled={running}>
        {running && <Spinner />}
        {running ? t.rescoring : t.rescore}
      </Button>
      <p className="mt-1 text-xs text-slate-400">
        {usesSavedResume ? t.rescoreUsesSaved : t.rescoreUsesSame}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}{" "}
          {limitHit && (
            <Link
              href="/dashboard/billing"
              className="font-semibold text-indigo-600 hover:text-indigo-500"
            >
              {t.upgrade}
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
