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

export default async function LandingPage() {
  const locale = await getLocale();
  const t = getMessages(locale).landing;
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
            {t.pricing}
          </a>
          <LanguageSwitcher locale={locale} />
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            {t.signIn}
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {t.getStarted}
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 text-center sm:pt-20">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl dark:text-slate-100">
            {t.heroLead} <span className="text-indigo-600">{t.heroAccent}</span>{" "}
            {t.heroTail}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            {t.heroSubtitle}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              {t.heroCta}
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-400">{t.heroNote}</p>
          <div className="mt-12">
            <SampleReport locale={locale} />
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-slate-100 bg-slate-50 py-16 dark:border-slate-900 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t.howItWorks}
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {t.steps.map((step, i) => (
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
            {t.featuresTitle}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.map((f) => (
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
              {t.pricingTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600 dark:text-slate-400">
              {proAvailable ? t.pricingSubtitle : t.pricingSubtitleComingSoon}
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <PlanCard
                plan="free"
                locale={locale}
                action={
                  <Link
                    href="/signup"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700"
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
                      className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
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
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t.trustTitle}
          </h2>
          <div className="mt-8 grid gap-6 text-left sm:grid-cols-3">
            {t.trust.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-slate-100 py-16 dark:border-slate-900">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t.faqTitle}
            </h2>
            <div className="mt-8 divide-y divide-slate-200 dark:divide-slate-800">
              {t.faqs.map((faq) => (
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
          <h2 className="text-2xl font-bold text-white">{t.finalCtaTitle}</h2>
          <Link
            href="/signup"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            {t.finalCta}
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} ApplyPilot AI</span>
          <nav className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300">
              {t.footerPrivacy}
            </Link>
            <Link href="/terms" className="hover:text-slate-700 dark:hover:text-slate-300">
              {t.footerTerms}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
