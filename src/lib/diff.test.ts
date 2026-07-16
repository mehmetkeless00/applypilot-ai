import { describe, expect, it } from "vitest";
import { diffLines } from "./diff";

describe("diffLines", () => {
  it("marks unchanged text as same", () => {
    const parts = diffLines("a\nb", "a\nb");
    expect(parts).toEqual([
      { type: "same", text: "a" },
      { type: "same", text: "b" },
    ]);
  });

  it("reports additions and removals around unchanged context", () => {
    const before = "Header\nOld line\nFooter";
    const after = "Header\nNew line\nFooter";
    expect(diffLines(before, after)).toEqual([
      { type: "same", text: "Header" },
      { type: "removed", text: "Old line" },
      { type: "added", text: "New line" },
      { type: "same", text: "Footer" },
    ]);
  });

  it("handles pure additions and pure removals", () => {
    expect(diffLines("a", "a\nb")).toEqual([
      { type: "same", text: "a" },
      { type: "added", text: "b" },
    ]);
    expect(diffLines("a\nb", "b")).toEqual([
      { type: "removed", text: "a" },
      { type: "same", text: "b" },
    ]);
  });

  it("keeps every line of both sides exactly once", () => {
    const before = Array.from({ length: 60 }, (_, i) => `line ${i}`).join("\n");
    const after = before.replace("line 30", "changed 30");
    const parts = diffLines(before, after);
    const removed = parts.filter((p) => p.type === "removed");
    const added = parts.filter((p) => p.type === "added");
    expect(removed).toEqual([{ type: "removed", text: "line 30" }]);
    expect(added).toEqual([{ type: "added", text: "changed 30" }]);
    expect(parts.filter((p) => p.type === "same")).toHaveLength(59);
  });

  it("stays safe on very large inputs via the fallback path", () => {
    // Two large, fully different texts exceed the LCS budget.
    const before = Array.from({ length: 3000 }, (_, i) => `a${i}`).join("\n");
    const after = Array.from({ length: 3000 }, (_, i) => `b${i}`).join("\n");
    const parts = diffLines(before, after);
    expect(parts.filter((p) => p.type === "removed")).toHaveLength(3000);
    expect(parts.filter((p) => p.type === "added")).toHaveLength(3000);
  });
});
