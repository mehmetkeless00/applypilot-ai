import { decodeEntities, extractJobPostingJsonLd, htmlToText } from "./html";

export interface ImportedJob {
  jobTitle: string;
  company?: string;
  location?: string;
  jobDescription: string;
}

/** Import failed for a reason the user can act on. */
export class JobImportError extends Error {
  constructor(
    message: string,
    public readonly kind: "invalid_url" | "linkedin" | "unsupported" | "fetch_failed" | "not_found",
  ) {
    super(message);
    this.name = "JobImportError";
  }
}

type ProviderTarget =
  | { provider: "greenhouse"; board: string; jobId: string }
  | { provider: "lever"; company: string; jobId: string }
  | { provider: "ashby"; org: string; jobId: string }
  | { provider: "workable"; account: string; shortcode: string };

/**
 * Parses a job posting URL into a provider target. Only allowlisted hosts are
 * ever fetched — unknown hosts are rejected here, never requested (SSRF guard).
 */
export function parseJobUrl(rawUrl: string): ProviderTarget {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new JobImportError("That doesn't look like a valid URL.", "invalid_url");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new JobImportError("That doesn't look like a valid URL.", "invalid_url");
  }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    throw new JobImportError(
      "LinkedIn postings can't be imported automatically. Open the posting, copy the description, and paste it in the Paste tab.",
      "linkedin",
    );
  }

  // Greenhouse: boards.greenhouse.io/{board}/jobs/{id} or job-boards.greenhouse.io
  if (
    host === "boards.greenhouse.io" ||
    host === "job-boards.greenhouse.io" ||
    host === "boards.eu.greenhouse.io" ||
    host === "job-boards.eu.greenhouse.io"
  ) {
    const jobsIdx = segments.indexOf("jobs");
    if (segments.length >= 1 && jobsIdx > 0 && segments[jobsIdx + 1]) {
      return {
        provider: "greenhouse",
        board: segments[0],
        jobId: segments[jobsIdx + 1],
      };
    }
  }

  // Lever: jobs.lever.co/{company}/{uuid}
  if (host === "jobs.lever.co" || host === "jobs.eu.lever.co") {
    if (segments.length >= 2) {
      return { provider: "lever", company: segments[0], jobId: segments[1] };
    }
  }

  // Ashby: jobs.ashbyhq.com/{org}/{jobId}
  if (host === "jobs.ashbyhq.com") {
    if (segments.length >= 2) {
      return { provider: "ashby", org: segments[0], jobId: segments[1] };
    }
  }

  // Workable: apply.workable.com/{account}/j/{shortcode}
  if (host === "apply.workable.com") {
    const jIdx = segments.indexOf("j");
    if (jIdx > 0 && segments[jIdx + 1]) {
      return {
        provider: "workable",
        account: segments[0],
        shortcode: segments[jIdx + 1],
      };
    }
  }

  throw new JobImportError(
    "This site isn't supported for import yet. Supported: Greenhouse, Lever, Ashby, Workable. Paste the description manually instead.",
    "unsupported",
  );
}

const FETCH_HEADERS = {
  Accept: "application/json, text/html;q=0.9",
  "User-Agent": "ApplyPilotAI/1.0 (job import; +https://applypilot.ai)",
};

async function fetchOrThrow(url: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new JobImportError(
      "Couldn't reach the job board. Check your connection and try again.",
      "fetch_failed",
    );
  }
  if (response.status === 404) {
    throw new JobImportError(
      "That job posting wasn't found — it may have been closed or removed.",
      "not_found",
    );
  }
  if (!response.ok) {
    throw new JobImportError(
      "The job board blocked or failed the request. Paste the description manually instead.",
      "fetch_failed",
    );
  }
  return response;
}

function finalize(
  title: string | undefined,
  company: string | undefined,
  location: string | undefined,
  descriptionText: string | undefined,
): ImportedJob {
  const jobDescription = descriptionText?.trim() ?? "";
  if (!title || jobDescription.length < 50) {
    throw new JobImportError(
      "Couldn't extract a usable job description from that page. Paste it manually instead.",
      "not_found",
    );
  }
  return {
    jobTitle: title.trim(),
    company: company?.trim() || undefined,
    location: location?.trim() || undefined,
    jobDescription,
  };
}

async function importGreenhouse(target: Extract<ProviderTarget, { provider: "greenhouse" }>): Promise<ImportedJob> {
  const response = await fetchOrThrow(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(target.board)}/jobs/${encodeURIComponent(target.jobId)}?questions=false`,
  );
  const data = (await response.json()) as {
    title?: string;
    content?: string;
    location?: { name?: string };
    company_name?: string;
  };
  // Greenhouse returns `content` as entity-encoded HTML — decode before stripping tags.
  return finalize(
    data.title,
    data.company_name ?? target.board,
    data.location?.name,
    data.content ? htmlToText(decodeEntities(data.content)) : undefined,
  );
}

async function importLever(target: Extract<ProviderTarget, { provider: "lever" }>): Promise<ImportedJob> {
  const response = await fetchOrThrow(
    `https://api.lever.co/v0/postings/${encodeURIComponent(target.company)}/${encodeURIComponent(target.jobId)}`,
  );
  const data = (await response.json()) as {
    text?: string;
    categories?: { location?: string };
    descriptionPlain?: string;
    description?: string;
    lists?: Array<{ text?: string; content?: string }>;
  };
  const listsHtml = (data.lists ?? [])
    .map((l) => `<h3>${l.text ?? ""}</h3><ul>${l.content ?? ""}</ul>`)
    .join("");
  const body = data.descriptionPlain ?? htmlToText(data.description ?? "");
  const listsText = listsHtml ? htmlToText(listsHtml) : "";
  const description = [body, listsText].filter(Boolean).join("\n\n");
  return finalize(data.text, target.company, data.categories?.location, description);
}

async function importAshby(target: Extract<ProviderTarget, { provider: "ashby" }>): Promise<ImportedJob> {
  const response = await fetchOrThrow(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(target.org)}?includeCompensation=false`,
  );
  const data = (await response.json()) as {
    jobs?: Array<{
      id?: string;
      title?: string;
      location?: string;
      descriptionHtml?: string;
      jobUrl?: string;
    }>;
  };
  const job = (data.jobs ?? []).find(
    (j) => j.id === target.jobId || j.jobUrl?.includes(target.jobId),
  );
  if (!job) {
    throw new JobImportError(
      "That job posting wasn't found — it may have been closed or removed.",
      "not_found",
    );
  }
  return finalize(
    job.title,
    target.org,
    job.location,
    job.descriptionHtml ? htmlToText(job.descriptionHtml) : undefined,
  );
}

async function importWorkable(target: Extract<ProviderTarget, { provider: "workable" }>): Promise<ImportedJob> {
  // Widget API first; some accounts disable it, then fall back to page JSON-LD.
  try {
    const response = await fetchOrThrow(
      `https://apply.workable.com/api/v2/accounts/${encodeURIComponent(target.account)}/jobs/${encodeURIComponent(target.shortcode)}`,
    );
    const data = (await response.json()) as {
      title?: string;
      description?: string;
      company?: { title?: string };
      location?: { city?: string; country?: string };
    };
    const location = [data.location?.city, data.location?.country]
      .filter(Boolean)
      .join(", ");
    return finalize(
      data.title,
      data.company?.title ?? target.account,
      location || undefined,
      data.description ? htmlToText(data.description) : undefined,
    );
  } catch (err) {
    if (err instanceof JobImportError && err.kind === "fetch_failed") throw err;
    const page = await fetchOrThrow(
      `https://apply.workable.com/${encodeURIComponent(target.account)}/j/${encodeURIComponent(target.shortcode)}/`,
    );
    const html = await page.text();
    const posting = extractJobPostingJsonLd(html);
    if (!posting) {
      throw new JobImportError(
        "Couldn't extract a usable job description from that page. Paste it manually instead.",
        "not_found",
      );
    }
    return finalize(
      posting.title,
      posting.company ?? target.account,
      posting.location,
      posting.descriptionHtml ? htmlToText(posting.descriptionHtml) : undefined,
    );
  }
}

export async function importJobFromUrl(rawUrl: string): Promise<ImportedJob> {
  const target = parseJobUrl(rawUrl);
  switch (target.provider) {
    case "greenhouse":
      return importGreenhouse(target);
    case "lever":
      return importLever(target);
    case "ashby":
      return importAshby(target);
    case "workable":
      return importWorkable(target);
  }
}
