import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResumeVersion } from "@/lib/types";

// Data helpers for the resume library. All queries run through the caller's
// RLS-scoped client, so ownership checks are enforced by the database.

export interface NewVersionInput {
  content?: string;
  filePath?: string;
  source: "paste" | "pdf";
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
