import { beforeEach, describe, expect, it, vi } from "vitest";

const generateMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateMock };
  },
  FinishReason: {
    STOP: "STOP",
    SAFETY: "SAFETY",
    PROHIBITED_CONTENT: "PROHIBITED_CONTENT",
    BLOCKLIST: "BLOCKLIST",
  },
}));

import { analyze, AnalysisRefusedError, MODEL } from "./analyze";

// The client is cached module-wide, so config errors are tested against
// a fresh copy of the module before any successful call caches a client.
async function freshAnalyze() {
  vi.resetModules();
  return await import("./analyze");
}

const input = {
  jobTitle: "Backend Engineer",
  company: "Acme",
  jobDescription: "We need someone who knows Go and Postgres.",
  resumeText: "I have 6 years of Go experience.",
};

const validPayload = {
  fit_score: 81,
  fit_summary: "Strong match.",
  missing_skills: [],
  strengths: [{ strength: "Go", evidence: "6 years of Go experience." }],
  tailored_summary: "Experienced backend engineer.",
  cover_letter: "Dear team, ...",
  ats_keywords: [
    {
      keyword: "Go",
      status: "matched",
      importance: "required",
      suggestion: "Keep Go prominent in your skills list.",
    },
  ],
  resume_suggestions: [
    {
      section: "Summary",
      original_text: "I have 6 years of Go experience.",
      improved_text: "Backend engineer with 6 years of production Go experience.",
      reason: "Mirrors the job's core requirement in the first line.",
      impact: "high",
    },
  ],
};

function mockResponse(overrides: Record<string, unknown> = {}) {
  return {
    text: JSON.stringify(validPayload),
    modelVersion: MODEL,
    candidates: [{ finishReason: "STOP" }],
    ...overrides,
  };
}

beforeEach(() => {
  generateMock.mockReset();
  process.env.GEMINI_API_KEY = "test-gemini-key";
});

describe("analyze", () => {
  it("returns the parsed result and serving model", async () => {
    generateMock.mockResolvedValue(mockResponse());
    const { result, servedBy } = await analyze(input);
    expect(result.fit_score).toBe(81);
    expect(result.strengths).toHaveLength(1);
    expect(servedBy).toBe(MODEL);
  });

  it("requests Gemini 2.5 Flash with schema-constrained JSON output", async () => {
    generateMock.mockResolvedValue(mockResponse());
    await analyze(input);
    const params = generateMock.mock.calls[0][0];
    expect(params.model).toBe("gemini-2.5-flash");
    expect(params.config.responseMimeType).toBe("application/json");
    expect(params.config.responseJsonSchema).toBeDefined();
    expect(params.config.systemInstruction).toContain("career coach");
  });

  it("instructs the model to never alter resume facts or dates", async () => {
    generateMock.mockResolvedValue(mockResponse());
    await analyze(input);
    const system = generateMock.mock.calls[0][0].config.systemInstruction;
    expect(system).toContain("Factual integrity");
    // Recency comes only from the supplied <current_date>, never the
    // model's own assumption — and dates are never altered because of it.
    expect(system).toContain("Judge recency only against that date");
    expect(system).toContain('Never alter, doubt, or "correct" a resume date');
    expect(system).toMatch(/never write "assumed"/i);
  });

  it("throws AnalysisRefusedError when the prompt is blocked", async () => {
    generateMock.mockResolvedValue(
      mockResponse({
        text: undefined,
        promptFeedback: { blockReason: "SAFETY" },
        candidates: [],
      }),
    );
    await expect(analyze(input)).rejects.toBeInstanceOf(AnalysisRefusedError);
  });

  it("throws AnalysisRefusedError when the output is safety-blocked", async () => {
    generateMock.mockResolvedValue(
      mockResponse({ text: undefined, candidates: [{ finishReason: "SAFETY" }] }),
    );
    await expect(analyze(input)).rejects.toBeInstanceOf(AnalysisRefusedError);
  });

  it("clamps out-of-range scores from the model", async () => {
    generateMock.mockResolvedValue(
      mockResponse({ text: JSON.stringify({ ...validPayload, fit_score: 130 }) }),
    );
    const { result } = await analyze(input);
    expect(result.fit_score).toBe(100);
  });

  it("reports the concrete model version that served the response", async () => {
    generateMock.mockResolvedValue(
      mockResponse({ modelVersion: "gemini-2.5-flash-002" }),
    );
    const { servedBy } = await analyze(input);
    expect(servedBy).toBe("gemini-2.5-flash-002");
  });

  it("throws when the response has no text", async () => {
    generateMock.mockResolvedValue(
      mockResponse({ text: undefined, candidates: [{ finishReason: "STOP" }] }),
    );
    await expect(analyze(input)).rejects.toThrow(/no text/);
  });

  it("throws AIConfigError when the key is unset", async () => {
    delete process.env.GEMINI_API_KEY;
    const mod = await freshAnalyze();
    await expect(mod.analyze(input)).rejects.toBeInstanceOf(mod.AIConfigError);
  });

  it("throws AIConfigError when the key is a placeholder", async () => {
    process.env.GEMINI_API_KEY = "placeholder";
    const mod = await freshAnalyze();
    await expect(mod.analyze(input)).rejects.toBeInstanceOf(mod.AIConfigError);
  });
});
