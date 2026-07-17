import { signOut } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
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
      <DashboardNav
        locale={locale}
        usage={<HeaderUsage />}
        switcher={<LanguageSwitcher locale={locale} />}
        account={
          <>
            <span className="hidden max-w-48 truncate text-sm text-slate-500 lg:inline dark:text-slate-400">
              {user?.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {t.common.signOut}
              </button>
            </form>
          </>
        }
      />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
