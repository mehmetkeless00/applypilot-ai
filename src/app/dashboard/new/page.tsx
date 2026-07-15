import { createClient } from "@/lib/supabase/server";
import { NewAnalysisForm } from "@/components/analysis/NewAnalysisForm";
import { billingAvailable } from "@/lib/billing/stripe";

export const metadata = { title: "New analysis" };

export default async function NewAnalysisPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resumes")
    .select("id, title")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        New analysis
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Paste the job description and your resume. You&apos;ll get a fit score,
        skills-gap analysis, tailored summary, and cover letter.
      </p>
      <div className="mt-8">
        <NewAnalysisForm
          savedResumes={data ?? []}
          billingAvailable={billingAvailable()}
        />
      </div>
    </div>
  );
}
