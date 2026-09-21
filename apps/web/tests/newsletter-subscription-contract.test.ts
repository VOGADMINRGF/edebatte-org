import { describe, expect, it } from "vitest";

import {
  DEFAULT_NEWSLETTER_PREFERENCES,
  deriveNewsletterAudienceTier,
  mergeNewsletterPreferences,
  normalizeNewsletterEmail,
  resolveNewsletterEligibility,
} from "@features/notifications/newsletterSubscriptionContract";

describe("newsletter subscription contract", () => {
  it("normalizes valid email addresses and rejects invalid ones", () => {
    expect(normalizeNewsletterEmail("  USER@Example.org ")).toBe("user@example.org");
    expect(normalizeNewsletterEmail("not-an-email")).toBeNull();
  });

  it("fails closed unless the subscription is active and consent is current", () => {
    expect(
      resolveNewsletterEligibility({
        email: "user@example.org",
        status: "pending",
        consentVersion: "v1",
        requiredConsentVersion: "v1",
        channel: "email",
      }),
    ).toEqual({ eligible: false, reason: "not_active" });

    expect(
      resolveNewsletterEligibility({
        email: "user@example.org",
        status: "active",
        consentVersion: "v1",
        requiredConsentVersion: "v2",
        channel: "email",
      }),
    ).toEqual({ eligible: false, reason: "consent_version_mismatch" });

    expect(
      resolveNewsletterEligibility({
        email: "user@example.org",
        status: "active",
        consentVersion: "v2",
        requiredConsentVersion: "v2",
        channel: "email",
      }),
    ).toEqual({ eligible: true, reason: "eligible" });
  });

  it("never treats suppressed recipients as eligible", () => {
    expect(
      resolveNewsletterEligibility({
        email: "user@example.org",
        status: "active",
        consentVersion: "v1",
        requiredConsentVersion: "v1",
        channel: "email",
        suppressed: true,
      }),
    ).toEqual({ eligible: false, reason: "suppressed" });
  });

  it("maps technical package identifiers to stable communication audience tiers", () => {
    expect(deriveNewsletterAudienceTier({ packageId: "basis" })).toBe("member");
    expect(deriveNewsletterAudienceTier({ packageId: "start" })).toBe("plus");
    expect(deriveNewsletterAudienceTier({ packageId: "pro" })).toBe("pro");
    expect(deriveNewsletterAudienceTier({ accessTier: "citizenPremium" })).toBe("plus");
    expect(deriveNewsletterAudienceTier({ accessTier: "citizenPro" })).toBe("pro");
    expect(deriveNewsletterAudienceTier({ packageId: "b2g_pro" })).toBe("organization");
    expect(deriveNewsletterAudienceTier({ roles: ["admin"] })).toBe("staff");
  });

  it("merges preferences onto safe defaults and deduplicates targeting keys", () => {
    expect(
      mergeNewsletterPreferences({
        frequency: "daily",
        productUpdates: false,
        topicKeys: ["climate", "climate", " health "],
        regionKeys: ["DE:BE", "DE:BE"],
      }),
    ).toEqual({
      ...DEFAULT_NEWSLETTER_PREFERENCES,
      frequency: "daily",
      productUpdates: false,
      topicKeys: ["climate", "health"],
      regionKeys: ["DE:BE"],
    });
  });
});
