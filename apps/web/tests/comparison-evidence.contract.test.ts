import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const COMPARISON_ROUTES = [
  "consul",
  "decidim",
  "aula",
  "adhocracy-plus",
  "meinberlin",
  "govocal",
  "make-org",
  "polis",
  "your-priorities",
  "crowdinsights",
  "werdenktwas",
] as const;

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("public civic-tech comparison evidence contract", () => {
  it("shows methodology, research date, product-truth boundary and correction path on the shared surface", () => {
    const source = read("src/features/comparison/ComparisonPage.tsx");

    expect(source).toContain('const REVIEWED_AT = "4. September 2026"');
    expect(source).toContain("Quellen & Methodik");
    expect(source).toContain("öffentlich zugängliche, offizielle Produkt-, Projekt- oder Betreiberinformationen");
    expect(source).toContain("nicht als eigenständiger zentraler Produktkern beschrieben");
    expect(source).toContain("eDebatte-Spalte ist ausdrücklich als");
    expect(source).toContain("keine geschäftliche Verbindung oder Empfehlung");
    expect(source).toContain("support@edebatte.org");
  });

  it("links only to official primary domains for the named comparison systems", () => {
    const source = read("src/features/comparison/ComparisonPage.tsx");
    for (const expected of [
      "https://consuldemocracy.org/features/",
      "https://decidim.org/modules/",
      "https://www.aula.de/was-ist-aula/beteiligung-mit-aula/",
      "https://adhocracy.plus/info/features/",
      "https://mein.berlin.de/",
      "https://www.govocal.com/",
      "https://about.make.org/en/start-a-project",
      "https://compdemocracy.org/pol.is/",
      "https://citizens.is/your-priorities/",
      "https://www.citizens.is/policy-synth/",
      "https://crowdinsights.de/produkt/beteiligungswebsite",
      "https://werdenktwas.de/beteiligungsplattform-dialog-digital/",
    ]) {
      expect(source).toContain(expected);
    }
  });

  it("keeps every public competitor page on the same fair comparison template", () => {
    for (const route of COMPARISON_ROUTES) {
      const page = read(`src/app/vergleich/${route}/page.tsx`);
      expect(page).toContain("<ComparisonPage");
      expect(page).toContain("fairNote=");
      expect(page).toContain("rows={rows}");
    }
  });
});
