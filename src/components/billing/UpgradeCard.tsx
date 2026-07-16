"use client";

import { BillingActionButton } from "@/components/billing/BillingActions";
import { PLANS } from "@/lib/billing/plans";
import { getMessages, type Locale } from "@/lib/i18n";

/** Shown in place of a plain error when a request hits the plan limit. */
export function UpgradeCard({
  message,
  billingAvailable = true,
  locale = "en",
}: {
  message: string;
  /** When Stripe is not configured, offer no checkout — Pro is "coming soon". */
  billingAvailable?: boolean;
  locale?: Locale;
}) {
  const t = getMessages(locale).billing;
  return (
    <div
      role="alert"
      className="rounded-xl bg-indigo-50 p-5 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-500/10 dark:ring-indigo-500/30"
    >
      <p className="font-semibold text-slate-900 dark:text-slate-100">
        {message}
      </p>
      {billingAvailable ? (
        <>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.quotaUpgradeBody(PLANS.pro.analysesPerMonth)}
          </p>
          <div className="mt-4">
            <BillingActionButton endpoint="/api/billing/checkout" locale={locale}>
              {t.upgradeCta(PLANS.pro.priceMonthly)}
            </BillingActionButton>
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t.proUnavailable} {t.quotaResetNote}
        </p>
      )}
    </div>
  );
}
