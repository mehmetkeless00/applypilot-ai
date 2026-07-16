import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, PLANS } from "@/lib/billing/plans";
import { countUsageSince, monthStartUtc } from "@/lib/billing/usage";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

/** Compact monthly-usage indicator for the dashboard header. */
export async function HeaderUsage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const t = getMessages(await getLocale()).nav;

  const [{ data: profile }, count] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).single(),
    countUsageSince(supabase, "analysis", monthStartUtc()),
  ]);

  const plan = normalizePlan(profile?.plan);
  const limit = PLANS[plan].analysesPerMonth;
  const used = Math.min(count, limit);
  const exhausted = used >= limit;

  return (
    <Link
      href="/dashboard/billing"
      className={`hidden items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset sm:flex ${
        exhausted
          ? "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400"
          : "bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
      }`}
      title={t.usageTitle}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${exhausted ? "bg-red-500" : "bg-indigo-500"}`}
      />
      {t.usageThisMonth(used, limit)}
    </Link>
  );
}
