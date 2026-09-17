import { describe, expect, it } from "vitest";

import { resolveNewsletterDeliveryPolicy } from "@features/notifications/newsletterDeliveryPolicy";

describe("newsletter delivery policy", () => {
  const now = new Date("2026-09-17T08:00:00.000Z");

  it("blocks duplicate candidate delivery", () => {
    expect(
      resolveNewsletterDeliveryPolicy({
        frequency: "daily",
        audienceTier: "pro",
        now,
        candidateId: "item-1",
        lastCandidateIds: ["item-1"],
      }),
    ).toEqual({ allowed: false, reason: "duplicate" });
  });

  it("blocks non-critical delivery during quiet hours", () => {
    expect(
      resolveNewsletterDeliveryPolicy({
        frequency: "daily",
        audienceTier: "plus",
        now,
        candidateId: "item-2",
        quietHours: {
          enabled: true,
          startHourLocal: 22,
          endHourLocal: 7,
          localHour: 23,
        },
      }),
    ).toEqual({ allowed: false, reason: "quiet_hours" });
  });

  it("allows critical delivery through quiet hours but not duplicate protection", () => {
    expect(
      resolveNewsletterDeliveryPolicy({
        frequency: "important_only",
        audienceTier: "member",
        now,
        candidateId: "critical-1",
        isCritical: true,
        quietHours: {
          enabled: true,
          startHourLocal: 22,
          endHourLocal: 7,
          localHour: 23,
        },
      }),
    ).toEqual({ allowed: true, reason: "allowed" });
  });

  it("caps daily and weekly fatigue independently of audience tier", () => {
    expect(
      resolveNewsletterDeliveryPolicy({
        frequency: "daily",
        audienceTier: "pro",
        now,
        lastSentAt: new Date("2026-09-16T14:00:00.000Z"),
        candidateId: "item-3",
      }).reason,
    ).toBe("daily_cap");

    expect(
      resolveNewsletterDeliveryPolicy({
        frequency: "weekly",
        audienceTier: "public",
        now,
        lastSentAt: new Date("2026-09-13T08:00:00.000Z"),
        candidateId: "item-4",
      }).reason,
    ).toBe("weekly_cap");
  });
});
