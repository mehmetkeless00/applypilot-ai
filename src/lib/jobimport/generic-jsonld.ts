import * as cheerio from "cheerio";
import { htmlToCleanText } from "./html-to-text";

// schema.org/JobPosting extraction for arbitrary pages. Handles the shapes
// seen in the wild: a single object, a top-level array, and @graph wrappers;
// @type as a string or an array of types.

export interface ExtractedGenericJob {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
}

interface JsonLdAddress {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string | { name?: string };
}

interface JsonLdPlace {
  address?: JsonLdAddress | string;
  name?: string;
}

interface JsonLdJobPosting {
  "@type"?: string | string[];
  title?: string;
  name?: string;
  description?: string;
  hiringOrganization?: { name?: string } | string;
  jobLocation?: JsonLdPlace | JsonLdPlace[];
  jobLocationType?: string | string[];
  applicantLocationRequirements?:
    | { name?: string }
    | Array<{ name?: string }>;
}

function isJobPosting(value: unknown): value is JsonLdJobPosting {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { "@type"?: unknown })["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some(
    (t) => typeof t === "string" && t.toLowerCase() === "jobposting",
  );
}

/** Flattens single objects, arrays, and @graph wrappers into candidates. */
function candidatesOf(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed.flatMap(candidatesOf);
  if (typeof parsed !== "object" || parsed === null) return [];
  const graph = (parsed as { "@graph"?: unknown })["@graph"];
  if (Array.isArray(graph)) return [parsed, ...graph.flatMap(candidatesOf)];
  return [parsed];
}

function placeToString(place: JsonLdPlace | undefined): string | undefined {
  if (!place) return undefined;
  const address = place.address;
  if (typeof address === "string") return address.trim() || undefined;
  if (address) {
    const country =
      typeof address.addressCountry === "string"
        ? address.addressCountry
        : address.addressCountry?.name;
    const parts = [address.addressLocality, address.addressRegion, country]
      .map((p) => p?.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }
  return place.name?.trim() || undefined;
}

function locationOf(posting: JsonLdJobPosting): string | undefined {
  const places = Array.isArray(posting.jobLocation)
    ? posting.jobLocation
    : posting.jobLocation
      ? [posting.jobLocation]
      : [];
  const placeNames = places
    .map(placeToString)
    .filter((p): p is string => Boolean(p));

  const types = Array.isArray(posting.jobLocationType)
    ? posting.jobLocationType
    : posting.jobLocationType
      ? [posting.jobLocationType]
      : [];
  const remote = types.some((t) => t.toUpperCase() === "TELECOMMUTE");

  const requirements = Array.isArray(posting.applicantLocationRequirements)
    ? posting.applicantLocationRequirements
    : posting.applicantLocationRequirements
      ? [posting.applicantLocationRequirements]
      : [];
  const requirementNames = requirements
    .map((r) => r.name?.trim())
    .filter((n): n is string => Boolean(n));

  const parts: string[] = [];
  if (remote) {
    parts.push(
      requirementNames.length > 0
        ? `Remote (${requirementNames.join(", ")})`
        : "Remote",
    );
  } else if (requirementNames.length > 0) {
    parts.push(requirementNames.join(", "));
  }
  parts.push(...placeNames.slice(0, 2));

  const location = parts.join(" · ");
  return location || undefined;
}

/**
 * Finds a JobPosting in the page's JSON-LD script blocks. Malformed blocks
 * are skipped; returns null when no posting is present.
 */
export function extractJobPostingFromJsonLd(
  html: string,
): ExtractedGenericJob | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (const script of scripts.toArray()) {
    const raw = $(script).text().trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue; // malformed JSON-LD — try the next block
    }

    for (const candidate of candidatesOf(parsed)) {
      if (!isJobPosting(candidate)) continue;
      const posting = candidate;
      const org = posting.hiringOrganization;
      const description = posting.description
        ? htmlToCleanText(posting.description)
        : undefined;
      return {
        title: (posting.title ?? posting.name)?.trim() || undefined,
        company:
          (typeof org === "string" ? org : org?.name)?.trim() || undefined,
        location: locationOf(posting),
        description: description || undefined,
      };
    }
  }

  return null;
}
