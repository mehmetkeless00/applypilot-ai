// Shared contracts for the job-discovery feature: normalized listings from
// external providers, the user's search filters, and the deterministic
// match result computed against a saved CV. Every listing field is copied
// from real provider data — a field the provider didn't supply stays null.

export type JobProvider = "adzuna" | "remotive";

export type ListingEmploymentType = "full_time" | "part_time" | "contract" | "other";

export interface JobListing {
  /** Provider-prefixed stable id, e.g. "adzuna:12345". */
  id: string;
  provider: JobProvider;
  title: string;
  company: string | null;
  /** Human-readable location as the provider states it. */
  location: string | null;
  remote: boolean;
  /**
   * Remote-eligibility restriction as stated by the provider
   * (e.g. Remotive's candidate_required_location: "USA Only").
   */
  remoteRestriction: string | null;
  /** Original listing URL on the provider (never rewritten). */
  url: string;
  /** ISO timestamp of the posting date, when the provider supplies one. */
  postedAt: string | null;
  /**
   * Salary exactly as the provider states it, preformatted for display.
   * Null when absent — never estimated or invented.
   */
  salary: string | null;
  employmentType: ListingEmploymentType | null;
  /** Plain text (HTML stripped server-side). May be a provider snippet. */
  description: string;
}

export type ExperienceLevel =
  | "any"
  | "internship"
  | "entry"
  | "junior"
  | "mid"
  | "senior";

export type EmploymentTypeFilter = "any" | "full_time" | "part_time";

export interface JobSearchFilters {
  /** Free-text role keywords sent to providers (never CV content). */
  query: string;
  /** Adzuna country code, e.g. "gb", "de", "nl". */
  country: string;
  workMode: "remote" | "onsite";
  /** City for onsite searches. */
  city?: string;
  experienceLevel: ExperienceLevel;
  employmentType: EmploymentTypeFilter;
  /** 0 means any age. */
  maxDaysOld: number;
}

export type ProviderStatus = "ok" | "failed" | "unavailable" | "skipped";

export interface JobSearchOutcome {
  listings: JobListing[];
  providers: Record<JobProvider, ProviderStatus>;
}

/** Structured, localizable explanation of one score component. */
export type MatchReason =
  | { kind: "title"; matched: string[]; total: number }
  | { kind: "skills"; matched: string[]; total: number }
  | { kind: "seniority"; fit: "match" | "above" | "unknown" }
  | { kind: "location"; fit: "match" | "mismatch" | "unknown" }
  | { kind: "employment"; fit: "match" | "mismatch" | "unknown" }
  | { kind: "authorization" }
  | { kind: "mandatory"; missing: string[] };

export interface MatchResult {
  /** 0–100 heuristic estimate; deterministic for identical inputs. */
  score: number;
  /** CV skills that also appear in the listing. */
  matchedSkills: string[];
  /** Requirements the listing marks mandatory that the CV doesn't show. */
  missingRequirements: string[];
  reasons: MatchReason[];
}

export interface ScoredJobListing extends JobListing {
  match: MatchResult;
}

/** Body of a successful POST /api/jobs/search response (scored, sorted). */
export interface JobSearchResponse {
  listings: ScoredJobListing[];
  providers: Record<JobProvider, ProviderStatus>;
}

/** Raised by provider adapters for malformed responses or HTTP failures. */
export class JobProviderError extends Error {
  constructor(
    public readonly provider: JobProvider,
    message: string,
  ) {
    super(message);
    this.name = "JobProviderError";
  }
}
