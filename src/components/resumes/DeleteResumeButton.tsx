"use client";

import { useState } from "react";
import { deleteResume } from "@/app/dashboard/resumes/actions";
import { Button } from "@/components/ui/Button";
import { getMessages, type Locale } from "@/lib/i18n";

export function DeleteResumeButton({
  resumeId,
  locale = "en",
}: {
  resumeId: string;
  locale?: Locale;
}) {
  const [confirming, setConfirming] = useState(false);
  const t = getMessages(locale);

  if (!confirming) {
    return (
      <Button variant="ghost" type="button" onClick={() => setConfirming(true)}>
        {t.resumes.deleteButton}
      </Button>
    );
  }

  return (
    <form action={deleteResume} className="flex items-center gap-2">
      <input type="hidden" name="resumeId" value={resumeId} />
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {t.resumes.deleteConfirm}
      </span>
      <Button variant="danger" type="submit">
        {t.common.delete}
      </Button>
      <Button variant="ghost" type="button" onClick={() => setConfirming(false)}>
        {t.common.cancel}
      </Button>
    </form>
  );
}
