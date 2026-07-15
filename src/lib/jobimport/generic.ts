import { JobImportError } from "./errors";
import {
  extractMainContent,
  extractOpenGraph,
  extractPageTitle,
  looksBlockedOrJsOnly,
  MIN_DESCRIPTION_CHARS,
} from "./generic-html";
import { extractJobPostingFromJsonLd } from "./generic-jsonld";
import { safeFetch } from "./safe-fetch";
import { cleanMetadataText } from "@/lib/text";

export interface GenericImportedJob {
  jobTitle: string;
  company?: string;
  location?: string;
  jobDescription: string;
  note?: string;
}

const BLOCKED_MESSAGE =
  "This page could not be imported automatically. Please paste the job description manually.";

function noteForMissing(company?: string, location?: string): string | undefined {
  const missing: string[] = [];
  if (!company) missing.push("company");
  if (!location) missing.push("location");
  if (missing.length === 0) return undefined;
  return `Couldn't detect the ${missing.join(" or ")} — add ${
    missing.length > 1 ? "them" : "it"
  } if needed.`;
}

/**
 * Generic import for sites without a dedicated adapter:
 * 1. schema.org JobPosting JSON-LD (single object, array, or @graph)
 * 2. Open Graph meta tags
 * 3. semantic HTML content extraction
 * Pages that need JavaScript, a login, or answer with a bot check get a
 * manual-paste message instead of a partial import.
 */
export async function importGenericJob(url: string): Promise<GenericImportedJob> {
  const { body: html } = await safeFetch(url);

  // 1. JSON-LD JobPosting — the most reliable source when present.
  const jsonLd = extractJobPostingFromJsonLd(html);
  if (
    jsonLd?.title &&
    jsonLd.description &&
    jsonLd.description.length >= MIN_DESCRIPTION_CHARS / 2
  ) {
    // JSON-LD script content is not entity-decoded by the HTML parser, so
    // metadata can arrive encoded ("Bytes &amp; Pixels GmbH").
    const company = cleanMetadataText(jsonLd.company);
    const location = cleanMetadataText(jsonLd.location);
    return {
      jobTitle: cleanMetadataText(jsonLd.title) ?? jsonLd.title,
      company,
      location,
      jobDescription: jsonLd.description,
      note: noteForMissing(company, location),
    };
  }

  // 2 + 3. Open Graph for title/company, semantic extraction for the body.
  const og = extractOpenGraph(html);
  const mainContent = extractMainContent(html);

  const title =
    jsonLd?.title ?? og.title ?? extractPageTitle(html) ?? undefined;
  const company = jsonLd?.company ?? og.siteName;
  const location = jsonLd?.location;

  // Prefer real page content; fall back to a long og:description.
  const description =
    mainContent ??
    (og.description && og.description.length >= MIN_DESCRIPTION_CHARS
      ? og.description
      : undefined) ??
    jsonLd?.description;

  if (!title || !description || description.length < MIN_DESCRIPTION_CHARS / 2) {
    if (looksBlockedOrJsOnly(html, mainContent)) {
      throw new JobImportError(BLOCKED_MESSAGE, "blocked");
    }
    throw new JobImportError(
      "Couldn't find a job description on that page. Paste it manually instead.",
      "not_found",
    );
  }

  const cleanCompany = cleanMetadataText(company);
  const cleanLocation = cleanMetadataText(location);
  return {
    jobTitle: cleanMetadataText(title) ?? title,
    company: cleanCompany,
    location: cleanLocation,
    jobDescription: description,
    note: noteForMissing(cleanCompany, cleanLocation),
  };
}
