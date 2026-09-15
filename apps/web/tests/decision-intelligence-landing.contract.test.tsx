import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import DecisionIntelligenceLanding from "@/app/pricing/institutionen/decision-intelligence/DecisionIntelligenceLanding";
import { GO_TO_MARKET_PACKAGING } from "@features/pricing/goToMarketPackaging";

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ locale: "de" }),
}));

describe("Founding 100 decision intelligence contract", () => {
  it("shows the approved packages, founder-stage transparency and inquiry-only conversion", () => {
    const html = renderToStaticMarkup(<DecisionIntelligenceLanding />);

    expect(html).toContain("Policy Intelligence &amp; Entscheidungsanalyse");
    expect(html).toContain("Founding 100");
    expect(html).toContain("50 % Founding-Vorteil");
    expect(html).toContain("Decision Dossier");
    expect(html).toContain("3-Dossier Pilot");
    expect(html).toContain("Topic Intelligence");
    expect(html).toContain("Pro Intelligence");
    expect(html).toContain("Beauftragt wird eine konkrete Leistung – keine Spende.");
    expect(html).toContain("Fakten bleiben Fakten.");
    expect(html).toContain('href="/kontakt?anfrage=decision-intelligence&amp;programm=founding-100"');
    expect(html).not.toContain("Jetzt kaufen");
    expect(html).not.toContain("stripe.com");
  });

  it("keeps the campaign bounded and leaves checkout disabled", () => {
    const campaign = GO_TO_MARKET_PACKAGING.foundingDecisionIntelligence;

    expect(campaign.acceptedEngagementLimit).toBe(100);
    expect(campaign.discountPercent).toBe(50);
    expect(campaign.firstEngagementOnly).toBe(true);
    expect(campaign.recurringDiscountScope).toBe("first_month_only");
    expect(campaign.inquiryOnly).toBe(true);
    expect(campaign.checkoutIsAvailable).toBe(false);
    expect(GO_TO_MARKET_PACKAGING.checkoutIsAvailable).toBe(false);
    expect(GO_TO_MARKET_PACKAGING.publishedPricesAreAvailable).toBe(false);
  });

  it("publishes matching service and FAQ structured-data contracts", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/pricing/institutionen/decision-intelligence/page.tsx"),
      "utf8",
    );

    expect(source).toContain('"@type": "Service"');
    expect(source).toContain('"@type": "OfferCatalog"');
    expect(source).toContain('"@type": "FAQPage"');
    expect(source).toContain("foundingPriceEur");
    expect(source).toContain("buildPublicPageMetadata");
  });
});
