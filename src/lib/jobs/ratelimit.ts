// In-memory sliding-window rate limiter for job searches. The usage_events
// ledger constrains `kind` to analysis/import/export, so tracking searches
// there would need a migration; per-instance memory is enough to stop a
// single account from hammering the providers. Serverless caveat: each
// instance counts independently, so the effective global limit is a bit
// looser than the number below.

const windows = new Map<string, number[]>();

export function checkSearchRateLimit(
  userId: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const cutoff = now - windowMs;
  const timestamps = (windows.get(userId) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= limit) {
    windows.set(userId, timestamps);
    return false;
  }
  timestamps.push(now);
  windows.set(userId, timestamps);
  return true;
}

/** Test hook: clears all tracked windows. */
export function clearSearchRateLimits(): void {
  windows.clear();
}
