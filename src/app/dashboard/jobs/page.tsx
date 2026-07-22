import { createClient } from "@/lib/supabase/server";
import { JobSearch, type ResumeOption } from "@/components/jobs/JobSearch";
import { EmptyState } from "@/components/ui/EmptyState";
import { suggestSearchTerms } from "@/lib/jobs/suggest";
import { formatDate } from "@/lib/utils";
import { getMessages } from "@/lib/i18n";
import { getLocale, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = () => pageTitle("findJobs");

interface VersionRow {
  id: string;
  resume_id: string;
  version: number;
  content: string | null;
  created_at: string;
}

export default async function JobsPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = getMessages(locale).jobs;

  // RLS scopes both queries to the signed-in user. Search-term suggestions
  // are computed here so CV content itself never travels to the browser
  // beyond what the resume editor already shows.
  const [{ data: resumeRows }, { data: versionRows }] = await Promise.all([
    supabase.from("resumes").select("id, title").order("updated_at", { ascending: false }),
    supabase
      .from("resume_versions")
      .select("id, resume_id, version, content, created_at")
      .order("version", { ascending: false }),
  ]);

  const versions = (versionRows ?? []) as VersionRow[];
  const resumes: ResumeOption[] = ((resumeRows ?? []) as { id: string; title: string }[]).map(
    (resume) => ({
      id: resume.id,
      title: resume.title,
      versions: versions
        .filter((v) => v.resume_id === resume.id)
        .map((v) => ({
          id: v.id,
          version: v.version,
          label: t.filters.versionLabel(v.version, formatDate(v.created_at, locale)),
          terms: suggestSearchTerms(v.content),
        })),
    }),
  );

  return (
    <div className="animate-rise space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          {t.subtitle}
        </p>
      </div>

      {resumes.length === 0 || resumes.every((r) => r.versions.length === 0) ? (
        <EmptyState
          title={t.emptyTitle}
          description={t.emptyDescription}
          cta={{ href: "/dashboard/resumes", label: t.emptyCta }}
        />
      ) : (
        <JobSearch
          locale={locale}
          resumes={resumes.filter((r) => r.versions.length > 0)}
        />
      )}
    </div>
  );
}
