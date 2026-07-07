"use client";

import { deleteAnalysis } from "@/app/dashboard/actions";

export function DeleteAnalysisButton({ id }: { id: string }) {
  return (
    <form
      action={deleteAnalysis}
      onSubmit={(e) => {
        if (!confirm("Delete this analysis? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
      >
        Delete
      </button>
    </form>
  );
}
