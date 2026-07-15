import type { SupabaseClient } from "@supabase/supabase-js";

// Plan limits reset on UTC calendar-month boundaries.
export function monthStartUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function hourAgo(now: Date = new Date()): Date {
  return new Date(now.getTime() - 60 * 60 * 1000);
}

export type UsageKind = "analysis" | "import" | "export";

/**
 * Counts events in the append-only usage ledger. Unlike counting rows in
 * `analyses`, this can't be reset by deleting records.
 */
export async function countUsageSince(
  supabase: SupabaseClient,
  kind: UsageKind,
  since: Date,
): Promise<number> {
  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  kind: UsageKind,
): Promise<void> {
  const { error } = await supabase
    .from("usage_events")
    .insert({ user_id: userId, kind });
  if (error) {
    // Never fail the user's request over ledger bookkeeping.
    console.error("Failed to record usage event:", error);
  }
}
