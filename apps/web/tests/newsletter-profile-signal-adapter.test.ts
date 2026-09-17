import { describe, expect, it } from "vitest";

import { buildNewsletterProfileSignal } from "@features/notifications/newsletterProfileSignalAdapter";

describe("newsletter profile signal adapter", () => {
  it("combines explicit preferences with selected account topics and location", () => {
    const signal = buildNewsletterProfileSignal({
      account: {
        preferredLocale: "de",
        readingLocale: "de",
        profile: {
          topTopics: [{ key: "health" }, { key: "energy" }],
          publicLocation: { region: "DE:BE", countryCode: "DE" },
        },
      },
      preferences: {
        topicKeys: ["health", "housing"],
        regionKeys: ["DE:BE"],
      },
      audienceTier: "pro",
    });

    expect(signal.topicKeys).toEqual(["health", "housing", "energy"]);
    expect(signal.regionKeys).toEqual(["DE:BE", "DE"]);
    expect(signal.locale).toBe("de");
    expect(signal.audienceTier).toBe("pro");
  });

  it("keeps watchlist and own-work signals explicit and separate", () => {
    const signal = buildNewsletterProfileSignal({
      activity: {
        watchlistTopicKeys: ["climate"],
        watchlistRegionKeys: ["DE:BE"],
        ownWorkTopicKeys: ["mobility"],
        ownWorkRegionKeys: ["DE:BB"],
      },
    });

    expect(signal.watchlistTopicKeys).toEqual(["climate"]);
    expect(signal.watchlistRegionKeys).toEqual(["DE:BE"]);
    expect(signal.ownWorkTopicKeys).toEqual(["mobility"]);
    expect(signal.ownWorkRegionKeys).toEqual(["DE:BB"]);
  });

  it("does not invent profile signals when none are present", () => {
    expect(buildNewsletterProfileSignal({})).toEqual({
      topicKeys: [],
      regionKeys: [],
      watchlistTopicKeys: [],
      watchlistRegionKeys: [],
      ownWorkTopicKeys: [],
      ownWorkRegionKeys: [],
      locale: null,
      audienceTier: "public",
    });
  });
});
