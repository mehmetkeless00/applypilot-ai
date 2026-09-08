import { extractSkills } from "./skills";
import {
  COUNTRY_NAMES,
  detectListingSeniority,
  JUNIOR_LEVELS,
  REGION_MEMBERSHIP,
  scoreListing,
  tokenize,
  type MatchCvInput,
} from "./match";
import type { JobListing, JobSearchFilters, ScoredJobListing } from "./types";

// Two-stage result pipeline: Stage 1 removes listings that are obviously
// wrong (incompatible location, employment type, seniority, or simply not
// about the searched role) *before* any scoring happens. Stage 2 computes
// the existing CV-based Estimated Match only on what survives. This keeps
// "does this listing match the search" (relevance, query-driven) separate
// from "does this listing match the CV" (match, CV-driven) — mixing them
// into one score was why clearly irrelevant listings (wrong country, wrong
// role entirely) used to rank alongside real matches: an uninformative
// listing earned neutral half-credit on every unstated dimension instead
// of being excluded.

export const DEFAULT_MIN_RELEVANCE = 40;

// A handful of common tech-role synonyms so a "developer" search also
// recognizes "engineer"/"programmer" titles (and vice versa) — without
// this, "Software Engineer" would score zero relevance against a
// "developer" query despite being exactly the kind of role being searched
// for. Deliberately small: general synonyms, not literal example titles.
//
// Deliberately excludes the bare gerund/noun forms ("development",
// "engineering", "programming") as expansion targets: those words are
// common outside software (e.g. "Business Development Representative",
// "Sales Engineering Manager"), so letting a "developer"/"engineer" query
// match on them alone produced confirmed false positives — a Business
// Development listing scored 85/100 relevance against a "developer"
// search and ranked #1. Only the agent-noun forms (the person doing the
// role) cross-match each other.
const ROLE_SYNONYMS: Record<string, string[]> = {
  developer: ["developer", "engineer", "programmer"],
  dev: ["developer", "engineer", "programmer"],
  engineer: ["engineer", "developer", "programmer"],
  programmer: ["programmer", "developer", "engineer"],
};

function expand(token: string): string[] {
  return ROLE_SYNONYMS[token] ?? [token];
}

// "Developer" is a real, standard job-title word outside software too
// ("Business Developer" is a common EU sales title; "Real Estate/Property/
// Land Developer" build things, not code). Confirmed live: a "Business
// Developer" sales listing at an AI startup ranked #1 for an "AI developer"
// search — its title supplied the "developer" hit and its description's
// unrelated "AI-powered website builder" company blurb supplied the "ai"
// hit. Stripping these known non-tech compound phrases before tokenizing
// removes the false signal while leaving the rest of the text intact.
const NON_TECH_DEVELOPER_PATTERN =
  /\b(?:business|real estate|property|land)\s+develop(?:er|ers|ment)\b/gi;

function stripNonTechRolePhrases(text: string): string {
  return text.replace(NON_TECH_DEVELOPER_PATTERN, " ");
}

const TITLE_MATCH_WEIGHT = 60;
const DESCRIPTION_MATCH_WEIGHT = 25;
const SKILL_OVERLAP_WEIGHT = 30;

/**
 * How relevant a listing is to the searched role, 0–100 — independent of
 * the CV. Requires actual textual or technology overlap with the query;
 * an uninformative listing (no overlap at all) scores 0, not a neutral
 * default, since the whole point is separating "on-topic" from "not."
 */
export function computeRelevance(query: string, listing: JobListing): number {
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0) return 100;

  const titleTokens = new Set(tokenize(stripNonTechRolePhrases(listing.title)));
  const descriptionTokens = new Set(tokenize(stripNonTechRolePhrases(listing.description)));

  const titleHits = queryTokens.filter((t) => expand(t).some((v) => titleTokens.has(v)));
  const descriptionHits = queryTokens.filter((t) =>
    expand(t).some((v) => descriptionTokens.has(v)),
  );

  let score = 0;
  if (titleHits.length > 0) {
    score += (TITLE_MATCH_WEIGHT * titleHits.length) / queryTokens.length;
  }
  if (descriptionHits.length > 0) {
    score += (DESCRIPTION_MATCH_WEIGHT * descriptionHits.length) / queryTokens.length;
  }

  // Shared recognized technologies (e.g. searching "Node.js developer"
  // against a listing that names Node.js) are a strong signal on their
  // own, independent of how the title happens to be worded.
  const querySkills = extractSkills(query);
  if (querySkills.length > 0) {
    const listingSkills = extractSkills(`${listing.title}\n${listing.description}`);
    const shared = querySkills.filter((s) => listingSkills.includes(s));
    if (shared.length > 0) {
      score += Math.min(SKILL_OVERLAP_WEIGHT, (SKILL_OVERLAP_WEIGHT * shared.length) / querySkills.length);
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Place names commonly seen in a remote job's free-text eligibility
 * restriction that fall outside ApplyPilot's supported search countries
 * (e.g. Remotive frequently lists Latin American eligibility). Used only
 * to recognize an explicit restriction to a place clearly different from
 * the one searched — text that matches nothing here still defaults to
 * compatible (benefit of the doubt), same conservative philosophy as
 * match.ts's own location scoring.
 */
const OTHER_KNOWN_PLACES = [
  "uruguay", "argentina", "chile", "colombia", "peru", "venezuela", "ecuador",
  "bolivia", "paraguay", "costa rica", "panama", "latam", "latin america",
  "south america", "china", "japan", "south korea", "philippines", "vietnam",
  "thailand", "indonesia", "nigeria", "kenya", "egypt", "morocco", "russia",
  "ukraine",
];

/**
 * Hard remote/location filter. On-site searches are already scoped to the
 * chosen country by the provider request itself (Adzuna's country path,
 * Jooble for Turkey), so this only matters for remote searches.
 */
export function isRemoteLocationCompatible(
  filters: JobSearchFilters,
  listing: JobListing,
): boolean {
  if (filters.workMode !== "remote") return true;
  if (!listing.remote) return false;

  const restriction = listing.remoteRestriction?.toLowerCase() ?? "";
  if (!restriction) return true;
  if (/worldwide|anywhere|global/.test(restriction)) return true;

  const countryName = COUNTRY_NAMES[filters.country];
  if (countryName && restriction.includes(countryName)) return true;

  let namesIncompatibleRegion = false;
  for (const [region, members] of Object.entries(REGION_MEMBERSHIP)) {
    if (restriction.includes(region)) {
      if (members.includes(filters.country)) return true;
      namesIncompatibleRegion = true;
    }
  }

  const namesOtherCountry =
    OTHER_KNOWN_PLACES.some((name) => restriction.includes(name)) ||
    Object.entries(COUNTRY_NAMES).some(
      ([code, name]) => code !== filters.country && restriction.includes(name),
    );

  return !(namesIncompatibleRegion || namesOtherCountry);
}

/** Hard employment-type filter — only excludes on a stated conflict. */
export function isEmploymentTypeCompatible(
  filters: JobSearchFilters,
  listing: JobListing,
): boolean {
  if (filters.employmentType === "any") return true;
  if (listing.employmentType === null) return true;
  return listing.employmentType === filters.employmentType;
}

/**
 * Hard seniority filter — only excludes a listing that clearly asks for
 * more seniority than the candidate has (a senior/lead role for a
 * junior-tier search). A junior-tagged listing surviving a senior search
 * is left to scoring, not excluded, since a senior candidate applying to
 * a junior role isn't "obviously irrelevant" the way the reverse is.
 */
export function isSeniorityCompatible(
  filters: JobSearchFilters,
  listing: JobListing,
): boolean {
  if (filters.experienceLevel === "any") return true;
  const listingSeniority = detectListingSeniority(listing.title);
  return !(listingSeniority === "senior" && JUNIOR_LEVELS.includes(filters.experienceLevel));
}

/**
 * Stage 1 (hard filter + relevance gate) followed by Stage 2 (Estimated
 * Match, computed only on survivors), sorted by relevance, then match
 * score, then posting recency.
 */
export function rankListings(
  listings: JobListing[],
  filters: JobSearchFilters,
  cv: MatchCvInput,
  minRelevance: number = DEFAULT_MIN_RELEVANCE,
): ScoredJobListing[] {
  const candidates = listings.filter(
    (listing) =>
      isRemoteLocationCompatible(filters, listing) &&
      isEmploymentTypeCompatible(filters, listing) &&
      isSeniorityCompatible(filters, listing) &&
      computeRelevance(filters.query, listing) >= minRelevance,
  );

  return candidates
    .map((listing) => ({
      listing,
      relevance: computeRelevance(filters.query, listing),
      match: scoreListing(cv, filters, listing),
    }))
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      if (b.match.score !== a.match.score) return b.match.score - a.match.score;
      const aTime = a.listing.postedAt ? Date.parse(a.listing.postedAt) : -Infinity;
      const bTime = b.listing.postedAt ? Date.parse(b.listing.postedAt) : -Infinity;
      return bTime - aTime;
    })
    .map(({ listing, match }) => ({ ...listing, match }));
}
