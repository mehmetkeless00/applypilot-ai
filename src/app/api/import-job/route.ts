import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { countUsageSince, hourAgo, recordUsage } from "@/lib/billing/usage";
import { importJobFromUrl, JobImportError } from "@/lib/jobimport/providers";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

// The importer makes server-side requests to third-party sites on the
// user's behalf — cap how fast a single account can drive it.
const IMPORTS_PER_HOUR = 20;

const kindToStatus: Record<JobImportError["kind"], number> = {
  invalid_url: 400,
  linkedin: 422,
  unsupported: 422,
  blocked: 422,
  not_found: 404,
  fetch_failed: 502,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = getMessages(locale);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t.errors.notAuthenticated }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bodySchema = z.object({
    url: z.string().trim().min(1, t.errors.import.enterUrl).max(2000),
  });
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const attempts = await countUsageSince(supabase, "import", hourAgo());
  if (attempts >= IMPORTS_PER_HOUR) {
    return NextResponse.json(
      { error: t.errors.import.rateLimited },
      { status: 429 },
    );
  }
  // Record the attempt (not just successes) so failures can't be hammered.
  await recordUsage(supabase, user.id, "import");

  try {
    const job = await importJobFromUrl(parsed.data.url);
    return NextResponse.json(job);
  } catch (err) {
    if (err instanceof JobImportError) {
      // English keeps the importer's specific message; Turkish maps the
      // error kind to an equivalent actionable message.
      const message =
        locale === "en" ? err.message : t.errors.import.kinds[err.kind];
      return NextResponse.json(
        { error: message, kind: err.kind },
        { status: kindToStatus[err.kind] },
      );
    }
    console.error("Unexpected job import error:", err);
    return NextResponse.json(
      { error: t.errors.import.unexpected },
      { status: 500 },
    );
  }
}
