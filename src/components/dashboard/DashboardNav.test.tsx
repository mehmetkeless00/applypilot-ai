import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const navState = vi.hoisted(() => ({ pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navState.pathname,
}));

import { DashboardNav, isNavActive } from "./DashboardNav";

describe("isNavActive", () => {
  it("marks My analyses active on the dashboard and on analysis detail pages", () => {
    expect(isNavActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavActive("/dashboard", "/dashboard/analysis/abc")).toBe(true);
    expect(isNavActive("/dashboard", "/dashboard/resumes")).toBe(false);
  });

  it("matches other destinations by prefix", () => {
    expect(isNavActive("/dashboard/resumes", "/dashboard/resumes")).toBe(true);
    expect(isNavActive("/dashboard/resumes", "/dashboard/resumes/xyz")).toBe(true);
    expect(isNavActive("/dashboard/billing", "/dashboard/resumes")).toBe(false);
  });
});

describe("DashboardNav", () => {
  it("renders every destination and highlights the current one", () => {
    navState.pathname = "/dashboard/resumes";
    const html = renderToStaticMarkup(<DashboardNav locale="en" />);
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/dashboard/jobs"');
    expect(html).toContain('href="/dashboard/resumes"');
    expect(html).toContain('href="/dashboard/billing"');
    expect(html).toContain('href="/dashboard/new"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("My analyses");
    expect(html).toContain("Find jobs");
    expect(html).toContain("New analysis");
  });

  it("exposes an accessible mobile menu button (collapsed by default)", () => {
    navState.pathname = "/dashboard";
    const html = renderToStaticMarkup(<DashboardNav locale="en" />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="dashboard-mobile-menu"');
    expect(html).toContain("Menu");
    // The collapsed panel isn't in the DOM at all.
    expect(html).not.toContain('id="dashboard-mobile-menu"');
  });

  it("renders fully in Turkish", () => {
    navState.pathname = "/dashboard";
    const html = renderToStaticMarkup(<DashboardNav locale="tr" />);
    expect(html).toContain("Analizlerim");
    expect(html).toContain("İş bul");
    expect(html).toContain("CV&#x27;ler");
    expect(html).toContain("Abonelik");
    expect(html).toContain("Yeni analiz");
    expect(html).toContain("Menü");
    expect(html).not.toContain("My analyses");
  });

  it("uses real links and a real button — no click-handler divs", () => {
    navState.pathname = "/dashboard";
    const html = renderToStaticMarkup(
      <DashboardNav locale="en" account={<span>account</span>} />,
    );
    expect(html).toContain("<nav");
    expect(html).toContain("<button");
    expect(html).not.toContain("onclick");
    expect(html).toContain("account");
  });
});
