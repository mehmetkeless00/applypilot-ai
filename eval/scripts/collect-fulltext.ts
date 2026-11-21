// Builds the frozen full-text listing pool for the full-text subset (E006).
//
//   npx tsx eval/scripts/collect-fulltext.ts
//   npx tsx eval/scripts/collect-fulltext.ts --rescreen   (no requests)
//
// Requests (each source throttled, see lib/fulltext-sources.ts):
//   Arbeitnow  DE feed pages 1-3 and UK feed pages 1-2. Deeper DE pages
//              returned truncated JSON during the API check; a failed page
//              ends that feed instead of retrying.
//   Jobicy     remote jobs for geo germany, europe and uk, plus role tags
//              matching the subset's CVs (geo europe).
//
// Every listing gets two screening fields, never used to drop anything:
//   listing_quality  "thin" if under 1,000 characters or truncated, else "full"
//   non_job_suspect  "yes" if title or text looks like a programme, course
//                    or something the candidate pays for. Screening only:
//                    the final non_job decision is made in label review.
//
// Listings already in the main (Adzuna/Remotive) snapshot, by title+company,
// are left out so the two sets stay disjoint.
//
// Outputs:
//   data/jobs/snapshot-fulltext.jsonl   listing text (gitignored)
//   data/jobs/index-fulltext.csv        job_id, provider, url (committed)

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchArbeitnow, fetchJobicy, type FullTextJob } from "./lib/fulltext-sources";
import { DATA_DIR, loadSnapshot } from "./lib/snapshot";
import { normalizeTitle } from "./lib/titles";

const THIN_BELOW_CHARS = 1000;
const JOBICY_TAGS = [
  "backend", "full stack", "software engineer", "data scientist", "machine learning",
  "qa", "product manager", "designer", "sales", "data analyst", "marketing", "intern",
];

// Screening patterns for listings that may not be real job openings.
// Tuned after the first run: employee benefits ("tuition reimbursement",
// "training programme") and "Program Manager" titles are not suspects.
const NON_JOB_TITLE =
  /\b(?:programme|program)\b(?!\s*manag)|\b(?:course|bootcamp|academy|umschulung|career change|placement)\b/i;
const NON_JOB_TEXT =
  /(course fee|tuition fee|funded training|career programme|placement programme|guaranteed (?:job|interview)|no experience (?:needed|required)[^.]{0,80}train|self-employed|commission[- ]only|personal development and leadership)/i;

export type ScreenedJob = FullTextJob & {
  listing_quality: "thin" | "full";
  non_job_suspect: "yes" | "no";
};

const key = (title: string, company: string | null) =>
  `${normalizeTitle(title)}|${(company ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;

function screen(job: FullTextJob): ScreenedJob {
  return {
    ...job,
    listing_quality:
      job.description.length < THIN_BELOW_CHARS || job.description.endsWith("…") ? "thin" : "full",
    non_job_suspect:
      NON_JOB_TITLE.test(job.title) || NON_JOB_TEXT.test(job.description) ? "yes" : "no",
  };
}

const SNAPSHOT_FILE = join(DATA_DIR, "jobs", "snapshot-fulltext.jsonl");

/** --rescreen: recompute screening fields on the frozen pool, no requests. */
function rescreen() {
  const pool = readFileSync(SNAPSHOT_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => screen(JSON.parse(line) as FullTextJob));
  writeFileSync(SNAPSHOT_FILE, pool.map((j) => JSON.stringify(j)).join("\n") + "\n");
  console.log(`rescreened ${pool.length}; non_job_suspect ${pool.filter((j) => j.non_job_suspect === "yes").length}`);
}

async function main() {
  if (process.argv.includes("--rescreen")) return rescreen();
  const collected: FullTextJob[] = [];
  const log: string[] = [];

  for (const [market, pages] of [["de", 3], ["uk", 2]] as const) {
    for (let page = 1; page <= pages; page++) {
      try {
        const jobs = await fetchArbeitnow(market, page);
        collected.push(...jobs);
        log.push(`arbeitnow ${market} page ${page}: ${jobs.length}`);
        if (jobs.length === 0) break;
      } catch (error) {
        log.push(`arbeitnow ${market} page ${page}: FAILED (${(error as Error).message.slice(0, 80)})`);
        break;
      }
    }
  }

  const jobicyQueries: Record<string, string>[] = [
    { geo: "germany", count: "100" },
    { geo: "europe", count: "100" },
    { geo: "uk", count: "100" },
    ...JOBICY_TAGS.map((tag) => ({ geo: "europe", tag, count: "50" })),
  ];
  for (const params of jobicyQueries) {
    try {
      const jobs = await fetchJobicy(params);
      collected.push(...jobs);
      log.push(`jobicy ${JSON.stringify(params)}: ${jobs.length}`);
    } catch (error) {
      log.push(`jobicy ${JSON.stringify(params)}: FAILED (${(error as Error).message.slice(0, 80)})`);
    }
  }

  // Deduplicate: same ID, or same title+company across sources (keep the
  // longer description). Then drop anything already in the main snapshot.
  const mainKeys = new Set([...loadSnapshot().values()].map((j) => key(j.title, j.company)));
  const byKey = new Map<string, FullTextJob>();
  let duplicates = 0;
  for (const job of collected) {
    const k = key(job.title, job.company);
    const existing = byKey.get(k);
    if (existing) {
      duplicates++;
      if (job.description.length > existing.description.length) byKey.set(k, job);
    } else {
      byKey.set(k, job);
    }
  }
  const overlapMain = [...byKey.keys()].filter((k) => mainKeys.has(k)).length;
  const pool: ScreenedJob[] = [...byKey.entries()]
    .filter(([k]) => !mainKeys.has(k))
    .map(([, job]) => screen(job));

  writeFileSync(
    SNAPSHOT_FILE,
    pool.map((j) => JSON.stringify(j)).join("\n") + "\n",
  );
  writeFileSync(
    join(DATA_DIR, "jobs", "index-fulltext.csv"),
    "job_id,provider,url\n" + pool.map((j) => `${j.id},${j.provider},${j.url}`).join("\n") + "\n",
  );

  for (const line of log) console.log(line);
  console.log(
    `collected ${collected.length}; duplicates ${duplicates}; already in main pool ${overlapMain}; final pool ${pool.length}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
