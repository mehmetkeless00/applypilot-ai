import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ResumeEditor } from "@/components/resumes/ResumeEditor";
import { ResumeTitleForm } from "@/components/resumes/ResumeTitleForm";
import { DeleteResumeButton } from "@/components/resumes/DeleteResumeButton";
import { formatDate, scoreTone } from "@/lib/utils";
import type { Analysis, Resume, ResumeVersion } from "@/lib/types";

const toneToBadge = { poor: "red", fair: "amber", strong: "green" } as const;

export const metadata = { title: "Resume" };

export default async function ResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: resumeData }, { data: versionData }, { data: analysisData }] =
    await Promise.all([
      supabase.from("resumes").select("*").eq("id", id).single(),
      supabase
        .from("resume_versions")
        .select("*")
        .eq("resume_id", id)
        .order("version", { ascending: false }),
      supabase
        .from("analyses")
        .select("id, job_title, company, fit_score, created_at, resume_version_id")
        .eq("resume_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (!resumeData) notFound();
  const resume = resumeData as Resume;
  const versions = (versionData ?? []) as ResumeVersion[];
  const latest = versions[0];
  const history = (analysisData ?? []) as Array<
    Pick<Analysis, "id" | "job_title" | "company" | "fit_score" | "created_at"> & {
      resume_version_id: string | null;
    }
  >;
  const versionNumber = new Map(versions.map((v) => [v.id, v.version]));

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

      {history.length > 0 && (
        <Card>
          <CardTitle>Score history</CardTitle>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Analyses that used this resume, newest first.
          </p>
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/dashboard/analysis/${a.id}`}
                  className="flex items-center gap-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <Badge tone={toneToBadge[scoreTone(a.fit_score)]}>
                    {a.fit_score}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">
                    {a.job_title}
                    {a.company ? ` · ${a.company}` : ""}
                  </span>
                  {a.resume_version_id && versionNumber.has(a.resume_version_id) && (
                    <span className="shrink-0 text-xs text-slate-400">
                      v{versionNumber.get(a.resume_version_id)}
                    </span>
                  )}
                  <span className="shrink-0 text-slate-400">
                    {formatDate(a.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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
