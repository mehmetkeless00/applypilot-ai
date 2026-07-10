"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

type ResumeMode = "paste" | "upload";
type JobMode = "paste" | "import";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function ModeTabs<T extends string>({
  modes,
  labels,
  active,
  onChange,
  disabled,
}: {
  modes: readonly T[];
  labels: Record<T, string>;
  active: T;
  onChange: (mode: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          disabled={disabled}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
            active === mode
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400",
          )}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  );
}

export function NewAnalysisForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobMode, setJobMode] = useState<JobMode>("paste");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedFrom, setImportedFrom] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);

  const [resumeMode, setResumeMode] = useState<ResumeMode>("paste");
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setImportError(null);
    setImporting(true);
    try {
      const response = await fetch("/api/import-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Import failed. Try pasting manually.");
      }
      setJobTitle(payload.jobTitle ?? "");
      setCompany(payload.company ?? "");
      setJobDescription(
        payload.location
          ? `Location: ${payload.location}\n\n${payload.jobDescription}`
          : payload.jobDescription,
      );
      setImportedFrom(importUrl);
      setImportNote(payload.note ?? null);
      setJobMode("paste"); // show the imported text so the user can review/edit
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Import failed. Try pasting manually.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const resumeText = String(formData.get("resumeText") ?? "");
    const file = fileInputRef.current?.files?.[0];

    if (resumeMode === "upload") {
      if (!file) {
        setError("Choose a PDF resume to upload.");
        return;
      }
      if (file.type !== "application/pdf") {
        setError("The resume must be a PDF file.");
        return;
      }
      if (file.size > MAX_PDF_BYTES) {
        setError("The PDF is too large (max 10 MB).");
        return;
      }
    }

    setSubmitting(true);
    try {
      let resumeFilePath: string | undefined;

      if (resumeMode === "upload" && file) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Your session expired — sign in again.");

        const path = `${user.id}/${crypto.randomUUID()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(path, file, { contentType: "application/pdf" });
        if (uploadError) {
          throw new Error("Could not upload the PDF. Try again.");
        }
        resumeFilePath = path;
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          company: company || undefined,
          jobDescription,
          resumeText: resumeMode === "paste" ? resumeText : undefined,
          resumeFilePath,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Analysis failed. Try again.");
      }

      router.push(`/dashboard/analysis/${payload.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Job title"
          name="jobTitle"
          required
          minLength={2}
          maxLength={200}
          placeholder="Senior Frontend Engineer"
          disabled={submitting}
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />
        <Input
          label="Company (optional)"
          name="company"
          maxLength={200}
          placeholder="Acme Inc."
          disabled={submitting}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Job description
          </span>
          <ModeTabs
            modes={["paste", "import"] as const}
            labels={{ paste: "Paste job description", import: "Import from URL" }}
            active={jobMode}
            onChange={setJobMode}
            disabled={submitting || importing}
          />
        </div>

        {jobMode === "import" ? (
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <Input
              label="Job posting URL"
              type="url"
              placeholder="https://boards.greenhouse.io/company/jobs/123456"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              disabled={importing}
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Works best with Greenhouse, Lever, Ashby, and Workable; many
              other job pages import too, but not all. For LinkedIn, copy the
              posting text and use the Paste tab.
            </p>
            {importError && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                {importError}
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={handleImport}
              disabled={importing || !importUrl.trim()}
            >
              {importing && <Spinner />}
              {importing ? "Importing…" : "Import job posting"}
            </Button>
          </div>
        ) : (
          <>
            {importedFrom && (
              <p className="mb-1.5 text-xs text-green-700 dark:text-green-400">
                Imported from {importedFrom} — review and edit below.
                {importNote && (
                  <span className="text-amber-700 dark:text-amber-400">
                    {" "}
                    {importNote}
                  </span>
                )}
              </p>
            )}
            <Textarea
              name="jobDescription"
              required
              minLength={100}
              maxLength={50000}
              rows={10}
              placeholder="Paste the full job description here…"
              disabled={submitting}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Your resume
          </span>
          <ModeTabs
            modes={["paste", "upload"] as const}
            labels={{ paste: "Paste text", upload: "Upload PDF" }}
            active={resumeMode}
            onChange={setResumeMode}
            disabled={submitting}
          />
        </div>

        {resumeMode === "paste" ? (
          <Textarea
            name="resumeText"
            required
            minLength={100}
            maxLength={50000}
            rows={10}
            placeholder="Paste your resume text here…"
            disabled={submitting}
          />
        ) : (
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 text-center hover:border-indigo-400 dark:border-slate-700",
              submitting && "pointer-events-none opacity-60",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              name="resumeFile"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <span className="text-sm font-semibold text-indigo-600">
              {fileName ?? "Choose a PDF resume"}
            </span>
            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              PDF only, up to 10 MB
            </span>
          </label>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? "Analyzing…" : "Analyze application"}
        </Button>
        {submitting && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Analysis in progress — this usually takes under a minute.
          </p>
        )}
      </div>
    </form>
  );
}
