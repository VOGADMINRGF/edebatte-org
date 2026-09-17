import { describe, expect, it } from "vitest";

import {
  DEFAULT_PERSONALIZATION_SOURCES,
  DEFAULT_QUIET_HOURS,
  mergeNewsletterPreferenceCenter,
} from "@features/notifications/newsletterPreferenceCenterContract";

describe("newsletter preference center", () => {
  it("provides deterministic privacy-friendly defaults", () => {
    const center = mergeNewsletterPreferenceCenter();
    expect(center.personalizationSources).toEqual(DEFAULT_PERSONALIZATION_SOURCES);
    expect(center.quietHours).toEqual(DEFAULT_QUIET_HOURS);
    expect(center.showRelevanceExplanation).toBe(true);
    expect(center.preferences.frequency).toBe("weekly");
  });

  it("allows personalization sources to be disabled independently", () => {
    const center = mergeNewsletterPreferenceCenter({
      personalizationSources: {
        profileTopics: false,
        profileRegion: true,
        watchlistActivity: false,
        ownWorkActivity: true,
      },
    });

    expect(center.personalizationSources).toEqual({
      profileTopics: false,
      profileRegion: true,
      watchlistActivity: false,
      ownWorkActivity: true,
    });
  });

  it("clamps quiet-hour values to safe local-hour bounds", () => {
    const center = mergeNewsletterPreferenceCenter({
      quietHours: {
        enabled: true,
        timezone: "Europe/Berlin",
        startHourLocal: 99,
        endHourLocal: -5,
      },
    });

    expect(center.quietHours.startHourLocal).toBe(23);
    expect(center.quietHours.endHourLocal).toBe(0);
  });
});
