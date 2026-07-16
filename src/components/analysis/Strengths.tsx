import { Card, CardTitle } from "@/components/ui/Card";
import { getMessages, type Locale } from "@/lib/i18n";
import type { Strength } from "@/lib/types";

export function Strengths({
  strengths,
  locale = "en",
}: {
  strengths: Strength[];
  locale?: Locale;
}) {
  const t = getMessages(locale).analysis;
  return (
    <Card>
      <CardTitle>{t.strengthsTitle}</CardTitle>
      {strengths.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {t.strengthsEmpty}
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {strengths.map((s) => (
            <li key={s.strength} className="flex gap-3 text-sm">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="mt-0.5 size-4 shrink-0 text-green-500"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {s.strength}
                </span>
                <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                  {s.evidence}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
