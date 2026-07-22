import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analysisErrorResponse, executeAnalysis } from "@/lib/analysis/execute";
import { getMessages } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { importJobFromUrl } from "@/lib/jobimport/providers";
import { isProviderListingUrl } from "@/lib/jobs/hosts";

// "Analyze this job" from the job-discovery results: feeds a provider
// listing into the existing analysis pipeline (executeAnalysis), which
// enforces plan quota (exactly one usage event), hourly rate limits,
// resume ownership, and the anti-fabrication guard. The provider and
// original listing URL are preserved in the stored job description.

// Generous headroom for slow model responses, matching /api/analyze.
export const maxDuration = 300;

const analyzeJobSchema = z.object({
  resumeId: z.uuid(),
  resumeVersionId: z.uuid(),
  listing: z.object({
    provider: z.enum(["adzuna", "remotive"]),
    url: z.string().trim().max(1000),
    title: z.string().trim().min(2).max(200),
    company: z.string().trim().max(200).optional(),
    description: z.string().trim().min(80).max(30_000),
  }),
  outputLanguage: z.enum(["en", "tr"]).optional(),
});

const PROVIDER_LABELS = { adzuna: "Adzuna", remotive: "Remotive" } as const;

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
  const parsed = analyzeJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: t.errors.invalidRequest }, { status: 400 });
  }

  const { listing, resumeId, resumeVersionId } = parsed.data;
  if (!isProviderListingUrl(listing.provider, listing.url)) {
    return NextResponse.json({ error: t.jobs.errors.invalidListing }, { status: 400 });
  }

  // Adzuna search results carry a snippet; try the hardened import
  // pipeline (SSRF-guarded, redirect-validated) for the full posting and
  // fall back to the snippet if the page can't be read.
  let description = listing.description;
  if (listing.provider === "adzuna") {
    try {
      const imported = await importJobFromUrl(listing.url);
      if (imported.jobDescription.length > description.length) {
        description = imported.jobDescription;
      }
    } catch {
      // Snippet fallback — never block the analysis on enrichment.
    }
  }

  const outputLanguage = parsed.data.outputLanguage ?? locale;
  // Provenance travels with the stored analysis (and into the report).
  const sourceLine = getMessages(outputLanguage).jobs.sourceLine(
    PROVIDER_LABELS[listing.provider],
    listing.url,
  );

  try {
    const { id } = await executeAnalysis(supabase, user, {
      jobTitle: listing.title,
      company: listing.company,
      jobDescription: `${description}\n\n${sourceLine}`,
      resumeId,
      resumeVersionId,
      outputLanguage,
      locale,
    });
    return NextResponse.json({ id });
  } catch (err) {
    return analysisErrorResponse(err, locale);
  }
}
