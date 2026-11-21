// Renders a labelling sheet: each pair's CV and listing side by side as
// Markdown, for reading in the editor's preview.
//
//   npx tsx eval/scripts/render-sheet.ts calibration
//   npx tsx eval/scripts/render-sheet.ts main 1 60     (pairs p-001..p-060)
//   npx tsx eval/scripts/render-sheet.ts fulltext 1 50 (pairs f-001..f-050)
//
// The sheet shows only what a recruiter would see: CV text (front matter
// stripped) and the listing's title, company and description. It hides
// the selection bucket, languages and any system score, so labelling stays
// blind. Sheets contain listing text and go to eval/work/ (gitignored).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCvs } from "./lib/cvs";
import { DATA_DIR, loadSnapshot } from "./lib/snapshot";

const WORK_DIR = join(import.meta.dirname, "..", "work");

function readPairs(file: string): { pair_id: string; cv_id: string; job_id: string }[] {
  const [header, ...rows] = readFileSync(file, "utf8").trim().split("\n");
  const cols = header.split(",");
  return rows.map((row) => {
    const values = row.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, values[i]])) as {
      pair_id: string;
      cv_id: string;
      job_id: string;
    };
  });
}

function main() {
  const [set = "calibration", from, to] = process.argv.slice(2);
  const file =
    set === "calibration"
      ? join(DATA_DIR, "labels", "calibration-pairs.csv")
      : set === "fulltext"
        ? join(DATA_DIR, "pairs-fulltext.csv")
        : join(DATA_DIR, "pairs.csv");
  let pairs = readPairs(file);
  if (set !== "calibration") {
    const start = Number(from ?? 1);
    const end = Number(to ?? start + 59);
    pairs = pairs.slice(start - 1, end);
  }

  const cvs = new Map(loadCvs().map((cv) => [cv.meta.id, cv.text]));
  const snapshot = loadSnapshot(set === "fulltext" ? "snapshot-fulltext.jsonl" : "snapshot.jsonl");

  const sections = pairs.map((p) => {
    const job = snapshot.get(p.job_id);
    if (!job) throw new Error(`Job ${p.job_id} missing from snapshot`);
    const truncated = job.description.endsWith("…")
      ? "\n\n*(The provider truncated this description. Label from what is shown and set `flag=thin` if it is not enough.)*"
      : "";
    return [
      `## ${p.pair_id} · ${p.cv_id}`,
      "",
      "### Listing",
      "",
      `**${job.title}**${job.company ? ` · ${job.company}` : ""}`,
      "",
      job.description + truncated,
      "",
      "### CV",
      "",
      cvs.get(p.cv_id)!.replace(/^#/gm, "####"),
      "",
      "---",
    ].join("\n");
  });

  const title = set === "calibration" ? "Calibration sheet" : `Labelling sheet ${pairs[0]?.pair_id} to ${pairs.at(-1)?.pair_id}`;
  const out = [
    `# ${title}`,
    "",
    "Read eval/LABELLING_GUIDE.md first. Record labels in the matching CSV in eval/data/labels/.",
    "",
    ...sections,
  ].join("\n");

  mkdirSync(WORK_DIR, { recursive: true });
  const name = set === "calibration" ? "calibration.md" : `${set}-${pairs[0]?.pair_id}-${pairs.at(-1)?.pair_id}.md`;
  writeFileSync(join(WORK_DIR, name), out + "\n");
  console.log(`Wrote eval/work/${name} (${pairs.length} pairs)`);
}

main();
