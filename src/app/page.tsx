import Link from "next/link";
import { ComingSoonAction, PlanCard } from "@/components/billing/PlanCards";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SampleReport } from "@/components/marketing/SampleReport";
import { billingAvailable } from "@/lib/billing/stripe";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

// Rendered per request (locale cookie), no auth check. billingAvailable()
// still only reads env vars: configuring Stripe flips Pro from "Coming
// soon" to purchasable on the next deploy without a code change.
//
// The landing page commits to the dark-navy brand surface in both OS
// themes, so colors here are explicit rather than paired with dark:.

export default async function LandingPage() {
  const locale = await getLocale();
  const t = getMessages(locale).landing;
  const proAvailable = billingAvailable();
  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-slate-300">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-5 sm:px-6">
        <span className="text-lg font-bold tracking-tight text-white">
          ApplyPilot <span className="text-indigo-400">AI</span>
        </span>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href="#how-it-works"
            className="hidden text-sm font-medium text-slate-300 hover:text-white sm:inline"
          >
            {t.howItWorks}
          </a>
          <a
            href="#pricing"
            className="hidden text-sm font-medium text-slate-300 hover:text-white sm:inline"
          >
            {t.pricing}
          </a>
          <LanguageSwitcher locale={locale} />
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-200 hover:text-white"
          >
            {t.signIn}
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400"
          >
            {t.getStarted}
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero: value proposition beside the real report shape */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-2">
          <div className="animate-rise text-center lg:text-left">
            <h1 className="mx-auto max-w-xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:mx-0">
              {t.heroLead}{" "}
              <span className="text-indigo-400">{t.heroAccent}</span>{" "}
              {t.heroTail}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400 lg:mx-0">
              {t.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center rounded-lg bg-indigo-500 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-400"
              >
                {t.heroCta}
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex min-h-12 items-center rounded-lg px-4 py-3 text-base font-semibold text-slate-200 ring-1 ring-inset ring-slate-700 hover:bg-slate-900 hover:text-white"
              >
                {t.heroSecondaryCta}
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">{t.heroNote}</p>
          </div>
          <div className="min-w-0">
            <SampleReport locale={locale} />
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-t border-white/5 bg-slate-900/50 py-20 scroll-mt-8"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-white">
              {t.howItWorks}
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-3">
              {t.steps.map((step, i) => (
                <li key={step.title} className="text-center sm:text-left">
                  <span
                    aria-hidden
                    className="inline-flex size-9 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-300 ring-1 ring-inset ring-indigo-400/30"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features: varied bento layout, not a wall of identical cards */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            {t.featuresTitle}
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.map((f, i) => (
              <div
                key={f.title}
                className={`rounded-2xl bg-slate-900 p-6 ring-1 ring-white/10 ${
                  i === 0 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="border-t border-white/5 bg-slate-900/50 py-20 scroll-mt-8"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-white">
              {t.pricingTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-400">
              {proAvailable ? t.pricingSubtitle : t.pricingSubtitleComingSoon}
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <PlanCard
                plan="free"
                locale={locale}
                action={
                  <Link
                    href="/signup"
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700"
                  >
                    {t.startFree}
                  </Link>
                }
              />
              <PlanCard
                plan="pro"
                locale={locale}
                comingSoon={!proAvailable}
                action={
                  proAvailable ? (
                    <Link
                      href="/signup"
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                      {t.getPro}
                    </Link>
                  ) : (
                    <ComingSoonAction locale={locale} />
                  )
                }
              />
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            {t.trustTitle}
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-3">
            {t.trust.map((item) => (
              <div key={item.title}>
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <span
                    aria-hidden
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs text-indigo-300"
                  >
                    ✓
                  </span>
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-white">
              {t.faqTitle}
            </h2>
            <div className="mt-10 divide-y divide-white/10">
              {t.faqs.map((faq) => (
                <details key={faq.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white">
                    {faq.q}
                    <span
                      aria-hidden
                      className="text-slate-500 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-white/5 bg-indigo-600 px-4 py-16 text-center sm:px-6">
          <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t.finalCtaTitle}
          </h2>
          <Link
            href="/signup"
            className="mt-8 inline-flex min-h-12 items-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            {t.finalCta}
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} ApplyPilot AI</span>
          <nav className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-300">
              {t.footerPrivacy}
            </Link>
            <Link href="/terms" className="hover:text-slate-300">
              {t.footerTerms}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
