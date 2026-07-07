import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "slate" | "indigo";

const tones: Record<Tone, string> = {
  green: "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400",
  slate: "bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400",
};

export function Badge({
  tone = "slate",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
