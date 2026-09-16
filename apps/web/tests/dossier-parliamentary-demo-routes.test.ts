import { describe, expect, it } from "vitest";
import {
  buildParliamentaryTestDossier,
  isParliamentaryDemoTopic,
} from "@/app/demo/dossier/parliamentaryTestDossiers";
import { getParliamentaryContextTopics } from "@/components/dossier/parliamentaryContext";

describe("parliamentary demo dossier fixtures", () => {
  it("builds the chat control test dossier with the matching parliamentary context", () => {
    const dossier = buildParliamentaryTestDossier("chatkontrolle");
    const topics = getParliamentaryContextTopics(dossier.sourceSet);

    expect(dossier.meta.title).toContain("Chatkontrolle");
    expect(dossier.meta.jurisdiction).toBe("eu");
    expect(topics.map((topic) => topic.id)).toEqual(["eu-csa-chatkontrolle"]);
  });

  it("builds the IFG test dossier with the matching parliamentary context", () => {
    const dossier = buildParliamentaryTestDossier("informationsfreiheit");
    const topics = getParliamentaryContextTopics(dossier.sourceSet);

    expect(dossier.meta.title).toContain("Informationsfreiheitsgesetz");
    expect(dossier.meta.jurisdiction).toBe("federal");
    expect(topics.map((topic) => topic.id)).toEqual(["de-ifg-reform"]);
  });

  it("rejects unknown public test slugs", () => {
    expect(isParliamentaryDemoTopic("chatkontrolle")).toBe(true);
    expect(isParliamentaryDemoTopic("informationsfreiheit")).toBe(true);
    expect(isParliamentaryDemoTopic("verkehr")).toBe(false);
  });
});
