import { describe, expect, it } from "vitest";

import {
  explainNewsletterRelevance,
  resolveNewsletterProfileRelevance,
} from "@features/notifications/newsletterProfileRelevance";

describe("newsletter profile relevance", () => {
  it("uses explicit topic and region signals with explainable reasons", () => {
    const decision = resolveNewsletterProfileRelevance({
      profile: {
        topicKeys: ["health"],
        regionKeys: ["DE:BE"],
        locale: "de",
        audienceTier: "plus",
      },
      candidate: {
        id: "dossier-1",
        kind: "topic_update",
        topicKeys: ["health"],
        regionKeys: ["DE:BE"],
        locale: "de",
      },
    });

    expect(decision.relevant).toBe(true);
    expect(decision.score).toBe(55);
    expect(decision.reasons).toEqual([
      "explicit_topic",
      "explicit_region",
      "locale_match",
    ]);
    expect(decision.audienceTier).toBe("plus");
    expect(explainNewsletterRelevance(decision)).toHaveLength(3);
  });

  it("prioritizes watchlist and own-work relevance without political preference inference", () => {
    const decision = resolveNewsletterProfileRelevance({
      profile: {
        watchlistTopicKeys: ["energy"],
        ownWorkTopicKeys: ["energy"],
      },
      candidate: {
        id: "dossier-2",
        kind: "watchlist_update",
        topicKeys: ["energy"],
      },
    });

    expect(decision.relevant).toBe(true);
    expect(decision.score).toBe(90);
    expect(decision.reasons).toEqual(["watchlist_topic", "own_work_topic"]);
  });

  it("fails to relevant=false when there is no explainable profile match", () => {
    const decision = resolveNewsletterProfileRelevance({
      profile: { topicKeys: ["health"], regionKeys: ["DE:BE"] },
      candidate: {
        id: "dossier-3",
        kind: "topic_update",
        topicKeys: ["agriculture"],
        regionKeys: ["DE:BY"],
      },
    });

    expect(decision.relevant).toBe(false);
    expect(decision.score).toBe(0);
    expect(decision.reasons).toEqual(["no_profile_match"]);
  });

  it("marks critical alerts relevant independently of profile matching", () => {
    const decision = resolveNewsletterProfileRelevance({
      profile: {},
      candidate: {
        id: "critical-1",
        kind: "important_alert",
        importance: "critical",
      },
    });

    expect(decision.relevant).toBe(true);
    expect(decision.reasons).toContain("important_alert");
    expect(decision.score).toBeGreaterThanOrEqual(100);
  });
});
