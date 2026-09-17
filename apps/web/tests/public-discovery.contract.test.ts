import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { metadata as loginMetadata } from "@/app/login/page";
import { metadata as registerMetadata } from "@/app/register/page";
import { metadata as resetMetadata } from "@/app/reset/page";
import { metadata as verifyMetadata } from "@/app/verify/page";
import { metadata as settingsMetadata } from "@/app/settings/layout";
import {
  buildHomeStructuredData,
  buildPublicDiscoverySitemap,
  NOINDEX_ROBOTS,
  PUBLIC_DISCOVERY_PATHS,
} from "@/lib/seo/publicDiscovery";

describe("public discovery contract", () => {
  it("keeps auth and settings surfaces out of indexing", () => {
    expect(loginMetadata.robots).toMatchObject(NOINDEX_ROBOTS);
    expect(registerMetadata.robots).toMatchObject(NOINDEX_ROBOTS);
    expect(resetMetadata.robots).toMatchObject(NOINDEX_ROBOTS);
    expect(verifyMetadata.robots).toMatchObject(NOINDEX_ROBOTS);
    expect(settingsMetadata.robots).toMatchObject(NOINDEX_ROBOTS);
  });

  it("keeps the homepage structured data explicit, international and rooted at the canonical host", () => {
    const data = buildHomeStructuredData();
    const startSource = readFileSync(resolve(process.cwd(), "src/app/start/page.tsx"), "utf8");

    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "eDebatte",
      url: "https://www.edebatte.org",
      inLanguage: "de-DE",
    });
    expect(data.description).toContain("gemeinsamen Agenda");
    expect(data.description).toContain("lokal bis global");
    expect(data.about).toContain("Agenda-Setting");
    expect(data.about).toContain("civic collective intelligence");
    expect(data.about).toContain("public reasoning");
    expect(startSource).toContain('type="application/ld+json"');
    expect(startSource).toContain("buildHomeStructuredData");
  });

  it("keeps the global positioning and comparison cluster in public discovery", () => {
    const expectedPaths = [
      "/warum-edebatte",
      "/vergleich",
      "/vergleich/consul",
      "/vergleich/decidim",
      "/vergleich/aula",
      "/vergleich/adhocracy-plus",
      "/vergleich/meinberlin",
      "/vergleich/govocal",
      "/vergleich/make-org",
      "/vergleich/polis",
      "/vergleich/your-priorities",
      "/vergleich/crowdinsights",
      "/vergleich/werdenktwas",
      "/en/why-edebatte",
      "/en/civic-tech-landscape",
    ];

    for (const path of expectedPaths) expect(PUBLIC_DISCOVERY_PATHS).toContain(path);

    const sitemap = buildPublicDiscoverySitemap();
    expect(sitemap).toContainEqual(expect.objectContaining({ url: "https://www.edebatte.org/warum-edebatte", priority: 0.95 }));
    expect(sitemap).toContainEqual(expect.objectContaining({ url: "https://www.edebatte.org/vergleich", priority: 0.9 }));
    expect(sitemap).toContainEqual(expect.objectContaining({ url: "https://www.edebatte.org/vergleich/polis", priority: 0.8 }));
    expect(sitemap).toContainEqual(expect.objectContaining({ url: "https://www.edebatte.org/vergleich/aula", priority: 0.8 }));
    expect(sitemap).toContainEqual(expect.objectContaining({ url: "https://www.edebatte.org/vergleich/adhocracy-plus", priority: 0.8 }));
    expect(sitemap).toContainEqual(expect.objectContaining({ url: "https://www.edebatte.org/vergleich/meinberlin", priority: 0.8 }));
    expect(sitemap).toContainEqual(expect.objectContaining({ url: "https://www.edebatte.org/en/why-edebatte", priority: 0.95 }));
  });

  it("pairs the German and English strategic pillars with hreflang sitemap alternates", () => {
    const sitemap = buildPublicDiscoverySitemap();
    const why = sitemap.find((entry) => entry.url.endsWith("/warum-edebatte"));
    const whyEn = sitemap.find((entry) => entry.url.endsWith("/en/why-edebatte"));
    const landscape = sitemap.find((entry) => entry.url.endsWith("/vergleich"));
    const landscapeEn = sitemap.find((entry) => entry.url.endsWith("/en/civic-tech-landscape"));

    expect(why?.alternates?.languages).toMatchObject({
      de: "https://www.edebatte.org/warum-edebatte",
      en: "https://www.edebatte.org/en/why-edebatte",
      "x-default": "https://www.edebatte.org/warum-edebatte",
    });
    expect(whyEn?.alternates?.languages).toEqual(why?.alternates?.languages);
    expect(landscapeEn?.alternates?.languages).toEqual(landscape?.alternates?.languages);
  });

  it("keeps comparison copy honest about strong citizen-led alternatives", () => {
    const whySource = readFileSync(resolve(process.cwd(), "src/app/warum-edebatte/page.tsx"), "utf8");
    const whyEnSource = readFileSync(resolve(process.cwd(), "src/app/en/why-edebatte/page.tsx"), "utf8");
    const landscapeEnSource = readFileSync(resolve(process.cwd(), "src/app/en/civic-tech-landscape/page.tsx"), "utf8");
    const consulSource = readFileSync(resolve(process.cwd(), "src/app/vergleich/consul/page.tsx"), "utf8");
    const decidimSource = readFileSync(resolve(process.cwd(), "src/app/vergleich/decidim/page.tsx"), "utf8");
    const aulaSource = readFileSync(resolve(process.cwd(), "src/app/vergleich/aula/page.tsx"), "utf8");
    const adhocracySource = readFileSync(resolve(process.cwd(), "src/app/vergleich/adhocracy-plus/page.tsx"), "utf8");
    const meinBerlinSource = readFileSync(resolve(process.cwd(), "src/app/vergleich/meinberlin/page.tsx"), "utf8");
    const prioritiesSource = readFileSync(resolve(process.cwd(), "src/app/vergleich/your-priorities/page.tsx"), "utf8");
    const landscapeSource = readFileSync(resolve(process.cwd(), "src/app/vergleich/page.tsx"), "utf8");

    expect(whySource).toContain("democratic problem-solving");
    expect(whySource).toContain("lokal bis global");
    expect(whyEnSource).toContain("Participation starts before the process");
    expect(landscapeEnSource).toContain("The moat cannot be a feature checklist");
    expect(consulSource).toContain("CONSUL besitzt bereits echte Bottom-up-Mechanismen");
    expect(decidimSource).toContain("Bürgerinitiativen und Agenda-Setting");
    expect(aulaSource).toContain("aula besitzt echte Bottom-up-Ideenbeteiligung");
    expect(adhocracySource).toContain("adhocracy+ erlaubt echte Ideenbeteiligung");
    expect(meinBerlinSource).toContain("meinBerlin macht Beteiligung an Verwaltungsprojekten sichtbar");
    expect(prioritiesSource).toContain("kommt dem eDebatte-Zielbild sehr nahe");
    expect(landscapeSource).toContain("Nicht ein Markt. Mehrere demokratische Technologieklassen.");
    expect(consulSource).not.toContain("nur bei eDebatte");
    expect(aulaSource).not.toContain("nur bei eDebatte");
    expect(adhocracySource).not.toContain("nur bei eDebatte");
    expect(meinBerlinSource).not.toContain("nur bei eDebatte");
  });
});
