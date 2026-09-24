import { describe, expect, it } from "vitest";

import {
  resolveNewsletterBriefingPolicy,
  selectNewsletterBriefingItems,
} from "@features/notifications/newsletterBriefingPolicy";

describe("newsletter briefing policy", () => {
  it("gives paid communication tiers more depth without changing relevance", () => {
    expect(resolveNewsletterBriefingPolicy("public")).toMatchObject({
      depth: "compact",
      maxItems: 4,
    });
    expect(resolveNewsletterBriefingPolicy("plus")).toMatchObject({
      depth: "standard",
      maxItems: 6,
      includeRelevanceExplanation: true,
    });
    expect(resolveNewsletterBriefingPolicy("pro")).toMatchObject({
      depth: "deep",
      maxItems: 10,
      includeEvidencePointers: true,
    });
  });

  it("prevents one topic from crowding out the whole briefing", () => {
    const selected = selectNewsletterBriefingItems({
      audienceTier: "plus",
      items: [
        ["a", "energy", 90],
        ["b", "energy", 80],
        ["c", "energy", 70],
        ["d", "health", 60],
      ].map(([id, topic, score]) => ({
        candidate: {
          id: String(id),
          kind: "topic_update" as const,
          topicKeys: [String(topic)],
          importance: "normal" as const,
        },
        relevance: {
          candidateId: String(id),
          score: Number(score),
          relevant: true,
          reasons: ["explicit_topic" as const],
          audienceTier: "plus" as const,
        },
      })),
    });

    expect(selected.map((entry) => entry.candidate.id)).toEqual(["a", "b", "d"]);
  });

  it("keeps critical items even when a topic diversity cap is reached", () => {
    const selected = selectNewsletterBriefingItems({
      audienceTier: "public",
      items: [
        {
          candidate: { id: "a", kind: "topic_update", topicKeys: ["energy"], importance: "high" },
          relevance: { candidateId: "a", score: 90, relevant: true, reasons: ["explicit_topic"], audienceTier: "public" },
        },
        {
          candidate: { id: "b", kind: "topic_update", topicKeys: ["energy"], importance: "high" },
          relevance: { candidateId: "b", score: 80, relevant: true, reasons: ["explicit_topic"], audienceTier: "public" },
        },
        {
          candidate: { id: "c", kind: "important_alert", topicKeys: ["energy"], importance: "critical" },
          relevance: { candidateId: "c", score: 100, relevant: true, reasons: ["important_alert"], audienceTier: "public" },
        },
      ],
    });

    expect(selected.map((entry) => entry.candidate.id)).toContain("c");
  });
});
