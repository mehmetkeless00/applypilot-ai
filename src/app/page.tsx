import Link from "next/link";
import { ComingSoonAction, PlanCard } from "@/components/billing/PlanCards";
import { SampleReport } from "@/components/marketing/SampleReport";
import { billingAvailable } from "@/lib/billing/stripe";

// Fully static — no per-request auth check, so the marketing page is cached.
// billingAvailable() reads env vars at build time, which is exactly right:
// configuring Stripe (a deploy-time change) flips Pro from "Coming soon" to
// purchasable on the next deploy without a code change.

const steps = [
  {
    title: "Add the job",
    description:
      "Paste the description or import it straight from a posting URL — Greenhouse, Lever, Ashby, Workable, and many company career pages.",
  },
  {
    title: "Add your resume once",
    description:
      "Paste it or upload a PDF. It's saved to your library with versions, so you never paste it twice.",
  },
  {
    title: "Fix, re-score, apply",
    description:
      "Get a calibrated fit score, the gaps that matter, concrete rewrites, and a ready cover letter. Edit, re-score, and watch the number climb.",
  },
];

const features = [
  {
    title: "Calibrated fit score",
    description:
      "A 0–100 score built on the role's real must-haves — not keyword counting, and never inflated to flatter you.",
  },
  {
    title: "Evidence, not fabrication",
    description:
      "Every strength is backed by a line from your own resume. We never invent experience — recruiters can tell.",
  },
  {
    title: "ATS keyword coverage",
    description:
      "See exactly which screening keywords you match, which are weak, and which are missing — with a fix for each.",
  },
  {
    title: "Concrete rewrites",
    description:
      "Before/after rewrites of your weakest resume passages, aligned to the job's language. Copy, apply, re-score.",
  },
  {
    title: "Cover letter in seconds",
    description:
      "A complete, ready-to-send letter grounded in your real experience — edit the tone, keep the substance.",
  },
  {
    title: "Progress you can measure",
    description:
      "Re-score after every edit and see the delta. Your dashboard tracks every application and every improvement.",
  },
];

const faqs = [
  {
    q: "Is the fit score just keyword matching?",
    a: "No. The score weighs the role's explicit must-have qualifications against what your resume actually demonstrates. Keyword coverage is reported separately, because ATS screening and human screening are different problems.",
  },
  {
    q: "Will it invent experience I don't have?",
    a: "Never. The analysis is instructed to ground every claim in your resume, and suggestions only rephrase what's genuinely there. Fabricated resumes fail interviews — we won't write one.",
  },
  {
    q: "What happens to my resume?",
    a: "It's stored encrypted in your private account, sent to our AI provider only to run your analysis, and never sold or used to train models. You can delete resumes and analyses at any time.",
  },
  {
    q: "Which job boards can I import from?",
    a: "Greenhouse, Lever, Ashby, and Workable have first-class support, and most company career pages import via structured data. LinkedIn postings need a quick copy-paste.",
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes — one click in the Stripe billing portal. You keep Pro until the end of the period you paid for.",
  },
];

export default function LandingPage() {
  const proAvailable = billingAvailable();
  return (
    <div className="flex min-h-dvh flex-col bg-white dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
          ApplyPilot <span className="text-indigo-600">AI</span>
        </span>
        <nav className="flex items-center gap-4">
          <a
            href="#pricing"
            className="hidden text-sm font-semibold text-slate-700 hover:text-slate-900 sm:inline dark:text-slate-300 dark:hover:text-slate-100"
          >
            Pricing
          </a>
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
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 text-center sm:pt-20">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl dark:text-slate-100">
            Know your fit <span className="text-indigo-600">before</span> you
            apply
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            ApplyPilot scores your resume against the job&apos;s real requirements,
            shows you exactly what to fix, and proves it worked — your score
            climbs as you edit. Honest analysis, no invented experience.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Analyze your first application — free
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            3 free analyses a month. No credit card required.
          </p>
          <div className="mt-12">
            <SampleReport />
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-slate-100 bg-slate-50 py-16 dark:border-slate-900 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
              How it works
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.title} className="text-center sm:text-left">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
            Everything you need to apply with confidence
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Pricing */}
        <section
          id="pricing"
          className="border-t border-slate-100 bg-slate-50 py-16 dark:border-slate-900 dark:bg-slate-900/40"
        >
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
              Simple pricing
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600 dark:text-slate-400">
              {proAvailable
                ? "Start free. Upgrade when your search gets serious. Cancel anytime."
                : "Start free — 3 analyses a month, no credit card required."}
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <PlanCard
                plan="free"
                action={
                  <Link
                    href="/signup"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700"
                  >
                    Start free
                  </Link>
                }
              />
              <PlanCard
                plan="pro"
                comingSoon={!proAvailable}
                action={
                  proAvailable ? (
                    <Link
                      href="/signup"
                      className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                      Get Pro
                    </Link>
                  ) : (
                    <ComingSoonAction />
                  )
                }
              />
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Your resume is yours
          </h2>
          <div className="mt-8 grid gap-6 text-left sm:grid-cols-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Private by default
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Row-level security isolates your data; resumes live in private
                storage only you can access.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Never sold, never trained on
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Your resume is used only to run your analyses. We don&apos;t
                sell data or use it to train models.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Delete anytime
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Remove any resume or analysis with one click — files included.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-slate-100 py-16 dark:border-slate-900">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
              Frequently asked questions
            </h2>
            <div className="mt-8 divide-y divide-slate-200 dark:divide-slate-800">
              {faqs.map((faq) => (
                <details key={faq.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-slate-900 dark:text-slate-100">
                    {faq.q}
                    <span
                      aria-hidden
                      className="ml-4 text-slate-400 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-indigo-600 py-16 text-center">
          <h2 className="text-2xl font-bold text-white">
            Your next application deserves better than a guess
          </h2>
          <Link
            href="/signup"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            Get your fit score — free
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} ApplyPilot AI</span>
          <nav className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-700 dark:hover:text-slate-300">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
