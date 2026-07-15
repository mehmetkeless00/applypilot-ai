import Link from "next/link";

/**
 * Shared empty-state block: a real heading for screen readers, a short
 * explanation of what the feature provides, and an optional CTA link.
 */
export function EmptyState({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-6 py-10 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
