import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    title: "AI fit score",
    description:
      "A calibrated 0–100 score showing how well your resume matches the role's real requirements.",
  },
  {
    title: "Skills-gap analysis",
    description:
      "See exactly which must-have skills you're missing — and how to close or reframe each gap.",
  },
  {
    title: "Your strengths, evidenced",
    description:
      "Your strongest matches for the role, each backed by evidence pulled from your own resume.",
  },
  {
    title: "Tailored summary",
    description:
      "A rewritten professional summary that puts your most relevant experience front and center.",
  },
  {
    title: "Cover letter in seconds",
    description:
      "A complete, ready-to-send cover letter grounded in your real experience — no fabrication.",
  },
  {
    title: "Every application saved",
    description:
      "All your analyses in one dashboard, so you can compare roles and track your applications.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-dvh flex-col bg-white dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
          ApplyPilot <span className="text-indigo-600">AI</span>
        </span>
        <nav className="flex items-center gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl dark:text-slate-100">
            Land more interviews with{" "}
            <span className="text-indigo-600">AI-tailored</span> applications
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Paste a job description and your resume. ApplyPilot AI scores your
            fit, surfaces missing skills, highlights your strengths, and writes
            a tailored summary and cover letter — in one shot.
          </p>
          <div className="mt-10">
            <Link
              href={user ? "/dashboard/new" : "/signup"}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Analyze your first application
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl bg-slate-50 p-6 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
        © {new Date().getFullYear()} ApplyPilot AI
      </footer>
    </div>
  );
}
