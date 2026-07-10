import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { JobImportError } from "./errors";

// Fetcher for user-supplied hosts (the generic import path). Unlike the
// provider adapters — which only ever call fixed, trusted API hosts — this
// path fetches arbitrary public URLs, so every hop is validated against
// SSRF: scheme, hostname, and every DNS-resolved address must be public,
// and redirects are re-validated before being followed.

const MAX_REDIRECTS = 5;
const DEFAULT_MAX_BYTES = 2_000_000;
const DEFAULT_TIMEOUT_MS = 10_000;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.azure.internal",
]);

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p > 255)) {
    return true; // malformed — treat as unsafe
  }
  const [a, b] = parts;
  return (
    a === 0 || // "this network"
    a === 10 ||
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) || // 192.0.0.0/24 special use
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast + reserved
  );
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:10.0.0.1) — validate the embedded IPv4.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return (
    lower === "::" ||
    lower === "::1" || // loopback
    lower.startsWith("fc") || // unique local fc00::/7
    lower.startsWith("fd") ||
    lower.startsWith("fe8") || // link-local fe80::/10
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb") ||
    lower.startsWith("ff") // multicast
  );
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return true; // not an IP — callers must resolve first
}

function invalidUrl(message: string): JobImportError {
  return new JobImportError(message, "invalid_url");
}

/**
 * Rejects URLs that must never be fetched: non-http(s) schemes, localhost,
 * internal hostnames, and private/reserved IP literals.
 */
export function assertSafeUrl(url: URL): void {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw invalidUrl("Only http and https URLs can be imported.");
  }
  if (url.username || url.password) {
    throw invalidUrl("URLs with embedded credentials aren't supported.");
  }

  // Strip brackets from IPv6 literals for inspection.
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(host)) {
    throw invalidUrl("That address can't be imported.");
  }
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw invalidUrl("That address can't be imported.");
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw invalidUrl("That address can't be imported.");
    }
    return;
  }
  // Dotless names ("intranet", "router") only resolve on internal networks.
  if (!host.includes(".")) {
    throw invalidUrl("That address can't be imported.");
  }
}

/**
 * Resolves the hostname and verifies every address is public. Catches
 * internal hostnames that pass the lexical checks (e.g. a public-looking
 * domain whose A record points at 10.0.0.5).
 */
async function assertResolvesPublic(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return; // literal — already validated in assertSafeUrl

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new JobImportError(
      "Couldn't reach that site. Check the URL and try again.",
      "fetch_failed",
    );
  }
  if (
    addresses.length === 0 ||
    addresses.some((a) => isPrivateAddress(a.address))
  ) {
    throw invalidUrl("That address can't be imported.");
  }
}

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "application/json",
  "application/ld+json",
];

export interface SafeFetchResult {
  body: string;
  contentType: string;
  finalUrl: string;
}

export interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new JobImportError(
        "That page is too large to import. Paste the description manually instead.",
        "fetch_failed",
      );
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Fetches an untrusted URL with SSRF validation on the initial URL and on
 * every redirect hop, a timeout, a redirect limit, a response-size cap,
 * and a content-type requirement (HTML or JSON only).
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw invalidUrl("That doesn't look like a valid URL.");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertSafeUrl(url);
    await assertResolvesPublic(url);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,application/json;q=0.8",
          "User-Agent": "ApplyPilotAI/1.0 (job import; +https://applypilot.ai)",
        },
      });
    } catch {
      throw new JobImportError(
        "Couldn't reach that site. Check the URL and try again.",
        "fetch_failed",
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new JobImportError(
          "That site returned a broken redirect. Paste the description manually instead.",
          "fetch_failed",
        );
      }
      // Each destination is re-validated at the top of the loop.
      url = new URL(location, url);
      continue;
    }

    if (response.status === 404 || response.status === 410) {
      throw new JobImportError(
        "That job posting wasn't found — it may have been closed or removed.",
        "not_found",
      );
    }
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      throw new JobImportError(
        "This page could not be imported automatically. Please paste the job description manually.",
        "blocked",
      );
    }
    if (!response.ok) {
      throw new JobImportError(
        "That site failed the request. Paste the description manually instead.",
        "fetch_failed",
      );
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
      throw new JobImportError(
        "That URL doesn't point to a web page. Paste the description manually instead.",
        "not_found",
      );
    }

    const body = await readCapped(response, maxBytes);
    return { body, contentType, finalUrl: url.toString() };
  }

  throw new JobImportError(
    "Too many redirects. Paste the description manually instead.",
    "fetch_failed",
  );
}
