import { ApiError } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AnalyzeRequest } from "@/lib/ai/schema";
import { analyze, AnalysisRefusedError, AIConfigError } from "@/lib/ai/analyze";

// Generous headroom for slow model responses; Flash typically answers in seconds.
export const maxDuration = 300;

const ANALYSES_PER_HOUR = 10;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AnalyzeRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Simple per-user rate limit backed by the analyses table.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .gte("created_at", oneHourAgo);
  if ((count ?? 0) >= ANALYSES_PER_HOUR) {
    return NextResponse.json(
      { error: "Rate limit reached — try again in an hour." },
      { status: 429 },
    );
  }

  // When a PDF was uploaded, fetch it from storage (RLS scopes access,
  // but verify the path prefix anyway) and base64-encode for the model.
  let resumePdfBase64: string | undefined;
  if (input.resumeFilePath) {
    if (!input.resumeFilePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Invalid resume file" }, { status: 400 });
    }
    const { data: file, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(input.resumeFilePath);
    if (downloadError || !file) {
      return NextResponse.json(
        { error: "Could not read the uploaded resume" },
        { status: 400 },
      );
    }
    resumePdfBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  }

  try {
    const { result, servedBy } = await analyze({
      jobTitle: input.jobTitle,
      company: input.company,
      jobDescription: input.jobDescription,
      resumeText: input.resumeText,
      resumePdfBase64,
    });

    const { data: row, error: insertError } = await supabase
      .from("analyses")
      .insert({
        user_id: user.id,
        job_title: input.jobTitle,
        company: input.company ?? null,
        job_description: input.jobDescription,
        resume_text: input.resumeText ?? null,
        resume_file_path: input.resumeFilePath ?? null,
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
      return NextResponse.json(
        { error: "Analysis succeeded but could not be saved. Try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: row.id });
  } catch (err) {
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
}
