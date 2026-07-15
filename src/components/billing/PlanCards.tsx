import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { PLANS, type Plan } from "@/lib/billing/plans";

// Shared plan comparison used on the billing page and the landing page.
export function PlanCard({
  plan,
  current,
  action,
}: {
  plan: Plan;
  current?: boolean;
  action?: React.ReactNode;
}) {
  const info = PLANS[plan];
  return (
    <Card
      className={
        plan === "pro" ? "ring-2 ring-indigo-600 dark:ring-indigo-500" : undefined
      }
    >
      <div className="flex items-center justify-between">
        <CardTitle>{info.name}</CardTitle>
        {current && <Badge tone="indigo">Current plan</Badge>}
        {!current && plan === "pro" && <Badge tone="indigo">Most popular</Badge>}
      </div>
      <p className="mt-3">
        <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          ${info.priceMonthly}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">/month</span>
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
        {info.features.map((feature) => (
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
