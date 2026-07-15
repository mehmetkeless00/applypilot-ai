import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPdfForResume, MAX_RESUME_PDF_BYTES } from "./resumes";
import { samplePdf } from "./pdf-test-fixture";

const store: { bytes: Buffer | null } = { bytes: null };

const supabase = {
  storage: {
    from: () => ({
      download: async () =>
        store.bytes
          ? { data: new Blob([new Uint8Array(store.bytes)]), error: null }
          : { data: null, error: { message: "not found" } },
    }),
  },
} as unknown as SupabaseClient;

beforeEach(() => {
  store.bytes = null;
});

describe("loadPdfForResume", () => {
  it("rejects paths outside the caller's storage prefix", async () => {
    const result = await loadPdfForResume(supabase, "user-1", "user-2/cv.pdf");
    expect(result.ok).toBe(false);
  });

  it("rejects non-PDF content despite a .pdf path", async () => {
    store.bytes = Buffer.from("plain text pretending");
    const result = await loadPdfForResume(supabase, "user-1", "user-1/cv.pdf");
    expect(result).toEqual({ ok: false, error: "The uploaded file isn't a valid PDF." });
  });

  it("rejects oversized files", async () => {
    store.bytes = Buffer.concat([
      Buffer.from("%PDF-1.4"),
      Buffer.alloc(MAX_RESUME_PDF_BYTES),
    ]);
    const result = await loadPdfForResume(supabase, "user-1", "user-1/cv.pdf");
    expect(result.ok).toBe(false);
  });

  it("returns extracted text for a valid PDF", async () => {
    store.bytes = await samplePdf(
      "Senior Backend Engineer at Acme GmbH since July 2025. Led migration of payment services to Go.",
    );
    const result = await loadPdfForResume(supabase, "user-1", "user-1/cv.pdf");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content).toContain("July 2025");
      expect(result.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    }
  });

  it("returns ok with null content for a text-free PDF", async () => {
    store.bytes = await samplePdf("x");
    const result = await loadPdfForResume(supabase, "user-1", "user-1/cv.pdf");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.content).toBeNull();
  });

  it("fails cleanly when the file is missing", async () => {
    const result = await loadPdfForResume(supabase, "user-1", "user-1/gone.pdf");
    expect(result.ok).toBe(false);
  });
});
