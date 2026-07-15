import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ResumeEditor } from "@/components/resumes/ResumeEditor";
import { ResumeTitleForm } from "@/components/resumes/ResumeTitleForm";
import { DeleteResumeButton } from "@/components/resumes/DeleteResumeButton";
import { formatDate } from "@/lib/utils";
import type { Resume, ResumeVersion } from "@/lib/types";

export const metadata = { title: "Resume" };

export default async function ResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: resumeData }, { data: versionData }] = await Promise.all([
    supabase.from("resumes").select("*").eq("id", id).single(),
    supabase
      .from("resume_versions")
      .select("*")
      .eq("resume_id", id)
      .order("version", { ascending: false }),
  ]);

  if (!resumeData) notFound();
  const resume = resumeData as Resume;
  const versions = (versionData ?? []) as ResumeVersion[];
  const latest = versions[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/dashboard/resumes"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← All resumes
          </Link>
          <ResumeTitleForm resumeId={resume.id} title={resume.title} />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {versions.length} {versions.length === 1 ? "version" : "versions"} ·
            updated {formatDate(resume.updated_at)}
          </p>
        </div>
        <DeleteResumeButton resumeId={resume.id} />
      </div>

      {latest?.content != null ? (
        <Card>
          <CardTitle>
            Current version{" "}
            <span className="font-normal text-slate-400">v{latest.version}</span>
          </CardTitle>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Edit and save to create version {latest.version + 1}. Old versions
            are kept so past analyses stay traceable.
          </p>
          <div className="mt-4">
            <ResumeEditor resumeId={resume.id} initialContent={latest.content} />
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>
            Current version{" "}
            <span className="font-normal text-slate-400">
              v{latest?.version ?? 1} · PDF
            </span>
          </CardTitle>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            This version is an uploaded PDF. To make edits, paste the text
            below and save it as a new version.
          </p>
          <div className="mt-4">
            <ResumeEditor resumeId={resume.id} initialContent="" />
          </div>
        </Card>
      )}

      {versions.length > 1 && (
        <Card>
          <CardTitle>Version history</CardTitle>
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Badge tone={v.id === latest.id ? "indigo" : "slate"}>
                  v{v.version}
                </Badge>
                <span className="text-slate-600 dark:text-slate-400">
                  {v.source === "pdf" ? "PDF upload" : "Text"}
                </span>
                <span className="ml-auto text-slate-400">
                  {formatDate(v.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
