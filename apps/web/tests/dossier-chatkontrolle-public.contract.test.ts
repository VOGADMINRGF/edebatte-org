import { describe, expect, it } from "vitest";
import { DossierSchema } from "@features/dossier";
import chatkontrolleDossier from "@features/dossier/data/chatkontrolleDossier";
import { getParliamentaryContextTopics } from "@/components/dossier/parliamentaryContext";

describe("public chat control dossier", () => {
  it("is a valid published dossier at the canonical slug", () => {
    const parsed = DossierSchema.parse(chatkontrolleDossier);
    expect(parsed.meta.id).toBe("chatkontrolle");
    expect(parsed.meta.status).toBe("published");
    expect(parsed.meta.title).toContain("Chatkontrolle");
  });

  it("keeps official procedure, historical vote data and political statements distinct", () => {
    const sources = chatkontrolleDossier.sourceSet;
    expect(sources.some((source) => source.host === "consilium.europa.eu")).toBe(true);
    expect(sources.some((source) => source.host === "europarl.europa.eu")).toBe(true);
    expect(
      sources.some(
        (source) =>
          source.host === "abgeordnetenwatch.de" &&
          source.canonicalUrl.includes("/api/v2/polls/6454"),
      ),
    ).toBe(true);

    const parliamentaryContext = getParliamentaryContextTopics(sources);
    expect(parliamentaryContext.map((topic) => topic.id)).toContain("eu-csa-chatkontrolle");
  });

  it("does not present the March 2026 vote as the current September procedure state", () => {
    const report = chatkontrolleDossier.analyze.report;
    expect(report.takeaways.join(" ")).toContain("März-Abstimmung");
    expect(report.takeaways.join(" ")).toContain("nicht gleichbedeutend");
    expect(
      chatkontrolleDossier.analyze.claims.some(
        (claim) => claim.id === "claim-procedure" && claim.text.includes("14. September 2026"),
      ),
    ).toBe(true);
  });

  it("is evidence-first and does not enable a public vote before the decision contract is complete", () => {
    expect(chatkontrolleDossier.voteConfig?.enabled).toBe(false);
    expect(chatkontrolleDossier.analyze.evidenceGraph?.summary.linkedClaimCount).toBeGreaterThanOrEqual(4);
    expect(chatkontrolleDossier.analyze.questions.length).toBeGreaterThan(0);
    expect(chatkontrolleDossier.analyze.missingPerspectives.length).toBeGreaterThan(0);
  });
});
