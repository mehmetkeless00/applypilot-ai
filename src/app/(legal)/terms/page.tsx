export const metadata = { title: "Terms of Service" };

// NOTE: template language — have counsel review before relying on it.

const sections = [
  {
    heading: "The service",
    body: [
      "ApplyPilot AI analyzes your resume against job descriptions and generates fit scores, suggestions, summaries, and cover letters. Output is AI-generated guidance — review it before you send it to an employer. You are responsible for the accuracy of applications you submit.",
    ],
  },
  {
    heading: "Your account",
    body: [
      "You must provide accurate account information and keep your credentials secure. Accounts are personal; one person per account.",
      "You retain all rights to the content you upload. You grant us only the limited license needed to store and process it to provide the service.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "Don't abuse the service: no scraping, no automated bulk account creation, no attempting to bypass plan limits or rate limits, no using the importer to attack third-party sites, and no uploading content you don't have the right to use.",
      "We may suspend accounts that violate these rules, with notice where practical.",
    ],
  },
  {
    heading: "Plans and billing",
    body: [
      "The Free plan includes a monthly analysis allowance. Pro is a monthly subscription billed through Stripe; prices are shown before checkout.",
      "You can cancel anytime from the billing portal — Pro remains active until the end of the paid period. Renewals, failed payments, and cancellations follow Stripe's standard subscription behavior.",
    ],
  },
  {
    heading: "Disclaimers",
    body: [
      "AI analysis can be wrong. Fit scores are estimates, not hiring decisions, and we make no guarantee of interviews or offers.",
      'The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, our liability is limited to the amount you paid us in the twelve months before a claim.',
    ],
  },
  {
    heading: "Changes and contact",
    body: [
      "We may update these terms; material changes will be announced in the product or by email before they take effect.",
      "Questions: support@applypilot.ai.",
    ],
  },
];

export default function TermsPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Last updated: July 15, 2026
      </p>
      {sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {s.heading}
          </h2>
          <ul className="mt-3 space-y-2">
            {s.body.map((line) => (
              <li
                key={line}
                className="text-sm leading-6 text-slate-700 dark:text-slate-300"
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
