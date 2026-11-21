import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCvs, type CvMeta } from "./cvs";
import { parseCsv } from "./csv";
import { DATA_DIR, loadSnapshot, type SnapshotJob } from "./snapshot";

// The frozen evaluation set: every pair in pairs.csv (production) and
// pairs-fulltext.csv (full-text), joined with its CV and listing. Both
// baseline runners load pairs through this one function, so they score
// exactly the same inputs. Exclusions (non_job) happen only in the metrics.

export interface EvalPair {
  set: "production" | "fulltext";
  pair_id: string;
  cv: { meta: CvMeta; text: string };
  job: SnapshotJob;
}

export function loadEvalPairs(): EvalPair[] {
  const cvs = new Map(loadCvs().map((cv) => [cv.meta.id, cv]));
  const out: EvalPair[] = [];
  for (const [set, pairsFile, snapshotFile] of [
    ["production", "pairs.csv", "snapshot.jsonl"],
    ["fulltext", "pairs-fulltext.csv", "snapshot-fulltext.jsonl"],
  ] as const) {
    const jobs = loadSnapshot(snapshotFile);
    for (const p of parseCsv(readFileSync(join(DATA_DIR, pairsFile), "utf8"))) {
      const cv = cvs.get(p.cv_id);
      const job = jobs.get(p.job_id);
      if (!cv || !job) throw new Error(`Missing CV or listing for ${p.pair_id}`);
      out.push({ set, pair_id: p.pair_id, cv, job });
    }
  }
  return out;
}
