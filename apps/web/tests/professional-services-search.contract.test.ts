import { describe, expect, it } from "vitest";
import { PUBLIC_DISCOVERY_PATHS } from "@/lib/seo/publicDiscovery";
import {
  PROFESSIONAL_SERVICES,
  PROFESSIONAL_SERVICE_PACKAGING,
} from "@features/pricing/professionalServices";

describe("PROFESSIONAL-SERVICES-MONETIZATION-01 contract", () => {
  it("publishes the agreed pilot prices without pretending self-service checkout", () => {
    expect(PROFESSIONAL_SERVICE_PACKAGING).toMatchObject({
      currency: "EUR",
      checkoutIsAvailable: false,
      fulfillmentMode: "manual_reviewed_service",
      publishedPilotPricesAreAvailable: true,
      evidenceStandardDependsOnPrice: false,
      factsOrTruthAreNeverPaywalledByQualityTier: true,
    });

    const byId = Object.fromEntries(PROFESSIONAL_SERVICES.map((service) => [service.id, service]));
    expect(byId["decision-dossier"]?.price).toEqual({ amountEur: 790, billing: "one_time", from: false });
    expect(byId["decision-dossier-pilot"]?.price).toEqual({ amountEur: 1990, billing: "one_time", from: false });
    expect(byId["topic-intelligence"]?.price).toEqual({ amountEur: 1490, billing: "monthly", from: true });
    expect(byId["topic-intelligence-pro"]?.price).toEqual({ amountEur: 2990, billing: "monthly", from: true });
    expect(byId["white-label"]?.price).toEqual({ amountEur: 4900, billing: "monthly", from: true });
  });

  it("keeps professional search pages in the canonical public discovery sitemap", () => {
    expect(PUBLIC_DISCOVERY_PATHS).toEqual(
      expect.arrayContaining([
        "/leistungen",
        "/leistungen/decision-dossier",
        "/leistungen/topic-intelligence",
        "/leistungen/organisationen",
      ]),
    );
  });

  it("routes every paid service to a human inquiry path", () => {
    for (const service of PROFESSIONAL_SERVICES) {
      expect(service.inquiryHref).toContain("/kontakt");
      expect(service.inquiryHref).toContain("offer=");
    }
  });
});
