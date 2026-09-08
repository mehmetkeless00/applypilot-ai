import { extractSkills, sortSkills } from "./skills";
import type {
  ExperienceLevel,
  JobListing,
  JobSearchFilters,
  MatchReason,
  MatchResult,
} from "./types";

// Deterministic preview scoring: estimates how well a listing matches the
// selected CV *before* the user spends an analysis. Pure function of its
// inputs — no AI call, no randomness — so identical inputs always produce
// the identical score, and every component is reported as a reason the UI
// can explain. It's an estimate of alignment, never a promise of
// eligibility or employment.

// Component weights (sum = 100).
const TITLE_WEIGHT = 30;
const SKILLS_WEIGHT = 45;
const SENIORITY_WEIGHT = 10;
const LOCATION_WEIGHT = 10;
const EMPLOYMENT_WEIGHT = 5;

// Penalties for clear incompatibilities.
const SENIORITY_PENALTY = 15;
const LOCATION_PENALTY = 10;
const AUTHORIZATION_PENALTY = 10;
const MANDATORY_PENALTY_EACH = 8;
const MANDATORY_PENALTY_CAP = 24;

/** English names used to test remote-eligibility restrictions. */
export const COUNTRY_NAMES: Record<string, string> = {
  at: "austria", au: "australia", be: "belgium", br: "brazil", ca: "canada",
  ch: "switzerland", de: "germany", es: "spain", fr: "france",
  gb: "united kingdom", in: "india", it: "italy", mx: "mexico",
  nl: "netherlands", nz: "new zealand", pl: "poland", sg: "singapore",
  us: "usa", za: "south africa", tr: "turkey",
};

export const REGION_MEMBERSHIP: Record<string, string[]> = {
  emea: ["at", "be", "ch", "de", "es", "fr", "gb", "it", "nl", "pl", "za"],
  europe: ["at", "be", "ch", "de", "es", "fr", "gb", "it", "nl", "pl"],
  eu: ["at", "be", "de", "es", "fr", "it", "nl", "pl"],
  americas: ["br", "ca", "mx", "us"],
  "north america": ["ca", "us"],
  apac: ["au", "in", "nz", "sg"],
  uk: ["gb"],
  "united states": ["us"],
  "u.s.": ["us"],
  usa: ["us"],
  america: ["us"],
  canada: ["ca"],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9çğıöşü+#.]+/)
    // Keep intra-token dots (node.js) but not sentence punctuation.
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1);
}

/** Seniority a listing itself declares, from its title. */
export function detectListingSeniority(
  title: string,
): "internship" | "junior" | "senior" | null {
  if (/(?:^|\W)(?:intern|internship|trainee|stajyer|staj)(?:\W|$)/i.test(title)) {
    return "internship";
  }
  if (/(?:^|\W)(?:senior|sr\.?|lead|principal|staff|head of|director|kıdemli)(?:\W|$)/i.test(title)) {
    return "senior";
  }
  if (/(?:^|\W)(?:junior|jr\.?|entry[ -]level|graduate)(?:\W|$)/i.test(title)) {
    return "junior";
  }
  return null;
}

export const JUNIOR_LEVELS: ExperienceLevel[] = ["internship", "entry", "junior"];

/**
 * Sentences that declare a requirement mandatory; any dictionary skill in
 * them that the CV lacks is an important missing requirement.
 */
function findMandatoryMissing(description: string, cvSkills: Set<string>): string[] {
  const missing = new Set<string>();
  const sentences = description.split(/[.\n•;]+/);
  for (const sentence of sentences) {
    if (!/(?:must[- ]have|must have|required|essential|zorunlu|şarttır|gereklidir)/i.test(sentence)) {
      continue;
    }
    for (const skill of extractSkills(sentence)) {
      if (!cvSkills.has(skill)) missing.add(skill);
    }
  }
  return sortSkills([...missing]);
}

const AUTHORIZATION_PATTERN =
  /(?:citizens? only|(?:work (?:permit|authori[sz]ation)|right to work) (?:is )?required|no visa sponsorship|without sponsorship|unable to sponsor|cannot sponsor|must be authori[sz]ed to work)/i;

function locationFit(
  listing: JobListing,
  filters: JobSearchFilters,
): "match" | "mismatch" | "unknown" {
  if (filters.workMode === "remote") {
    if (!listing.remote) return "mismatch";
    const restriction = listing.remoteRestriction?.toLowerCase() ?? "";
    if (!restriction || /worldwide|anywhere/.test(restriction)) return "match";
    const countryName = COUNTRY_NAMES[filters.country];
    if (countryName && restriction.includes(countryName)) return "match";
    for (const [region, members] of Object.entries(REGION_MEMBERSHIP)) {
      if (restriction.includes(region)) {
        return members.includes(filters.country) ? "match" : "mismatch";
      }
    }
    // A restriction is stated but names places we can't map — don't guess.
    return "unknown";
  }
  // Onsite: compare against the city the user asked for.
  if (listing.remote) return "unknown";
  if (!filters.city) return "unknown";
  const location = listing.location?.toLowerCase() ?? "";
  if (!location) return "unknown";
  return location.includes(filters.city.toLowerCase()) ? "match" : "unknown";
}

export interface MatchCvInput {
  /** Canonical skills extracted from the selected CV version. */
  cvSkills: string[];
  /** The user's (editable) role keywords driving the search. */
  roleKeywords: string;
}

/** Deterministic estimated-match score for one listing. */
export function scoreListing(
  cv: MatchCvInput,
  filters: JobSearchFilters,
  listing: JobListing,
): MatchResult {
  const reasons: MatchReason[] = [];
  let score = 0;

  // Title similarity: share of query tokens that appear in the title.
  const queryTokens = [...new Set(tokenize(cv.roleKeywords))];
  const titleTokens = new Set(tokenize(listing.title));
  const titleMatched = queryTokens.filter((t) => titleTokens.has(t));
  score +=
    queryTokens.length === 0
      ? TITLE_WEIGHT / 2
      : (TITLE_WEIGHT * titleMatched.length) / queryTokens.length;
  reasons.push({ kind: "title", matched: titleMatched, total: queryTokens.length });

  // Skill overlap: share of the listing's recognized skills the CV covers.
  const cvSkillSet = new Set(cv.cvSkills);
  const listingSkills = extractSkills(`${listing.title}\n${listing.description}`);
  const matchedSkills = sortSkills(listingSkills.filter((s) => cvSkillSet.has(s)));
  if (listingSkills.length === 0) {
    // The listing names no recognizable technologies — neutral half credit.
    score += SKILLS_WEIGHT / 2;
    reasons.push({ kind: "skills", matched: [], total: 0 });
  } else {
    score += (SKILLS_WEIGHT * matchedSkills.length) / listingSkills.length;
    reasons.push({ kind: "skills", matched: matchedSkills, total: listingSkills.length });
  }

  // Seniority fit: a senior/lead listing is penalized for junior-level
  // candidates rather than merely scoring lower.
  const listingSeniority = detectListingSeniority(listing.title);
  if (listingSeniority === null || filters.experienceLevel === "any") {
    score += SENIORITY_WEIGHT / 2;
    reasons.push({ kind: "seniority", fit: "unknown" });
  } else if (
    listingSeniority === "senior" &&
    JUNIOR_LEVELS.includes(filters.experienceLevel)
  ) {
    score -= SENIORITY_PENALTY;
    reasons.push({ kind: "seniority", fit: "above" });
  } else if (
    listingSeniority === filters.experienceLevel ||
    (listingSeniority === "junior" && JUNIOR_LEVELS.includes(filters.experienceLevel)) ||
    (listingSeniority === "senior" && filters.experienceLevel === "senior")
  ) {
    score += SENIORITY_WEIGHT;
    reasons.push({ kind: "seniority", fit: "match" });
  } else {
    score += SENIORITY_WEIGHT / 2;
    reasons.push({ kind: "seniority", fit: "unknown" });
  }

  // Location / remote compatibility.
  const locFit = locationFit(listing, filters);
  if (locFit === "match") {
    score += LOCATION_WEIGHT;
  } else if (locFit === "mismatch") {
    score -= LOCATION_PENALTY;
  } else {
    score += LOCATION_WEIGHT / 2;
  }
  reasons.push({ kind: "location", fit: locFit });

  // Employment-type compatibility.
  if (filters.employmentType === "any" || listing.employmentType === null) {
    score += EMPLOYMENT_WEIGHT / 2;
    reasons.push({ kind: "employment", fit: "unknown" });
  } else if (listing.employmentType === filters.employmentType) {
    score += EMPLOYMENT_WEIGHT;
    reasons.push({ kind: "employment", fit: "match" });
  } else {
    reasons.push({ kind: "employment", fit: "mismatch" });
  }

  // Explicit work-authorization requirements are a hard signal.
  if (AUTHORIZATION_PATTERN.test(listing.description)) {
    score -= AUTHORIZATION_PENALTY;
    reasons.push({ kind: "authorization" });
  }

  // Mandatory requirements the CV doesn't demonstrate.
  const missingRequirements = findMandatoryMissing(listing.description, cvSkillSet);
  if (missingRequirements.length > 0) {
    score -= Math.min(
      MANDATORY_PENALTY_CAP,
      missingRequirements.length * MANDATORY_PENALTY_EACH,
    );
    reasons.push({ kind: "mandatory", missing: missingRequirements });
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    matchedSkills,
    missingRequirements,
    reasons,
  };
}
