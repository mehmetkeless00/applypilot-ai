import Link from "next/link";

export function ScoreDelta({
  previousId,
  previousScore,
  currentScore,
}: {
  previousId: string;
  previousScore: number;
  currentScore: number;
}) {
  const delta = currentScore - previousScore;
  const label = delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "no change";
  const tone =
    delta > 0
      ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400"
      : delta < 0
        ? "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400"
        : "bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400";

  return (
    <p className="mt-2 text-sm">
      <span
        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}
      >
        {label}
      </span>{" "}
      <span className="text-slate-500 dark:text-slate-400">
        vs{" "}
        <Link
          href={`/dashboard/analysis/${previousId}`}
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          previous run ({previousScore})
        </Link>
      </span>
    </p>
  );
}
