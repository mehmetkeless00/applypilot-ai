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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <Link href="/" className="mb-8 text-xl font-bold text-slate-900 dark:text-slate-100">
        ApplyPilot <span className="text-indigo-600">AI</span>
      </Link>
      {children}
      <div className="mt-8">
        <LanguageSwitcher locale={locale} />
      </div>
    </div>
  );
}
