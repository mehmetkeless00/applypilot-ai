import { decodeEntities, htmlToText } from "@/lib/jobimport/html";
import { cleanMetadataText } from "@/lib/text";
import {
  JobProviderError,
  type JobListing,
  type JobSearchFilters,
  type ListingEmploymentType,
} from "./types";

// Adzuna job search adapter (https://developer.adzuna.com/docs/search).
// Credentials are read from server-only env vars and appear exclusively in
// the outbound request URL — never in anything returned to the client.

/** Countries Adzuna serves, per their developer docs. */
export const ADZUNA_COUNTRIES = [
  "at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb",
  "in", "it", "mx", "nl", "nz", "pl", "sg", "us", "za",
] as const;

export type AdzunaCountry = (typeof ADZUNA_COUNTRIES)[number];

export function adzunaAvailable(): boolean {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

export const ADZUNA_RESULTS_PER_PAGE = 20;

/** Builds the search URL, including credentials — server-side use only. */
export function buildAdzunaUrl(filters: JobSearchFilters): string {
  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(filters.country)}/search/1`,
  );
  url.searchParams.set("app_id", process.env.ADZUNA_APP_ID ?? "");
  url.searchParams.set("app_key", process.env.ADZUNA_APP_KEY ?? "");
  url.searchParams.set("results_per_page", String(ADZUNA_RESULTS_PER_PAGE));
  if (filters.workMode === "onsite" && filters.city) {
    url.searchParams.set("where", filters.city);
  }
  if (filters.workMode === "remote") {
    // Adzuna has no remote flag and "where" is a geocoded location field —
    // setting where=remote doesn't match anything (confirmed live: 0
    // results for every country) since "remote" isn't a real place Adzuna
    // can resolve. Narrow with a keyword in "what" instead, which Adzuna
    // actually searches against titles/descriptions.
    const alreadyMentionsRemote = /\bremote\b/i.test(filters.query);
    url.searchParams.set(
      "what",
      alreadyMentionsRemote ? filters.query : `${filters.query} remote`,
    );
  } else {
    url.searchParams.set("what", filters.query);
  }
  if (filters.maxDaysOld > 0) {
    url.searchParams.set("max_days_old", String(filters.maxDaysOld));
  }
  if (filters.employmentType === "full_time") url.searchParams.set("full_time", "1");
  if (filters.employmentType === "part_time") url.searchParams.set("part_time", "1");
  return url.toString();
}

interface AdzunaResult {
  id?: string | number;
  title?: string;
  description?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  created?: string;
  redirect_url?: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  contract_time?: string;
}

function employmentType(contractTime: string | undefined): ListingEmploymentType | null {
  if (contractTime === "full_time") return "full_time";
  if (contractTime === "part_time") return "part_time";
  return null;
}

/**
 * Salary display from real listing data only: Adzuna marks estimated
 * salaries with salary_is_predicted="1" — those are suppressed entirely.
 * No currency symbol is added since the API doesn't state one.
 */
export function adzunaSalary(result: AdzunaResult): string | null {
  if (result.salary_is_predicted === "1") return null;
  const min = typeof result.salary_min === "number" && result.salary_min > 0 ? result.salary_min : null;
  const max = typeof result.salary_max === "number" && result.salary_max > 0 ? result.salary_max : null;
  if (min === null && max === null) return null;
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  if (min !== null && max !== null) {
    return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  }
  return fmt((min ?? max) as number);
}

/** Normalizes one Adzuna result; null when it lacks the required fields. */
export function normalizeAdzunaResult(result: AdzunaResult): JobListing | null {
  const title = cleanMetadataText(result.title);
  const url = result.redirect_url;
  if (!title || !url || result.id === undefined || result.id === null) return null;
  const description = result.description
    ? htmlToText(decodeEntities(result.description))
    : "";
  const location = cleanMetadataText(result.location?.display_name) ?? null;
  return {
    id: `adzuna:${result.id}`,
    provider: "adzuna",
    title,
    company: cleanMetadataText(result.company?.display_name) ?? null,
    location,
    remote: /\bremote\b/i.test(`${title} ${location ?? ""}`),
    remoteRestriction: null,
    url,
    postedAt: result.created && !Number.isNaN(Date.parse(result.created)) ? result.created : null,
    salary: adzunaSalary(result),
    employmentType: employmentType(result.contract_time),
    description,
  };
}

export async function searchAdzuna(filters: JobSearchFilters): Promise<JobListing[]> {
  let response: Response;
  try {
    response = await fetch(buildAdzunaUrl(filters), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new JobProviderError("adzuna", "Adzuna request failed or timed out");
  }
  if (!response.ok) {
    throw new JobProviderError("adzuna", `Adzuna responded ${response.status}`);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new JobProviderError("adzuna", "Adzuna returned invalid JSON");
  }
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) {
    throw new JobProviderError("adzuna", "Adzuna response missing results array");
  }
  return results
    .map((r) => normalizeAdzunaResult(r as AdzunaResult))
    .filter((listing): listing is JobListing => listing !== null);
}
