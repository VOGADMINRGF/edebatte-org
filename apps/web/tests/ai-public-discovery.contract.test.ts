import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildIndexableReleaseUrls } from "@/lib/seo/publicSitemap";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("AI and public discovery contract", () => {
  it("keeps the ecosystem on independent eDebatte and VOG-owned governance", () => {
    const ecosystem = read("src/config/ecosystem.ts");
    const llms = read("public/llms.txt");

    expect(ecosystem).toContain("Politische und gesellschaftliche Bewegung mit eigener Governance");
    expect(ecosystem).toContain("Ein eDebatte-Ergebnis wird jedoch nicht automatisch zu einer VoiceOpenGov-Position");
    expect(ecosystem).not.toContain("gültige eDebatte-Mehrheitsmandate");
    expect(ecosystem).not.toContain("verpflichtet seine politische Repräsentation");

    expect(llms).toContain("An eDebatte result does not automatically become a VoiceOpenGov position.");
    expect(llms).toContain("VoiceOpenGov decides its own program state under its own published governance rules.");
    expect(llms).toContain("Machine summaries should preserve the visible publication status");
  });

  it("uses canonical cross-domain ecosystem hosts", () => {
    const links = read("src/config/links.ts");
    expect(links).toContain('VOG_HOME_URL = "https://www.voiceopengov.org"');
    expect(links).toContain('VOTE4GOV_URL = "https://www.vote4gov.eu"');
    expect(links).not.toContain('"https://voiceopengov.org/');
  });

  it("explicitly allows OAI-SearchBot but excludes private and API surfaces", () => {
    const robots = read("src/app/robots.ts");
    expect(robots).toContain('userAgent: "OAI-SearchBot"');
    for (const path of ["/api/", "/admin/", "/konto/", "/login/"]) {
      expect(robots).toContain(`"${path}"`);
    }
  });

  it("does not invent sitemap freshness or priority", () => {
    const discovery = read("src/lib/seo/publicDiscovery.ts");
    expect(discovery).not.toContain("changeFrequency");
    expect(discovery).not.toContain("priority:");
  });

  it("indexes only canonical visible topic/dossier release records", () => {
    const base = "https://www.edebatte.org";
    const urls = buildIndexableReleaseUrls(
      [
        { targetType: "topic_page", publicHref: "/topic/offen", visibilityState: "public_unverified" },
        { targetType: "topic_page", publicHref: "/topic/geprueft", visibilityState: "public_reviewed" },
        { targetType: "dossier", publicHref: "/dossier/amtlich", visibilityState: "public_official" },
        { targetType: "dossier", publicHref: "/dossier/intern", visibilityState: "internal_review" },
        { targetType: "topic_page", publicHref: "/topic/blockiert", visibilityState: "blocked" },
        { targetType: "topic_page", publicHref: "/topic/archiv", visibilityState: "archived" },
        { targetType: "anlassraum", publicHref: "/anlassraum?anlassraumId=abc", visibilityState: "public_reviewed" },
        { targetType: "dossier", publicHref: "https://example.org/dossier/fremd", visibilityState: "public_reviewed" },
        { targetType: "dossier", publicHref: "/dossier/query?preview=1", visibilityState: "public_reviewed" },
      ],
      base,
    );

    expect(urls).toEqual([
      "https://www.edebatte.org/dossier/amtlich",
      "https://www.edebatte.org/topic/geprueft",
      "https://www.edebatte.org/topic/offen",
    ]);
  });
});
