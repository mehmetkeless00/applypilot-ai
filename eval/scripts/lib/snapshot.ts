import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { JobListing } from "@/lib/jobs/types";

// Reads the frozen job snapshot written by collect-jobs.ts.

export type SnapshotJob = JobListing & { language: string; fetchedAt: string };

export const DATA_DIR = join(import.meta.dirname, "..", "..", "data");

export function loadSnapshot(): Map<string, SnapshotJob> {
  const lines = readFileSync(join(DATA_DIR, "jobs", "snapshot.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean);
  return new Map(
    lines.map((line) => {
      const job = JSON.parse(line) as SnapshotJob;
      return [job.id, job];
    }),
  );
}
