import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/Card";
import { BillingActionButton } from "@/components/billing/BillingActions";
import { PlanCard } from "@/components/billing/PlanCards";
import { UsageIndicator } from "@/components/billing/UsageIndicator";
import { normalizePlan, PLANS } from "@/lib/billing/plans";
import { countUsageSince, monthStartUtc } from "@/lib/billing/usage";

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
      .select("plan, subscription_status, stripe_customer_id")
      .eq("id", user!.id)
      .single(),
    countUsageSince(supabase, "analysis", monthStartUtc()),
  ]);

  const plan = normalizePlan(profile?.plan);
  const pastDue = profile?.subscription_status === "past_due";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Billing
      </h1>

      {checkout === "success" && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400">
          Welcome to Pro! Your new limit is available immediately.
        </p>
      )}
      {checkout === "canceled" && (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400">
          Checkout canceled — no charge was made.
        </p>
      )}
      {pastDue && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
          Your last payment failed. Update your payment method to keep Pro —
          we&apos;ll retry automatically for a few days.
        </p>
      )}

      <Card>
        <CardTitle>Usage</CardTitle>
        <div className="mt-4">
          <UsageIndicator used={used} limit={PLANS[plan].analysesPerMonth} />
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Limits reset on the 1st of each month (UTC). Re-scores count as
          analyses.
        </p>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <PlanCard
          plan="free"
          current={plan === "free"}
          action={
            plan === "pro" ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cancel anytime from the billing portal below.
              </p>
            ) : undefined
          }
        />
        <PlanCard
          plan="pro"
          current={plan === "pro"}
          action={
            plan === "free" ? (
              <BillingActionButton endpoint="/api/billing/checkout">
                Upgrade to Pro — ${PLANS.pro.priceMonthly}/mo
              </BillingActionButton>
            ) : (
              <BillingActionButton endpoint="/api/billing/portal" variant="secondary">
                Manage subscription
              </BillingActionButton>
            )
          }
        />
      </div>

      <p className="text-xs text-slate-400">
        Payments are processed by Stripe. Invoices, payment methods, and
        cancellation are handled in the Stripe billing portal.
      </p>
    </div>
  );
}
