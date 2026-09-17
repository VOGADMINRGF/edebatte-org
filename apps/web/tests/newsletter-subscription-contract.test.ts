import { describe, expect, it } from "vitest";
import {
  deriveNewsletterBriefingLevel,
  mergeNewsletterSubscriberTruth,
} from "@features/notifications/newsletterSubscriptions";

describe("newsletter subscription contract", () => {
  it("keeps legacy account opt-in as compatibility input when no canonical record exists", () => {
    const result = mergeNewsletterSubscriberTruth({
      legacyUsers: [
        {
          _id: "user-1",
          email: "Ada@Example.org",
          name: "Ada",
          settings: { newsletterOptIn: true, readingLocale: "de" },
        },
      ],
      canonicalSubscribers: [],
    });

    expect(result).toEqual([
      expect.objectContaining({
        email: "ada@example.org",
        status: "active",
        sources: ["legacy_user_opt_in"],
        userId: "user-1",
      }),
    ]);
  });

  it("lets canonical pending and unsubscribe states suppress an older legacy opt-in", () => {
    const legacyUsers = [
      {
        email: "ada@example.org",
        settings: { newsletterOptIn: true },
      },
    ];

    expect(
      mergeNewsletterSubscriberTruth({
        legacyUsers,
        canonicalSubscribers: [{ email: "ada@example.org", status: "pending" }],
      })[0],
    ).toMatchObject({ email: "ada@example.org", status: "pending" });

    expect(
      mergeNewsletterSubscriberTruth({
        legacyUsers,
        canonicalSubscribers: [{ email: "ada@example.org", status: "unsubscribed" }],
      })[0],
    ).toMatchObject({ email: "ada@example.org", status: "unsubscribed" });
  });

  it("preserves canonical active double-opt-in and merges safe legacy profile hints", () => {
    const result = mergeNewsletterSubscriberTruth({
      legacyUsers: [
        {
          _id: "user-2",
          email: "bea@example.org",
          name: "Bea Account",
          settings: { newsletterOptIn: true, readingLocale: "de" },
          accessTier: "citizenPremium",
        },
      ],
      canonicalSubscribers: [
        {
          email: "bea@example.org",
          name: "Bea Updates",
          locale: "en",
          status: "active",
          source: "public_updates",
        },
      ],
    });

    expect(result[0]).toMatchObject({
      email: "bea@example.org",
      name: "Bea Updates",
      locale: "en",
      status: "active",
      sources: ["legacy_user_opt_in", "public_updates"],
      briefingLevel: "personalized",
    });
  });

  it("derives briefing depth from stable entitlement keys, not visible package copy", () => {
    expect(deriveNewsletterBriefingLevel({ accessTier: "citizenPremium" })).toBe("personalized");
    expect(deriveNewsletterBriefingLevel({ accessTier: "citizenPro" })).toBe("deep");
    expect(deriveNewsletterBriefingLevel({ accessTier: "citizenUltra" })).toBe("deep");
    expect(deriveNewsletterBriefingLevel({ b2cPlanId: "plus" })).toBe("personalized");
    expect(deriveNewsletterBriefingLevel({ edebatte: { package: "pro" } })).toBe("deep");
    expect(deriveNewsletterBriefingLevel({ accessTier: "citizenBasic" })).toBe("standard");
  });
});
