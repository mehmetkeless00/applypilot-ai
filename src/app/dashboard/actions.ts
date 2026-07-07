"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteAnalysis(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const supabase = await createClient();

  // Fetch first so we can clean up any uploaded resume file.
  // RLS restricts both the select and the delete to the owner's rows.
  const { data: row } = await supabase
    .from("analyses")
    .select("resume_file_path")
    .eq("id", id)
    .single();

  await supabase.from("analyses").delete().eq("id", id);

  if (row?.resume_file_path) {
    await supabase.storage.from("resumes").remove([row.resume_file_path]);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
