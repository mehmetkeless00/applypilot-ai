"use client";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { JobCard } from "./JobCard";
import { getMessages, type Locale } from "@/lib/i18n";
import type { JobSearchResponse, ProviderStatus, ScoredJobListing } from "@/lib/jobs/types";

// Pure, prop-driven rendering of the search results area, split out of
// JobSearch so every phase (initial/loading/failed/loaded — including
// zero-result and partial/full provider failure) is directly testable by
// passing props, with no DOM/browser needed to drive state transitions.

export type SearchPhase = "initial" | "loading" | "failed" | "loaded";

export function JobSearchPanel({
  phase,
  results,
  formError,
  locale = "en",
  onRetry,
  onAnalyze,
  analyzeDisabled = false,
}: {
  phase: SearchPhase;
  results: JobSearchResponse | null;
  formError: string | null;
  locale?: Locale;
  onRetry: () => void;
  onAnalyze: (listing: ScoredJobListing) => void;
  analyzeDisabled?: boolean;
}) {
  const t = getMessages(locale).jobs;

  if (phase === "initial") {
    return (
      <p className="rounded-xl bg-slate-50 px-6 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
        {t.results.initialHint}
      </p>
    );
  }

  if (phase === "loading") {
    return (
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="space-y-3 rounded-xl bg-red-50 px-6 py-8 text-center ring-1 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/30">
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {formError ?? t.results.fullFailure}
        </p>
        <Button type="button" variant="secondary" onClick={onRetry}>
          {t.results.retry}
        </Button>
      </div>
    );
  }

  // phase === "loaded"
  if (!results) return null;

  const providerStates: ProviderStatus[] = [
    results.providers.adzuna,
    results.providers.remotive,
  ];
  const activeStates = providerStates.filter((s) => s === "ok" || s === "failed");
  const noProviders = activeStates.length === 0;
  const allFailed = activeStates.length > 0 && activeStates.every((s) => s === "failed");
  const someFailed = !allFailed && activeStates.includes("failed");

  return (
    <section aria-label={t.results.heading} className="space-y-4">
      {(noProviders || allFailed) && (
        <div className="space-y-3 rounded-xl bg-red-50 px-6 py-8 text-center ring-1 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/30">
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {noProviders ? t.results.noProviders : t.results.fullFailure}
          </p>
          {allFailed && (
            <Button type="button" variant="secondary" onClick={onRetry}>
              {t.results.retry}
            </Button>
          )}
        </div>
      )}

      {someFailed && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30"
        >
          {t.results.partialFailure}
        </p>
      )}

      {!noProviders && !allFailed && results.listings.length === 0 && (
        <div className="rounded-xl bg-slate-50 px-6 py-10 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.results.emptyTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {t.results.emptyDescription}
          </p>
        </div>
      )}

      {results.listings.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t.results.count(results.listings.length)}
          </h2>
          <ul className="space-y-4">
            {results.listings.map((listing) => (
              <li key={listing.id}>
                <JobCard
                  listing={listing}
                  locale={locale}
                  onAnalyze={onAnalyze}
                  analyzeDisabled={analyzeDisabled}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
