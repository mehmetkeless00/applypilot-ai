import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { BillingActionButton } from "@/components/billing/BillingActions";
import { UsageIndicator } from "@/components/billing/UsageIndicator";
import { normalizePlan, PLANS } from "@/lib/billing/plans";
import { monthStartUtc } from "@/lib/billing/usage";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { count }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, subscription_status, stripe_customer_id")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStartUtc().toISOString()),
  ]);

  const plan = normalizePlan(profile?.plan);
  const used = count ?? 0;
  const pastDue = profile?.subscription_status === "past_due";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Billing
      </h1>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Current plan</CardTitle>
          <Badge tone={plan === "pro" ? "indigo" : "slate"}>
            {PLANS[plan].name}
          </Badge>
        </div>
        {pastDue && (
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
            Your last payment failed. Update your payment method to keep Pro —
            we&apos;ll retry automatically for a few days.
          </p>
        )}
        <div className="mt-4">
          <UsageIndicator used={used} limit={PLANS[plan].analysesPerMonth} />
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Limits reset on the 1st of each month (UTC).
        </p>
      </Card>

      {plan === "free" ? (
        <Card>
          <CardTitle>Upgrade to Pro</CardTitle>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {PLANS.pro.analysesPerMonth} analyses per month instead of{" "}
            {PLANS.free.analysesPerMonth} — enough for a serious job search.
          </p>
          <div className="mt-4">
            <BillingActionButton endpoint="/api/billing/checkout">
              Upgrade to Pro
            </BillingActionButton>
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>Manage subscription</CardTitle>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Update your payment method, view invoices, or cancel in the Stripe
            billing portal.
          </p>
          <div className="mt-4">
            <BillingActionButton endpoint="/api/billing/portal" variant="secondary">
              Open billing portal
            </BillingActionButton>
          </div>
        </Card>
      )}
    </div>
  );
}
