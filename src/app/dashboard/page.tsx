import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import {
  OnboardingChecklist,
  shouldShowOnboarding,
} from "@/components/dashboard/OnboardingChecklist";
import { formatDate, scoreTone } from "@/lib/utils";
import { decodeAnalysisMetadata } from "@/lib/text";
import { getMessages } from "@/lib/i18n";
import { getLocale, pageTitle } from "@/lib/i18n/server";
import type { Analysis } from "@/lib/types";

export const generateMetadata = () => pageTitle("myAnalyses");

const toneToBadge = { poor: "red", fair: "amber", strong: "green" } as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = getMessages(locale);
  const { data } = await supabase
    .from("analyses")
    .select(
      "id, job_title, company, fit_score, created_at, rescored_from, resume_version_id, output_language",
    )
    .order("created_at", { ascending: false });

  // Legacy imports may hold entity-encoded metadata — decode for display.
  const analyses = ((data ?? []) as Pick<
    Analysis,
    | "id"
    | "job_title"
    | "company"
    | "fit_score"
    | "created_at"
    | "rescored_from"
    | "resume_version_id"
    | "output_language"
  >[]).map(decodeAnalysisMetadata);

  const total = analyses.length;

  // Resolve resume-version numbers for rows that ran against a saved version.
  const versionIds = [
    ...new Set(
      analyses
        .map((a) => a.resume_version_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const versionNumbers = new Map<string, number>();
  if (versionIds.length > 0) {
    const { data: versions } = await supabase
      .from("resume_versions")
      .select("id, version")
      .in("id", versionIds);
    for (const v of versions ?? []) versionNumbers.set(v.id, v.version);
  }

  // Onboarding progress comes from the user's own rows (RLS-scoped) and is
  // only queried while there's no analysis yet.
  let hasResume = false;
  if (shouldShowOnboarding(total)) {
    const { count } = await supabase
      .from("resumes")
      .select("id", { count: "exact", head: true });
    hasResume = (count ?? 0) > 0;
  }

  const avg = total
    ? Math.round(analyses.reduce((sum, a) => sum + a.fit_score, 0) / total)
    : 0;
  const best = total ? Math.max(...analyses.map((a) => a.fit_score)) : 0;
  const rescores = analyses.filter((a) => a.rescored_from).length;

  const stats = [
    { label: t.dashboard.stats.analyses, value: String(total) },
    { label: t.dashboard.stats.averageFit, value: `${avg}/100` },
    { label: t.dashboard.stats.bestFit, value: `${best}/100` },
    { label: t.dashboard.stats.rescores, value: String(rescores) },
  ];

  return (
    <div className="animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.dashboard.title}
        </h1>
        <Link
          href="/dashboard/new"
          className="inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 md:hidden"
        >
          {t.nav.newAnalysis}
        </Link>
      </div>

      {total > 0 && (
        <dl className="mt-6 grid grid-cols-2 divide-slate-200 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 sm:grid-cols-4 sm:divide-x dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
          {stats.map((stat) => (
            <div key={stat.label} className="px-5 py-4">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {stat.label}
              </dt>
              <dd className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {shouldShowOnboarding(total) ? (
        <div className="mt-8">
          <OnboardingChecklist hasResume={hasResume} locale={locale} />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
          {analyses.map((a) => {
            const version = a.resume_version_id
              ? versionNumbers.get(a.resume_version_id)
              : undefined;
            return (
              <li key={a.id}>
                <Link
                  href={`/dashboard/analysis/${a.id}`}
                  className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5 dark:hover:bg-slate-800/50"
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ring-inset data-[tone=strong]:bg-green-50 data-[tone=strong]:text-green-700 data-[tone=strong]:ring-green-600/30 data-[tone=fair]:bg-amber-50 data-[tone=fair]:text-amber-700 data-[tone=fair]:ring-amber-600/30 data-[tone=poor]:bg-red-50 data-[tone=poor]:text-red-700 data-[tone=poor]:ring-red-600/30 dark:data-[tone=strong]:bg-green-500/10 dark:data-[tone=fair]:bg-amber-500/10 dark:data-[tone=poor]:bg-red-500/10"
                    data-tone={scoreTone(a.fit_score)}
                  >
                    {a.fit_score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                      {a.job_title}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500 dark:text-slate-400">
                      <span className="truncate">
                        {a.company || t.dashboard.companyUnknown}
                      </span>
                      <span aria-hidden>·</span>
                      <span className="whitespace-nowrap">
                        {formatDate(a.created_at, locale)}
                      </span>
                      {version !== undefined && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="whitespace-nowrap">v{version}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.output_language && a.output_language !== locale && (
                      <Badge tone="slate">{a.output_language.toUpperCase()}</Badge>
                    )}
                    <Badge tone={toneToBadge[scoreTone(a.fit_score)]}>
                      {t.dashboard.fit[scoreTone(a.fit_score)]}
                    </Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
