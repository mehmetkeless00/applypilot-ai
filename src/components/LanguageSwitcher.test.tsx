import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { LanguageSwitcher } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("is an accessible group of pressable language buttons", () => {
    const html = renderToStaticMarkup(<LanguageSwitcher locale="en" />);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Language"');
    expect(html).toContain(">EN</button>");
    expect(html).toContain(">TR</button>");
    expect(html).toContain('aria-label="English"');
    expect(html).toContain('aria-label="Türkçe"');
  });

  it("marks the active locale with aria-pressed", () => {
    const en = renderToStaticMarkup(<LanguageSwitcher locale="en" />);
    expect(en).toMatch(/aria-pressed="true"[^>]*aria-label="English"/);
    expect(en).toMatch(/aria-pressed="false"[^>]*aria-label="Türkçe"/);

    const tr = renderToStaticMarkup(<LanguageSwitcher locale="tr" />);
    expect(tr).toMatch(/aria-pressed="true"[^>]*aria-label="Türkçe"/);
    // The group label itself is localized.
    expect(tr).toContain('aria-label="Dil"');
  });
});
