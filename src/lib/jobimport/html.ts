// Minimal HTML-to-text conversion for job descriptions.
// Job boards return simple formatted HTML (p, br, li, headings) — a full
// parser dependency isn't warranted.

import { decodeHtmlEntities } from "@/lib/text";

export const decodeEntities = decodeHtmlEntities;

export function htmlToText(html: string): string {
  const text = html
    // Drop non-content blocks entirely
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, "")
    // Block-level closings and separators become newlines
    .replace(/<\/(p|div|section|h[1-6]|tr|table|ul|ol)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    // Strip all remaining tags
    .replace(/<[^>]+>/g, "");

  return decodeEntities(text)
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface JsonLdJobPosting {
  title?: string;
  description?: string;
  hiringOrganization?: { name?: string } | string;
  jobLocation?:
    | { address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } }
    | Array<{ address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } }>;
}

export interface ExtractedJobPosting {
  title?: string;
  company?: string;
  location?: string;
  descriptionHtml?: string;
}

/**
 * Extracts a schema.org JobPosting from JSON-LD script blocks in a page.
 * Used as the fallback when a provider's JSON API isn't available.
 */
export function extractJobPostingJsonLd(html: string): ExtractedJobPosting | null {
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    const candidates: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      if (
        typeof candidate === "object" &&
        candidate !== null &&
        (candidate as { "@type"?: string })["@type"] === "JobPosting"
      ) {
        const posting = candidate as JsonLdJobPosting;
        const org = posting.hiringOrganization;
        const locationNode = Array.isArray(posting.jobLocation)
          ? posting.jobLocation[0]
          : posting.jobLocation;
        const address = locationNode?.address;
        const location = [
          address?.addressLocality,
          address?.addressRegion,
          address?.addressCountry,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          title: posting.title,
          company: typeof org === "string" ? org : org?.name,
          location: location || undefined,
          descriptionHtml: posting.description,
        };
      }
    }
  }

  return null;
}
