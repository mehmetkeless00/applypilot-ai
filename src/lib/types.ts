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
  model: string;
  created_at: string;
}
