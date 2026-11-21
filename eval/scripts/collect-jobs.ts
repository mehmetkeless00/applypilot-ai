// Builds the frozen job snapshot for the evaluation.
//
//   npx tsx eval/scripts/collect-jobs.ts
//
// For every CV it pulls listings for two queries from its front matter:
//   own        = search_query      (the persona's real target role)
//   neighbour  = neighbour_query   (an adjacent role, for hard cases)
//
// Adzuna is searched with the provider's own search engine, once per query
// (about 60 calls, well inside the free tier). Remotive asks for very low
// request frequency, so its full public feed is fetched ONCE and filtered
// locally: a listing joins a query's pool when its title contains at least
// half of the query's role words. Neither filter uses the app's matching
// heuristic, so the pools are not pre-selected by a system under test.
//
// Outputs:
//   data/jobs/snapshot.jsonl  listing text (gitignored, not redistributed)
//   data/jobs/index.csv       job_id, provider, url (committed)
//   data/jobs/pools.json      per CV: own / neighbour job IDs (committed)

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { searchAdzuna } from "@/lib/jobs/adzuna";
import { normalizeRemotiveJob } from "@/lib/jobs/remotive";
import type { JobListing, JobSearchFilters } from "@/lib/jobs/types";
import { loadCvs } from "./lib/cvs";
import { detectLanguage } from "./lib/lang";
import { titleMatches } from "./lib/titles";

process.loadEnvFile(join(import.meta.dirname, "..", "..", ".env.local"));

const JOBS_DIR = join(import.meta.dirname, "..", "data", "jobs");
const ADZUNA_DELAY_MS = 1200;

async function fetchRemotiveFeed(): Promise<JobListing[]> {
  const response = await fetch("https://remotive.com/api/remote-jobs", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Remotive HTTP ${response.status}`);
  const data = (await response.json()) as { jobs?: unknown[] };
  return (data.jobs ?? [])
    .map((j) => normalizeRemotiveJob(j as Parameters<typeof normalizeRemotiveJob>[0]))
    .filter((j): j is JobListing => j !== null);
}

function filtersFor(query: string, country: string): JobSearchFilters {
  return {
    query,
    country,
    workMode: "onsite",
    experienceLevel: "any",
    employmentType: "any",
    maxDaysOld: 0,
  };
}

// Adzuna adds tracking parameters to listing URLs, including our app ID
// (utm_source). The committed index must not carry it, so tracking
// parameters are dropped; the listing ID in the path is enough to open it.
function publicUrl(url: string): string {
  const u = new URL(url);
  for (const key of [...u.searchParams.keys()]) {
    if (key.startsWith("utm_")) u.searchParams.delete(key);
  }
  return u.toString();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const cvs = loadCvs();
  const fetchedAt = new Date().toISOString();
  const all = new Map<string, JobListing>();
  const pools: Record<string, { own: string[]; neighbour: string[] }> = {};

  const remotive = await fetchRemotiveFeed();
  console.log(`Remotive feed: ${remotive.length} listings`);
  for (const job of remotive) all.set(job.id, job);

  for (const cv of cvs) {
    const pool = { own: [] as string[], neighbour: [] as string[] };
    for (const bucket of ["own", "neighbour"] as const) {
      const query = bucket === "own" ? cv.meta.search_query : cv.meta.neighbour_query;
      let adzuna: JobListing[] = [];
      try {
        adzuna = await searchAdzuna(filtersFor(query, cv.meta.search_country));
      } catch (error) {
        console.error(`Adzuna failed for ${cv.meta.id} ${bucket}:`, error);
      }
      await sleep(ADZUNA_DELAY_MS);
      for (const job of adzuna) all.set(job.id, job);
      const fromRemotive = remotive.filter((j) => titleMatches(query, j.title));
      pool[bucket] = [...new Set([...adzuna, ...fromRemotive].map((j) => j.id))];
      console.log(
        `${cv.meta.id} ${bucket.padEnd(9)} "${query}" adzuna=${adzuna.length} remotive=${fromRemotive.length}`,
      );
    }
    pools[cv.meta.id] = pool;
  }

  const lines = [...all.values()].map((job) =>
    JSON.stringify({ ...job, language: detectLanguage(job.description), fetchedAt }),
  );
  writeFileSync(join(JOBS_DIR, "snapshot.jsonl"), lines.join("\n") + "\n");
  writeFileSync(
    join(JOBS_DIR, "index.csv"),
    "job_id,provider,url\n" +
      [...all.values()].map((j) => `${j.id},${j.provider},${publicUrl(j.url)}`).join("\n") +
      "\n",
  );
  writeFileSync(join(JOBS_DIR, "pools.json"), JSON.stringify(pools, null, 2) + "\n");
  console.log(`Snapshot: ${all.size} unique listings`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
