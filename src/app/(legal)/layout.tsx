import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = getMessages(locale).common;
  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          ApplyPilot <span className="text-indigo-600">AI</span>
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher locale={locale} />
          <Link
            href="/"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            {t.backToHome}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-4">{children}</main>
    </div>
  );
}
