"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  addResumeVersion,
  createResumeWithVersion,
  loadPdfForResume,
} from "@/lib/resumes/resumes";
import { getMessages, type Messages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export type ResumeActionState = { error: string } | null;

const contentSchema = (t: Messages) =>
  z
    .string()
    .trim()
    .min(100, t.errors.resumeActions.contentMin)
    .max(50_000, t.errors.resumeActions.contentMax);

const titleSchema = (t: Messages) =>
  z.string().trim().min(1, t.errors.resumeActions.nameRequired).max(120);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user, t: getMessages(await getLocale()) };
}

export async function createResume(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const { supabase, user, t } = await requireUser();
  if (!user) return { error: t.newAnalysis.errors.sessionExpired };

  const title = titleSchema(t).safeParse(formData.get("title"));
  if (!title.success) return { error: title.error.issues[0].message };

  // PDF uploads are stored by the client first; the path is passed here.
  const filePath = formData.get("filePath");
  let input;
  if (typeof filePath === "string" && filePath) {
    // Validate the PDF and extract its text so the version is editable in
    // the resume editor; the original PDF path is kept alongside.
    const loaded = await loadPdfForResume(supabase, user.id, filePath);
    if (!loaded.ok) {
      return { error: loaded.error };
    }
    input = {
      filePath,
      content: loaded.content ?? undefined,
      source: "pdf" as const,
    };
  } else {
    const content = contentSchema(t).safeParse(formData.get("content"));
    if (!content.success) return { error: content.error.issues[0].message };
    input = { content: content.data, source: "paste" as const };
  }

  const created = await createResumeWithVersion(supabase, user.id, title.data, input);
  if (!created) return { error: t.errors.resumeActions.saveFailed };

  revalidatePath("/dashboard/resumes");
  redirect(`/dashboard/resumes/${created.resumeId}`);
}

export async function saveNewVersion(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const { supabase, user, t } = await requireUser();
  if (!user) return { error: t.newAnalysis.errors.sessionExpired };

  const resumeId = formData.get("resumeId");
  if (typeof resumeId !== "string" || !resumeId) {
    return { error: t.errors.generic };
  }

  const content = contentSchema(t).safeParse(formData.get("content"));
  if (!content.success) return { error: content.error.issues[0].message };

  const saved = await addResumeVersion(supabase, user.id, resumeId, {
    content: content.data,
    source: "paste",
  });
  if (!saved) return { error: t.errors.resumeActions.saveFailed };

  revalidatePath(`/dashboard/resumes/${resumeId}`);
  return null;
}

export async function renameResume(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const { supabase, user, t } = await requireUser();
  if (!user) return { error: t.newAnalysis.errors.sessionExpired };

  const resumeId = formData.get("resumeId");
  const title = titleSchema(t).safeParse(formData.get("title"));
  if (typeof resumeId !== "string" || !resumeId) {
    return { error: t.errors.generic };
  }
  if (!title.success) return { error: title.error.issues[0].message };

  await supabase
    .from("resumes")
    .update({ title: title.data, updated_at: new Date().toISOString() })
    .eq("id", resumeId);

  revalidatePath(`/dashboard/resumes/${resumeId}`);
  revalidatePath("/dashboard/resumes");
  return null;
}

export async function deleteResume(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) return;

  const resumeId = formData.get("resumeId");
  if (typeof resumeId !== "string" || !resumeId) return;

  // Clean up any uploaded PDFs owned by this resume's versions, then delete.
  // Versions cascade; analyses keep their data (resume_id becomes null).
  const { data: versions } = await supabase
    .from("resume_versions")
    .select("file_path")
    .eq("resume_id", resumeId);
  const paths = (versions ?? [])
    .map((v: { file_path: string | null }) => v.file_path)
    .filter((p): p is string => Boolean(p));

  await supabase.from("resumes").delete().eq("id", resumeId);
  if (paths.length > 0) {
    await supabase.storage.from("resumes").remove(paths);
  }

  revalidatePath("/dashboard/resumes");
  redirect("/dashboard/resumes");
}
