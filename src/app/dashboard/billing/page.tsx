import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { BillingActionButton } from "@/components/billing/BillingActions";
import { ComingSoonAction, PlanCard } from "@/components/billing/PlanCards";
import { UsageIndicator } from "@/components/billing/UsageIndicator";
import { PLANS } from "@/lib/billing/plans";
import { billingAvailable } from "@/lib/billing/stripe";
import { subscriptionSummary } from "@/lib/billing/status";
import { countUsageSince, monthStartUtc } from "@/lib/billing/usage";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export const metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { checkout } = await searchParams;

  const [{ data: profile }, used] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "plan, subscription_status, stripe_customer_id, current_period_end, cancel_at_period_end",
      )
      .eq("id", user!.id)
      .single(),
    countUsageSince(supabase, "analysis", monthStartUtc()),
  ]);

  const locale = await getLocale();
  const t = getMessages(locale).billing;
  const summary = subscriptionSummary(profile, locale);
  const plan = summary.plan;
  const available = billingAvailable();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {t.title}
      </h1>

      {checkout === "success" && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400">
          {t.checkoutSuccess}
        </p>
      )}
      {checkout === "canceled" && (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400">
          {t.checkoutCanceled}
        </p>
      )}
      {summary.warning && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
          {t.paymentWarning}
        </p>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t.subscription}</CardTitle>
          <Badge tone={summary.warning ? "amber" : plan === "pro" ? "indigo" : "slate"}>
            {summary.statusLabel}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t.youAreOn}{" "}
          <span className="font-semibold">{t.planNames[plan]}</span>{" "}
          {t.planLine(t.planNames[plan], PLANS[plan].analysesPerMonth)}
          {summary.detail ? ` ${summary.detail}` : ""}
        </p>
      </Card>

      <Card>
        <CardTitle>{t.usage}</CardTitle>
        <div className="mt-4">
          <UsageIndicator
            used={used}
            limit={PLANS[plan].analysesPerMonth}
            label={t.usageLabel}
          />
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {t.usageHint}
        </p>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <PlanCard
          plan="free"
          current={plan === "free"}
          locale={locale}
          action={
            plan === "pro" ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t.cancelAnytime}
              </p>
            ) : undefined
          }
        />
        <PlanCard
          plan="pro"
          current={plan === "pro"}
          comingSoon={!available && plan === "free"}
          locale={locale}
          action={
            plan === "free" ? (
              available ? (
                <BillingActionButton endpoint="/api/billing/checkout" locale={locale}>
                  {t.upgradeCta(PLANS.pro.priceMonthly)}
                </BillingActionButton>
              ) : (
                <ComingSoonAction locale={locale} />
              )
            ) : (
              <BillingActionButton
                endpoint="/api/billing/portal"
                variant="secondary"
                locale={locale}
              >
                {t.manage}
              </BillingActionButton>
            )
          }
        />
      </div>

      {(available || plan === "pro") && (
        <p className="text-xs text-slate-400">{t.stripeFooter}</p>
      )}
    </div>
  );
}
