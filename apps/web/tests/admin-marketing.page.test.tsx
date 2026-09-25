import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MarketingAdminPage from "@/app/admin/marketing/page";
import { flattenNavItems } from "@/app/admin/adminNav";
import { getMarketingRegistry } from "@/features/marketing/registry/data";

describe("admin marketing operator workspace", () => {
  it("prioritises real work, compact campaigns and the contextual assistant", async () => {
    const html = renderToStaticMarkup(
      await MarketingAdminPage({ searchParams: Promise.resolve({ lang: "de" }) }),
    );

    expect(html).toContain("Marketing-Cockpit");
    expect(html).toContain("Heute wichtig");
    expect(html).toContain(`${getMarketingRegistry().campaigns.length} Kampagnen`);
    expect(html).toContain("2 konkrete Beiträge &amp; Videos");
    expect(html).toContain("Inhalte prüfen");
    expect(html).toContain("B2C");
    expect(html).toContain("B2B");
    expect(html).toContain("B2G");
    expect(html).toContain("Marketing-Assistent");
    expect(html).toContain("Heute sinnvoll");
    expect(html).toContain("Bestandsdaten verifiziert");
    expect(html).toContain("Empfehlungssicherheit");
    expect(html).toContain("Niedrig");
    expect(html).toContain("Kampagnen");
    expect(html).toContain("Weitere Angaben");
    expect(html).toContain("Beiträge &amp; Ausspielungen");
    expect(html).toContain("Messdaten &amp; Datenquellen");
    expect(html).toContain("0 von 6 Datenquellen verbunden");
    expect(html).toContain("Debattenstand der Woche");
    expect(html).toContain("Voxy erklärt");
    expect(html).toContain("/admin/marketing/review?lang=de");
    expect(html).not.toContain("/admin/editorial/queue");
    expect(html).not.toContain("25 %");
    expect(html).not.toContain("Weitere Marketingmaterialien");
    expect(html).not.toContain("docs/marketing/");
  });

  it("filters the campaign list by B2G without mixing unrelated B2C content", async () => {
    const html = renderToStaticMarkup(
      await MarketingAdminPage({ searchParams: Promise.resolve({ lang: "de", segment: "b2g" }) }),
    );

    expect(html).toContain("Beteiligung nachvollziehbar organisieren");
    expect(html).toContain("Kommunen");
    expect(html).not.toContain("Voxy erklärt · Was ist ein Debattenstand?");
  });

  it("uses selected campaign context and a real marketing review link", async () => {
    const html = renderToStaticMarkup(
      await MarketingAdminPage({
        searchParams: Promise.resolve({ lang: "de", campaign: "CAM-CONTENT-02" }),
      }),
    );

    expect(html).toContain("Kampagnendetails");
    expect(html).toContain("Den Debattenstand als wiederkehrendes");
    expect(html).toContain("Begonnene Produktaktionen");
    expect(html).toContain("Instagram, LinkedIn, Facebook, Newsletter, Meta Ads");
    expect(html).toContain("1 Inhalte dieser Kampagne warten auf Prüfung");
    expect(html).toContain("/admin/marketing/review?");
    expect(html).toContain("campaign=CAM-CONTENT-02");
    expect(html).not.toContain("/admin/editorial/queue");
    expect(html).toContain("/admin/marketing/insights?lang=de&amp;campaign=CAM-CONTENT-02");
  });

  it("shows only the two review-ready contents when the review filter is active", async () => {
    const html = renderToStaticMarkup(
      await MarketingAdminPage({
        searchParams: Promise.resolve({ lang: "de", contentStatus: "review_ready" }),
      }),
    );

    expect(html).toContain("Es werden nur Inhalte angezeigt, die auf Prüfung warten.");
    expect(html).toContain("Debattenstand der Woche · Carousel");
    expect(html).toContain("Voxy erklärt · Was ist ein Debattenstand?");
    expect((html.match(/Inhalte prüfen/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("keeps missing measurements honest instead of rendering zero performance", async () => {
    const html = renderToStaticMarkup(
      await MarketingAdminPage({ searchParams: Promise.resolve({ lang: "de" }) }),
    );

    expect(html).toContain("Noch keine verifizierten Leistungsdaten");
    expect(html).toContain("Noch keine Performance-Datenquelle ist verbunden.");
    expect(html).toContain("Keine selbstständige Änderung, Terminierung oder Veröffentlichung.");
    expect(html).not.toContain("0 Likes");
    expect(html).not.toContain("0 Shares");
    expect(html).not.toContain("ROI");
  });

  it("renders the English operator and assistant view", async () => {
    const html = renderToStaticMarkup(
      await MarketingAdminPage({ searchParams: Promise.resolve({ lang: "en" }) }),
    );

    expect(html).toContain("Marketing cockpit");
    expect(html).toContain("Important today");
    expect(html).toContain("Content &amp; distribution");
    expect(html).toContain("Measurement data &amp; sources");
    expect(html).toContain("Marketing assistant");
    expect(html).toContain("Recommendations only");
    expect(html).toContain("Inventory verified");
    expect(html).toContain("Recommendation confidence");
    expect(html).toContain("Low");
    expect(html).toContain("0 of 6 data sources connected");
  });

  it("remains discoverable in the existing admin navigation", () => {
    const marketingItem = flattenNavItems().find((item) => item.href === "/admin/marketing");

    expect(marketingItem).toMatchObject({
      label: "Marketing-Zentrale",
      description: "Kampagnen steuern, Ergebnisse prüfen, Arbeit delegieren",
    });
  });
});
