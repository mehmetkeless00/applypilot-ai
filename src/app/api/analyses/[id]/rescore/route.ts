import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analysisErrorResponse, executeAnalysis } from "@/lib/analysis/execute";
import { decodeAnalysisMetadata } from "@/lib/text";
import type { Analysis } from "@/lib/types";

export const maxDuration = 300;

/**
 * Re-runs an analysis for the same job. When the original used a saved
 * resume, the resume's *latest* version is used — that's the point of the
 * loop: edit your resume, re-score, see the delta. Legacy analyses without
 * a saved resume are re-run against their stored resume text/PDF.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  // RLS scopes the read to the caller's own analyses.
  const { data } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  // Decode legacy entity-encoded metadata so the re-scored analysis is
  // persisted with clean values.
  const original = decodeAnalysisMetadata(data as Analysis);

  const hasSavedResume = Boolean(original.resume_id);
  if (!hasSavedResume && !original.resume_text && !original.resume_file_path) {
    return NextResponse.json(
      { error: "The original resume isn't available for this analysis." },
      { status: 400 },
    );
  }

  try {
    const { id: newId } = await executeAnalysis(supabase, user, {
      jobTitle: original.job_title,
      company: original.company ?? undefined,
      jobDescription: original.job_description,
      resumeId: original.resume_id ?? undefined,
      resumeText: hasSavedResume ? undefined : (original.resume_text ?? undefined),
      resumeFilePath:
        hasSavedResume || original.resume_text
          ? undefined
          : (original.resume_file_path ?? undefined),
      rescoredFrom: original.id,
    });
    return NextResponse.json({ id: newId });
  } catch (err) {
    return analysisErrorResponse(err);
  }
}
