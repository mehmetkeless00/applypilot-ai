"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { ResumeSuggestion } from "@/lib/types";

// Guided "apply suggestion" flow: preview dialog → explicit confirm →
// immutable new version → optional re-score CTA. The server re-validates
// everything; this component only displays outcomes.

/** Dialog body shown before confirming. Pure — also rendered in tests. */
export function SuggestionPreview({
  suggestion,
  titleId,
}: {
  suggestion: ResumeSuggestion;
  titleId: string;
}) {
  return (
    <div>
      <h2
        id={titleId}
        className="text-lg font-bold text-slate-900 dark:text-slate-100"
      >
        Preview change
      </h2>
      <div className="mt-4 space-y-3">
        <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Before
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
            {suggestion.original_text}
          </p>
        </div>
        <div className="rounded-md bg-green-50 p-3 dark:bg-green-500/10">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
            After
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
            {suggestion.improved_text}
          </p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {suggestion.reason}
        </p>
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
          Only the text shown above will change. The rest of your resume
          stays exactly as it is, and your current version is kept.
        </p>
      </div>
    </div>
  );
}

interface AppliedResult {
  versionId: string;
  version: number;
  resumeId: string;
}

export function ApplySuggestionButton({
  analysisId,
  suggestionIndex,
  suggestion,
}: {
  analysisId: string;
  suggestionIndex: number;
  suggestion: ResumeSuggestion;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<AppliedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState<string | null>(null);

  function open() {
    setError(null);
    setConflict(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function confirmApply() {
    setBusy(true);
    setError(null);
    setConflict(false);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/apply-suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion: suggestionIndex }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setConflict(res.status === 409);
        setError(payload?.error ?? "Something went wrong. Try again.");
        setBusy(false);
        return;
      }
      setApplied({
        versionId: payload.versionId,
        version: payload.version,
        resumeId: payload.resumeId,
      });
      setBusy(false);
    } catch {
      setError("Could not reach the server. Try again.");
      setBusy(false);
    }
  }

  async function rescore() {
    setRescoring(true);
    setRescoreError(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/rescore`, {
        method: "POST",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setRescoreError(payload?.error ?? "Re-score failed. Try again.");
        setRescoring(false);
        return;
      }
      router.push(`/dashboard/analysis/${payload.id}`);
    } catch {
      setRescoreError("Could not reach the server. Try again.");
      setRescoring(false);
    }
  }

  return (
    <>
      <Button variant="secondary" type="button" onClick={open}>
        Apply to resume
      </Button>

      {applied && (
        <div
          role="status"
          className="order-last basis-full rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-400"
        >
          <p className="font-semibold">
            Suggestion applied. Resume version {applied.version} was created.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={rescore} disabled={rescoring}>
              {rescoring && <Spinner />}
              {rescoring
                ? "Re-scoring…"
                : `Re-score with version ${applied.version}`}
            </Button>
            <Link
              href={`/dashboard/resumes/${applied.resumeId}`}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              View resume
            </Link>
          </div>
          <p className="mt-2 text-xs text-green-700 dark:text-green-500">
            Re-scoring uses 1 analysis from your monthly limit.
          </p>
          {rescoreError && (
            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {rescoreError} Your new resume version is saved either way.
            </p>
          )}
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-full max-w-lg rounded-xl bg-white p-6 shadow-xl backdrop:bg-slate-900/50 dark:bg-slate-900 dark:text-slate-100"
      >
        {applied ? (
          <div>
            <h2
              id={titleId}
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              Suggestion applied
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Resume version {applied.version} was created. Your previous
              versions are unchanged.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" type="button" onClick={close}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <SuggestionPreview suggestion={suggestion} titleId={titleId} />
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
              >
                {error}
                {conflict && applied === null && (
                  <>
                    {" "}
                    <Link
                      href="/dashboard/resumes"
                      className="font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      Review your resume
                    </Link>
                  </>
                )}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={close}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmApply}
                disabled={busy || conflict}
                aria-label="Create a new resume version with this change"
              >
                {busy && <Spinner />}
                {busy ? "Creating version…" : "Create new version"}
              </Button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
