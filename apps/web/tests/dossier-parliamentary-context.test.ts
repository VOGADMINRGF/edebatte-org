import { describe, expect, it } from "vitest";
import type { Dossier } from "@features/dossier";
import {
  getParliamentaryContextTopics,
  PARLIAMENTARY_CONTEXT_PILOT_TOPICS,
} from "@/components/dossier/parliamentaryContext";

function sources(...entries: Array<{ title: string; canonicalUrl: string; publisher?: string }>) {
  return entries.map((entry) => ({
    canonicalUrl: entry.canonicalUrl,
    host: new URL(entry.canonicalUrl).host,
    publisher: entry.publisher ?? "Test",
    sourceClass: "gov",
    sourceType: "gov",
    fetchedAt: "2026-09-16T12:00:00.000Z",
    title: entry.title,
  })) as Dossier["sourceSet"];
}

describe("parliamentary context dossier matching", () => {
  it("matches the EU CSA/chat control pilot only for related dossier sources", () => {
    const matched = getParliamentaryContextTopics(
      sources({
        title: "EU-Chatkontrolle: CSA Regulation state of play",
        canonicalUrl: "https://www.consilium.europa.eu/example-csa",
      }),
    );

    expect(matched.map((topic) => topic.id)).toEqual(["eu-csa-chatkontrolle"]);
    expect(matched[0]?.links.some((link) => link.publisher === "abgeordnetenwatch.de")).toBe(true);
  });

  it("matches the IFG/transparency pilot only for related dossier sources", () => {
    const matched = getParliamentaryContextTopics(
      sources({
        title: "Reform des Informationsfreiheitsgesetzes (IFG)",
        canonicalUrl: "https://www.lobbyregister.bundestag.de/example-ifg",
      }),
    );

    expect(matched.map((topic) => topic.id)).toEqual(["de-ifg-reform"]);
    expect(matched[0]?.caveat).toContain("Organisationsposition");
  });

  it("does not inject pilot politics into unrelated dossiers", () => {
    const matched = getParliamentaryContextTopics(
      sources({
        title: "Kommunale Verkehrsplanung und Schulwege",
        canonicalUrl: "https://example.org/verkehr",
      }),
    );

    expect(matched).toEqual([]);
  });

  it("keeps political self-statements separate from official procedure sources", () => {
    for (const topic of PARLIAMENTARY_CONTEXT_PILOT_TOPICS) {
      expect(topic.statements.length).toBeGreaterThan(0);
      expect(topic.links.some((link) => link.kind === "official")).toBe(true);
      expect(topic.caveat.length).toBeGreaterThan(40);
    }
  });
});
