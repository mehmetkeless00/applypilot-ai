import { SUPPORTED_COUNTRIES, type SearchCountry } from "./countries";
import type {
  EmploymentTypeFilter,
  ExperienceLevel,
  JobSearchResponse,
} from "./types";

// Client-side request lifecycle for job search, pulled out of the
// JobSearch component so it's unit-testable without a browser: the
// fetch/parse/classify logic and the native-form-fallback recovery are
// both pure functions with no React or DOM dependency.

export interface JobSearchRequestBody {
  resumeId: string;
  resumeVersionId: string;
  query: string;
  country: SearchCountry;
  workMode: "remote" | "onsite";
  city?: string;
  experienceLevel: ExperienceLevel;
  employmentType: EmploymentTypeFilter;
  maxDaysOld: number;
}

export type JobSearchClientResult =
  | { status: "ok"; data: JobSearchResponse }
  | { status: "error"; message: string };

/**
 * Turkey has no working on-site provider (see the routing comment in
 * search.ts). Rather than let the user submit a search that's guaranteed
 * to come back empty, the UI disables the submit control and explains why
 * whenever this is true — a pure predicate so both the disabled state and
 * the submit guard share one tested source of truth.
 */
export function isTurkeyOnsiteBlocked(
  country: SearchCountry,
  workMode: "remote" | "onsite",
): boolean {
  return country === "tr" && workMode === "onsite";
}

const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Runs the job search request and classifies the outcome. Never throws:
 * a network failure, a timeout, a non-2xx status, or a 200 with an
 * unexpected body shape all become a clean {status:"error"} the caller
 * can render — the UI's phase can therefore always leave "loading",
 * regardless of what the server or network does.
 */
export async function runJobSearch(
  body: JobSearchRequestBody,
  fallbackMessage: string,
  fetchImpl: typeof fetch = fetch,
): Promise<JobSearchClientResult> {
  let res: Response;
  try {
    res = await fetchImpl("/api/jobs/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return { status: "error", message: fallbackMessage };
  }

  const payload: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : fallbackMessage;
    return { status: "error", message };
  }

  // A 200 that doesn't match the documented shape is treated the same as
  // any other failure — never passed through to the UI as-is.
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as { listings?: unknown }).listings) ||
    typeof (payload as { providers?: unknown }).providers !== "object"
  ) {
    return { status: "error", message: fallbackMessage };
  }

  return { status: "ok", data: payload as JobSearchResponse };
}

const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "any",
  "internship",
  "entry",
  "junior",
  "mid",
  "senior",
];
const EMPLOYMENT_TYPES: EmploymentTypeFilter[] = ["any", "full_time", "part_time"];
const RECENCY_VALUES = [0, 1, 3, 7, 14, 30];

/**
 * Recovers a search request from a URL query string. This is the recovery
 * path for a rare but real failure mode: if the page's JavaScript hasn't
 * finished hydrating when the form is submitted (slow network/device),
 * the browser falls back to its native submission — a plain GET to the
 * current path — before React's onSubmit ever runs. With `name`
 * attributes on every field, that fallback lands here as query
 * parameters instead of silently discarding the user's filters.
 * Returns null when the required fields aren't present or don't validate,
 * so a stray or hand-edited URL never triggers a bogus search.
 */
export function recoverSearchParams(
  params: URLSearchParams,
): JobSearchRequestBody | null {
  const resumeId = params.get("resumeId");
  const resumeVersionId = params.get("resumeVersionId");
  const query = params.get("query");
  const country = params.get("country");
  const workMode = params.get("workMode");
  const experienceLevel = params.get("experienceLevel");
  const employmentType = params.get("employmentType");
  const maxDaysOldRaw = params.get("maxDaysOld");

  if (!resumeId || !resumeVersionId || !query || query.trim().length < 2) return null;
  if (!country || !(SUPPORTED_COUNTRIES as readonly string[]).includes(country)) return null;
  if (workMode !== "remote" && workMode !== "onsite") return null;
  if (!experienceLevel || !EXPERIENCE_LEVELS.includes(experienceLevel as ExperienceLevel)) {
    return null;
  }
  if (!employmentType || !EMPLOYMENT_TYPES.includes(employmentType as EmploymentTypeFilter)) {
    return null;
  }
  const maxDaysOld = Number(maxDaysOldRaw);
  if (!RECENCY_VALUES.includes(maxDaysOld)) return null;

  const city = params.get("city");

  return {
    resumeId,
    resumeVersionId,
    query,
    country: country as SearchCountry,
    workMode,
    city: workMode === "onsite" && city ? city : undefined,
    experienceLevel: experienceLevel as ExperienceLevel,
    employmentType: employmentType as EmploymentTypeFilter,
    maxDaysOld,
  };
}
