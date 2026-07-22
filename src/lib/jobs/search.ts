import { adzunaAvailable, searchAdzuna } from "./adzuna";
import { searchRemotive } from "./remotive";
import type {
  JobListing,
  JobProvider,
  JobSearchFilters,
  JobSearchOutcome,
  ProviderStatus,
} from "./types";

// Orchestrates the provider adapters: runs them in parallel, tolerates
// individual failures (partial results beat no results), and deduplicates
// the same job appearing on both providers.

function dedupeKey(listing: JobListing): string {
  const norm = (v: string | null) =>
    (v ?? "").toLowerCase().replace(/[^a-z0-9çğıöşü]+/g, " ").trim();
  return `${norm(listing.title)}|${norm(listing.company)}`;
}

/**
 * Removes cross-provider duplicates (same normalized title + company),
 * keeping the listing with the fuller description and borrowing the
 * duplicate's salary/date when the kept one lacks them.
 */
export function dedupeListings(listings: JobListing[]): JobListing[] {
  const byKey = new Map<string, JobListing>();
  for (const listing of listings) {
    const key = dedupeKey(listing);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, listing);
      continue;
    }
    const keep =
      listing.description.length > existing.description.length ? listing : existing;
    const drop = keep === listing ? existing : listing;
    byKey.set(key, {
      ...keep,
      salary: keep.salary ?? drop.salary,
      postedAt: keep.postedAt ?? drop.postedAt,
    });
  }
  return [...byKey.values()];
}

/**
 * Searches the applicable providers. Remotive only serves remote jobs, so
 * it's skipped for onsite city searches; Adzuna is skipped (with status
 * "unavailable") when its server credentials aren't configured.
 */
export async function searchJobs(filters: JobSearchFilters): Promise<JobSearchOutcome> {
  const statuses: Record<JobProvider, ProviderStatus> = {
    adzuna: adzunaAvailable() ? "ok" : "unavailable",
    remotive: filters.workMode === "remote" ? "ok" : "skipped",
  };

  const tasks: { provider: JobProvider; run: () => Promise<JobListing[]> }[] = [];
  if (statuses.adzuna === "ok") {
    tasks.push({ provider: "adzuna", run: () => searchAdzuna(filters) });
  }
  if (statuses.remotive === "ok") {
    tasks.push({ provider: "remotive", run: () => searchRemotive(filters) });
  }

  const settled = await Promise.allSettled(tasks.map((t) => t.run()));
  const listings: JobListing[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      listings.push(...result.value);
    } else {
      statuses[tasks[i].provider] = "failed";
      // Log the reason server-side only; raw provider errors never reach
      // the client.
      console.error(`Job provider ${tasks[i].provider} failed:`, result.reason);
    }
  });

  return { listings: dedupeListings(listings), providers: statuses };
}
