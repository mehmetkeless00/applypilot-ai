import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { getMessages, type Locale } from "@/lib/i18n";
import type { AtsKeyword, AtsStatus } from "@/lib/types";

const statusTone: Record<AtsStatus, "green" | "amber" | "red"> = {
  matched: "green",
  weak: "amber",
  missing: "red",
};

export function AtsCoverage({
  keywords,
  locale = "en",
}: {
  keywords: AtsKeyword[];
  locale?: Locale;
}) {
  // Analyses created before this feature have no keyword data — hide the section.
  if (keywords.length === 0) return null;
  const t = getMessages(locale).analysis;

  const counts = { matched: 0, weak: 0, missing: 0 };
  for (const k of keywords) counts[k.status]++;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>{t.atsTitle}</CardTitle>
        <div className="flex gap-2">
          <Badge tone="green">{t.atsCounts.matched(counts.matched)}</Badge>
          <Badge tone="amber">{t.atsCounts.weak(counts.weak)}</Badge>
          <Badge tone="red">{t.atsCounts.missing(counts.missing)}</Badge>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {keywords.map((k) => (
          <li key={k.keyword} className="flex gap-3 py-3 text-sm">
            <Badge tone={statusTone[k.status]} className="h-fit shrink-0">
              {t.atsStatus[k.status]}
            </Badge>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {k.keyword}
                <span className="ml-2 text-xs font-medium text-slate-400">
                  {t.atsImportance[k.importance]}
                </span>
              </p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                {k.suggestion}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
