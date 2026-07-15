import { describe, expect, it } from "vitest";
import { isDisposableEmail } from "./disposable";

describe("isDisposableEmail", () => {
  it("blocks known disposable domains, case-insensitively", () => {
    expect(isDisposableEmail("x@mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@YOPMAIL.com")).toBe(true);
    expect(isDisposableEmail("x@temp-mail.org")).toBe(true);
  });

  it("allows regular providers", () => {
    expect(isDisposableEmail("x@gmail.com")).toBe(false);
    expect(isDisposableEmail("x@company.io")).toBe(false);
  });

  it("handles malformed input safely", () => {
    expect(isDisposableEmail("not-an-email")).toBe(false);
    expect(isDisposableEmail("")).toBe(false);
  });
});
