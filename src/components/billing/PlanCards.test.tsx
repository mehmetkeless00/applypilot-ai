import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ComingSoonAction, PlanCard } from "./PlanCards";
import { BillingActionButton } from "./BillingActions";
import { UpgradeCard } from "./UpgradeCard";
import { PRO_UNAVAILABLE_MESSAGE } from "@/lib/billing/plans";

describe("ComingSoonAction (billing not configured)", () => {
  const html = renderToStaticMarkup(<ComingSoonAction />);

  it("shows a non-clickable Pro — Coming soon state with the neutral message", () => {
    expect(html).toContain("Pro — Coming soon");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain(PRO_UNAVAILABLE_MESSAGE);
  });

  it("offers no checkout and leaks no configuration detail", () => {
    expect(html).not.toContain("<button");
    expect(html).not.toContain("/api/billing");
    expect(html).not.toContain("STRIPE");
    expect(html).not.toContain("configured");
  });
});

describe("locale rendering", () => {
  it("shows Pro as Yakında (coming soon) in Turkish", () => {
    const html = renderToStaticMarkup(
      <PlanCard
        plan="pro"
        comingSoon
        locale="tr"
        action={<ComingSoonAction locale="tr" />}
      />,
    );
    expect(html).toContain("Yakında");
    expect(html).toContain("Pro — Yakında");
    expect(html).toContain("Pro abonelikler henüz kullanıma açık değil");
    expect(html).not.toContain("Coming soon");
  });

  it("localizes plan names and features in Turkish", () => {
    const html = renderToStaticMarkup(<PlanCard plan="free" locale="tr" />);
    expect(html).toContain("Ücretsiz");
    expect(html).toContain("Ayda 3 analiz");
    expect(html).toContain("/ay");
  });
});

describe("PlanCard", () => {
  it("marks the Pro plan as Coming soon when billing is unavailable", () => {
    const html = renderToStaticMarkup(
      <PlanCard plan="pro" comingSoon action={<ComingSoonAction />} />,
    );
    expect(html).toContain("Coming soon");
    expect(html).not.toContain("Most popular");
    expect(html).not.toContain("/api/billing");
  });

  it("shows the real Upgrade button when billing is configured", () => {
    const html = renderToStaticMarkup(
      <PlanCard
        plan="pro"
        action={
          <BillingActionButton endpoint="/api/billing/checkout">
            Upgrade to Pro — $12/mo
          </BillingActionButton>
        }
      />,
    );
    expect(html).toContain("Most popular");
    expect(html).toContain("<button");
    expect(html).toContain("Upgrade to Pro");
    expect(html).not.toContain("Coming soon");
  });
});

describe("UpgradeCard (quota reached)", () => {
  it("shows the real upgrade CTA when billing is configured", () => {
    const html = renderToStaticMarkup(
      <UpgradeCard message="Monthly limit reached." />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Monthly limit reached.");
    expect(html).toContain("<button");
    expect(html).toContain("Upgrade to Pro");
  });

  it("degrades to the neutral coming-soon message when billing is unavailable", () => {
    const html = renderToStaticMarkup(
      <UpgradeCard message="Monthly limit reached." billingAvailable={false} />,
    );
    expect(html).toContain("Monthly limit reached.");
    expect(html).toContain(PRO_UNAVAILABLE_MESSAGE);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Upgrade to Pro");
    expect(html).not.toContain("STRIPE");
  });
});
