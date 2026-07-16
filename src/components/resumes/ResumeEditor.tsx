"use client";

import { useActionState, useState } from "react";
import { saveNewVersion, type ResumeActionState } from "@/app/dashboard/resumes/actions";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { getMessages, type Locale } from "@/lib/i18n";

export function ResumeEditor({
  resumeId,
  initialContent,
  locale = "en",
}: {
  resumeId: string;
  initialContent: string;
  locale?: Locale;
}) {
  const t = getMessages(locale).resumes;
  const [content, setContent] = useState(initialContent);
  const [state, formAction, pending] = useActionState(
    async (prev: ResumeActionState, formData: FormData) => {
      const result = await saveNewVersion(prev, formData);
      return result;
    },
    null,
  );
  const dirty = content !== initialContent;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="resumeId" value={resumeId} />
      <Textarea
        label={t.form.resumeText}
        name="content"
        rows={16}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !dirty}>
          {pending && <Spinner />}
          {t.editor.saveNewVersion}
        </Button>
        {!dirty && (
          <span className="text-xs text-slate-400">{t.editor.editToSave}</span>
        )}
      </div>
    </form>
  );
}
