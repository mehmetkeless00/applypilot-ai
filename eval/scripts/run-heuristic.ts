// Baseline 1: the app's deterministic Estimated Match (scoreListing).
//
//   npx tsx eval/scripts/run-heuristic.ts
//
// Inputs per pair, chosen to mirror how the app scores a listing while
// keeping logistics neutral (eval/README.md, "What the labels measure"):
//   cvSkills       extractSkills(CV text), exactly as the search route does
//   roleKeywords   the CV's search_query (the persona's target role, which
//                  a real user would type as the search query)
//   experienceLevel persona seniority: intern -> internship, junior ->
//                  junior, mid -> mid, senior/lead -> senior
//   workMode onsite with no city, employmentType any, maxDaysOld 0, so
//                  location and employment components are always neutral
// Output: results/predictions/heuristic.csv (score 0-100 for all 550 pairs).

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { scoreListing } from "@/lib/jobs/match";
import { extractSkills } from "@/lib/jobs/skills";
import type { ExperienceLevel, JobSearchFilters } from "@/lib/jobs/types";
import { stringifyCsv } from "./lib/csv";
import { loadEvalPairs } from "./lib/dataset";

const LEVELS: Record<string, ExperienceLevel> = {
  intern: "internship", junior: "junior", mid: "mid", senior: "senior", lead: "senior",
};

const rows = loadEvalPairs().map((p) => {
  const filters: JobSearchFilters = {
    query: p.cv.meta.search_query,
    country: p.cv.meta.search_country,
    workMode: "onsite",
    experienceLevel: LEVELS[p.cv.meta.seniority] ?? "any",
    employmentType: "any",
    maxDaysOld: 0,
  };
  const result = scoreListing(
    { cvSkills: extractSkills(p.cv.text), roleKeywords: p.cv.meta.search_query },
    filters,
    p.job,
  );
  return { set: p.set, pair_id: p.pair_id, score: String(result.score), status: "ok", detail: "" };
});

const out = join(import.meta.dirname, "..", "results", "predictions", "heuristic.csv");
writeFileSync(out, stringifyCsv(["set", "pair_id", "score", "status", "detail"], rows));
console.log(`heuristic: ${rows.length} pairs scored -> ${out}`);
