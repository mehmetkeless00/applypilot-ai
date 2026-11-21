// Baseline 2: the app's Gemini analysis (analyze() in src/lib/ai/analyze.ts),
// using its fit_score (0-100) as the prediction.
//
//   npx tsx eval/scripts/run-gemini.ts [--limit N] [--concurrency C]
//
// Each pair is sent exactly as the app's analysis feature would send it:
// job title, company, listing description and the CV text, output in
// English, with the app's own prompt, schema and model settings.
//
// Every successful or refused response is cached in eval/cache/gemini/
// (gitignored, because responses quote listing text), keyed by a hash of
// model + input, so re-runs are free and reproducible. Errors are not
// cached, so a re-run retries them. Network failures are retried up to 3
// times. Rate limits (HTTP 429) are retried with
// backoff; after repeated 429s the run stops and the remaining pairs are
// written as not_run, so a daily quota cannot silently drop pairs.
//
// Output: results/predictions/gemini.csv (score, or status refused / error
// / not_run, for all 550 pairs).

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ApiError } from "@google/genai";
import { analyze, AnalysisRefusedError, MODEL } from "@/lib/ai/analyze";
import type { PromptInput } from "@/lib/ai/prompt";
import { stringifyCsv } from "./lib/csv";
import { loadEvalPairs, type EvalPair } from "./lib/dataset";

process.loadEnvFile(join(import.meta.dirname, "..", "..", ".env.local"));

const CACHE_DIR = join(import.meta.dirname, "..", "cache", "gemini");
const MAX_429_RETRIES = 4;
const MAX_NETWORK_RETRIES = 3;
const STOP_AFTER_CONSECUTIVE_429 = 3;

interface Cached {
  status: "ok" | "refused";
  fit_score?: number;
  served_by?: string;
  result?: unknown;
  at: string;
}

function inputFor(p: EvalPair): PromptInput {
  return {
    jobTitle: p.job.title,
    company: p.job.company ?? undefined,
    jobDescription: p.job.description,
    resumeText: p.cv.text,
    outputLanguage: "en",
  };
}

function cachePath(input: PromptInput): string {
  const key = createHash("sha256").update(JSON.stringify({ model: MODEL, input })).digest("hex");
  return join(CACHE_DIR, `${key}.json`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let consecutive429 = 0;
let stopped = false;

async function scorePair(p: EvalPair): Promise<{ status: string; score: string; detail: string }> {
  const input = inputFor(p);
  const file = cachePath(input);
  if (existsSync(file)) {
    const c = JSON.parse(readFileSync(file, "utf8")) as Cached;
    return { status: c.status, score: c.fit_score !== undefined ? String(c.fit_score) : "", detail: c.served_by ?? "" };
  }
  let networkRetries = 0;
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    if (stopped) return { status: "not_run", score: "", detail: "stopped after repeated rate limits" };
    try {
      const out = await analyze(input);
      consecutive429 = 0;
      const c: Cached = {
        status: "ok", fit_score: out.result.fit_score, served_by: out.servedBy,
        result: out.result, at: new Date().toISOString(),
      };
      writeFileSync(file, JSON.stringify(c));
      return { status: "ok", score: String(out.result.fit_score), detail: out.servedBy };
    } catch (error) {
      if (error instanceof AnalysisRefusedError) {
        writeFileSync(file, JSON.stringify({ status: "refused", at: new Date().toISOString() }));
        return { status: "refused", score: "", detail: "safety block" };
      }
      if (error instanceof ApiError && error.status === 429) {
        consecutive429++;
        // Name the quota that was hit (per-minute vs per-day) in the log.
        const quota = error.message.match(/"quotaId":\s*"([^"]+)"/)?.[1] ?? "unknown quota";
        console.error(`429 on ${p.pair_id}: ${quota}`);
        if (consecutive429 >= STOP_AFTER_CONSECUTIVE_429 * (MAX_429_RETRIES + 1)) stopped = true;
        await sleep(15_000 * 2 ** attempt);
        continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      // Network-level failures (slow connection setup, resets) are retried.
      if (/fetch failed|ECONNRESET|ETIMEDOUT|UND_ERR/i.test(message) && networkRetries < MAX_NETWORK_RETRIES) {
        networkRetries++;
        attempt--;
        await sleep(5_000 * networkRetries);
        continue;
      }
      return { status: "error", score: "", detail: message.replace(/\s+/g, " ").slice(0, 160) };
    }
  }
  return { status: "error", score: "", detail: "rate limited after retries" };
}

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const concArg = process.argv.indexOf("--concurrency");
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;
  const concurrency = concArg > 0 ? Number(process.argv[concArg + 1]) : 2;

  const pairs = loadEvalPairs();
  const results = new Map<string, { status: string; score: string; detail: string }>();
  const todo = pairs.slice(0, Math.min(limit, pairs.length));
  let next = 0;
  let done = 0;
  const started = Date.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < todo.length) {
        const p = todo[next++];
        const r = await scorePair(p);
        results.set(`${p.set}:${p.pair_id}`, r);
        done++;
        if (done % 25 === 0 || r.status !== "ok") {
          console.log(`${done}/${todo.length} ${p.pair_id} ${r.status} ${r.score} ${r.status !== "ok" ? r.detail : ""} (${Math.round((Date.now() - started) / 1000)}s)`);
        }
      }
    }),
  );

  const rows = pairs.map((p) => ({
    set: p.set, pair_id: p.pair_id,
    ...(results.get(`${p.set}:${p.pair_id}`) ?? { status: "not_run", score: "", detail: "outside --limit" }),
  }));
  const out = join(import.meta.dirname, "..", "results", "predictions", "gemini.csv");
  writeFileSync(out, stringifyCsv(["set", "pair_id", "score", "status", "detail"], rows));
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  console.log(`gemini: ok ${count("ok")}, refused ${count("refused")}, error ${count("error")}, not_run ${count("not_run")} -> ${out}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
