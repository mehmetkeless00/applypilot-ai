import Link from "next/link";

/**
 * Onboarding is shown only until the first analysis exists. Progress is
 * derived server-side from the authenticated user's own rows (RLS-scoped
 * counts) — never from client state.
 */
export function shouldShowOnboarding(analysisCount: number): boolean {
  return analysisCount === 0;
}

interface Step {
  title: string;
  description: string;
  done: boolean;
  cta?: { href: string; label: string };
}

export function onboardingSteps(hasResume: boolean): Step[] {
  return [
    {
      title: "Add your resume",
      description:
        "Upload a PDF or paste the text once. It's saved to your library with versions, so you never paste it twice.",
      done: hasResume,
      cta: { href: "/dashboard/resumes", label: "Add your resume" },
    },
    {
      title: "Add a job",
      description:
        "Paste a job description or import it straight from a posting URL.",
      done: false,
      cta: { href: "/dashboard/new", label: "Analyze a job" },
    },
    {
      title: "Review your fit report",
      description:
        "Get a calibrated fit score, the skills gaps that matter, concrete resume rewrites, and a ready-to-send cover letter.",
      done: false,
    },
  ];
}

export function OnboardingChecklist({ hasResume }: { hasResume: boolean }) {
  const steps = onboardingSteps(hasResume);
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <section
      aria-labelledby="onboarding-title"
      className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-slate-900 dark:ring-slate-800"
    >
      <h2
        id="onboarding-title"
        className="text-lg font-bold text-slate-900 dark:text-slate-100"
      >
        Get your first fit report
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
        Three quick steps to see how well you match a job — and exactly what
        to fix before you apply.
      </p>

      <ol className="mt-6 space-y-5">
        {steps.map((step, i) => {
          const isCurrent = i === currentIndex;
          return (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  step.done
                    ? "bg-green-600 text-white"
                    : isCurrent
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {step.title}
                  {step.done && <span className="sr-only"> (completed)</span>}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {step.description}
                </p>
                {!step.done && step.cta && (
                  <Link
                    href={step.cta.href}
                    className={`mt-3 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${
                      isCurrent
                        ? "bg-indigo-600 text-white hover:bg-indigo-500"
                        : "bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700"
                    }`}
                  >
                    {step.cta.label}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
