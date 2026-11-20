// Chooses which CV–job pairs get labelled.
//
//   npx tsx eval/scripts/build-pairs.ts
//
// Step 1: the 10 calibration pairs. Each comes from a different CV and is
//   chosen to exercise a specific rule in the labelling guide (see
//   CALIBRATION below). They are written to labels/calibration-pairs.csv
//   and never appear in pairs.csv.
// Step 2: per CV, 15 pairs: 8 from its own-role pool, 5 from its
//   neighbour-role pool, 2 random listings from outside both pools.
//   A job in both pools counts as "own".
// Step 3: the main pairs are shuffled into labelling order, so you never
//   label one CV's pairs in a block (that would let earlier labels anchor
//   later ones).
//
// Every random choice uses one fixed seed, so re-running gives identical
// files as long as the snapshot and pools are unchanged.
//
// Listing quality is computed here, mechanically, before any label is
// drafted or reviewed: `truncated` means the provider cut the text (it ends
// with "…"); `listing_quality` is "thin" when the listing is truncated or
// shorter than THIN_BELOW_CHARS, otherwise "full". Whether a listing is a
// real job (flag=non_job) is a judgement made during labelling instead.
//
// The labels template is written only when no labels file exists yet, so
// re-running this script can never erase drafted or reviewed labels.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCvs } from "./lib/cvs";
import { makeRng, shuffle } from "./lib/rng";
import { DATA_DIR, loadSnapshot, type SnapshotJob } from "./lib/snapshot";

const SEED = 20261120;
const THIN_BELOW_CHARS = 1000;
const PER_BUCKET = { own: 8, neighbour: 5, random: 2 } as const;
type Bucket = keyof typeof PER_BUCKET;

// One calibration pair per CV, each aimed at a guide rule.
const CALIBRATION: { cv: string; bucket: Bucket; tests: string }[] = [
  { cv: "cv-01", bucket: "own", tests: "clear strong fit vs seniority" },
  { cv: "cv-02", bucket: "own", tests: "Turkish CV, cross-language" },
  { cv: "cv-03", bucket: "neighbour", tests: "career changer, marketing trap" },
  { cv: "cv-08", bucket: "neighbour", tests: "React vs Angular boundary" },
  { cv: "cv-11", bucket: "random", tests: "easy 0 sanity check" },
  { cv: "cv-15", bucket: "own", tests: "intern career changer vs junior roles" },
  { cv: "cv-18", bucket: "own", tests: "senior specialist, evidence vs keywords" },
  { cv: "cv-27", bucket: "neighbour", tests: "'developer' word trap" },
  { cv: "cv-28", bucket: "neighbour", tests: "Turkish CV, marketing vs analytics" },
  { cv: "cv-30", bucket: "neighbour", tests: "manager vs senior IC" },
];

interface Pair {
  pair_id: string;
  cv_id: string;
  job_id: string;
  bucket: Bucket;
  cv_language: string;
  job_language: string;
  language_pair: "same" | "cross" | "unknown";
  desc_chars: number;
  truncated: "yes" | "no";
  listing_quality: "thin" | "full";
}

export const LABEL_COLUMNS = [
  "pair_id", "cv_id", "job_id", "draft_label", "label", "reviewed_change",
  "confidence", "flag", "notes", "labelled_at",
] as const;

function languagePair(cvLang: string, jobLang: string): Pair["language_pair"] {
  if (jobLang === "unknown") return "unknown";
  return cvLang === jobLang ? "same" : "cross";
}

function toCsv(rows: Pair[]): string {
  const cols: (keyof Pair)[] = [
    "pair_id", "cv_id", "job_id", "bucket", "cv_language", "job_language", "language_pair",
    "desc_chars", "truncated", "listing_quality",
  ];
  return [cols.join(","), ...rows.map((r) => cols.map((c) => r[c]).join(","))].join("\n") + "\n";
}

function main() {
  const rng = makeRng(SEED);
  const cvs = loadCvs();
  const snapshot = loadSnapshot();
  const pools = JSON.parse(
    readFileSync(join(DATA_DIR, "jobs", "pools.json"), "utf8"),
  ) as Record<string, { own: string[]; neighbour: string[] }>;

  // Candidate jobs per CV and bucket, in a seeded random order.
  const candidates = new Map<string, Record<Bucket, string[]>>();
  for (const cv of cvs) {
    const pool = pools[cv.meta.id];
    const own = pool.own.filter((id) => snapshot.has(id));
    const ownSet = new Set(own);
    const neighbour = pool.neighbour.filter((id) => snapshot.has(id) && !ownSet.has(id));
    const inPools = new Set([...own, ...neighbour]);
    const random = [...snapshot.keys()].filter((id) => !inPools.has(id));
    candidates.set(cv.meta.id, {
      own: shuffle(own, rng),
      neighbour: shuffle(neighbour, rng),
      random: shuffle(random, rng),
    });
  }

  const makePair = (cvId: string, job: SnapshotJob, bucket: Bucket): Pair => {
    const cvLang = cvs.find((c) => c.meta.id === cvId)!.meta.cv_language;
    const truncated = job.description.endsWith("…");
    const descChars = job.description.length;
    return {
      pair_id: "",
      cv_id: cvId,
      job_id: job.id,
      bucket,
      cv_language: cvLang,
      job_language: job.language,
      language_pair: languagePair(cvLang, job.language),
      desc_chars: descChars,
      truncated: truncated ? "yes" : "no",
      listing_quality: truncated || descChars < THIN_BELOW_CHARS ? "thin" : "full",
    };
  };

  // Step 1: calibration pairs take the first candidate of their bucket.
  const calibration = CALIBRATION.map(({ cv, bucket }, i) => {
    const jobId = candidates.get(cv)![bucket].shift();
    if (!jobId) throw new Error(`No ${bucket} candidate left for ${cv}`);
    return { ...makePair(cv, snapshot.get(jobId)!, bucket), pair_id: `cal-${String(i + 1).padStart(2, "0")}` };
  });

  // Step 2: 15 main pairs per CV from what remains.
  const main: Pair[] = [];
  for (const cv of cvs) {
    const c = candidates.get(cv.meta.id)!;
    for (const bucket of Object.keys(PER_BUCKET) as Bucket[]) {
      const ids = c[bucket].slice(0, PER_BUCKET[bucket]);
      if (ids.length < PER_BUCKET[bucket]) {
        throw new Error(`${cv.meta.id}: only ${ids.length} ${bucket} candidates`);
      }
      for (const id of ids) main.push(makePair(cv.meta.id, snapshot.get(id)!, bucket));
    }
  }

  // Step 3: shuffle into labelling order and number the pairs.
  const ordered = shuffle(main, rng).map((p, i) => ({
    ...p,
    pair_id: `p-${String(i + 1).padStart(3, "0")}`,
  }));

  writeFileSync(join(DATA_DIR, "pairs.csv"), toCsv(ordered));
  writeFileSync(join(DATA_DIR, "labels", "calibration-pairs.csv"), toCsv(calibration));
  const calibrationLabels = join(DATA_DIR, "labels", "calibration-labels.csv");
  if (existsSync(calibrationLabels)) {
    console.log("calibration-labels.csv exists; left untouched");
  } else {
    const blanks = ",".repeat(LABEL_COLUMNS.length - 3);
    writeFileSync(
      calibrationLabels,
      LABEL_COLUMNS.join(",") + "\n" +
        calibration.map((p) => `${p.pair_id},${p.cv_id},${p.job_id}${blanks}`).join("\n") +
        "\n",
    );
  }

  const count = (rows: Pair[], key: keyof Pair) =>
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r[key]] = (acc[r[key]] ?? 0) + 1;
      return acc;
    }, {});
  console.log("main pairs:", ordered.length, count(ordered, "bucket"), count(ordered, "language_pair"));
  console.log("main listing quality:", count(ordered, "listing_quality"));
  console.log("calibration:", calibration.length, count(calibration, "language_pair"), count(calibration, "listing_quality"));
}

main();
