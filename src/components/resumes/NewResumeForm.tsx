"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createResume, type ResumeActionState } from "@/app/dashboard/resumes/actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { getMessages, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function NewResumeForm({ locale = "en" }: { locale?: Locale }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [uploading, setUploading] = useState(false);
  const messages = getMessages(locale);
  const t = messages.resumes.form;
  const errs = messages.newAnalysis.errors;

  const [state, formAction, pending] = useActionState(
    async (prev: ResumeActionState, formData: FormData) => {
      // For uploads, store the PDF first and pass its path to the action.
      if (mode === "upload") {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return { error: errs.choosePdfFile };
        if (file.type !== "application/pdf") return { error: errs.mustBePdf };
        if (file.size > MAX_PDF_BYTES) return { error: errs.pdfTooLarge };

        setUploading(true);
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return { error: errs.sessionExpired };
          const path = `${user.id}/${crypto.randomUUID()}.pdf`;
          const { error } = await supabase.storage
            .from("resumes")
            .upload(path, file, { contentType: "application/pdf" });
          if (error) return { error: errs.uploadFailed };
          formData.set("filePath", path);
        } finally {
          setUploading(false);
        }
      }
      return createResume(prev, formData);
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Input
        label={t.name}
        name="title"
        required
        maxLength={120}
        placeholder={t.namePlaceholder}
      />

      <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 w-fit">
        {(["paste", "upload"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
              mode === m
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400",
            )}
          >
            {m === "paste" ? t.pasteTab : t.uploadTab}
          </button>
        ))}
      </div>

      {mode === "paste" ? (
        <Textarea
          label={t.resumeText}
          name="content"
          rows={10}
          placeholder={t.textPlaceholder}
        />
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.pdfFile}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-300"
          />
        </div>
      )}

      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending || uploading}>
        {(pending || uploading) && <Spinner />}
        {pending || uploading ? t.saving : t.submit}
      </Button>
    </form>
  );
}
