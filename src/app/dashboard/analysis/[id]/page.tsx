import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/Card";
import { ScoreGauge } from "@/components/analysis/ScoreGauge";
import { AtsCoverage } from "@/components/analysis/AtsCoverage";
import { ResumeSuggestions } from "@/components/analysis/ResumeSuggestions";
import { MissingSkills } from "@/components/analysis/MissingSkills";
import { Strengths } from "@/components/analysis/Strengths";
import { CopyableText } from "@/components/analysis/CopyableText";
import { DeleteAnalysisButton } from "@/components/analysis/DeleteAnalysisButton";
import { ExportButtons } from "@/components/analysis/ExportButtons";
import { RescoreButton } from "@/components/analysis/RescoreButton";
import {
  ScoreComparison,
  type ComparisonRun,
} from "@/components/analysis/ScoreComparison";
import { formatDate } from "@/lib/utils";
import { decodeAnalysisMetadata } from "@/lib/text";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import type { Analysis, AtsKeyword } from "@/lib/types";

export const metadata = { title: "Analysis" };

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const locale = await getLocale();
  const t = getMessages(locale);
  // Decode legacy entity-encoded metadata for display.
  const analysis = decodeAnalysisMetadata(data as Analysis);
  const slug = analysis.job_title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // When this run re-scored an earlier one, fetch it (plus the resume
  // version numbers involved) for the comparison card.
  let comparison: { previous: ComparisonRun; current: ComparisonRun } | null =
    null;
  if (analysis.rescored_from) {
    const { data: prev } = await supabase
      .from("analyses")
      .select("id, fit_score, ats_keywords, resume_version_id, created_at")
      .eq("id", analysis.rescored_from)
      .maybeSingle();
    if (prev) {
      const versionIds = [prev.resume_version_id, analysis.resume_version_id]
        .filter((v): v is string => Boolean(v));
      const versionNumbers = new Map<string, number>();
      if (versionIds.length > 0) {
        const { data: versions } = await supabase
          .from("resume_versions")
          .select("id, version")
          .in("id", versionIds);
        for (const v of versions ?? []) versionNumbers.set(v.id, v.version);
      }
      comparison = {
        previous: {
          id: prev.id,
          score: prev.fit_score,
          atsKeywords: (prev.ats_keywords ?? []) as AtsKeyword[],
          createdAt: prev.created_at,
          resumeVersion: prev.resume_version_id
            ? (versionNumbers.get(prev.resume_version_id) ?? null)
            : null,
        },
        current: {
          id: analysis.id,
          score: analysis.fit_score,
          atsKeywords: analysis.ats_keywords ?? [],
          createdAt: analysis.created_at,
          resumeVersion: analysis.resume_version_id
            ? (versionNumbers.get(analysis.resume_version_id) ?? null)
            : null,
        },
      };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            {t.analysis.back}
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {analysis.job_title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {analysis.company || t.dashboard.companyUnknown} ·{" "}
            {formatDate(analysis.created_at, locale)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RescoreButton
            analysisId={analysis.id}
            usesSavedResume={Boolean(analysis.resume_id)}
            locale={locale}
          />
          <ExportButtons
            analysisId={analysis.id}
            doc="full"
            formats={["pdf"]}
            locale={locale}
          />
          <DeleteAnalysisButton id={analysis.id} locale={locale} />
        </div>
      </div>

      <Card className="flex flex-col items-center gap-6 sm:flex-row">
        <ScoreGauge score={analysis.fit_score} locale={locale} />
        <div>
          <CardTitle>{t.analysis.fitAssessment}</CardTitle>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {analysis.fit_summary}
          </p>
        </div>
      </Card>

      {comparison && (
        <ScoreComparison
          previous={comparison.previous}
          current={comparison.current}
          locale={locale}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Strengths strengths={analysis.strengths} locale={locale} />
        <MissingSkills skills={analysis.missing_skills} locale={locale} />
      </div>

      <AtsCoverage keywords={analysis.ats_keywords ?? []} locale={locale} />

      <ResumeSuggestions
        suggestions={analysis.resume_suggestions ?? []}
        analysisId={analysis.id}
        hasSavedResume={Boolean(analysis.resume_id)}
        locale={locale}
      />

      <Card>
        <CardTitle>{t.analysis.summaryTitle}</CardTitle>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
          {analysis.tailored_summary}
        </p>
        <CopyableText
          text={analysis.tailored_summary}
          filename={`summary-${slug}.txt`}
          locale={locale}
        />
        <ExportButtons
          analysisId={analysis.id}
          doc="summary"
          className="mt-2"
          locale={locale}
        />
      </Card>

      <Card>
        <CardTitle>{t.analysis.coverLetterTitle}</CardTitle>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
          {analysis.cover_letter}
        </div>
        <CopyableText
          text={analysis.cover_letter}
          filename={`cover-letter-${slug}.md`}
          locale={locale}
        />
        <ExportButtons
          analysisId={analysis.id}
          doc="cover_letter"
          className="mt-2"
          locale={locale}
        />
      </Card>
    </div>
  );
}
