import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { PLANS, type Plan } from "@/lib/billing/plans";
import { getMessages, type Locale } from "@/lib/i18n";

/**
 * Non-clickable stand-in for the Upgrade button while Stripe billing is
 * not configured. Once billing env vars are set, callers render the real
 * BillingActionButton instead — no code change needed here.
 */
export function ComingSoonAction({ locale = "en" }: { locale?: Locale }) {
  const t = getMessages(locale).billing;
  return (
    <div>
      <span
        aria-disabled="true"
        className="inline-flex w-full cursor-default items-center justify-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700"
      >
        {t.comingSoonAction}
      </span>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {t.proUnavailable}
      </p>
    </div>
  );
}

// Shared plan comparison used on the billing page and the landing page.
// Prices come from PLANS (kept in sync with Stripe); names and feature
// lists are localized copy.
export function PlanCard({
  plan,
  current,
  comingSoon,
  locale = "en",
  action,
}: {
  plan: Plan;
  current?: boolean;
  comingSoon?: boolean;
  locale?: Locale;
  action?: React.ReactNode;
}) {
  const info = PLANS[plan];
  const t = getMessages(locale).billing;
  return (
    <Card
      className={
        plan === "pro" ? "ring-2 ring-indigo-600 dark:ring-indigo-500" : undefined
      }
    >
      <div className="flex items-center justify-between">
        <CardTitle>{t.planNames[plan]}</CardTitle>
        {current && <Badge tone="indigo">{t.currentPlan}</Badge>}
        {!current && plan === "pro" && (
          <Badge tone={comingSoon ? "slate" : "indigo"}>
            {comingSoon ? t.comingSoonBadge : t.mostPopular}
          </Badge>
        )}
      </div>
      <p className="mt-3">
        <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          ${info.priceMonthly}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t.perMonth}
        </span>
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
        {t.planFeatures[plan].map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden className="text-indigo-600">
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
