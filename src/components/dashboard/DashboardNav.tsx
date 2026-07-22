"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { getMessages, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Analysis detail pages live under /dashboard/analysis/*, so they light up
 * the "My analyses" tab; every other destination matches by prefix.
 */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/analysis");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Dashboard header navigation: desktop links with active states, a primary
 * "New analysis" action, and a disclosure-style mobile menu. Server-only
 * pieces (usage indicator, account/sign-out) come in as slots.
 */
export function DashboardNav({
  locale,
  usage,
  account,
  switcher,
}: {
  locale: Locale;
  usage?: ReactNode;
  account?: ReactNode;
  switcher?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = getMessages(locale).nav;

  const links = [
    { href: "/dashboard", label: t.myAnalyses },
    { href: "/dashboard/jobs", label: t.findJobs },
    { href: "/dashboard/resumes", label: t.resumes },
    { href: "/dashboard/billing", label: t.billing },
  ];

  const linkClasses = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
    );

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
        >
          ApplyPilot <span className="text-indigo-600 dark:text-indigo-400">AI</span>
        </Link>

        <nav aria-label={t.menu} className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = isNavActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={linkClasses(active)}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {usage}
          <span className="hidden md:inline-flex">{switcher}</span>
          <Link
            href="/dashboard/new"
            className="hidden min-h-10 items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 md:inline-flex"
          >
            {t.newAnalysis}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="dashboard-mobile-menu"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span className="sr-only">{open ? t.closeMenu : t.menu}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-5"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
          <span className="hidden items-center gap-3 md:flex">{account}</span>
        </div>

        {open && (
          <nav
            id="dashboard-mobile-menu"
            aria-label={t.menu}
            className="w-full border-t border-slate-100 pt-2 md:hidden dark:border-slate-800"
          >
            <ul className="space-y-1">
              <li>
                <Link
                  href="/dashboard/new"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  {t.newAnalysis}
                </Link>
              </li>
              {links.map((link) => {
                const active = isNavActive(link.href, pathname);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn("block py-2.5", linkClasses(active))}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-3 dark:border-slate-800">
              {switcher}
              {account}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
