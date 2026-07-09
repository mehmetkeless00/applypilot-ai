import { describe, expect, it } from "vitest";
import { paragraphs, stripMarkdown } from "./content";

describe("stripMarkdown", () => {
  it("removes common markdown markers", () => {
    const input = "# Hello\n\nI am **bold** and *keen*.\n\n- one\n- two";
    const out = stripMarkdown(input);
    expect(out).not.toContain("#");
    expect(out).not.toContain("**");
    expect(out).toContain("I am bold and keen.");
    expect(out).toContain("• one");
  });
});

describe("paragraphs", () => {
  it("splits on blank lines and drops empties", () => {
    expect(paragraphs("a\n\nb\n\n\n\nc\n\n")).toEqual(["a", "b", "c"]);
  });
});
