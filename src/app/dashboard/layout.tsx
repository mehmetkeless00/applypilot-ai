import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import { HeaderUsage } from "@/components/billing/HeaderUsage";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  const t = getMessages(locale);

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              ApplyPilot <span className="text-indigo-600">AI</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
              <Link
                href="/dashboard"
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t.nav.myAnalyses}
              </Link>
              <Link
                href="/dashboard/new"
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t.nav.newAnalysis}
              </Link>
              <Link
                href="/dashboard/resumes"
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t.nav.resumes}
              </Link>
              <Link
                href="/dashboard/billing"
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t.nav.billing}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <HeaderUsage />
            <LanguageSwitcher locale={locale} />
            <span className="hidden text-sm text-slate-500 lg:inline dark:text-slate-400">
              {user?.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
