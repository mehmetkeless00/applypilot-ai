"use client";

import { deleteAnalysis } from "@/app/dashboard/actions";
import { getMessages, type Locale } from "@/lib/i18n";

export function DeleteAnalysisButton({
  id,
  locale = "en",
}: {
  id: string;
  locale?: Locale;
}) {
  const t = getMessages(locale);
  return (
    <form
      action={deleteAnalysis}
      onSubmit={(e) => {
        if (!confirm(t.analysis.deleteConfirm)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
      >
        {t.common.delete}
      </button>
    </form>
  );
}
