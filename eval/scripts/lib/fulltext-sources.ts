import { htmlToText } from "@/lib/jobimport/html";
import { detectLanguage } from "./lang";

// Eval-only fetchers for the two full-text sources (experiment log E006).
// They are not wired into the app.
//
// Rate limits, from the terms checked on 2026-11-21:
// - Jobicy: at most 1 request per second per IP. We wait 2 s.
// - Arbeitnow: responses carry x-ratelimit-limit: 50 with no documented
//   window. We wait 5 s between requests and make only a few.
// Attribution: credit Jobicy and link back to Arbeitnow (see eval/README.md).

export interface FullTextJob {
  id: string;
  provider: "jobicy" | "arbeitnow";
  title: string;
  company: string | null;
  location: string | null;
  remote: boolean;
  /** Jobicy's stated remote eligibility (jobGeo), or null. */
  remoteRestriction: string | null;
  url: string;
  postedAt: string | null;
  salary: null;
  employmentType: null;
  description: string;
  language: string;
  fetchedAt: string;
}

const JOBICY_DELAY_MS = 2000;
const ARBEITNOW_DELAY_MS = 5000;
const lastCall: Record<string, number> = {};

async function throttledJson(source: string, delayMs: number, url: string): Promise<unknown> {
  const wait = (lastCall[source] ?? 0) + delayMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall[source] = Date.now();
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(90_000),
  });
  if (response.status === 429) {
    throw new Error(`${source} rate limited (Retry-After: ${response.headers.get("retry-after")})`);
  }
  if (!response.ok) throw new Error(`${source} HTTP ${response.status}`);
  // Parse explicitly so a truncated body (seen on Arbeitnow page 3) fails loudly.
  return JSON.parse(await response.text());
}

function clean(html: string | undefined): string {
  return htmlToText(html ?? "").replace(/\s+/g, " ").trim();
}

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName?: string;
  jobGeo?: string;
  pubDate?: string;
  jobDescription?: string;
}

export async function fetchJobicy(params: Record<string, string>): Promise<FullTextJob[]> {
  const url = new URL("https://jobicy.com/api/v2/remote-jobs");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const data = (await throttledJson("jobicy", JOBICY_DELAY_MS, url.toString())) as {
    jobs?: JobicyJob[];
  };
  const fetchedAt = new Date().toISOString();
  return (data.jobs ?? []).map((j) => {
    const description = clean(j.jobDescription);
    return {
      id: `jobicy:${j.id}`,
      provider: "jobicy",
      title: j.jobTitle,
      company: j.companyName ?? null,
      location: j.jobGeo ?? null,
      remote: true,
      remoteRestriction: j.jobGeo ?? null,
      url: j.url,
      postedAt: j.pubDate ?? null,
      salary: null,
      employmentType: null,
      description,
      language: detectLanguage(description),
      fetchedAt,
    };
  });
}

interface ArbeitnowJob {
  slug: string;
  url: string;
  title: string;
  company_name?: string;
  location?: string;
  remote?: boolean;
  created_at?: number;
  description?: string;
}

/** One page of Arbeitnow's feed. `market` "de" is arbeitnow.com, "uk" is arbeitnow.co.uk. */
export async function fetchArbeitnow(market: "de" | "uk", page: number): Promise<FullTextJob[]> {
  const host = market === "uk" ? "https://www.arbeitnow.co.uk" : "https://www.arbeitnow.com";
  const data = (await throttledJson(
    "arbeitnow",
    ARBEITNOW_DELAY_MS,
    `${host}/api/job-board-api?page=${page}`,
  )) as { data?: ArbeitnowJob[] };
  const fetchedAt = new Date().toISOString();
  return (data.data ?? []).map((j) => {
    const description = clean(j.description);
    return {
      id: `arbeitnow:${market}:${j.slug}`,
      provider: "arbeitnow",
      title: j.title,
      company: j.company_name ?? null,
      location: j.location ?? null,
      remote: Boolean(j.remote),
      remoteRestriction: null,
      url: j.url,
      postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
      salary: null,
      employmentType: null,
      description,
      language: detectLanguage(description),
      fetchedAt,
    };
  });
}
