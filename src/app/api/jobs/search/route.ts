import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { fetchVersion } from "@/lib/resumes/resumes";
import { ADZUNA_COUNTRIES } from "@/lib/jobs/adzuna";
import { scoreListing } from "@/lib/jobs/match";
import { checkSearchRateLimit } from "@/lib/jobs/ratelimit";
import { searchJobs } from "@/lib/jobs/search";
import { extractSkills } from "@/lib/jobs/skills";

// Job discovery search. Runs entirely server-side: provider credentials
// never leave the server, and only the user's chosen keywords are sent to
// providers — never CV content. Searching and preview scoring are free:
// no analysis quota is consumed and nothing is written to usage_events.

const SEARCHES_PER_HOUR = 30;

const searchSchema = z.object({
  resumeId: z.uuid(),
  resumeVersionId: z.uuid(),
  query: z.string().trim().min(2).max(120),
  country: z.enum(ADZUNA_COUNTRIES),
  workMode: z.enum(["remote", "onsite"]),
  city: z.string().trim().max(80).optional(),
  experienceLevel: z.enum(["any", "internship", "entry", "junior", "mid", "senior"]),
  employmentType: z.enum(["any", "full_time", "part_time"]),
  maxDaysOld: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(3),
    z.literal(7),
    z.literal(14),
    z.literal(30),
  ]),
});

const MAX_RESULTS = 30;

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
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: t.errors.invalidRequest }, { status: 400 });
  }

  if (!checkSearchRateLimit(user.id, SEARCHES_PER_HOUR, 60 * 60 * 1000)) {
    return NextResponse.json({ error: t.jobs.errors.rateLimited }, { status: 429 });
  }

  // Ownership: the version must exist under this user's RLS scope AND
  // belong to the resume the client claims. The user id itself is never
  // read from the request.
  const { resumeId, resumeVersionId, ...filters } = parsed.data;

  try {
    const version = await fetchVersion(supabase, resumeId, resumeVersionId);
    if (!version) {
      return NextResponse.json({ error: t.errors.savedResumeNotFound }, { status: 404 });
    }

    // CV skills are extracted server-side for scoring; the CV text itself
    // is neither sent to providers nor logged nor returned.
    const cvSkills = extractSkills(version.content ?? "");

    const { listings, providers } = await searchJobs(filters);
    const scored = listings
      .map((listing) => ({
        ...listing,
        match: scoreListing(
          { cvSkills, roleKeywords: filters.query },
          filters,
          listing,
        ),
      }))
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, MAX_RESULTS);

    return NextResponse.json({ listings: scored, providers });
  } catch (err) {
    // Never let an unexpected failure (Supabase hiccup, a scoring edge
    // case) surface as a raw 500 with no body the client can parse — log
    // just the error message and user id (no CV content, no credentials)
    // and return the same clean, localized error shape as every other
    // failure path.
    console.error("Job search failed for user", user.id, ":", err);
    return NextResponse.json({ error: t.jobs.errors.searchFailed }, { status: 500 });
  }
}
