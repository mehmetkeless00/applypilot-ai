"use client";

import { useState } from "react";
import { ApplySuggestionButton } from "@/components/analysis/ApplySuggestion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import type { ResumeSuggestion, SuggestionImpact } from "@/lib/types";

const impactMeta: Record<SuggestionImpact, { label: string; tone: "red" | "amber" | "slate" }> = {
  high: { label: "High impact", tone: "red" },
  medium: { label: "Medium impact", tone: "amber" },
  low: { label: "Low impact", tone: "slate" },
};

function CopyImprovedButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" type="button" onClick={copy}>
      {copied ? "Copied!" : "Copy improved text"}
    </Button>
  );
}

export function ResumeSuggestions({
  suggestions,
  analysisId,
  hasSavedResume = false,
}: {
  suggestions: ResumeSuggestion[];
  analysisId?: string;
  hasSavedResume?: boolean;
}) {
  // Analyses created before this feature have no suggestions — hide the section.
  if (suggestions.length === 0) return null;
  const canApply = Boolean(analysisId) && hasSavedResume;

  return (
    <Card>
      <CardTitle>Resume Improvement Suggestions</CardTitle>
      {!canApply && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Run analyses with a saved resume to apply suggestions in one click —
          for now, copy the improved text into your resume manually.
        </p>
      )}
      <ul className="mt-4 space-y-6">
        {suggestions.map((s, i) => (
          <li
            key={i}
            className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {s.section}
              </p>
              <Badge tone={impactMeta[s.impact].tone}>
                {impactMeta[s.impact].label}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Current
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {s.original_text}
                </p>
              </div>
              <div className="rounded-md bg-green-50 p-3 dark:bg-green-500/10">
                <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
                  Improved
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {s.improved_text}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {s.reason}
            </p>
            <div className="mt-3 flex flex-wrap items-start gap-3">
              {canApply && (
                <ApplySuggestionButton
                  analysisId={analysisId!}
                  suggestionIndex={i}
                  suggestion={s}
                />
              )}
              <CopyImprovedButton text={s.improved_text} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
