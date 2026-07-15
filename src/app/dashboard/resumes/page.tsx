import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewResumeForm } from "@/components/resumes/NewResumeForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import type { Resume } from "@/lib/types";

export const metadata = { title: "My resumes" };

interface ResumeListRow extends Resume {
  resume_versions: { count: number }[];
}

export default async function ResumesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resumes")
    .select("*, resume_versions(count)")
    .order("updated_at", { ascending: false });

  const resumes = (data ?? []) as ResumeListRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          My resumes
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Save your resume once and reuse it across analyses. Every edit is
          kept as a version, so you can track what improved your scores.
        </p>
      </div>

      {resumes.length === 0 && (
        <EmptyState
          title="No resumes yet"
          description="Saved resumes are versioned — every edit becomes a new version you can re-score, so you can watch your fit improve as you refine it."
          cta={{ href: "#add-resume", label: "Add your first resume" }}
        />
      )}

      {resumes.length > 0 && (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
          {resumes.map((resume) => {
            const versions = resume.resume_versions?.[0]?.count ?? 1;
            return (
              <li key={resume.id}>
                <Link
                  href={`/dashboard/resumes/${resume.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                      {resume.title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {versions} {versions === 1 ? "version" : "versions"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-slate-400">
                    Updated {formatDate(resume.updated_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div id="add-resume" className="max-w-2xl scroll-mt-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {resumes.length === 0 ? "Add your first resume" : "Add another resume"}
        </h2>
        <div className="mt-4">
          <NewResumeForm />
        </div>
      </div>
    </div>
  );
}
