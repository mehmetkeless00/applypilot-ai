import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import type { AtsKeyword, AtsStatus } from "@/lib/types";

const statusMeta: Record<AtsStatus, { label: string; tone: "green" | "amber" | "red" }> = {
  matched: { label: "Matched", tone: "green" },
  weak: { label: "Weak", tone: "amber" },
  missing: { label: "Missing", tone: "red" },
};

const importanceLabel = {
  required: "Required",
  preferred: "Preferred",
  nice_to_have: "Nice to have",
} as const;

export function AtsCoverage({ keywords }: { keywords: AtsKeyword[] }) {
  // Analyses created before this feature have no keyword data — hide the section.
  if (keywords.length === 0) return null;

  const counts = { matched: 0, weak: 0, missing: 0 };
  for (const k of keywords) counts[k.status]++;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>ATS keyword coverage</CardTitle>
        <div className="flex gap-2">
          <Badge tone="green">{counts.matched} matched</Badge>
          <Badge tone="amber">{counts.weak} weak</Badge>
          <Badge tone="red">{counts.missing} missing</Badge>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {keywords.map((k) => (
          <li key={k.keyword} className="flex gap-3 py-3 text-sm">
            <Badge tone={statusMeta[k.status].tone} className="h-fit shrink-0">
              {statusMeta[k.status].label}
            </Badge>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {k.keyword}
                <span className="ml-2 text-xs font-medium text-slate-400">
                  {importanceLabel[k.importance]}
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
