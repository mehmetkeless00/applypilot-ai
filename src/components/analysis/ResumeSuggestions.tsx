"use client";

import { useState } from "react";
import { ApplySuggestionButton } from "@/components/analysis/ApplySuggestion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { getMessages, type Locale } from "@/lib/i18n";
import type { ResumeSuggestion, SuggestionImpact } from "@/lib/types";

const impactTone: Record<SuggestionImpact, "red" | "amber" | "slate"> = {
  high: "red",
  medium: "amber",
  low: "slate",
};

function CopyImprovedButton({
  text,
  label,
  copiedLabel,
}: {
  text: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" type="button" onClick={copy}>
      {copied ? copiedLabel : label}
    </Button>
  );
}

export function ResumeSuggestions({
  suggestions,
  analysisId,
  hasSavedResume = false,
  locale = "en",
}: {
  suggestions: ResumeSuggestion[];
  analysisId?: string;
  hasSavedResume?: boolean;
  locale?: Locale;
}) {
  // Analyses created before this feature have no suggestions — hide the section.
  if (suggestions.length === 0) return null;
  const canApply = Boolean(analysisId) && hasSavedResume;
  const messages = getMessages(locale).analysis;
  const t = messages.suggestions;

  return (
    <Card>
      <CardTitle>{t.title}</CardTitle>
      {!canApply && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t.applyHint}
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
              <Badge tone={impactTone[s.impact]}>{t.impact[s.impact]}</Badge>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t.current}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {s.original_text}
                </p>
              </div>
              <div className="rounded-md bg-green-50 p-3 dark:bg-green-500/10">
                <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
                  {t.improved}
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
                  locale={locale}
                />
              )}
              <CopyImprovedButton
                text={s.improved_text}
                label={t.copyImproved}
                copiedLabel={messages.copied}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
