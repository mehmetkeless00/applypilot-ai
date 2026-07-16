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

import { getLocale } from "./server";

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
