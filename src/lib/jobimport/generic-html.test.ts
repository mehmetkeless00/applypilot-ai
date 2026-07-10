import { describe, expect, it } from "vitest";
import {
  extractMainContent,
  extractOpenGraph,
  extractPageTitle,
  looksBlockedOrJsOnly,
} from "./generic-html";
import { htmlToCleanText } from "./html-to-text";

const longBody = "We are hiring a senior engineer to build data pipelines. ".repeat(8);

describe("htmlToCleanText", () => {
  it("converts blocks, lists, and breaks into readable text", () => {
    const text = htmlToCleanText(
      "<h2>Role</h2><p>First line.<br>Second line.</p><ul><li>Go</li><li>SQL</li></ul>",
    );
    expect(text).toContain("Role\n");
    expect(text).toContain("First line.\nSecond line.");
    expect(text).toContain("• Go");
    expect(text).toContain("• SQL");
    expect(text).not.toMatch(/<[a-z]/);
  });

  it("drops script and style content", () => {
    const text = htmlToCleanText(
      "<p>Keep</p><script>alert(1)</script><style>.x{}</style>",
    );
    expect(text).toBe("Keep");
  });
});

describe("extractOpenGraph", () => {
  it("reads og:title, og:description, and og:site_name", () => {
    const og = extractOpenGraph(`<html><head>
      <meta property="og:title" content="Staff Engineer" />
      <meta property="og:description" content="Join our team." />
      <meta property="og:site_name" content="Acme Careers" />
    </head><body></body></html>`);
    expect(og).toEqual({
      title: "Staff Engineer",
      description: "Join our team.",
      siteName: "Acme Careers",
    });
  });
});

describe("extractPageTitle", () => {
  it("strips trailing site chrome from the title tag", () => {
    expect(
      extractPageTitle("<title>Backend Engineer | Acme Careers</title>"),
    ).toBe("Backend Engineer");
  });
});

describe("extractMainContent", () => {
  it("prefers semantic job-description containers", () => {
    const html = `<html><body>
      <nav>Home Jobs About</nav>
      <div class="cookie-banner">We use cookies to improve your experience on this site okay</div>
      <div class="job-description"><p>${longBody}</p></div>
      <footer>© Acme</footer>
    </body></html>`;
    const text = extractMainContent(html);
    expect(text).toContain("senior engineer");
    expect(text).not.toContain("cookies");
    expect(text).not.toContain("© Acme");
    expect(text).not.toContain("Home Jobs About");
  });

  it("falls back to main/article content", () => {
    const html = `<html><body>
      <header>Acme</header>
      <main><article><p>${longBody}</p></article></main>
    </body></html>`;
    expect(extractMainContent(html)).toContain("senior engineer");
  });

  it("rejects pages whose content is too short", () => {
    expect(
      extractMainContent("<html><body><main>Too short.</main></body></html>"),
    ).toBeUndefined();
  });
});

describe("looksBlockedOrJsOnly", () => {
  it("detects JavaScript-required shells", () => {
    const html =
      "<html><body><div id=\"app\"></div><noscript>Please enable JavaScript to continue.</noscript></body></html>";
    expect(looksBlockedOrJsOnly(html)).toBe(true);
  });

  it("detects bot-check pages", () => {
    expect(
      looksBlockedOrJsOnly("<html><body>Just a moment... Checking your browser</body></html>"),
    ).toBe(true);
  });

  it("does not flag a page with real extracted content", () => {
    expect(looksBlockedOrJsOnly("<html><body></body></html>", longBody)).toBe(false);
  });
});
