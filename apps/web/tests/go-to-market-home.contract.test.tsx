import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import LandingStart from "@/app/start/LandingStart";
import {
  buildFreeBallotStartHref,
  GO_TO_MARKET_PACKAGING,
  GO_TO_MARKET_TEMPLATES,
} from "@features/pricing/goToMarketPackaging";

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ locale: "de" }),
}));

describe("GO-TO-MARKET-01 homepage contract", () => {
  it("renders a citizen-first public entry before professional use", () => {
    const html = renderToStaticMarkup(<LandingStart />);

    expect(html).toContain("Was sollte sich ändern?");
    expect(html).toContain("Anliegen einbringen");
    expect(html).toContain("Schnell mitentscheiden");
    expect(html).toContain("Ein Satz reicht zum Start");
    expect(html).toContain("Straße, Stadt, Bundesland, Bund oder EU.");
    expect(html).toContain("Auch für Initiativen, Vereine, Kommunen und Organisationen.");
    expect(html).toContain("Nichts geht automatisch online");
    expect(html).toContain("Voxy bleibt optional");
    expect(html).toContain('href="/create"');
    expect(html).toContain('href="/swipes"');
    expect(html.indexOf("Anliegen einbringen")).toBeLessThan(
      html.indexOf("Auch für Initiativen, Vereine, Kommunen und Organisationen."),
    );
    expect(html).not.toContain("Mitarbeiter-, Kunden- oder Mitgliederperspektiven");
    expect(html).not.toContain("Anlassraum");
    expect(html).not.toContain("Orchestrator");
    expect(html).not.toContain("Review-first");
    expect(html).not.toContain("Analysefortschritt");
  });

  it("keeps the free guideline and broadly usable templates in one truthful configuration", () => {
    expect(GO_TO_MARKET_PACKAGING).toMatchObject({
      freeParticipantGuideline: 30,
      freeUseIsAvailable: true,
      guidelineIsHardLimit: false,
      checkoutIsAvailable: false,
      publishedPricesAreAvailable: false,
    });
    expect(GO_TO_MARKET_TEMPLATES).toHaveLength(5);
    expect(GO_TO_MARKET_TEMPLATES[0]?.title.de).toBe("Prioritäten gemeinsam klären");
    expect(buildFreeBallotStartHref("member-priorities")).toBe(
      "/runden/new?gtm=1&source=homepage&template=member-priorities",
    );
  });

  it("keeps professional ballot setup secondary while public CTAs use create and swipes", () => {
    const landingSource = readFileSync(
      resolve(process.cwd(), "src/features/home/HomeGoToMarketLanding.tsx"),
      "utf8",
    );
    const swipesSource = readFileSync(
      resolve(process.cwd(), "src/app/swipes/SwipesClient.tsx"),
      "utf8",
    );
    const formSource = readFileSync(
      resolve(process.cwd(), "src/app/runden/new/AnlassraumSetupForm.tsx"),
      "utf8",
    );
    const prePublishSource = readFileSync(
      resolve(process.cwd(), "src/app/runden/new/AnlassraumPrePublishCheck.tsx"),
      "utf8",
    );

    expect(landingSource).toContain('href="/create"');
    expect(landingSource).toContain('href="/swipes"');
    expect(landingSource).toContain("buildFreeBallotStartHref");
    expect(landingSource).toContain('"homepage-professional"');
    expect(swipesSource).toContain('buildFreeBallotStartHref(undefined, "swipes-outcome")');
    expect(formSource).toContain("getGoToMarketTemplate");
    expect(prePublishSource).toContain("Kostenlos als Entwurf speichern");
    expect(formSource).toContain("Es wurde nichts veröffentlicht");
  });
});
