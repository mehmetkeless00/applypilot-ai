import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobImportError } from "./errors";

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

import { importGenericJob } from "./generic";
import { importJobFromUrl } from "./providers";

const longBody = "You will design and operate data pipelines at scale. ".repeat(8);

function stubPage(html: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    ),
  );
}

beforeEach(() => {
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("importGenericJob", () => {
  it("imports via JSON-LD when a JobPosting is present", async () => {
    stubPage(`<html><head><script type="application/ld+json">${JSON.stringify({
      "@type": "JobPosting",
      title: "Data Engineer",
      description: `<p>${longBody}</p>`,
      hiringOrganization: { name: "Acme" },
      jobLocation: { address: { addressLocality: "Amsterdam", addressCountry: "NL" } },
    })}</script></head><body></body></html>`);

    const job = await importGenericJob("https://careers.acme.com/jobs/42");
    expect(job.jobTitle).toBe("Data Engineer");
    expect(job.company).toBe("Acme");
    expect(job.location).toBe("Amsterdam, NL");
    expect(job.jobDescription).toContain("data pipelines");
    expect(job.note).toBeUndefined();
  });

  it("decodes entity-encoded metadata from JSON-LD", async () => {
    stubPage(`<html><head><script type="application/ld+json">${JSON.stringify({
      "@type": "JobPosting",
      title: "Engineer &amp; Architect",
      description: `<p>${longBody}</p>`,
      hiringOrganization: { name: "Labeless (Bytes &amp; Pixels GmbH)" },
    })}</script></head><body></body></html>`);

    const job = await importGenericJob("https://careers.acme.com/jobs/42");
    expect(job.jobTitle).toBe("Engineer & Architect");
    expect(job.company).toBe("Labeless (Bytes & Pixels GmbH)");
  });

  it("falls back to Open Graph + main content when there is no JSON-LD", async () => {
    stubPage(`<html><head>
      <meta property="og:title" content="Data Engineer" />
      <meta property="og:site_name" content="Acme Careers" />
    </head><body><nav>menu</nav><main><p>${longBody}</p></main></body></html>`);

    const job = await importGenericJob("https://careers.acme.com/jobs/42");
    expect(job.jobTitle).toBe("Data Engineer");
    expect(job.company).toBe("Acme Careers");
    expect(job.jobDescription).toContain("data pipelines");
    // Location was undetectable — the note says so.
    expect(job.note).toContain("location");
  });

  it("uses semantic job-description containers in the HTML fallback", async () => {
    stubPage(`<html><head><title>Backend Engineer | Acme</title></head><body>
      <header>Acme nav</header>
      <div class="job-description__content"><p>${longBody}</p></div>
    </body></html>`);

    const job = await importGenericJob("https://acme.com/careers/backend");
    expect(job.jobTitle).toBe("Backend Engineer");
    expect(job.jobDescription).toContain("data pipelines");
    expect(job.note).toContain("company");
  });

  it("returns the manual-paste message for JavaScript-only pages", async () => {
    stubPage(
      '<html><body><div id="root"></div><noscript>Please enable JavaScript to view this page.</noscript></body></html>',
    );
    try {
      await importGenericJob("https://spa.example.com/jobs/1");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(JobImportError);
      expect((err as JobImportError).kind).toBe("blocked");
      expect((err as JobImportError).message).toBe(
        "This page could not be imported automatically. Please paste the job description manually.",
      );
    }
  });

  it("reports not_found when a real page has no job content", async () => {
    stubPage(
      `<html><body><main><p>${"Our company was founded in 1999 and sells widgets. ".repeat(2)}</p></main></body></html>`,
    );
    await expect(
      importGenericJob("https://acme.com/about"),
    ).rejects.toMatchObject({ kind: "not_found" });
  });
});

describe("importJobFromUrl — generic routing", () => {
  it("imports unknown hosts through the generic pipeline end to end", async () => {
    stubPage(`<html><head><script type="application/ld+json">${JSON.stringify({
      "@graph": [
        { "@type": "WebSite", name: "Acme" },
        {
          "@type": "JobPosting",
          title: "SRE",
          description: `<p>${longBody}</p>`,
          hiringOrganization: "Acme",
        },
      ],
    })}</script></head><body></body></html>`);

    const job = await importJobFromUrl("https://jobs.acme.dev/sre-123");
    expect(job.jobTitle).toBe("SRE");
    expect(job.company).toBe("Acme");
  });

  it("still refuses LinkedIn before any fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      importJobFromUrl("https://www.linkedin.com/jobs/view/123"),
    ).rejects.toMatchObject({ kind: "linkedin" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
