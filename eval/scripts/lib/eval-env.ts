// The Gemini API key for evaluation runs, kept apart from the app's key.
//
// Eval scripts that call Gemini (run-gemini.ts, the daily launchd job that
// runs it, and the embedding scripts) call loadEvalGeminiKey() before their
// first Gemini request. It reads GEMINI_API_KEY_EVAL from eval/.env.local
// (gitignored; see eval/.env.example), which belongs to a separate Google
// project, so evaluation traffic and quota never touch the app's project.
//
// There is no fallback: if the eval key is missing, a placeholder, or the
// same as the app's key in the root .env.local, the script stops. The key
// is then written to process.env.GEMINI_API_KEY, overriding anything
// inherited from the shell, because the app's analyze() reads that name.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

const REPO = join(import.meta.dirname, "..", "..", "..");
export const EVAL_ENV_FILE = join(REPO, "eval", ".env.local");

function readEnvFile(path: string): Record<string, string | undefined> {
  return existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
}

/** Short, non-reversible fingerprint for logs, so the key itself is never printed. */
export function keyFingerprint(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 8);
}

export function loadEvalGeminiKey(): string {
  const key = readEnvFile(EVAL_ENV_FILE).GEMINI_API_KEY_EVAL?.trim();
  if (!key) {
    throw new Error(`GEMINI_API_KEY_EVAL is not set in ${EVAL_ENV_FILE}. Paste the eval key there; the app's key is never used.`);
  }
  if (key.toLowerCase().includes("placeholder") || key.includes("<")) {
    throw new Error(`GEMINI_API_KEY_EVAL in ${EVAL_ENV_FILE} is still a placeholder.`);
  }
  const appKey = readEnvFile(join(REPO, ".env.local")).GEMINI_API_KEY?.trim();
  if (appKey && appKey === key) {
    throw new Error("GEMINI_API_KEY_EVAL is the same as the app's GEMINI_API_KEY. Use the key from the separate eval project.");
  }
  process.env.GEMINI_API_KEY = key;
  console.log(`Gemini key: GEMINI_API_KEY_EVAL from eval/.env.local (fingerprint ${keyFingerprint(key)})`);
  return key;
}
