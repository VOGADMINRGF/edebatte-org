import { describe, expect, it } from "vitest";

import {
  reconcileNewsletterSubscription,
  shouldExportAsNewsletterRecipient,
} from "@features/notifications/newsletterSubscriptionReconciliation";

describe("newsletter subscription reconciliation", () => {
  it("never promotes a legacy opt-in to active without canonical consent", () => {
    const decision = reconcileNewsletterSubscription({
      legacyUser: {
        email: "USER@example.org",
        settingsNewsletterOptIn: true,
        accessTier: "citizenPremium",
      },
    });

    expect(decision.sourceOfTruth).toBe("legacy_only");
    expect(decision.effectiveStatus).toBe("pending");
    expect(decision.migrationAction).toBe("reconfirm_legacy_opt_in");
    expect(decision.audienceTier).toBe("plus");
    expect(shouldExportAsNewsletterRecipient(decision)).toBe(false);
  });

  it("preserves canonical unsubscribe even when the legacy mirror says true", () => {
    const decision = reconcileNewsletterSubscription({
      canonical: {
        email: "user@example.org",
        status: "unsubscribed",
        consentVersion: "updates_v1",
      },
      legacyUser: {
        email: "user@example.org",
        newsletterOptIn: true,
      },
    });

    expect(decision.sourceOfTruth).toBe("canonical");
    expect(decision.effectiveStatus).toBe("unsubscribed");
    expect(decision.migrationAction).toBe("preserve_unsubscribed");
    expect(decision.conflict).toBe("legacy_true_canonical_inactive");
    expect(shouldExportAsNewsletterRecipient(decision)).toBe(false);
  });

  it("preserves suppression over every legacy state", () => {
    const decision = reconcileNewsletterSubscription({
      canonical: {
        email: "user@example.org",
        status: "suppressed",
        consentVersion: "updates_v1",
      },
      legacyUser: {
        email: "user@example.org",
        settingsNewsletterOptIn: true,
      },
    });

    expect(decision.migrationAction).toBe("preserve_suppressed");
    expect(shouldExportAsNewsletterRecipient(decision)).toBe(false);
  });

  it("exports only canonical active subscriptions", () => {
    const decision = reconcileNewsletterSubscription({
      canonical: {
        email: "user@example.org",
        status: "active",
        consentVersion: "updates_v1",
        audienceTier: "pro",
        preferences: { frequency: "daily" },
      },
      legacyUser: {
        email: "user@example.org",
        settingsNewsletterOptIn: false,
      },
    });

    expect(decision.effectiveStatus).toBe("active");
    expect(decision.audienceTier).toBe("pro");
    expect(decision.preferences.frequency).toBe("daily");
    expect(decision.conflict).toBe("legacy_false_canonical_active");
    expect(shouldExportAsNewsletterRecipient(decision)).toBe(true);
  });
});
