import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSuggestionSupported } from "@/lib/ai/sanitize";
import {
  applySuggestionToContent,
  isApplicableSuggestion,
} from "@/lib/resumes/applySuggestion";
import { addResumeVersion, fetchLatestVersion } from "@/lib/resumes/resumes";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import type { ResumeSuggestion } from "@/lib/types";

// Applies one resume suggestion from an analysis to the linked saved
// resume, creating the next immutable version. The suggestion itself is
// always read from the stored analysis (never from the client), the
// replacement is refused unless the original text still appears exactly
// once, and the factual-integrity guard is re-checked at apply time.
// Creating a version consumes no analysis quota.

type ConflictCode =
  | "no_saved_resume"
  | "no_text"
  | "text_not_found"
  | "multiple_matches";

function conflict(code: ConflictCode, error: string) {
  return NextResponse.json({ error, code }, { status: 409 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const t = getMessages(await getLocale()).errors;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t.notAuthenticated }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const index = body?.suggestion;
  if (!Number.isInteger(index) || index < 0 || index > 99) {
    return NextResponse.json({ error: t.apply.invalidRef }, { status: 400 });
  }

  const { id } = await params;
  // RLS scopes the read to the caller's own analyses; the explicit owner
  // check below is defense in depth.
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, user_id, resume_id, resume_suggestions")
    .eq("id", id)
    .single();
  if (!analysis || analysis.user_id !== user.id) {
    return NextResponse.json({ error: t.analysisNotFound }, { status: 404 });
  }

  const suggestions = (analysis.resume_suggestions ?? []) as unknown[];
  const suggestion = suggestions[index];
  if (suggestion === undefined) {
    return NextResponse.json({ error: t.apply.notOnAnalysis }, { status: 400 });
  }
  if (!isApplicableSuggestion(suggestion)) {
    return NextResponse.json({ error: t.apply.cantAutoApply }, { status: 422 });
  }
  const s: ResumeSuggestion = suggestion;

  if (!analysis.resume_id) {
    return conflict("no_saved_resume", t.apply.noSavedResume);
  }

  // RLS scopes versions to the owner; verify explicitly as well.
  const latest = await fetchLatestVersion(supabase, analysis.resume_id);
  if (!latest || latest.user_id !== user.id) {
    return conflict("no_saved_resume", t.apply.resumeGone);
  }
  if (!latest.content) {
    return conflict("no_text", t.apply.noText);
  }

  // Duplicate-submit protection: the same suggestion applied on top of the
  // same version returns the version it already created.
  const { data: existing } = await supabase
    .from("resume_versions")
    .select("id, version")
    .eq("resume_id", analysis.resume_id)
    .eq("source", "applied_suggestion")
    .eq("source_analysis_id", analysis.id)
    .eq("source_suggestion", index)
    .eq("previous_version_id", latest.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      versionId: existing.id,
      version: existing.version,
      resumeId: analysis.resume_id,
      alreadyApplied: true,
    });
  }

  // Re-run the factual-integrity guard against the *current* resume text.
  // Stored suggestions passed it at analysis time, but legacy analyses
  // predate the guard and the resume may have changed since.
  if (!isSuggestionSupported(s, latest.content)) {
    return NextResponse.json({ error: t.apply.integrityFailed }, { status: 422 });
  }

  const outcome = applySuggestionToContent(
    latest.content,
    s.original_text,
    s.improved_text,
  );
  if (!outcome.ok) {
    return outcome.reason === "not_found"
      ? conflict("text_not_found", t.apply.textNotFound)
      : conflict("multiple_matches", t.apply.multipleMatches);
  }

  const created = await addResumeVersion(supabase, user.id, analysis.resume_id, {
    content: outcome.content,
    source: "applied_suggestion",
    sourceAnalysisId: analysis.id,
    sourceSuggestion: index,
    previousVersionId: latest.id,
  });
  if (!created) {
    // A concurrent double-click may have won the unique-index race — if a
    // matching version exists now, return it instead of failing.
    const { data: raced } = await supabase
      .from("resume_versions")
      .select("id, version")
      .eq("resume_id", analysis.resume_id)
      .eq("source", "applied_suggestion")
      .eq("source_analysis_id", analysis.id)
      .eq("source_suggestion", index)
      .eq("previous_version_id", latest.id)
      .maybeSingle();
    if (raced) {
      return NextResponse.json({
        versionId: raced.id,
        version: raced.version,
        resumeId: analysis.resume_id,
        alreadyApplied: true,
      });
    }
    return NextResponse.json({ error: t.apply.createFailed }, { status: 500 });
  }

  return NextResponse.json({
    versionId: created.versionId,
    version: created.version,
    resumeId: analysis.resume_id,
    alreadyApplied: false,
  });
}
