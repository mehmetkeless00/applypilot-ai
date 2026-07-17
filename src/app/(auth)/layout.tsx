import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLocale } from "@/lib/i18n/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <Link
        href="/"
        className="mb-8 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
      >
        ApplyPilot <span className="text-indigo-600 dark:text-indigo-400">AI</span>
      </Link>
      <div className="flex w-full max-w-md animate-rise justify-center rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-slate-900 dark:ring-slate-800">
        {children}
      </div>
      <div className="mt-8">
        <LanguageSwitcher locale={locale} />
      </div>
    </div>
  );
}
