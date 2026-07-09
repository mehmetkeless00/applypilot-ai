export function UsageIndicator({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const exhausted = used >= limit;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-900 dark:text-slate-100">
          Analyses this month
        </span>
        <span
          className={
            exhausted
              ? "font-semibold text-red-600 dark:text-red-400"
              : "text-slate-500 dark:text-slate-400"
          }
        >
          {used} / {limit}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${
            exhausted ? "bg-red-500" : "bg-indigo-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
