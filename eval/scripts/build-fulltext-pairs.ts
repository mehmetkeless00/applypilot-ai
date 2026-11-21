// Chooses the full-text subset's pairs (experiment log E006).
//
//   npx tsx eval/scripts/build-fulltext-pairs.ts
//
// Separate from the 450-pair production set: these pairs use only the
// full-text pool (Jobicy, Arbeitnow) and are reported on their own.
//
// Per CV: 5 own-role, 3 neighbour-role, 2 random pairs.
//   own        title contains EVERY role word of search_query
//              (titleMatchesAll: the stricter rule approved for this subset)
//   neighbour  title passes the main set's rule for neighbour_query
//              (at least half the role words), excluding own candidates
//   random     any other listing in the pool
//
// CV selection: the 12 approved CVs, in order; any CV with fewer than 5
// own-role candidates is replaced by the next fallback CV that has enough.
// The outcome is printed and recorded in E006.
//
// non_job_suspect is copied from the pool as a screening column only.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCvs } from "./lib/cvs";
import { makeRng, shuffle } from "./lib/rng";
import { DATA_DIR } from "./lib/snapshot";
import { loadSnapshot } from "./lib/snapshot";
import { titleMatches, titleMatchesAll } from "./lib/titles";

const SEED = 20261121;
const PER_BUCKET = { own: 5, neighbour: 3, random: 2 } as const;
type Bucket = keyof typeof PER_BUCKET;

const APPROVED = [
  "cv-01", "cv-09", "cv-11", "cv-17", "cv-18", "cv-24",
  "cv-25", "cv-26", "cv-27", "cv-02", "cv-16", "cv-28",
];
// Fallbacks in order of preference (Turkish CVs first, to keep a Turkish
// subgroup, then the largest own-role pools).
const FALLBACKS = ["cv-21", "cv-05", "cv-10", "cv-20", "cv-30", "cv-06", "cv-04", "cv-14"];

interface PoolJob {
  id: string;
  title: string;
  description: string;
  language: string;
  listing_quality: "thin" | "full";
  non_job_suspect: "yes" | "no";
}

function main() {
  const rng = makeRng(SEED);
  const cvs = new Map(loadCvs().map((cv) => [cv.meta.id, cv.meta]));
  const pool = [...loadSnapshot("snapshot-fulltext.jsonl").values()] as unknown as PoolJob[];
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));

  const candidatesFor = (cvId: string): Record<Bucket, PoolJob[]> => {
    const meta = cvs.get(cvId)!;
    const own = sorted.filter((j) => titleMatchesAll(meta.search_query, j.title));
    const ownIds = new Set(own.map((j) => j.id));
    const neighbour = sorted.filter(
      (j) => !ownIds.has(j.id) && titleMatches(meta.neighbour_query, j.title),
    );
    const used = new Set([...ownIds, ...neighbour.map((j) => j.id)]);
    const random = sorted.filter((j) => !used.has(j.id));
    return { own, neighbour, random };
  };

  const enough = (c: Record<Bucket, PoolJob[]>) =>
    (Object.keys(PER_BUCKET) as Bucket[]).every((b) => c[b].length >= PER_BUCKET[b]);

  const selected: string[] = [];
  const fallbacks = [...FALLBACKS];
  for (const cvId of APPROVED) {
    const c = candidatesFor(cvId);
    if (enough(c)) {
      selected.push(cvId);
      console.log(`${cvId} kept      own ${c.own.length} neighbour ${c.neighbour.length}`);
      continue;
    }
    console.log(`${cvId} too few   own ${c.own.length} neighbour ${c.neighbour.length}`);
    while (fallbacks.length > 0) {
      const alt = fallbacks.shift()!;
      const ca = candidatesFor(alt);
      if (enough(ca)) {
        selected.push(alt);
        console.log(`  -> ${alt} replaces it (own ${ca.own.length} neighbour ${ca.neighbour.length})`);
        break;
      }
      console.log(`  -> ${alt} also too few (own ${ca.own.length})`);
    }
  }

  const rows: string[][] = [];
  for (const cvId of selected) {
    const c = candidatesFor(cvId);
    const cvLang = cvs.get(cvId)!.cv_language;
    for (const bucket of Object.keys(PER_BUCKET) as Bucket[]) {
      for (const job of shuffle(c[bucket], rng).slice(0, PER_BUCKET[bucket])) {
        const languagePair =
          job.language === "unknown" ? "unknown" : job.language === cvLang ? "same" : "cross";
        rows.push([
          cvId, job.id, bucket, cvLang, job.language, languagePair,
          String(job.description.length), job.description.endsWith("…") ? "yes" : "no",
          job.listing_quality, job.non_job_suspect,
        ]);
      }
    }
  }
  const ordered = shuffle(rows, rng).map((r, i) => [`f-${String(i + 1).padStart(3, "0")}`, ...r]);
  const header = [
    "pair_id", "cv_id", "job_id", "bucket", "cv_language", "job_language", "language_pair",
    "desc_chars", "truncated", "listing_quality", "non_job_suspect",
  ];
  writeFileSync(
    join(DATA_DIR, "pairs-fulltext.csv"),
    [header.join(","), ...ordered.map((r) => r.join(","))].join("\n") + "\n",
  );
  console.log(`selected ${selected.length} CVs: ${selected.join(" ")}; pairs ${ordered.length}`);
}

main();
