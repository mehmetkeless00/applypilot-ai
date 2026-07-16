"use client";

import { Button } from "@/components/ui/Button";
import { getMessages, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";

// Client error boundary — no server render, so the locale comes from the
// same cookie the server reads.
function cookieLocale() {
  if (typeof document === "undefined") return "en" as const;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`),
  );
  return normalizeLocale(match?.[1]);
}

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  const t = getMessages(cookieLocale()).common;
  return (
    <div className="py-24 text-center">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {t.errorTitle}
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {t.errorBody}
      </p>
      <Button className="mt-6" onClick={reset}>
        {t.tryAgain}
      </Button>
    </div>
  );
}
