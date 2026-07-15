import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          ApplyPilot <span className="text-indigo-600">AI</span>
        </Link>
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          ← Back to home
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-4">{children}</main>
    </div>
  );
}
