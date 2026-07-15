import { ApiError } from "@google/genai";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { analyze, AnalysisRefusedError, AIConfigError } from "@/lib/ai/analyze";
import { normalizePlan, PLANS } from "@/lib/billing/plans";
import {
  countUsageSince,
  hourAgo,
  monthStartUtc,
  recordUsage,
} from "@/lib/billing/usage";
import { createResumeWithVersion, fetchLatestVersion } from "@/lib/resumes/resumes";

// Shared analysis execution used by POST /api/analyze and the re-score
// route: plan limits, resume resolution, the AI call, and the insert.

export const ANALYSES_PER_HOUR = 10;

/** A request-level failure with a user-facing message and HTTP status. */
export class AnalysisRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AnalysisRequestError";
  }
}

export interface ExecuteAnalysisInput {
  jobTitle: string;
  company?: string;
  jobDescription: string;
  resumeText?: string;
  resumeFilePath?: string;
  resumeId?: string;
  saveResumeTitle?: string;
  rescoredFrom?: string;
}

export async function executeAnalysis(
  supabase: SupabaseClient,
  user: User,
  input: ExecuteAnalysisInput,
): Promise<{ id: string }> {
  // Monthly plan limit (free 3 / pro 50), reset on UTC calendar months.
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = normalizePlan(profile?.plan);
  const monthlyLimit = PLANS[plan].analysesPerMonth;
  // Usage comes from the append-only ledger, so deleting analyses
  // doesn't refund quota.
  const monthCount = await countUsageSince(supabase, "analysis", monthStartUtc());
  if (monthCount >= monthlyLimit) {
    throw new AnalysisRequestError(
      plan === "free"
        ? `You've used all ${monthlyLimit} free analyses this month. Upgrade to Pro for ${PLANS.pro.analysesPerMonth}/month.`
        : `You've used all ${monthlyLimit} Pro analyses this month. Your limit resets on the 1st.`,
      402,
    );
  }

  // Simple per-user anti-abuse rate limit.
  const hourCount = await countUsageSince(supabase, "analysis", hourAgo());
  if (hourCount >= ANALYSES_PER_HOUR) {
    throw new AnalysisRequestError(
      "Rate limit reached — try again in an hour.",
      429,
    );
  }

  // Resolve the resume source: a saved resume's latest version, or the
  // text/PDF provided inline with the request.
  let resumeText = input.resumeText;
  let resumeFilePath = input.resumeFilePath;
  let resumeId: string | null = null;
  let resumeVersionId: string | null = null;

  if (input.resumeId) {
    const version = await fetchLatestVersion(supabase, input.resumeId);
    if (!version) {
      throw new AnalysisRequestError("That saved resume wasn't found.", 404);
    }
    resumeText = version.content ?? undefined;
    resumeFilePath = version.file_path ?? undefined;
    resumeId = input.resumeId;
    resumeVersionId = version.id;
  }

  // When a PDF was uploaded, fetch it from storage (RLS scopes access,
  // but verify the path prefix anyway) and base64-encode for the model.
  let resumePdfBase64: string | undefined;
  if (resumeFilePath) {
    if (!resumeFilePath.startsWith(`${user.id}/`)) {
      throw new AnalysisRequestError("Invalid resume file", 400);
    }
    const { data: file, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(resumeFilePath);
    if (downloadError || !file) {
      throw new AnalysisRequestError("Could not read the uploaded resume", 400);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    // The bucket's MIME restriction trusts the client; verify the content.
    if (!bytes.subarray(0, 5).toString("latin1").startsWith("%PDF-")) {
      throw new AnalysisRequestError(
        "The uploaded file isn't a valid PDF. Re-upload your resume.",
        400,
      );
    }
    resumePdfBase64 = bytes.toString("base64");
  }

  // Optionally save an inline resume to the library before analyzing.
  if (!input.resumeId && input.saveResumeTitle && (resumeText || resumeFilePath)) {
    const created = await createResumeWithVersion(
      supabase,
      user.id,
      input.saveResumeTitle,
      {
        content: resumeText,
        filePath: resumeFilePath,
        source: resumeFilePath ? "pdf" : "paste",
      },
    );
    if (created) {
      resumeId = created.resumeId;
      resumeVersionId = created.versionId;
    }
  }

  const { result, servedBy } = await analyze({
    jobTitle: input.jobTitle,
    company: input.company,
    jobDescription: input.jobDescription,
    resumeText: resumePdfBase64 ? undefined : resumeText,
    resumePdfBase64,
  });

  const { data: row, error: insertError } = await supabase
    .from("analyses")
    .insert({
      user_id: user.id,
      job_title: input.jobTitle,
      company: input.company ?? null,
      job_description: input.jobDescription,
      resume_text: resumeText ?? null,
      resume_file_path: resumeFilePath ?? null,
      resume_id: resumeId,
      resume_version_id: resumeVersionId,
      rescored_from: input.rescoredFrom ?? null,
      fit_score: result.fit_score,
      fit_summary: result.fit_summary,
      missing_skills: result.missing_skills,
      strengths: result.strengths,
      tailored_summary: result.tailored_summary,
      cover_letter: result.cover_letter,
      ats_keywords: result.ats_keywords,
      resume_suggestions: result.resume_suggestions,
      model: servedBy,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("Failed to save analysis:", insertError);
    throw new AnalysisRequestError(
      "Analysis succeeded but could not be saved. Try again.",
      500,
    );
  }

  await recordUsage(supabase, user.id, "analysis");

  return { id: row.id };
}

/** Maps execution errors (request-level and AI-provider) to responses. */
export function analysisErrorResponse(err: unknown): NextResponse {
  if (err instanceof AnalysisRequestError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof AIConfigError) {
    console.error(err.message);
    return NextResponse.json(
      { error: "The AI service is not configured on the server. Set GEMINI_API_KEY and restart." },
      { status: 500 },
    );
  }
  if (err instanceof AnalysisRefusedError) {
    return NextResponse.json(
      { error: "We couldn't analyze this content. Check that the job description and resume are standard application materials." },
      { status: 422 },
    );
  }
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      console.error("Gemini auth error — check GEMINI_API_KEY:", err.message);
      return NextResponse.json(
        { error: "The server's AI credentials were rejected. Check GEMINI_API_KEY." },
        { status: 500 },
      );
    }
    if (err.status === 429) {
      return NextResponse.json(
        { error: "The AI service is busy — try again in a minute." },
        { status: 429 },
      );
    }
    console.error("Gemini API error:", err.status, err.message);
    return NextResponse.json(
      { error: "The AI service returned an error. Try again shortly." },
      { status: 502 },
    );
  }
  if (err instanceof TypeError && err.message.includes("fetch")) {
    return NextResponse.json(
      { error: "Could not reach the AI service. Try again." },
      { status: 502 },
    );
  }
  console.error("Unexpected analyze error:", err);
  return NextResponse.json(
    { error: "Something went wrong. Try again." },
    { status: 500 },
  );
}
