import { FinishReason, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { AnalysisResult, clampScore, type AnalysisResultData } from "./schema";
import { SYSTEM_PROMPT, buildUserParts, type PromptInput } from "./prompt";

export const MODEL = "gemini-2.5-flash";

/** Thrown when the model declines to analyze the content (safety block). */
export class AnalysisRefusedError extends Error {
  constructor() {
    super("The AI declined to analyze this content.");
    this.name = "AnalysisRefusedError";
  }
}

/** Thrown when GEMINI_API_KEY is missing or still a placeholder. */
export class AIConfigError extends Error {
  constructor(detail: string) {
    super(`GEMINI_API_KEY is not configured: ${detail}. Set a real key in .env.local (local) or the Vercel project settings (production).`);
    this.name = "AIConfigError";
  }
}

let _client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new AIConfigError("the variable is unset");
    if (key.toLowerCase().includes("placeholder")) {
      throw new AIConfigError("it still contains the placeholder value");
    }
    _client = new GoogleGenAI({ apiKey: key }); // server-only
  }
  return _client;
}

// The response schema Gemini constrains its JSON output to,
// derived from the same Zod schema used for validation.
const RESPONSE_JSON_SCHEMA = z.toJSONSchema(AnalysisResult);

export interface AnalyzeOutput {
  result: AnalysisResultData;
  /** Model version that actually produced the response. */
  servedBy: string;
}

export async function analyze(input: PromptInput): Promise<AnalyzeOutput> {
  const client = getClient();

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: buildUserParts(input) }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
      maxOutputTokens: 16000,
    },
  });

  // Safety blocks surface as prompt feedback (input blocked) or as a
  // candidate finish reason (output blocked) — check before reading text.
  const finishReason = response.candidates?.[0]?.finishReason;
  if (
    response.promptFeedback?.blockReason ||
    finishReason === FinishReason.SAFETY ||
    finishReason === FinishReason.PROHIBITED_CONTENT ||
    finishReason === FinishReason.BLOCKLIST
  ) {
    throw new AnalysisRefusedError();
  }

  const text = response.text;
  if (!text) {
    throw new Error("Model response contained no text");
  }

  const parsed = AnalysisResult.parse(JSON.parse(text));
  return {
    result: { ...parsed, fit_score: clampScore(parsed.fit_score) },
    servedBy: response.modelVersion ?? MODEL,
  };
}
