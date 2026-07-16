import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  compareAtsKeywords,
  scoreChangeLabel,
} from "@/lib/analysis/compare";
import { formatDate } from "@/lib/utils";
import type { AtsKeyword } from "@/lib/types";

// Compact previous-vs-new comparison shown on a re-scored analysis.
// Server-safe (pure props) so pages and tests can render it directly.

export interface ComparisonRun {
  id: string;
  score: number;
  atsKeywords: AtsKeyword[];
  createdAt: string;
  /** Resume version number the run was scored against, when known. */
  resumeVersion?: number | null;
}

function KeywordChips({ keywords, tone }: { keywords: string[]; tone: "green" | "red" }) {
  const shown = keywords.slice(0, 8);
  const more = keywords.length - shown.length;
  const cls =
    tone === "green"
      ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400"
      : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400";
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {shown.map((k) => (
        <span
          key={k}
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
        >
          {k}
        </span>
      ))}
      {more > 0 && (
        <span className="text-xs text-slate-400">+{more} more</span>
      )}
    </span>
  );
}

export function ScoreComparison({
  previous,
  current,
}: {
  previous: ComparisonRun;
  current: ComparisonRun;
}) {
  const delta = current.score - previous.score;
  const label = scoreChangeLabel(previous.score, current.score);
  const ats = compareAtsKeywords(previous.atsKeywords, current.atsKeywords);
  const hasAts =
    previous.atsKeywords.length > 0 || current.atsKeywords.length > 0;
  const tone =
    delta > 0
      ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400"
      : delta < 0
        ? "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400"
        : "bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400";

  const versionLabel = (run: ComparisonRun) =>
    run.resumeVersion != null ? `resume v${run.resumeVersion}` : "same resume";

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Compared to the previous run</CardTitle>
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}
        >
          {label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Previous
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {previous.score}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {versionLabel(previous)} · {formatDate(previous.createdAt)}
          </p>
          <Link
            href={`/dashboard/analysis/${previous.id}`}
            className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-500"
          >
            View previous result
          </Link>
        </div>
        <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-500/10">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
            This run
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {current.score}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {versionLabel(current)} · {formatDate(current.createdAt)}
          </p>
        </div>
      </div>

      {hasAts && (
        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <p>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              ATS keywords:
            </span>{" "}
            matched {ats.previous.matched} → {ats.current.matched} · weak{" "}
            {ats.previous.weak} → {ats.current.weak} · missing{" "}
            {ats.previous.missing} → {ats.current.missing}
          </p>
          {ats.nowMatched.length > 0 && (
            <p>
              Now matched: <KeywordChips keywords={ats.nowMatched} tone="green" />
            </p>
          )}
          {ats.regressed.length > 0 && (
            <p>
              No longer matched:{" "}
              <KeywordChips keywords={ats.regressed} tone="red" />
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Scores measure alignment with this job description. A higher score
        means a stronger keyword and requirement match — it doesn&apos;t
        guarantee interviews or offers.
      </p>
    </Card>
  );
}
