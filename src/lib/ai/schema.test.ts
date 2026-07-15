import { describe, expect, it } from "vitest";
import { AnalysisResult, AnalyzeRequest, clampScore } from "./schema";

const validRequest = {
  jobTitle: "Senior Frontend Engineer",
  company: "Acme",
  jobDescription: "x".repeat(200),
  resumeText: "y".repeat(200),
};

describe("AnalyzeRequest", () => {
  it("accepts a valid pasted-resume request", () => {
    expect(AnalyzeRequest.safeParse(validRequest).success).toBe(true);
  });

  it("accepts a file-based request without resume text", () => {
    const parsed = AnalyzeRequest.safeParse({
      ...validRequest,
      resumeText: undefined,
      resumeFilePath: "user-123/resume.pdf",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects when neither resume text nor file is provided", () => {
    const parsed = AnalyzeRequest.safeParse({
      ...validRequest,
      resumeText: undefined,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a saved-resume request via resumeId", () => {
    const parsed = AnalyzeRequest.safeParse({
      ...validRequest,
      resumeText: undefined,
      resumeId: "6f1c1f7e-9dcb-4f2a-8f4e-2b8a1a3d9c10",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-uuid resumeId", () => {
    const parsed = AnalyzeRequest.safeParse({
      ...validRequest,
      resumeId: "not-a-uuid",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a too-short job description", () => {
    const parsed = AnalyzeRequest.safeParse({
      ...validRequest,
      jobDescription: "too short",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects oversized inputs", () => {
    const parsed = AnalyzeRequest.safeParse({
      ...validRequest,
      jobDescription: "x".repeat(50_001),
    });
    expect(parsed.success).toBe(false);
  });

  it("company is optional", () => {
    const parsed = AnalyzeRequest.safeParse({
      ...validRequest,
      company: undefined,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("AnalysisResult", () => {
  const validResult = {
    fit_score: 72,
    fit_summary: "Solid foundation with some gaps.",
    missing_skills: [
      { skill: "Kubernetes", importance: "critical", suggestion: "Take a course." },
    ],
    strengths: [{ strength: "React", evidence: "5 years building React apps." }],
    tailored_summary: "Frontend engineer with...",
    cover_letter: "Dear Hiring Manager, ...",
    ats_keywords: [
      {
        keyword: "React",
        status: "matched",
        importance: "required",
        suggestion: "Keep React in your skills section header.",
      },
    ],
    resume_suggestions: [
      {
        section: "Summary",
        original_text: "Frontend developer with experience.",
        improved_text: "Senior frontend engineer with 5 years of React experience.",
        reason: "Leads with the seniority and stack the role requires.",
        impact: "high",
      },
    ],
  };

  it("parses a well-formed result", () => {
    expect(AnalysisResult.safeParse(validResult).success).toBe(true);
  });

  it("rejects unknown ATS status or importance values", () => {
    const bad = {
      ...validResult,
      ats_keywords: [
        { keyword: "React", status: "partial", importance: "required", suggestion: "x" },
      ],
    };
    expect(AnalysisResult.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown resume-suggestion impact level", () => {
    const bad = {
      ...validResult,
      resume_suggestions: [
        {
          section: "Summary",
          original_text: "a",
          improved_text: "b",
          reason: "c",
          impact: "critical",
        },
      ],
    };
    expect(AnalysisResult.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown importance level", () => {
    const parsed = AnalysisResult.safeParse({
      ...validResult,
      missing_skills: [
        { skill: "K8s", importance: "essential", suggestion: "..." },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const parsed = AnalysisResult.safeParse({
      ...validResult,
      cover_letter: undefined,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("clampScore", () => {
  it("clamps out-of-range scores into 0–100", () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(105)).toBe(100);
  });

  it("rounds fractional scores", () => {
    expect(clampScore(71.6)).toBe(72);
  });

  it("passes through valid scores", () => {
    expect(clampScore(88)).toBe(88);
  });
});
