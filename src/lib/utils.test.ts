import { describe, expect, it } from "vitest";
import { cn, scoreTone } from "./utils";

describe("scoreTone", () => {
  it("maps scores to tones at the documented boundaries", () => {
    expect(scoreTone(0)).toBe("poor");
    expect(scoreTone(49)).toBe("poor");
    expect(scoreTone(50)).toBe("fair");
    expect(scoreTone(74)).toBe("fair");
    expect(scoreTone(75)).toBe("strong");
    expect(scoreTone(100)).toBe("strong");
  });
});

describe("cn", () => {
  it("joins truthy classes and drops falsy ones", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
