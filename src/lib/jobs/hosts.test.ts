import { describe, expect, it } from "vitest";
import { isProviderListingUrl } from "./hosts";

describe("isProviderListingUrl", () => {
  it("accepts real provider hosts over HTTPS", () => {
    expect(isProviderListingUrl("adzuna", "https://www.adzuna.co.uk/land/ad/1")).toBe(true);
    expect(isProviderListingUrl("adzuna", "https://www.adzuna.com/land/ad/1")).toBe(true);
    expect(isProviderListingUrl("adzuna", "https://www.adzuna.com.au/land/ad/1")).toBe(true);
    expect(isProviderListingUrl("adzuna", "https://www.adzuna.de/land/ad/1")).toBe(true);
    expect(isProviderListingUrl("remotive", "https://remotive.com/remote-jobs/dev/x-1")).toBe(true);
    expect(isProviderListingUrl("remotive", "https://remotive.io/remote-jobs/dev/x-1")).toBe(true);
  });

  it("rejects lookalike hosts, other providers, and non-HTTPS schemes", () => {
    expect(isProviderListingUrl("adzuna", "https://adzuna.evil.com/x")).toBe(false);
    expect(isProviderListingUrl("adzuna", "https://evil.com/adzuna.co.uk")).toBe(false);
    expect(isProviderListingUrl("adzuna", "https://notadzuna.com/x")).toBe(false);
    expect(isProviderListingUrl("remotive", "https://remotive.evil.io/x")).toBe(false);
    expect(isProviderListingUrl("adzuna", "https://remotive.com/x")).toBe(false);
    expect(isProviderListingUrl("adzuna", "http://www.adzuna.co.uk/land/ad/1")).toBe(false);
    expect(isProviderListingUrl("adzuna", "not a url")).toBe(false);
  });
});
