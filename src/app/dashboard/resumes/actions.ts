"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { addResumeVersion, createResumeWithVersion } from "@/lib/resumes/resumes";

export type ResumeActionState = { error: string } | null;

const contentSchema = z
  .string()
  .trim()
  .min(100, "Paste your full resume (at least 100 characters)")
  .max(50_000, "Resume is too long (max 50,000 characters)");

const titleSchema = z.string().trim().min(1, "Give the resume a name").max(120);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createResume(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Your session expired — sign in again." };

  const title = titleSchema.safeParse(formData.get("title"));
  if (!title.success) return { error: title.error.issues[0].message };

  // PDF uploads are stored by the client first; the path is passed here.
  const filePath = formData.get("filePath");
  let input;
  if (typeof filePath === "string" && filePath) {
    if (!filePath.startsWith(`${user.id}/`)) {
      return { error: "Invalid resume file." };
    }
    input = { filePath, source: "pdf" as const };
  } else {
    const content = contentSchema.safeParse(formData.get("content"));
    if (!content.success) return { error: content.error.issues[0].message };
    input = { content: content.data, source: "paste" as const };
  }

  const created = await createResumeWithVersion(supabase, user.id, title.data, input);
  if (!created) return { error: "Could not save the resume. Try again." };

  revalidatePath("/dashboard/resumes");
  redirect(`/dashboard/resumes/${created.resumeId}`);
}

export async function saveNewVersion(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Your session expired — sign in again." };

  const resumeId = formData.get("resumeId");
  if (typeof resumeId !== "string" || !resumeId) return { error: "Missing resume." };

  const content = contentSchema.safeParse(formData.get("content"));
  if (!content.success) return { error: content.error.issues[0].message };

  const saved = await addResumeVersion(supabase, user.id, resumeId, {
    content: content.data,
    source: "paste",
  });
  if (!saved) return { error: "Could not save the new version. Try again." };

  revalidatePath(`/dashboard/resumes/${resumeId}`);
  return null;
}

export async function renameResume(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Your session expired — sign in again." };

  const resumeId = formData.get("resumeId");
  const title = titleSchema.safeParse(formData.get("title"));
  if (typeof resumeId !== "string" || !resumeId) return { error: "Missing resume." };
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
