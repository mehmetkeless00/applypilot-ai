import { getMessages, type Locale } from "@/lib/i18n";
import { scoreTone } from "@/lib/utils";

const toneColors = {
  poor: "text-red-500",
  fair: "text-amber-500",
  strong: "text-green-500",
} as const;

export function ScoreGauge({
  score,
  locale = "en",
}: {
  score: number;
  locale?: Locale;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - score / 100);
  const tone = scoreTone(score);
  const t = getMessages(locale).analysis;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={t.scoreAria(score)}>
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="10"
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          transform="rotate(-90 70 70)"
          className={`stroke-current ${toneColors[tone]}`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
          {score}
        </div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
          / 100
        </div>
      </div>
    </div>
  );
}
