import { htmlToText } from "@/lib/jobimport/html";
import { cleanMetadataText } from "@/lib/text";
import {
  JobProviderError,
  type JobListing,
  type JobSearchFilters,
  type ListingEmploymentType,
} from "./types";

// Remotive remote-jobs adapter (https://remotive.com/api/remote-jobs).
// The public API needs no key but asks for very low request frequency, so
// responses are memoized in-process for a while. Every listing is remote
// by definition; recency and employment-type filters are applied here
// because the API doesn't support them.

const REMOTIVE_LIMIT = 20;

// In-process courtesy cache honoring Remotive's request-frequency terms.
// Plain module state — resets on cold start, shared within an instance.
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; jobs: JobListing[] }>();

/** Test hook: clears the module-level response cache. */
export function clearRemotiveCache(): void {
  cache.clear();
}

interface RemotiveJob {
  id?: string | number;
  url?: string;
  title?: string;
  company_name?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
  tags?: unknown;
}

function employmentType(jobType: string | undefined): ListingEmploymentType | null {
  if (jobType === "full_time") return "full_time";
  if (jobType === "part_time") return "part_time";
  if (jobType === "contract" || jobType === "freelance") return "contract";
  return jobType ? "other" : null;
}

/** Normalizes one Remotive job; null when it lacks the required fields. */
export function normalizeRemotiveJob(job: RemotiveJob): JobListing | null {
  const title = cleanMetadataText(job.title);
  const url = job.url;
  if (!title || !url || job.id === undefined || job.id === null) return null;
  const restriction = cleanMetadataText(job.candidate_required_location) ?? null;
  const tags = Array.isArray(job.tags)
    ? job.tags.filter((t): t is string => typeof t === "string").join(" ")
    : "";
  // Descriptions arrive as HTML — strip to plain text so nothing external
  // is ever rendered as markup.
  const description = [
    job.description ? htmlToText(job.description) : "",
    tags,
  ]
    .filter(Boolean)
    .join("\n\n");
  const postedAt =
    job.publication_date && !Number.isNaN(Date.parse(job.publication_date))
      ? new Date(job.publication_date).toISOString()
      : null;
  return {
    id: `remotive:${job.id}`,
    provider: "remotive",
    title,
    company: cleanMetadataText(job.company_name) ?? null,
    location: restriction,
    remote: true,
    remoteRestriction: restriction,
    url,
    postedAt,
    // Free-text salary shown exactly as the listing states it.
    salary: cleanMetadataText(job.salary) ?? null,
    employmentType: employmentType(job.job_type),
    description,
  };
}

async function fetchRemotive(query: string): Promise<JobListing[]> {
  const cached = cache.get(query);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.jobs;

  const url = new URL("https://remotive.com/api/remote-jobs");
  url.searchParams.set("search", query);
  url.searchParams.set("limit", String(REMOTIVE_LIMIT));

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new JobProviderError("remotive", "Remotive request failed or timed out");
  }
  if (!response.ok) {
    throw new JobProviderError("remotive", `Remotive responded ${response.status}`);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new JobProviderError("remotive", "Remotive returned invalid JSON");
  }
  const jobs = (data as { jobs?: unknown }).jobs;
  if (!Array.isArray(jobs)) {
    throw new JobProviderError("remotive", "Remotive response missing jobs array");
  }
  const listings = jobs
    .map((j) => normalizeRemotiveJob(j as RemotiveJob))
    .filter((listing): listing is JobListing => listing !== null);
  cache.set(query, { at: Date.now(), jobs: listings });
  return listings;
}

export async function searchRemotive(
  filters: JobSearchFilters,
  now: Date = new Date(),
): Promise<JobListing[]> {
  const listings = await fetchRemotive(filters.query);
  return listings.filter((listing) => {
    if (filters.maxDaysOld > 0) {
      if (!listing.postedAt) return false;
      const ageDays = (now.getTime() - Date.parse(listing.postedAt)) / 86_400_000;
      if (ageDays > filters.maxDaysOld) return false;
    }
    if (
      filters.employmentType !== "any" &&
      listing.employmentType !== null &&
      listing.employmentType !== filters.employmentType
    ) {
      return false;
    }
    return true;
  });
}
