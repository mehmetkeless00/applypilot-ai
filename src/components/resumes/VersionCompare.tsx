"use client";

import { useMemo, useState } from "react";
import { diffLines, type DiffPart } from "@/lib/diff";
import { formatDate, resumeSourceLabel } from "@/lib/utils";

// Side-by-side-free version comparison: a single stacked, line-level diff
// that stays readable on mobile. All text is rendered as React children
// (never dangerouslySetInnerHTML), so resume content can't execute as HTML.

export interface CompareVersion {
  id: string;
  version: number;
  source: string;
  created_at: string;
  content: string | null;
}

/** Pure diff renderer — exported for tests. */
export function DiffView({ parts }: { parts: DiffPart[] }) {
  return (
    <div
      className="max-h-96 overflow-y-auto rounded-lg bg-slate-50 p-3 font-mono text-xs leading-5 dark:bg-slate-800/60"
      aria-label="Text differences between the selected versions"
    >
      {parts.map((part, i) => {
        const text = part.text === "" ? " " : part.text;
        if (part.type === "added") {
          return (
            <ins
              key={i}
              className="block whitespace-pre-wrap break-words bg-green-100 text-green-900 no-underline dark:bg-green-500/20 dark:text-green-300"
            >
              + {text}
            </ins>
          );
        }
        if (part.type === "removed") {
          return (
            <del
              key={i}
              className="block whitespace-pre-wrap break-words bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-300"
            >
              − {text}
            </del>
          );
        }
        return (
          <span
            key={i}
            className="block whitespace-pre-wrap break-words text-slate-600 dark:text-slate-400"
          >
            {"  "}
            {text}
          </span>
        );
      })}
    </div>
  );
}

function VersionSelect({
  label,
  versions,
  value,
  onChange,
}: {
  label: string;
  versions: CompareVersion[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            v{v.version} · {resumeSourceLabel(v.source)} ·{" "}
            {formatDate(v.created_at)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function VersionCompare({ versions }: { versions: CompareVersion[] }) {
  // Newest first, as passed from the resume page.
  const [fromId, setFromId] = useState(versions[1]?.id ?? versions[0]?.id);
  const [toId, setToId] = useState(versions[0]?.id);

  const from = versions.find((v) => v.id === fromId);
  const to = versions.find((v) => v.id === toId);

  const parts = useMemo(() => {
    if (!from?.content || !to?.content || from.id === to.id) return null;
    return diffLines(from.content, to.content);
  }, [from, to]);

  if (versions.length < 2) return null;

  const changed =
    parts?.filter((p) => p.type !== "same").length ?? 0;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <VersionSelect
          label="From version"
          versions={versions}
          value={fromId}
          onChange={setFromId}
        />
        <VersionSelect
          label="To version"
          versions={versions}
          value={toId}
          onChange={setToId}
        />
      </div>

      <div className="mt-4">
        {from && to && from.id === to.id ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pick two different versions to see what changed.
          </p>
        ) : !from?.content || !to?.content ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            One of the selected versions is a PDF without extracted text, so
            it can&apos;t be compared. Open the version and save its text
            first.
          </p>
        ) : parts && changed === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            These versions have identical text.
          </p>
        ) : parts ? (
          <DiffView parts={parts} />
        ) : null}
      </div>
    </div>
  );
}
