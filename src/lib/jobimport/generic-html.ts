import * as cheerio from "cheerio";
import { elementToCleanText, htmlToCleanText } from "./html-to-text";

// Last-resort extraction for pages without JSON-LD: Open Graph meta tags
// for title/company, then semantic content selectors for the description.

export interface OpenGraphData {
  title?: string;
  description?: string;
  siteName?: string;
}

// A real job description is long; short extractions are usually nav
// residue, teasers, or error pages.
export const MIN_DESCRIPTION_CHARS = 200;

export function extractOpenGraph(html: string): OpenGraphData {
  const $ = cheerio.load(html);
  const meta = (property: string) =>
    $(`meta[property="${property}"]`).attr("content")?.trim() ||
    $(`meta[name="${property}"]`).attr("content")?.trim() ||
    undefined;
  return {
    title: meta("og:title"),
    description: meta("og:description"),
    siteName: meta("og:site_name"),
  };
}

/** Page <title>, with trailing " - Site" / " | Site" chrome removed. */
export function extractPageTitle(html: string): string | undefined {
  const $ = cheerio.load(html);
  const raw = $("title").first().text().trim();
  if (!raw) return $("h1").first().text().trim() || undefined;
  return raw.split(/\s+[|\-–—]\s+/)[0].trim() || undefined;
}

// Chrome that never belongs in a job description.
const CHROME_SELECTOR = [
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "svg",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[class*="cookie"]',
  '[id*="cookie"]',
  '[class*="consent"]',
  '[class*="banner"]',
  '[class*="navbar"]',
  '[class*="sidebar"]',
  '[class*="footer"]',
  '[class*="header"]',
  '[class*="share"]',
  '[class*="related"]',
  '[aria-hidden="true"]',
].join(", ");

// Most-specific first; the first selector yielding enough text wins.
const CONTENT_SELECTORS = [
  '[class*="job-description"]',
  '[id*="job-description"]',
  '[class*="jobDescription"]',
  '[id*="jobDescription"]',
  '[class*="job-details"]',
  '[class*="job-content"]',
  '[class*="posting-description"]',
  '[itemprop="description"]',
  '[class*="description"]',
  '[id*="description"]',
  "main",
  "article",
];

/**
 * Extracts the main text content of a page after removing navigation,
 * cookie banners, and other chrome. Returns undefined when nothing
 * substantial is found.
 */
export function extractMainContent(html: string): string | undefined {
  const $ = cheerio.load(html);
  $(CHROME_SELECTOR).remove();

  let best: string | undefined;
  for (const selector of CONTENT_SELECTORS) {
    for (const el of $(selector).toArray()) {
      const text = elementToCleanText($, el);
      if (text.length >= MIN_DESCRIPTION_CHARS) return text;
      if (!best || text.length > best.length) best = text;
    }
    // A specific selector matched but was thin — keep trying broader ones.
  }

  // Whole-body fallback.
  const body = $("body")[0];
  if (body) {
    const text = elementToCleanText($, body);
    if (text.length >= MIN_DESCRIPTION_CHARS) return text;
    if (!best || text.length > best.length) best = text;
  }

  return best && best.length >= MIN_DESCRIPTION_CHARS ? best : undefined;
}

const BLOCKED_MARKERS = [
  "enable javascript",
  "javascript is required",
  "javascript is disabled",
  "requires javascript",
  "just a moment",
  "checking your browser",
  "verify you are human",
  "verifying you are human",
  "are you a robot",
  "captcha",
  "cf-challenge",
  "access denied",
  "sign in to view",
  "log in to view",
  "sign in to continue",
  "login to continue",
];

/**
 * Detects pages that render nothing without JavaScript, or that answered
 * with a CAPTCHA / bot-check / login wall instead of content.
 */
export function looksBlockedOrJsOnly(html: string, extractedText?: string): boolean {
  const haystack = html.toLowerCase();
  if (BLOCKED_MARKERS.some((marker) => haystack.includes(marker))) return true;
  // An SPA shell: a page whose entire rendered text is near-empty. A page
  // with some text but no job description is "not found", not "blocked".
  const text = extractedText ?? htmlToCleanText(html);
  return text.length < 40;
}
