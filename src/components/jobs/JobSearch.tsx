"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { JobSearchPanel, type SearchPhase } from "./JobSearchPanel";
import { getMessages, LOCALES, type Locale } from "@/lib/i18n";
import { SUPPORTED_COUNTRIES, type SearchCountry } from "@/lib/jobs/countries";
import {
  isTurkeyOnsiteBlocked,
  recoverSearchParams,
  runJobSearch,
  type JobSearchRequestBody,
} from "@/lib/jobs/searchRequest";
import type { SuggestedTerms } from "@/lib/jobs/suggest";
import type {
  EmploymentTypeFilter,
  ExperienceLevel,
  JobSearchResponse,
  ScoredJobListing,
} from "@/lib/jobs/types";

// Job discovery: pick a saved CV version, edit the CV-derived search
// terms, search real listings server-side, and preview compatibility
// before spending an analysis. Searching is free — only the explicit
// "Analyze this job" confirmation consumes quota.
//
// Every filter control below carries a `name` attribute and the form has
// no onSubmit-only reliance: if the page's JS hasn't finished hydrating
// yet when the form is submitted (slow device/network), the browser
// falls back to its native submission — a GET to the current URL with
// each named field as a query parameter. `recoverSearchParams` (called on
// mount) detects that fallback and completes the search the user actually
// asked for, instead of silently landing back on the initial state.

export interface ResumeOption {
  id: string;
  title: string;
  versions: { id: string; version: number; label: string; terms: SuggestedTerms }[];
}

const RECENCY_OPTIONS = [0, 1, 3, 7, 14, 30] as const;

const selectClass =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700";

const chipClass =
  "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300";

export function JobSearch({
  resumes,
  locale = "en",
}: {
  resumes: ResumeOption[];
  locale?: Locale;
}) {
  const router = useRouter();
  const t = getMessages(locale).jobs;
  const tCommon = getMessages(locale).common;
  const languageNames = getMessages(locale).newAnalysis.languageNames;

  // Computed once, lazily: does the URL carry a prior native-form-fallback
  // submission's parameters? Read directly into each field's initial
  // state below (never via an effect calling setState after mount, which
  // would cost an extra render and briefly flash the CV-derived
  // defaults before the recovered values replace them).
  const [recovered] = useState(() =>
    typeof window === "undefined"
      ? null
      : recoverSearchParams(new URLSearchParams(window.location.search)),
  );

  const [resumeId, setResumeId] = useState(recovered?.resumeId ?? resumes[0].id);
  const [versionId, setVersionId] = useState(
    recovered?.resumeVersionId ?? resumes[0].versions[0].id,
  );
  const resume = resumes.find((r) => r.id === resumeId) ?? resumes[0];
  const version = resume.versions.find((v) => v.id === versionId) ?? resume.versions[0];
  const terms = version.terms;

  const [query, setQuery] = useState(
    recovered?.query ?? (terms.titles[0] ?? terms.skills[0] ?? ""),
  );
  const [queryDirty, setQueryDirty] = useState(Boolean(recovered));
  const [country, setCountry] = useState<SearchCountry>(recovered?.country ?? "gb");
  const [workMode, setWorkMode] = useState<"remote" | "onsite">(
    recovered?.workMode ?? "remote",
  );
  const [city, setCity] = useState(recovered?.city ?? "");
  const [level, setLevel] = useState<ExperienceLevel>(
    recovered?.experienceLevel ?? (terms.level ?? "any"),
  );
  const [employment, setEmployment] = useState<EmploymentTypeFilter>(
    recovered?.employmentType ?? "any",
  );
  const [maxDaysOld, setMaxDaysOld] = useState<number>(recovered?.maxDaysOld ?? 0);

  // Turkey has no working on-site provider (see search.ts): show a heads-up
  // as soon as Turkey is selected, and block the submit itself once
  // on-site is also selected, so no request that's guaranteed to come
  // back empty is ever sent.
  const isTurkey = country === "tr";
  const onsiteBlocked = isTurkeyOnsiteBlocked(country, workMode);
  const turkeyNoticeId = "turkey-onsite-notice";

  const [phase, setPhase] = useState<SearchPhase>("initial");
  const [formError, setFormError] = useState<string | null>(null);
  const [results, setResults] = useState<JobSearchResponse | null>(null);
  // Ignore a response that resolves after a newer request has started, so
  // an out-of-order network reply can never clobber a fresher phase.
  const requestSeq = useRef(0);

  // Analyze-confirmation dialog state.
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<ScoredJobListing | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<Locale>(locale);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  function selectVersion(nextResumeId: string, nextVersionId?: string) {
    const nextResume = resumes.find((r) => r.id === nextResumeId) ?? resumes[0];
    const nextVersion =
      nextResume.versions.find((v) => v.id === nextVersionId) ?? nextResume.versions[0];
    setResumeId(nextResume.id);
    setVersionId(nextVersion.id);
    // Refresh CV-derived defaults unless the user already edited them.
    if (!queryDirty) {
      setQuery(nextVersion.terms.titles[0] ?? nextVersion.terms.skills[0] ?? "");
    }
    setLevel((prev) => (prev === "any" ? (nextVersion.terms.level ?? "any") : prev));
  }

  async function runSearch(body: JobSearchRequestBody) {
    const seq = ++requestSeq.current;
    setFormError(null);
    setPhase("loading");
    const result = await runJobSearch(body, t.errors.searchFailed);
    if (seq !== requestSeq.current) return; // superseded by a later request
    if (result.status === "error") {
      setFormError(result.message);
      setPhase("failed");
      return;
    }
    setResults(result.data);
    setPhase("loaded");
  }

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    // Belt-and-suspenders: the submit button is already disabled for this
    // combination, but a native form submission (e.g. Enter key with a
    // disabled submit control) could still reach here.
    if (onsiteBlocked) return;
    if (query.trim().length < 2) {
      setFormError(t.filters.keywordsRequired);
      return;
    }
    await runSearch({
      resumeId,
      resumeVersionId: versionId,
      query: query.trim().slice(0, 120),
      country,
      workMode,
      city: workMode === "onsite" && city.trim() ? city.trim() : undefined,
      experienceLevel: level,
      employmentType: employment,
      maxDaysOld,
    });
  }

  // The recovered values are already seeded as initial state above; this
  // effect's only job is the side effects proper: clean the recovered
  // query string out of the URL, and fetch the search the user actually
  // submitted — the documented case for an Effect ("fetch data when the
  // component mounts"), so its setPhase("loading")/setResults calls are
  // intentional, not the derived-state anti-pattern the rule targets.
  useEffect(() => {
    if (!recovered) return;
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runSearch(recovered);
    // Mount-only: this is strictly a one-time recovery of a prior page's
    // native form submission, not a response to subsequent state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAnalyze(listing: ScoredJobListing) {
    setSelected(listing);
    setAnalyzeError(null);
    setLimitHit(false);
    dialogRef.current?.showModal();
  }

  async function confirmAnalyze() {
    if (!selected) return;
    if (selected.description.trim().length < 80) {
      setAnalyzeError(t.errors.invalidListing);
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    setLimitHit(false);
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          resumeVersionId: versionId,
          listing: {
            provider: selected.provider,
            url: selected.url,
            title: selected.title,
            company: selected.company ?? undefined,
            description: selected.description,
          },
          outputLanguage,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setLimitHit(res.status === 402);
        setAnalyzeError(payload?.error ?? t.errors.analyzeFailed);
        setAnalyzing(false);
        return;
      }
      router.push(`/dashboard/analysis/${payload.id}`);
    } catch {
      setAnalyzeError(t.errors.analyzeFailed);
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form onSubmit={search} method="get" className="space-y-4">
          <input type="hidden" name="resumeId" value={resumeId} readOnly />
          <input type="hidden" name="resumeVersionId" value={versionId} readOnly />
          <fieldset className="space-y-4" disabled={phase === "loading"}>
            <legend className="sr-only">{t.filters.legend}</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.filters.resume}
                <select
                  value={resumeId}
                  onChange={(e) => selectVersion(e.target.value)}
                  className={`mt-1 ${selectClass}`}
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.filters.version}
                <select
                  value={versionId}
                  onChange={(e) => selectVersion(resumeId, e.target.value)}
                  className={`mt-1 ${selectClass}`}
                >
                  {resume.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <Input
                label={t.filters.keywords}
                name="query"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setQueryDirty(true);
                }}
                maxLength={120}
                required
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {t.filters.keywordsHint}
              </p>
              {(terms.titles.length > 0 || terms.skills.length > 0) && (
                <div className="mt-2 space-y-2">
                  {terms.titles.length > 0 && (
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium">{t.filters.suggestedTitles}:</span>
                      {terms.titles.map((title) => (
                        <button
                          key={title}
                          type="button"
                          className={chipClass}
                          onClick={() => {
                            setQuery(title);
                            setQueryDirty(true);
                          }}
                        >
                          {title}
                        </button>
                      ))}
                    </p>
                  )}
                  {terms.skills.length > 0 && (
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium">{t.filters.suggestedSkills}:</span>
                      {terms.skills.slice(0, 8).map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          className={chipClass}
                          onClick={() => {
                            setQuery((prev) =>
                              prev.toLowerCase().includes(skill.toLowerCase())
                                ? prev
                                : `${prev} ${skill}`.trim().slice(0, 120),
                            );
                            setQueryDirty(true);
                          }}
                        >
                          {skill}
                        </button>
                      ))}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t.filters.suggestionNote}
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.filters.workMode}
                <select
                  name="workMode"
                  value={workMode}
                  onChange={(e) =>
                    setWorkMode(e.target.value === "onsite" ? "onsite" : "remote")
                  }
                  aria-describedby={isTurkey ? turkeyNoticeId : undefined}
                  className={`mt-1 ${selectClass}`}
                >
                  <option value="remote">{t.filters.remote}</option>
                  <option value="onsite">{t.filters.onsite}</option>
                </select>
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.filters.country}
                  <select
                    name="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value as SearchCountry)}
                    aria-describedby={isTurkey ? turkeyNoticeId : undefined}
                    className={`mt-1 ${selectClass}`}
                  >
                    {SUPPORTED_COUNTRIES.map((code) => (
                      <option key={code} value={code}>
                        {t.countries[code]}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {t.filters.countryHint}
                </p>
              </div>
              {workMode === "onsite" && (
                <Input
                  label={t.filters.city}
                  name="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={80}
                  placeholder={t.filters.cityPlaceholder}
                />
              )}
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.filters.level}
                <select
                  name="experienceLevel"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as ExperienceLevel)}
                  className={`mt-1 ${selectClass}`}
                >
                  {(
                    ["any", "internship", "entry", "junior", "mid", "senior"] as const
                  ).map((value) => (
                    <option key={value} value={value}>
                      {t.filters.levels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.filters.employment}
                <select
                  name="employmentType"
                  value={employment}
                  onChange={(e) =>
                    setEmployment(e.target.value as EmploymentTypeFilter)
                  }
                  className={`mt-1 ${selectClass}`}
                >
                  {(["any", "full_time", "part_time"] as const).map((value) => (
                    <option key={value} value={value}>
                      {t.filters.employmentTypes[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.filters.recency}
                <select
                  name="maxDaysOld"
                  value={maxDaysOld}
                  onChange={(e) => setMaxDaysOld(Number(e.target.value))}
                  className={`mt-1 ${selectClass}`}
                >
                  {RECENCY_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {days === 0 ? t.filters.recencyAny : t.filters.recencyDays(days)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          {isTurkey && (
            <p
              id={turkeyNoticeId}
              role="status"
              className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30"
            >
              {t.filters.turkeyOnsiteNotice}
            </p>
          )}

          {formError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={phase === "loading" || onsiteBlocked}
              aria-describedby={isTurkey ? turkeyNoticeId : undefined}
            >
              {phase === "loading" && <Spinner />}
              {phase === "loading" ? t.filters.searching : t.filters.search}
            </Button>
          </div>
        </form>
      </Card>

      <JobSearchPanel
        phase={phase}
        results={results}
        formError={formError}
        locale={locale}
        onRetry={() => void search()}
        onAnalyze={openAnalyze}
        analyzeDisabled={analyzing}
      />

      <dialog
        ref={dialogRef}
        aria-labelledby="analyze-job-title"
        className="m-auto w-full max-w-md rounded-xl bg-white p-6 shadow-xl backdrop:bg-slate-900/50 dark:bg-slate-900"
      >
        <h2
          id="analyze-job-title"
          className="text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          {t.confirm.title}
        </h2>
        {selected && (
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            {selected.title}
            {selected.company ? ` — ${selected.company}` : ""}
          </p>
        )}
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {t.confirm.body(resume.title, version.version)}
        </p>
        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t.confirm.languageLabel}
          <select
            value={outputLanguage}
            onChange={(e) => setOutputLanguage(e.target.value === "tr" ? "tr" : "en")}
            disabled={analyzing}
            className={`mt-1 ${selectClass}`}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {languageNames[l]}
              </option>
            ))}
          </select>
        </label>
        {analyzeError && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {analyzeError}{" "}
            {limitHit && (
              <Link
                href="/dashboard/billing"
                className="font-semibold text-indigo-600 hover:text-indigo-500"
              >
                {getMessages(locale).analysis.upgrade}
              </Link>
            )}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialogRef.current?.close()}
            disabled={analyzing}
          >
            {tCommon.cancel}
          </Button>
          <Button type="button" onClick={confirmAnalyze} disabled={analyzing}>
            {analyzing && <Spinner />}
            {analyzing ? t.confirm.running : t.confirm.confirm}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
