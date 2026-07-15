// Static preview of an analysis report for the landing page — pure markup,
// no data fetching, so the page stays fully static.

const strengths = [
  { strength: "5 years of production React", evidence: "Led migration to React 18 at Datawheel" },
  { strength: "Design-system experience", evidence: "Built and maintained a 40-component library" },
];

const gaps = [
  { skill: "GraphQL", importance: "important" },
  { skill: "Terraform", importance: "nice to have" },
];

export function SampleReport() {
  return (
    <div
      aria-label="Example analysis report"
      className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 text-left shadow-xl ring-1 ring-slate-200 sm:p-8 dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="flex items-center gap-5">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full ring-8 ring-green-100 dark:ring-green-500/20">
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            84
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Senior Frontend Engineer · Acme
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Strong fit. Your React depth matches the core requirement; close
            the GraphQL gap to stand out.
          </p>
          <p className="mt-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
            ▲ +23 since your first draft
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Strengths
          </p>
          <ul className="mt-2 space-y-2">
            {strengths.map((s) => (
              <li key={s.strength} className="text-sm">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {s.strength}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  “{s.evidence}”
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Gaps to close
          </p>
          <ul className="mt-2 space-y-2">
            {gaps.map((g) => (
              <li key={g.skill} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {g.skill}
                </span>
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400">
                  {g.importance}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          ATS keywords
        </span>
        <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400">
          14 matched
        </span>
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400">
          3 weak
        </span>
        <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-400">
          2 missing
        </span>
        <span className="ml-auto text-xs text-slate-400">
          + tailored summary & cover letter
        </span>
      </div>
    </div>
  );
}
