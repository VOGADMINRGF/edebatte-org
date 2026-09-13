import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import LandingStart from "@/app/start/LandingStart";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/start",
}));

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ locale: "de" }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img alt="" {...props} />,
}));

describe("landing clarity contract", () => {
  it("explains the citizen-first participation journey and its guardrails", () => {
    const html = renderToStaticMarkup(<LandingStart />);
    const headings = [...html.matchAll(/<h1([^>]*)>/g)];

    expect(headings).toHaveLength(1);
    expect(headings[0]?.[1] ?? "").not.toContain("sr-only");

    expect(html).toContain("Was sollte sich ändern?");
    expect(html).toContain("Beteiligung beginnt vor dem Verfahren.");
    expect(html).toContain("Nicht erst mitreden, wenn die Frage schon feststeht.");
    expect(html).toContain("beim ungeklärten Anliegen");
    expect(html).toContain("Citizen-first heißt nicht verwaltungsfern");
    expect(html).toContain('href="/warum-edebatte"');
    expect(html).toContain("Anliegen einbringen");
    expect(html).toContain("Schnell mitentscheiden");
    expect(html).toContain("Ein Satz reicht zum Start");
    expect(html).toContain("So einfach beginnt es.");
    expect(html).toContain("Straße, Stadt, Bundesland, Bund oder EU.");
    expect(html).toContain("Entscheidend ist der Kontext des Anliegens – nicht einfach dein Wohnort.");
    expect(html).toContain("Nichts geht automatisch online");
    expect(html).toContain("Voxy bleibt optional");
    expect(html).toContain("Auch für Initiativen, Vereine, Kommunen und Organisationen.");
    expect(html).toContain("bis 30 Teilnehmende");
    expect(html).toContain('href="/create"');
    expect(html).toContain('href="/swipes"');
    expect(html).toContain('href="/runden/new?gtm=1&amp;source=homepage-professional"');

    expect(html).not.toContain("500K");
    expect(html).not.toContain("250 Partner");
    expect(html).not.toContain("35 Länder");
    expect(html).not.toContain("Live Poll");
    expect(html).not.toContain("/demo/");
    expect(html).not.toContain("Anlassraum");
    expect(html).not.toContain("Review-first");
    expect(html).not.toContain("Analysefortschritt");
    expect(html).not.toContain("Die Bürger in");
  });

  it("keeps the conversion landing free of debug and demo language", () => {
    const sources = [
      "src/app/start/LandingStart.tsx",
      "src/features/home/HomeGoToMarketLanding.tsx",
    ].map((path) => readFileSync(resolve(process.cwd(), path), "utf8"));

    for (const source of sources) {
      expect(source).not.toContain("Developer-Hinweis");
      expect(source).not.toContain("Runtime-basiert");
      expect(source).not.toContain("/demo/");
    }
  });

  it("keeps the productive start route free of demo, seed and localStorage landing fallbacks", () => {
    const startPageSource = readFileSync(resolve(process.cwd(), "src/app/start/page.tsx"), "utf8");
    const landingSource = readFileSync(resolve(process.cwd(), "src/app/start/LandingStart.tsx"), "utf8");
    const splitLandingSource = readFileSync(
      resolve(process.cwd(), "src/features/home/HomeGoToMarketLanding.tsx"),
      "utf8",
    );

    expect(startPageSource).not.toContain("selectExamples");
    expect(startPageSource).not.toContain("seedKey");
    expect(startPageSource).not.toContain("/demo/");
    expect(landingSource).not.toContain("localStorage");
    expect(landingSource).not.toContain("/demo/");
    expect(splitLandingSource).not.toContain("/demo/");
    expect(splitLandingSource).not.toContain("/brand/voxy/");
  });
});
