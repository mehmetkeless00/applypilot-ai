import { ApiError } from "@google/genai";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { analyze, AnalysisRefusedError, AIConfigError } from "@/lib/ai/analyze";
import { sanitizeAnalysisResult } from "@/lib/ai/sanitize";
import { normalizePlan, PLANS } from "@/lib/billing/plans";
import {
  countUsageSince,
  hourAgo,
  monthStartUtc,
  recordUsage,
} from "@/lib/billing/usage";
import { createResumeWithVersion, fetchLatestVersion } from "@/lib/resumes/resumes";
import { extractPdfText } from "@/lib/resumes/extract";
import { DEFAULT_LOCALE, getMessages, type Locale } from "@/lib/i18n";

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
  /** Language of the AI-generated output (stored on the analysis). */
  outputLanguage?: "en" | "tr";
  /** UI locale for user-facing error messages. */
  locale?: Locale;
}

export async function executeAnalysis(
  supabase: SupabaseClient,
  user: User,
  input: ExecuteAnalysisInput,
): Promise<{ id: string }> {
  const t = getMessages(input.locale ?? DEFAULT_LOCALE);
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
        ? t.errors.quotaFree(monthlyLimit, PLANS.pro.analysesPerMonth)
        : t.errors.quotaPro(monthlyLimit),
      402,
    );
  }

  // Simple per-user anti-abuse rate limit.
  const hourCount = await countUsageSince(supabase, "analysis", hourAgo());
  if (hourCount >= ANALYSES_PER_HOUR) {
    throw new AnalysisRequestError(t.errors.rateLimited, 429);
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
      throw new AnalysisRequestError(t.errors.savedResumeNotFound, 404);
    }
    if (version.content) {
      // Parsed/edited text is preferred; the original PDF stays in storage
      // untouched and is only used when no text exists (e.g. scanned PDFs).
      resumeText = version.content;
      resumeFilePath = undefined;
    } else {
      resumeText = undefined;
      resumeFilePath = version.file_path ?? undefined;
    }
    resumeId = input.resumeId;
    resumeVersionId = version.id;
  }

  // When a PDF was uploaded, fetch it from storage (RLS scopes access,
  // but verify the path prefix anyway) and base64-encode for the model.
  let resumePdfBase64: string | undefined;
  let parsedPdfText: string | null = null;
  if (resumeFilePath) {
    if (!resumeFilePath.startsWith(`${user.id}/`)) {
      throw new AnalysisRequestError(t.errors.invalidResumeFile, 400);
    }
    const { data: file, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(resumeFilePath);
    if (downloadError || !file) {
      throw new AnalysisRequestError(t.errors.resumeUnreadable, 400);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    // The bucket's MIME restriction trusts the client; verify the content.
    if (!bytes.subarray(0, 5).toString("latin1").startsWith("%PDF-")) {
      throw new AnalysisRequestError(t.errors.invalidPdf, 400);
    }
    resumePdfBase64 = bytes.toString("base64");
    // Best-effort text: feeds the anti-fabrication corpus and, when the
    // resume is saved to the library, makes the version editable.
    parsedPdfText = await extractPdfText(bytes);
  }

  // Optionally save an inline resume to the library before analyzing.
  if (!input.resumeId && input.saveResumeTitle && (resumeText || resumeFilePath)) {
    const created = await createResumeWithVersion(
      supabase,
      user.id,
      input.saveResumeTitle,
      {
        content: resumeText ?? parsedPdfText ?? undefined,
        filePath: resumeFilePath,
        source: resumeFilePath ? "pdf" : "paste",
      },
    );
    if (created) {
      resumeId = created.resumeId;
      resumeVersionId = created.versionId;
    }
  }

  const outputLanguage = input.outputLanguage ?? "en";
  const { result: rawResult, servedBy } = await analyze({
    jobTitle: input.jobTitle,
    company: input.company,
    jobDescription: input.jobDescription,
    resumeText: resumePdfBase64 ? undefined : resumeText,
    resumePdfBase64,
    outputLanguage,
  });

  // Deterministic anti-fabrication guard: drops suggestions that altered
  // or invented facts (dates, metrics, names) and scrubs guess qualifiers.
  const { result } = sanitizeAnalysisResult(
    rawResult,
    resumeText ?? parsedPdfText ?? undefined,
  );

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
      output_language: outputLanguage,
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
    throw new AnalysisRequestError(t.errors.saveFailed, 500);
  }

  await recordUsage(supabase, user.id, "analysis");

  return { id: row.id };
}

/** Maps execution errors (request-level and AI-provider) to responses. */
export function analysisErrorResponse(
  err: unknown,
  locale: Locale = DEFAULT_LOCALE,
): NextResponse {
  const t = getMessages(locale);
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
    return NextResponse.json({ error: t.errors.refused }, { status: 422 });
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
      return NextResponse.json({ error: t.errors.aiBusy }, { status: 429 });
    }
    console.error("Gemini API error:", err.status, err.message);
    return NextResponse.json({ error: t.errors.aiError }, { status: 502 });
  }
  if (err instanceof TypeError && err.message.includes("fetch")) {
    return NextResponse.json({ error: t.errors.aiUnreachable }, { status: 502 });
  }
  console.error("Unexpected analyze error:", err);
  return NextResponse.json({ error: t.errors.generic }, { status: 500 });
}
