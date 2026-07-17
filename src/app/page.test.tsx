import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const localeState = vi.hoisted(() => ({ locale: "en" as "en" | "tr" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/i18n/server", () => ({
  getLocale: async () => localeState.locale,
}));

import LandingPage from "./page";

async function renderLanding() {
  return renderToStaticMarkup(await LandingPage());
}

afterEach(() => {
  localeState.locale = "en";
  delete process.env.STRIPE_SECRET_KEY;
});

describe("landing page", () => {
  it("has exactly one h1 and a clear CTA hierarchy in the hero", async () => {
    const html = await renderLanding();
    expect(html.match(/<h1/g)?.length).toBe(1);
    // Primary CTA goes to signup; secondary is an in-page anchor.
    expect(html).toContain("Analyze your first application — free");
    expect(html).toContain("See how it works");
    expect(html).toContain('href="#how-it-works"');
    expect(html).toContain('href="/signup"');
    expect(html).toContain('href="/login"');
  });

  it("renders how-it-works, pricing, trust, and FAQ sections with real headings", async () => {
    const html = await renderLanding();
    expect(html).toContain('id="how-it-works"');
    expect(html).toContain('id="pricing"');
    expect(html).toContain("How it works");
    expect(html).toContain("Simple pricing");
    expect(html).toContain("Frequently asked questions");
    expect(html).toContain("<details");
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
  });

  it("shows Pro as Coming soon while billing is not configured", async () => {
    const html = await renderLanding();
    expect(html).toContain("Coming soon");
    expect(html).not.toContain("/api/billing");
    expect(html).not.toContain("STRIPE");
  });

  it("renders fully in Turkish, keeping sample-report facts verbatim", async () => {
    localeState.locale = "tr";
    const html = await renderLanding();
    expect(html).toContain("Nasıl çalışır");
    expect(html).toContain("Nasıl çalıştığını görün");
    expect(html).toContain("Sık sorulan sorular");
    // Sample-report technologies/companies play the role of user facts.
    expect(html).toContain("GraphQL");
    expect(html).toContain("Acme");
    expect(html).not.toContain("How it works");
  });
});
