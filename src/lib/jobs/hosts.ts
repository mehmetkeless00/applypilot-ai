import type { JobProvider } from "./types";

// Host validation for listing URLs echoed back from the browser: the
// analyze flow only accepts HTTPS URLs whose registrable domain belongs to
// the claimed provider, so a tampered request can't point elsewhere.

const PROVIDER_HOST_PATTERNS: Record<JobProvider, RegExp> = {
  // adzuna.com / adzuna.de / adzuna.co.uk / adzuna.com.au — "adzuna" must
  // sit directly before the public suffix, so adzuna.evil.com fails.
  adzuna: /^(?:[a-z0-9-]+\.)*adzuna\.(?:co\.|com\.)?[a-z]{2,3}$/,
  remotive: /^(?:[a-z0-9-]+\.)*remotive\.(?:com|io)$/,
};

export function isProviderListingUrl(provider: JobProvider, rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return PROVIDER_HOST_PATTERNS[provider].test(url.hostname.toLowerCase());
}
