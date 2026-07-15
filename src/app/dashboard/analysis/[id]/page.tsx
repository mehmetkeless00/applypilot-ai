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
import { ScoreDelta } from "@/components/analysis/ScoreDelta";
import { formatDate } from "@/lib/utils";
import { decodeAnalysisMetadata } from "@/lib/text";
import type { Analysis } from "@/lib/types";

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
  // Decode legacy entity-encoded metadata for display.
  const analysis = decodeAnalysisMetadata(data as Analysis);
  const slug = analysis.job_title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // When this run re-scored an earlier one, fetch it for the delta display.
  let previous: { id: string; fit_score: number } | null = null;
  if (analysis.rescored_from) {
    const { data: prev } = await supabase
      .from("analyses")
      .select("id, fit_score")
      .eq("id", analysis.rescored_from)
      .maybeSingle();
    previous = prev ?? null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← All analyses
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {analysis.job_title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {analysis.company || "Company not specified"} ·{" "}
            {formatDate(analysis.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RescoreButton
            analysisId={analysis.id}
            usesSavedResume={Boolean(analysis.resume_id)}
          />
          <ExportButtons analysisId={analysis.id} doc="full" formats={["pdf"]} />
          <DeleteAnalysisButton id={analysis.id} />
        </div>
      </div>

      <Card className="flex flex-col items-center gap-6 sm:flex-row">
        <ScoreGauge score={analysis.fit_score} />
        <div>
          <CardTitle>Fit assessment</CardTitle>
          {previous && (
            <ScoreDelta
              previousId={previous.id}
              previousScore={previous.fit_score}
              currentScore={analysis.fit_score}
            />
          )}
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {analysis.fit_summary}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Strengths strengths={analysis.strengths} />
        <MissingSkills skills={analysis.missing_skills} />
      </div>

      <AtsCoverage keywords={analysis.ats_keywords ?? []} />

      <ResumeSuggestions suggestions={analysis.resume_suggestions ?? []} />

      <Card>
        <CardTitle>Tailored professional summary</CardTitle>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
          {analysis.tailored_summary}
        </p>
        <CopyableText
          text={analysis.tailored_summary}
          filename={`summary-${slug}.txt`}
        />
        <ExportButtons analysisId={analysis.id} doc="summary" className="mt-2" />
      </Card>

      <Card>
        <CardTitle>Cover letter</CardTitle>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
          {analysis.cover_letter}
        </div>
        <CopyableText
          text={analysis.cover_letter}
          filename={`cover-letter-${slug}.md`}
        />
        <ExportButtons
          analysisId={analysis.id}
          doc="cover_letter"
          className="mt-2"
        />
      </Card>
    </div>
  );
}
