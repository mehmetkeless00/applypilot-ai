import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { importJobFromUrl, JobImportError } from "@/lib/jobimport/providers";

const bodySchema = z.object({
  url: z.string().trim().min(1, "Enter a job posting URL").max(2000),
});

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    const job = await importJobFromUrl(parsed.data.url);
    return NextResponse.json(job);
  } catch (err) {
    if (err instanceof JobImportError) {
      return NextResponse.json(
        { error: err.message, kind: err.kind },
        { status: kindToStatus[err.kind] },
      );
    }
    console.error("Unexpected job import error:", err);
    return NextResponse.json(
      { error: "Import failed unexpectedly. Paste the description manually instead." },
      { status: 500 },
    );
  }
}
