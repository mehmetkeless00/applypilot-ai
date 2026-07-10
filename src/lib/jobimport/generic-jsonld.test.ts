import { describe, expect, it } from "vitest";
import { extractJobPostingFromJsonLd } from "./generic-jsonld";

function page(jsonLd: string): string {
  return `<html><head><script type="application/ld+json">${jsonLd}</script></head><body></body></html>`;
}

const posting = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Platform Engineer",
  description: "<p>Build our platform.</p><ul><li>Go</li><li>Kubernetes</li></ul>",
  hiringOrganization: { "@type": "Organization", name: "Acme" },
  jobLocation: {
    "@type": "Place",
    address: {
      addressLocality: "Berlin",
      addressCountry: "DE",
    },
  },
};

describe("extractJobPostingFromJsonLd", () => {
  it("extracts from a single JSON-LD object", () => {
    const job = extractJobPostingFromJsonLd(page(JSON.stringify(posting)));
    expect(job?.title).toBe("Platform Engineer");
    expect(job?.company).toBe("Acme");
    expect(job?.location).toBe("Berlin, DE");
    expect(job?.description).toContain("Build our platform.");
    expect(job?.description).toContain("• Go");
    expect(job?.description).not.toContain("<p>");
  });

  it("extracts from a top-level array", () => {
    const array = JSON.stringify([{ "@type": "WebSite", name: "x" }, posting]);
    expect(extractJobPostingFromJsonLd(page(array))?.title).toBe(
      "Platform Engineer",
    );
  });

  it("extracts from an @graph structure", () => {
    const graph = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "Organization", name: "Acme" }, posting],
    });
    expect(extractJobPostingFromJsonLd(page(graph))?.title).toBe(
      "Platform Engineer",
    );
  });

  it("accepts @type given as an array", () => {
    const typed = JSON.stringify({ ...posting, "@type": ["JobPosting", "Thing"] });
    expect(extractJobPostingFromJsonLd(page(typed))?.title).toBe(
      "Platform Engineer",
    );
  });

  it("skips malformed JSON-LD blocks and keeps scanning", () => {
    const html = `<html><head>
      <script type="application/ld+json">{not valid json</script>
      <script type="application/ld+json">${JSON.stringify(posting)}</script>
    </head><body></body></html>`;
    expect(extractJobPostingFromJsonLd(html)?.title).toBe("Platform Engineer");
  });

  it("returns null when no JobPosting exists", () => {
    const html = page(JSON.stringify({ "@type": "Article", headline: "News" }));
    expect(extractJobPostingFromJsonLd(html)).toBeNull();
  });

  it("marks TELECOMMUTE postings as remote with applicant requirements", () => {
    const remote = JSON.stringify({
      ...posting,
      jobLocation: undefined,
      jobLocationType: "TELECOMMUTE",
      applicantLocationRequirements: { "@type": "Country", name: "USA" },
    });
    expect(extractJobPostingFromJsonLd(page(remote))?.location).toBe(
      "Remote (USA)",
    );
  });

  it("handles hiringOrganization given as a plain string", () => {
    const stringOrg = JSON.stringify({ ...posting, hiringOrganization: "Acme Inc" });
    expect(extractJobPostingFromJsonLd(page(stringOrg))?.company).toBe("Acme Inc");
  });
});
