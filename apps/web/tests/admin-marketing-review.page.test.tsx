import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MarketingReviewPage from "@/app/admin/marketing/review/page";

describe("admin marketing review", () => {
  it("shows exactly the two real review-ready marketing contents", async () => {
    const html = renderToStaticMarkup(
      await MarketingReviewPage({ searchParams: Promise.resolve({ lang: "de" }) }),
    );

    expect(html).toContain("Marketing-Inhalte prüfen");
    expect(html).toContain("Inhalte zur Prüfung: 2");
    expect(html).toContain("Debattenstand der Woche · Carousel");
    expect(html).toContain("Voxy erklärt · Was ist ein Debattenstand?");
    expect(html).toContain("Caption-Entwurf");
    expect(html).toContain("Script-Entwurf");
    expect(html).toContain("Für Social-Distribution freigeben");
    expect(html).toContain("Veröffentlichung und externe Ausspielung bleiben separat freigabepflichtig.");
    expect(html).not.toContain("/admin/editorial/queue");
  });

  it("can focus one campaign without mixing the other review item", async () => {
    const html = renderToStaticMarkup(
      await MarketingReviewPage({
        searchParams: Promise.resolve({ lang: "de", campaign: "CAM-CONTENT-02" }),
      }),
    );

    expect(html).toContain("Inhalte zur Prüfung: 1");
    expect(html).toContain("Debattenstand der Woche · Carousel");
    expect(html).not.toContain("Voxy erklärt · Was ist ein Debattenstand?");
    expect(html).toContain("content-MCO-CONTENT-02-DE-01");
  });

  it("renders the English operator view", async () => {
    const html = renderToStaticMarkup(
      await MarketingReviewPage({ searchParams: Promise.resolve({ lang: "en" }) }),
    );

    expect(html).toContain("Review marketing content");
    expect(html).toContain("Content items to review: 2");
    expect(html).toContain("Ready for review");
    expect(html).toContain("Approve for social distribution");
    expect(html).toContain("Open campaign context");
  });
});
