import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: { value: undefined as string | undefined, throws: false },
}));

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (cookieStore.throws) throw new Error("outside request scope");
    return {
      get: (name: string) =>
        name === "lang" && cookieStore.value !== undefined
          ? { name, value: cookieStore.value }
          : undefined,
    };
  },
}));

import { getLocale, pageTitle } from "./server";

beforeEach(() => {
  cookieStore.value = undefined;
  cookieStore.throws = false;
});

describe("getLocale (lang cookie)", () => {
  it("reads the persisted locale from the cookie", async () => {
    cookieStore.value = "tr";
    expect(await getLocale()).toBe("tr");
  });

  it("defaults to English without a cookie", async () => {
    expect(await getLocale()).toBe("en");
  });

  it("falls back to English for junk cookie values", async () => {
    cookieStore.value = "xx";
    expect(await getLocale()).toBe("en");
  });

  it("falls back to English outside a request scope", async () => {
    cookieStore.throws = true;
    expect(await getLocale()).toBe("en");
  });
});

describe("pageTitle", () => {
  it("localizes document titles from the lang cookie", async () => {
    expect(await pageTitle("signIn")).toEqual({ title: "Sign in" });
    cookieStore.value = "tr";
    expect(await pageTitle("signIn")).toEqual({ title: "Giriş yap" });
    expect(await pageTitle("myAnalyses")).toEqual({ title: "Analizlerim" });
  });

  it("never repeats the brand — the layout template appends it", async () => {
    // Regression: static titles like "Sign in — ApplyPilot AI" rendered as
    // "Sign in — ApplyPilot AI — ApplyPilot AI" through the %s template.
    for (const key of ["signIn", "signUp", "billing", "resumes"] as const) {
      const { title } = await pageTitle(key);
      expect(title).not.toContain("ApplyPilot");
    }
  });
});
