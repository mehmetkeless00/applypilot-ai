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
  })
  .refine((data) => data.resumeText || data.resumeFilePath, {
    message: "Provide your resume as text or an uploaded PDF",
    path: ["resumeText"],
  });

export type AnalyzeRequestData = z.infer<typeof AnalyzeRequest>;

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
