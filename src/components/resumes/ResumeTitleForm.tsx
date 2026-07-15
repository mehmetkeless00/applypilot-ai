"use client";

import { useActionState, useState } from "react";
import { renameResume, type ResumeActionState } from "@/app/dashboard/resumes/actions";

export function ResumeTitleForm({
  resumeId,
  title,
}: {
  resumeId: string;
  title: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ResumeActionState, formData: FormData) => {
      const result = await renameResume(prev, formData);
      if (!result) setEditing(false);
      return result;
    },
    null,
  );

  if (!editing) {
    return (
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        <span className="truncate">{title}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Rename
        </button>
      </h1>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex items-center gap-2">
      <input type="hidden" name="resumeId" value={resumeId} />
      <input
        name="title"
        defaultValue={title}
        maxLength={120}
        required
        autoFocus
        className="rounded-lg border-0 bg-white px-3 py-1.5 text-lg font-bold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        Cancel
      </button>
      {state?.error && (
        <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
      )}
    </form>
  );
}
