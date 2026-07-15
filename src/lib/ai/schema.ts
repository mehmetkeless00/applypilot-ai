import { z } from "zod";

// Contract for the structured analysis the model returns.
// Numeric bounds aren't enforceable by the API's JSON-schema subset,
// so fit_score is clamped in code after parsing.
export const AnalysisResult = z.object({
  fit_score: z.number(),
  fit_summary: z.string(),
  missing_skills: z.array(
    z.object({
      skill: z.string(),
      importance: z.enum(["critical", "important", "nice_to_have"]),
      suggestion: z.string(),
    }),
  ),
  strengths: z.array(
    z.object({
      strength: z.string(),
      evidence: z.string(),
    }),
  ),
  tailored_summary: z.string(),
  cover_letter: z.string(),
  ats_keywords: z.array(
    z.object({
      keyword: z.string(),
      status: z.enum(["matched", "weak", "missing"]),
      importance: z.enum(["required", "preferred", "nice_to_have"]),
      suggestion: z.string(),
    }),
  ),
  resume_suggestions: z.array(
    z.object({
      section: z.string(),
      original_text: z
        .string()
        .describe("The candidate's exact current text, quoted verbatim from the resume."),
      improved_text: z
        .string()
        .describe(
          "Rewrite of original_text. Wording, structure, and ATS phrasing only — every fact (dates, years, numbers, companies, titles, locations, technologies) must be copied verbatim from original_text or the resume. Never invent or 'correct' facts, and never alter dates.",
        ),
      reason: z
        .string()
        .describe(
          "One sentence on why the rewrite helps. Any concern about inconsistent-looking facts belongs here, never in improved_text.",
        ),
      impact: z.enum(["low", "medium", "high"]),
    }),
  ),
});

export type AnalysisResultData = z.infer<typeof AnalysisResult>;

// Request body accepted by POST /api/analyze.
// Input lengths are capped to bound token cost per request.
export const AnalyzeRequest = z
  .object({
    jobTitle: z.string().trim().min(2, "Enter the job title").max(200),
    company: z.string().trim().max(200).optional(),
    jobDescription: z
      .string()
      .trim()
      .min(100, "Paste the full job description (at least 100 characters)")
      .max(50_000, "Job description is too long (max 50,000 characters)"),
    resumeText: z
      .string()
      .trim()
      .min(100, "Paste your full resume (at least 100 characters)")
      .max(50_000, "Resume is too long (max 50,000 characters)")
      .optional(),
    resumeFilePath: z.string().trim().max(500).optional(),
    /** Analyze against the latest version of a saved resume. */
    resumeId: z.uuid().optional(),
    /** When resume text/PDF is provided inline, also save it to the library. */
    saveResumeTitle: z.string().trim().min(1).max(120).optional(),
  })
  .refine((data) => data.resumeText || data.resumeFilePath || data.resumeId, {
    message: "Provide your resume as text, an uploaded PDF, or a saved resume",
    path: ["resumeText"],
  });

export type AnalyzeRequestData = z.infer<typeof AnalyzeRequest>;

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
