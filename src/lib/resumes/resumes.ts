import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResumeVersion } from "@/lib/types";
import { extractPdfText } from "./extract";

// Data helpers for the resume library. All queries run through the caller's
// RLS-scoped client, so ownership checks are enforced by the database.

export interface NewVersionInput {
  content?: string;
  filePath?: string;
  source: "paste" | "pdf" | "applied_suggestion";
  /** Traceability, required when source is 'applied_suggestion'. */
  sourceAnalysisId?: string;
  sourceSuggestion?: number;
  previousVersionId?: string;
}

export const MAX_RESUME_PDF_BYTES = 10 * 1024 * 1024;

export type PdfLoadResult =
  | { ok: true; bytes: Buffer; content: string | null }
  | { ok: false; error: string };

/**
 * Downloads an uploaded resume PDF from storage, validates it (owner
 * prefix, size, magic bytes), and extracts its text. `content` is null
 * when the PDF has no extractable text (e.g. a scanned image).
 */
export async function loadPdfForResume(
  supabase: SupabaseClient,
  userId: string,
  filePath: string,
): Promise<PdfLoadResult> {
  if (!filePath.startsWith(`${userId}/`)) {
    return { ok: false, error: "Invalid resume file." };
  }
  const { data: file, error } = await supabase.storage
    .from("resumes")
    .download(filePath);
  if (error || !file) {
    return { ok: false, error: "Could not read the uploaded PDF. Try again." };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength > MAX_RESUME_PDF_BYTES) {
    return { ok: false, error: "The PDF is too large (max 10 MB)." };
  }
  if (!bytes.subarray(0, 5).toString("latin1").startsWith("%PDF-")) {
    return { ok: false, error: "The uploaded file isn't a valid PDF." };
  }
  return { ok: true, bytes, content: await extractPdfText(bytes) };
}

export async function fetchLatestVersion(
  supabase: SupabaseClient,
  resumeId: string,
): Promise<ResumeVersion | null> {
  const { data } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("resume_id", resumeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ResumeVersion | null) ?? null;
}

export async function createResumeWithVersion(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  input: NewVersionInput,
): Promise<{ resumeId: string; versionId: string } | null> {
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .insert({ user_id: userId, title })
    .select("id")
    .single();
  if (resumeError || !resume) return null;

  const { data: version, error: versionError } = await supabase
    .from("resume_versions")
    .insert({
      resume_id: resume.id,
      user_id: userId,
      version: 1,
      content: input.content ?? null,
      file_path: input.filePath ?? null,
      source: input.source,
    })
    .select("id")
    .single();
  if (versionError || !version) {
    // Don't leave an empty resume behind.
    await supabase.from("resumes").delete().eq("id", resume.id);
    return null;
  }

  return { resumeId: resume.id, versionId: version.id };
}

export async function addResumeVersion(
  supabase: SupabaseClient,
  userId: string,
  resumeId: string,
  input: NewVersionInput,
): Promise<{ versionId: string; version: number } | null> {
  const latest = await fetchLatestVersion(supabase, resumeId);
  if (!latest) return null;

  const nextVersion = latest.version + 1;
  const { data: version, error } = await supabase
    .from("resume_versions")
    .insert({
      resume_id: resumeId,
      user_id: userId,
      version: nextVersion,
      content: input.content ?? null,
      file_path: input.filePath ?? null,
      source: input.source,
      source_analysis_id: input.sourceAnalysisId ?? null,
      source_suggestion: input.sourceSuggestion ?? null,
      previous_version_id: input.previousVersionId ?? null,
    })
    .select("id")
    .single();
  if (error || !version) return null;

  await supabase
    .from("resumes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", resumeId);

  return { versionId: version.id, version: nextVersion };
}
