"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { getMessages, type Locale } from "@/lib/i18n";

/**
 * Shown when the UI language and the analysis's output language differ:
 * explains that the stored report has its own language and offers to
 * regenerate the analysis in the UI's language after explicit
 * confirmation. Regeneration runs the full pipeline via the rescore
 * endpoint (one quota unit; the original analysis is preserved).
 */
export function RegenerateLanguageNotice({
  analysisId,
  targetLanguage,
  locale = "en",
}: {
  analysisId: string;
  /** The language the new analysis will be generated in. */
  targetLanguage: "en" | "tr";
  locale?: Locale;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const t = getMessages(locale).analysis;

  async function regenerate() {
    setRunning(true);
    setError(null);
    setLimitHit(false);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/rescore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputLanguage: targetLanguage }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setLimitHit(res.status === 402);
        setError(payload?.error ?? t.rescoreFailed);
        setRunning(false);
        dialogRef.current?.close();
        return;
      }
      router.push(`/dashboard/analysis/${payload.id}`);
    } catch {
      setError(getMessages(locale).billing.unreachable);
      setRunning(false);
      dialogRef.current?.close();
    }
  }

  return (
    <div
      role="note"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800"
    >
      <p className="min-w-0 flex-1 basis-64">{t.languageMismatch}</p>
      <Button
        type="button"
        variant="secondary"
        onClick={() => dialogRef.current?.showModal()}
      >
        {t.regenerate}
      </Button>
      {error && (
        <p role="alert" className="w-full text-xs text-red-600 dark:text-red-400">
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

      <dialog
        ref={dialogRef}
        aria-labelledby="regenerate-language-title"
        className="m-auto w-full max-w-md rounded-xl bg-white p-6 shadow-xl backdrop:bg-slate-900/50 dark:bg-slate-900"
      >
        <h2
          id="regenerate-language-title"
          className="text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          {t.regenerateConfirmTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {t.regenerateConfirmBody}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialogRef.current?.close()}
            disabled={running}
          >
            {getMessages(locale).common.cancel}
          </Button>
          <Button type="button" onClick={regenerate} disabled={running}>
            {running && <Spinner />}
            {running ? t.regenerating : t.regenerate}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
