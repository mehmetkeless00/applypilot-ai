// Finds full-text replacements for thin Adzuna listings (approved plan,
// experiment log E004). This version only runs the PILOT: it writes its
// findings to separate files and never changes pairs.csv or the snapshot.
//
//   npx tsx eval/scripts/replace-thin.ts --limit 50
//
// 1. Replacement order (deterministic, seed 20261120):
//    - Keep a thin subgroup: per CV, 2 own-role and 1 neighbour-role thin
//      pairs are retained and never replaced.
//    - Every other thin listing used by an own or neighbour pair is a
//      replacement target. Own-role targets come first, then neighbour.
//      Within each, snippets that state no requirement come first.
// 2. Discovery: for the target's company, probe Greenhouse, Lever and
//    Ashby public job-list APIs with slug variants of the company name.
//    (The app's adapters import one known posting; listing a board's
//    postings needs these list endpoints of the same public APIs.)
// 3. Selection:
//    A. same posting: a board posting from that company whose normalized
//       title matches the target's title.
//    B. comparable posting: from any board found so far, a posting whose
//       title passes the pool's role-word rule for the pair's query, with
//       the same seniority class, in the same country. Seeded choice.
//    No evaluated system's score is used anywhere.
// 4. Import through the app's adapter (importJobFromUrl), only for
//    Greenhouse, Lever and Ashby URLs. Workable (HTML fallback) and the
//    generic importer are never used, so nothing is scraped.
// 5. Checks: at least 1,000 characters, not truncated, language detected,
//    no duplicate by title+company key, exact text or 90% token overlap.
//
// Outputs:
//   data/jobs/replacement-plan.csv          full ordered target list (IDs)
//   data/jobs/thin-retained.csv             retained thin pairs (IDs)
//   data/jobs/replacement-pilot.csv         pilot outcome per target (IDs, URLs)
//   data/jobs/snapshot-replacements-pilot.jsonl   imported text (gitignored)
//   work/replacement-pilot.md               readable report with titles (gitignored)

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { importJobFromUrl, parseJobUrl } from "@/lib/jobimport/providers";
import { COUNTRY_NAMES, detectListingSeniority } from "@/lib/jobs/match";
import { loadCvs } from "./lib/cvs";
import { detectLanguage } from "./lib/lang";
import { makeRng, shuffle } from "./lib/rng";
import { DATA_DIR, loadSnapshot, type SnapshotJob } from "./lib/snapshot";
import { normalizeTitle, titleMatches, tokenJaccard } from "./lib/titles";

const SEED = 20261120;
const REQUEST_DELAY_MS = 1000;
const MIN_CHARS = 1000;
const TITLE_MATCH_JACCARD = 0.8;
const NEAR_DUPLICATE_JACCARD = 0.9;
const WORK_DIR = join(import.meta.dirname, "..", "work");
const JOBS_DIR = join(DATA_DIR, "jobs");

// Requirement words in the main listing languages. Used only to ORDER
// targets (snippets without any of them go first), never to select pairs.
const REQUIREMENT_WORDS = [
  "require", "must", "experience with", "you have", "qualifications", "skills", "years",
  "anforderungen", "profil", "erfahrung", "ervaring", "vereisten", "wymagania",
  "requisitos", "experiencia", "exigences", "expérience", "profiel",
];

// Native names, so a board location like "Deutschland" matches too.
const NATIVE_COUNTRY_NAMES: Record<string, string[]> = {
  de: ["germany", "deutschland"], nl: ["netherlands", "nederland", "holland"],
  gb: ["united kingdom", "uk", "england", "scotland"], es: ["spain", "españa", "espana"],
  fr: ["france"], pl: ["poland", "polska"], ch: ["switzerland", "schweiz", "suisse"],
  us: ["united states", "usa"], ca: ["canada"], at: ["austria", "österreich"],
};

const LEGAL_SUFFIXES = new Set([
  "gmbh", "ggmbh", "ag", "se", "bv", "b.v.", "nv", "n.v.", "ltd", "ltd.", "limited", "inc",
  "inc.", "llc", "plc", "sa", "s.a.", "sas", "sl", "s.l.", "spa", "s.p.a.", "srl", "oy",
  "ab", "as", "aps", "kg", "co", "co.", "corp", "corp.", "corporation", "group", "holding",
  "holdings", "nederland", "deutschland", "uk", "the", "&", "and", "sp.", "z", "o.o.",
]);

type Platform = "greenhouse" | "lever" | "ashby";

interface BoardPosting {
  platform: Platform;
  board: string;
  id: string;
  title: string;
  location: string;
  url: string;
}

interface PairRow {
  pair_id: string;
  cv_id: string;
  job_id: string;
  bucket: "own" | "neighbour" | "random";
  listing_quality: "thin" | "full";
}

interface Target {
  order: number;
  job: SnapshotJob;
  bucket: "own" | "neighbour";
  pairs: PairRow[];
  statesRequirements: boolean;
}

interface Outcome {
  target: Target;
  step: "same_posting" | "comparable" | "none";
  reason: string;
  boardsFound: string[];
  posting?: BoardPosting;
  imported?: { title: string; company: string; description: string; language: string };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readCsv<T>(file: string): T[] {
  const [header, ...rows] = readFileSync(file, "utf8").trim().split("\n");
  const cols = header.split(",");
  return rows.map(
    (row) => Object.fromEntries(cols.map((c, i) => [c, row.split(",")[i]])) as T,
  );
}

function slugVariants(company: string): string[] {
  const words = company
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w && !LEGAL_SUFFIXES.has(w))
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  if (words.length === 0) return [];
  return [...new Set([words.join(""), words.join("-")])];
}

let lastRequest = 0;
async function getJson(url: string): Promise<unknown | null> {
  const wait = lastRequest + REQUEST_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ApplyPilotAI/1.0 (job import; +https://applypilot.ai)",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

const boardCache = new Map<string, BoardPosting[] | null>();

async function listBoard(platform: Platform, slug: string): Promise<BoardPosting[] | null> {
  const key = `${platform}:${slug}`;
  if (boardCache.has(key)) return boardCache.get(key)!;
  let postings: BoardPosting[] | null = null;
  if (platform === "greenhouse") {
    const data = (await getJson(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`,
    )) as { jobs?: { id: number; title: string; location?: { name?: string } }[] } | null;
    postings = data?.jobs?.map((j) => ({
      platform, board: slug, id: String(j.id), title: j.title,
      location: j.location?.name ?? "",
      url: `https://boards.greenhouse.io/${slug}/jobs/${j.id}`,
    })) ?? null;
  } else if (platform === "lever") {
    const data = (await getJson(
      `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
    )) as { id: string; text: string; categories?: { location?: string } }[] | null;
    postings = Array.isArray(data)
      ? data.map((j) => ({
          platform, board: slug, id: j.id, title: j.text,
          location: j.categories?.location ?? "",
          url: `https://jobs.lever.co/${slug}/${j.id}`,
        }))
      : null;
  } else {
    const data = (await getJson(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=false`,
    )) as { jobs?: { id: string; title: string; location?: string }[] } | null;
    postings = data?.jobs?.map((j) => ({
      platform, board: slug, id: j.id, title: j.title,
      location: j.location ?? "",
      url: `https://jobs.ashbyhq.com/${slug}/${j.id}`,
    })) ?? null;
  }
  if (postings && postings.length === 0) postings = null;
  boardCache.set(key, postings);
  return postings;
}

function sameCountry(target: SnapshotJob, country: string, location: string): boolean {
  const loc = location.toLowerCase();
  const names = [COUNTRY_NAMES[country], ...(NATIVE_COUNTRY_NAMES[country] ?? [])].filter(Boolean);
  if (names.some((n) => new RegExp(`\\b${n}\\b`).test(loc))) return true;
  const city = target.location?.split(",")[0]?.trim().toLowerCase();
  return Boolean(city && city.length > 2 && loc.includes(city));
}

function buildTargets(pairs: PairRow[], snapshot: Map<string, SnapshotJob>) {
  const rng = makeRng(SEED);
  const cvIds = [...new Set(pairs.map((p) => p.cv_id))].sort();
  const retained = new Set<string>();
  for (const cv of cvIds) {
    for (const [bucket, k] of [["own", 2], ["neighbour", 1]] as const) {
      const candidates = pairs
        .filter((p) => p.cv_id === cv && p.bucket === bucket && p.listing_quality === "thin")
        .map((p) => p.pair_id)
        .sort();
      for (const id of shuffle(candidates, rng).slice(0, k)) retained.add(id);
    }
  }
  const retainedJobs = new Set(pairs.filter((p) => retained.has(p.pair_id)).map((p) => p.job_id));

  const byJob = new Map<string, PairRow[]>();
  for (const p of pairs) byJob.set(p.job_id, [...(byJob.get(p.job_id) ?? []), p]);

  const targets: Omit<Target, "order">[] = [];
  for (const [jobId, jobPairs] of byJob) {
    if (retainedJobs.has(jobId)) continue;
    const relevant = jobPairs.filter((p) => p.bucket !== "random" && p.listing_quality === "thin");
    if (relevant.length === 0) continue;
    const job = snapshot.get(jobId)!;
    const text = job.description.toLowerCase();
    targets.push({
      job,
      bucket: relevant.some((p) => p.bucket === "own") ? "own" : "neighbour",
      pairs: jobPairs,
      statesRequirements: REQUIREMENT_WORDS.some((w) => text.includes(w)),
    });
  }
  const group = (b: string, req: boolean) =>
    shuffle(
      targets
        .filter((t) => t.bucket === b && t.statesRequirements === req)
        .sort((x, y) => x.job.id.localeCompare(y.job.id)),
      rng,
    );
  const ordered = [
    ...group("own", false), ...group("own", true),
    ...group("neighbour", false), ...group("neighbour", true),
  ].map((t, i) => ({ ...t, order: i + 1 }));
  return { ordered, retained: [...retained].sort() };
}

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : 50;

  const snapshot = loadSnapshot();
  const pairs = readCsv<PairRow>(join(DATA_DIR, "pairs.csv"));
  const cvs = new Map(loadCvs().map((cv) => [cv.meta.id, cv.meta]));
  const { ordered, retained } = buildTargets(pairs, snapshot);

  const affected = pairs.filter((p) => ordered.some((t) => t.job.id === p.job_id));
  console.log(
    `targets: ${ordered.length} listings, ${affected.length} pairs; retained thin pairs: ${retained.length}`,
  );
  writeFileSync(
    join(JOBS_DIR, "replacement-plan.csv"),
    "order,job_id,bucket,states_requirements,pair_ids\n" +
      ordered
        .map((t) => `${t.order},${t.job.id},${t.bucket},${t.statesRequirements ? "yes" : "no"},${t.pairs.map((p) => p.pair_id).join(";")}`)
        .join("\n") + "\n",
  );
  writeFileSync(join(JOBS_DIR, "thin-retained.csv"), "pair_id\n" + retained.join("\n") + "\n");

  // Duplicate reference: every snapshot listing's key and full texts.
  const key = (title: string, company: string | null) =>
    `${normalizeTitle(title)}|${(company ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
  const snapshotKeys = new Map([...snapshot.values()].map((j) => [key(j.title, j.company), j.id]));
  const fullTexts = [...snapshot.values()]
    .filter((j) => !j.description.endsWith("…") && j.description.length >= MIN_CHARS)
    .map((j) => normalizeTitle(j.description));
  const acceptedKeys = new Set<string>();
  const acceptedHashes = new Set<string>();
  const acceptedTexts: string[] = [];
  const usedPostings = new Set<string>();
  const knownBoards: BoardPosting[][] = [];
  const pickRng = makeRng(SEED + 1);

  const outcomes: Outcome[] = [];
  for (const target of ordered.slice(0, limit)) {
    const company = target.job.company ?? "";
    const boardsFound: string[] = [];
    const companyPostings: BoardPosting[] = [];
    for (const slug of slugVariants(company)) {
      for (const platform of ["greenhouse", "lever", "ashby"] as Platform[]) {
        const postings = await listBoard(platform, slug);
        if (postings) {
          boardsFound.push(`${platform}:${slug}`);
          companyPostings.push(...postings);
          if (!knownBoards.includes(postings)) knownBoards.push(postings);
        }
      }
    }

    const firstPair = target.pairs.find((p) => p.bucket === target.bucket)!;
    const cv = cvs.get(firstPair.cv_id)!;
    const query = target.bucket === "own" ? cv.search_query : cv.neighbour_query;
    const seniority = detectListingSeniority(target.job.title);
    const targetTitle = normalizeTitle(target.job.title);

    // A: same posting at the same company.
    const same = companyPostings.filter(
      (p) => !usedPostings.has(p.url) &&
        tokenJaccard(normalizeTitle(p.title), targetTitle) >= TITLE_MATCH_JACCARD,
    );
    // B: comparable posting from any board seen so far.
    const comparable = shuffle(
      knownBoards.flat().filter(
        (p) => !usedPostings.has(p.url) &&
          titleMatches(query, p.title) &&
          detectListingSeniority(p.title) === seniority &&
          sameCountry(target.job, cv.search_country, p.location),
      ),
      pickRng,
    );

    const attempts: { step: Outcome["step"]; posting: BoardPosting }[] = [
      ...same.map((posting) => ({ step: "same_posting" as const, posting })),
      ...comparable.slice(0, 5).map((posting) => ({ step: "comparable" as const, posting })),
    ];
    let outcome: Outcome = {
      target, step: "none", boardsFound,
      reason: boardsFound.length === 0 ? "no_board_found"
        : same.length === 0 && comparable.length === 0 ? "no_matching_posting" : "",
    };
    const rejections: string[] = [];
    for (const { step, posting } of attempts) {
      if (!["greenhouse", "lever", "ashby"].includes(parseJobUrl(posting.url).provider)) {
        rejections.push("unsupported_url");
        continue;
      }
      let imported;
      try {
        imported = await importJobFromUrl(posting.url);
      } catch {
        rejections.push("import_failed");
        continue;
      }
      const description = imported.jobDescription;
      const language = detectLanguage(description);
      const k = key(imported.jobTitle, imported.company ?? posting.board);
      const hash = createHash("sha256").update(description).digest("hex");
      const norm = normalizeTitle(description);
      const keyOwner = snapshotKeys.get(k);
      const problem =
        description.length < MIN_CHARS ? "too_short"
        : description.endsWith("…") ? "truncated"
        : language === "unknown" ? "language_unknown"
        : (keyOwner && keyOwner !== target.job.id) || acceptedKeys.has(k) ? "duplicate_key"
        : acceptedHashes.has(hash) ? "duplicate_text"
        : [...acceptedTexts, ...fullTexts].some((t) => tokenJaccard(t, norm) >= NEAR_DUPLICATE_JACCARD)
          ? "near_duplicate"
        : null;
      if (problem) {
        rejections.push(problem);
        continue;
      }
      usedPostings.add(posting.url);
      acceptedKeys.add(k);
      acceptedHashes.add(hash);
      acceptedTexts.push(norm);
      outcome = {
        target, step, posting, boardsFound, reason: "",
        imported: { title: imported.jobTitle, company: imported.company ?? posting.board, description, language },
      };
      break;
    }
    if (outcome.step === "none" && rejections.length > 0) {
      outcome.reason = `rejected:${[...new Set(rejections)].join("+")}`;
    }
    outcomes.push(outcome);
    console.log(
      `#${target.order} ${target.job.id} ${outcome.step}${outcome.reason ? ` (${outcome.reason})` : ""}`,
    );
  }

  writeFileSync(
    join(JOBS_DIR, "replacement-pilot.csv"),
    "order,old_job_id,bucket,step,reason,boards_found,new_job_id,new_url,desc_chars,language,old_language\n" +
      outcomes
        .map((o) => [
          o.target.order, o.target.job.id, o.target.bucket, o.step, o.reason,
          o.boardsFound.join(";"),
          o.posting ? `${o.posting.platform}:${o.posting.board}:${o.posting.id}` : "",
          o.posting?.url ?? "", o.imported?.description.length ?? "",
          o.imported?.language ?? "", o.target.job.language,
        ].join(","))
        .join("\n") + "\n",
  );
  writeFileSync(
    join(JOBS_DIR, "snapshot-replacements-pilot.jsonl"),
    outcomes
      .filter((o) => o.imported)
      .map((o) => JSON.stringify({
        id: `${o.posting!.platform}:${o.posting!.board}:${o.posting!.id}`,
        provider: o.posting!.platform, title: o.imported!.title, company: o.imported!.company,
        location: o.posting!.location, url: o.posting!.url, description: o.imported!.description,
        language: o.imported!.language, replaces: o.target.job.id,
        fetchedAt: new Date().toISOString(),
      }))
      .join("\n") + "\n",
  );
  mkdirSync(WORK_DIR, { recursive: true });
  writeFileSync(
    join(WORK_DIR, "replacement-pilot.md"),
    "# Replacement pilot\n\n| # | Old title | Company | Step | New title | Reason |\n|---|---|---|---|---|---|\n" +
      outcomes
        .map((o) => `| ${o.target.order} | ${o.target.job.title} | ${o.target.job.company ?? ""} | ${o.step} | ${o.imported?.title ?? ""} | ${o.reason} |`)
        .join("\n") + "\n",
  );

  const count = (s: string) => outcomes.filter((o) => o.step === s).length;
  console.log(
    `pilot: ${outcomes.length} targets; same_posting ${count("same_posting")}, comparable ${count("comparable")}, none ${count("none")}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
