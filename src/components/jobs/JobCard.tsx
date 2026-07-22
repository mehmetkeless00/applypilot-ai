"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getMessages, type Locale, type Messages } from "@/lib/i18n";
import type { MatchReason, ScoredJobListing } from "@/lib/jobs/types";
import { cn, formatDate, scoreTone } from "@/lib/utils";

// One search result: real listing fields exactly as the provider stated
// them (absent fields are simply not rendered — never filled in), plus the
// deterministic estimated-match preview and its explanation.

const SCORE_TEXT = {
  poor: "text-red-600 dark:text-red-400",
  fair: "text-amber-600 dark:text-amber-400",
  strong: "text-green-600 dark:text-green-400",
} as const;

const MAX_SKILL_BADGES = 6;

function reasonText(
  t: Messages["jobs"]["card"]["reasons"],
  reason: MatchReason,
): string {
  switch (reason.kind) {
    case "title":
      return reason.matched.length > 0
        ? t.titleMatch(reason.matched.join(", "))
        : t.titleNone;
    case "skills":
      return reason.total === 0
        ? t.skillsUnknown
        : t.skills(reason.matched.length, reason.total);
    case "seniority":
      if (reason.fit === "match") return t.seniorityMatch;
      if (reason.fit === "above") return t.seniorityAbove;
      return t.seniorityUnknown;
    case "location":
      if (reason.fit === "match") return t.locationMatch;
      if (reason.fit === "mismatch") return t.locationMismatch;
      return t.locationUnknown;
    case "employment":
      if (reason.fit === "match") return t.employmentMatch;
      if (reason.fit === "mismatch") return t.employmentMismatch;
      return t.employmentUnknown;
    case "authorization":
      return t.authorization;
    case "mandatory":
      return t.mandatory(reason.missing.join(", "));
  }
}

export function JobCard({
  listing,
  locale = "en",
  onAnalyze,
  analyzeDisabled = false,
}: {
  listing: ScoredJobListing;
  locale?: Locale;
  onAnalyze: (listing: ScoredJobListing) => void;
  analyzeDisabled?: boolean;
}) {
  const t = getMessages(locale).jobs;
  const tone = scoreTone(listing.match.score);
  const extraSkills = listing.match.matchedSkills.length - MAX_SKILL_BADGES;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-64">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {listing.title}
            </a>
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-600 dark:text-slate-400">
            {listing.company && <span className="font-medium">{listing.company}</span>}
            {listing.company && listing.location && <span aria-hidden>·</span>}
            {listing.location && <span>{listing.location}</span>}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {listing.remote && <Badge tone="indigo">{t.card.remote}</Badge>}
            {listing.employmentType && (
              <Badge tone="slate">{t.card.employmentTypes[listing.employmentType]}</Badge>
            )}
            {listing.postedAt && (
              <span>{t.card.posted(formatDate(listing.postedAt, locale))}</span>
            )}
            {listing.salary && <span>{t.card.salary(listing.salary)}</span>}
          </p>
        </div>

        <div className="text-right">
          <p
            aria-label={t.card.matchAria(listing.match.score)}
            className={cn("text-2xl font-bold tabular-nums", SCORE_TEXT[tone])}
          >
            {listing.match.score}
            <span className="text-sm font-medium text-slate-400">/100</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.card.estimatedMatch}
          </p>
        </div>
      </div>

      {listing.match.matchedSkills.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.card.matchedSkills}
          </p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {listing.match.matchedSkills.slice(0, MAX_SKILL_BADGES).map((skill) => (
              <Badge key={skill} tone="green">
                {skill}
              </Badge>
            ))}
            {extraSkills > 0 && <Badge tone="slate">+{extraSkills}</Badge>}
          </p>
        </div>
      )}

      {listing.match.missingRequirements.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.card.missingRequirements}
          </p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {listing.match.missingRequirements.map((skill) => (
              <Badge key={skill} tone="red">
                {skill}
              </Badge>
            ))}
          </p>
        </div>
      )}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          {t.card.whySummary}
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-400">
          {listing.match.reasons.map((reason, i) => (
            <li key={i}>{reasonText(t.card.reasons, reason)}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {t.card.disclaimer}
        </p>
      </details>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t.card.source(t.providers[listing.provider])}
          {" · "}
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            {t.card.viewListing}
          </a>
        </p>
        <Button
          type="button"
          onClick={() => onAnalyze(listing)}
          disabled={analyzeDisabled}
        >
          {t.card.analyze}
        </Button>
      </div>
    </Card>
  );
}
