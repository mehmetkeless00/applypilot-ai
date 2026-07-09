import { createClient } from "@supabase/supabase-js";

// Service-role client that bypasses RLS. Server-only; used where there is no
// user session (Stripe webhooks) or where users must not write the columns
// themselves (billing fields on profiles). Never import from client code.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
