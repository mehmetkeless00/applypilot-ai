export type Importance = "critical" | "important" | "nice_to_have";

export interface MissingSkill {
  skill: string;
  importance: Importance;
  suggestion: string;
}

export interface Strength {
  strength: string;
  evidence: string;
}

export type AtsStatus = "matched" | "weak" | "missing";
export type AtsImportance = "required" | "preferred" | "nice_to_have";

export interface AtsKeyword {
  keyword: string;
  status: AtsStatus;
  importance: AtsImportance;
  suggestion: string;
}

export type SuggestionImpact = "low" | "medium" | "high";

export interface ResumeSuggestion {
  section: string;
  original_text: string;
  improved_text: string;
  reason: string;
  impact: SuggestionImpact;
}

export type ResumeSource = "paste" | "pdf";

export interface Resume {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ResumeVersion {
  id: string;
  resume_id: string;
  user_id: string;
  version: number;
  content: string | null;
  file_path: string | null;
  source: ResumeSource;
  created_at: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  job_title: string;
  company: string | null;
  job_description: string;
  resume_text: string | null;
  resume_file_path: string | null;
  fit_score: number;
  fit_summary: string;
  missing_skills: MissingSkill[];
  strengths: Strength[];
  tailored_summary: string;
  cover_letter: string;
  /** Empty for analyses created before ATS coverage shipped. */
  ats_keywords: AtsKeyword[];
  /** Empty for analyses created before rewrite suggestions shipped. */
  resume_suggestions: ResumeSuggestion[];
  /** Set when the analysis was run against a saved resume. */
  resume_id: string | null;
  resume_version_id: string | null;
  /** Set when this analysis re-scored an earlier one. */
  rescored_from: string | null;
  model: string;
  created_at: string;
}
