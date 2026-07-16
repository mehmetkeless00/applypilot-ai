"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  getMessages,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  LOCALES,
  type Locale,
} from "@/lib/i18n";

/** Persist the language choice in a server-readable cookie (1 year). */
function persistLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
}

/**
 * EN/TR toggle. Persists the choice in a server-readable cookie and
 * re-renders the current route on the server, so every server component
 * switches language without a flash or a URL change.
 */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = getMessages(locale);

  function switchTo(next: Locale) {
    if (next === locale) return;
    persistLocale(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={t.common.language}
      className="flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold dark:bg-slate-800"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={pending}
          aria-pressed={l === locale}
          aria-label={LOCALE_LABELS[l]}
          className={
            l === locale
              ? "rounded-full bg-white px-2.5 py-1 text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "rounded-full px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
