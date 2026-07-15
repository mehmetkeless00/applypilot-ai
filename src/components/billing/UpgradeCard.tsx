"use client";

import { BillingActionButton } from "@/components/billing/BillingActions";
import { PLANS } from "@/lib/billing/plans";

/** Shown in place of a plain error when a request hits the plan limit. */
export function UpgradeCard({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl bg-indigo-50 p-5 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-500/10 dark:ring-indigo-500/30"
    >
      <p className="font-semibold text-slate-900 dark:text-slate-100">
        {message}
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Pro gives you {PLANS.pro.analysesPerMonth} analyses a month — enough to
        tailor and re-score every application in a serious search.
      </p>
      <div className="mt-4">
        <BillingActionButton endpoint="/api/billing/checkout">
          Upgrade to Pro — ${PLANS.pro.priceMonthly}/mo
        </BillingActionButton>
      </div>
    </div>
  );
}
