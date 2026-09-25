import { describe, expect, it } from "vitest";

import {
  buildNewsletterListUnsubscribeHeaders,
  newsletterDeliveryRetentionUntil,
  newsletterFailureProvenBeforeExternalHandoff,
  resolveNewsletterRetryDecision,
  shouldSuppressNewsletterRecipient,
} from "@features/notifications/newsletterDeliveryLifecycle";

describe("newsletter delivery lifecycle", () => {
  const now = new Date("2026-09-17T12:00:00.000Z");

  it("allows the first attempt and bounds retries", () => {
    expect(resolveNewsletterRetryDecision({ now, attemptCount: 0 }).reason).toBe("first_attempt");
    expect(resolveNewsletterRetryDecision({ now, attemptCount: 4, retryable: true, maxAttempts: 4 }).reason).toBe("retry_exhausted");
    expect(resolveNewsletterRetryDecision({ now, attemptCount: 1, retryable: false }).reason).toBe("non_retryable");
  });

  it("backs off retryable failures exponentially", () => {
    const blocked = resolveNewsletterRetryDecision({
      now,
      attemptCount: 2,
      retryable: true,
      lastAttemptAt: new Date("2026-09-17T11:45:00.000Z"),
      baseBackoffMinutes: 15,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("retry_backoff");
    expect(blocked.nextAttemptAt?.toISOString()).toBe("2026-09-17T12:15:00.000Z");

    const allowed = resolveNewsletterRetryDecision({
      now: new Date("2026-09-17T12:16:00.000Z"),
      attemptCount: 2,
      retryable: true,
      lastAttemptAt: new Date("2026-09-17T11:45:00.000Z"),
      baseBackoffMinutes: 15,
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.reason).toBe("retry_allowed");
  });

  it("only classifies deterministic local/configuration failures as proven pre-handoff", () => {
    for (const category of [
      "recipient_invalid",
      "recipient_placeholder_domain",
      "recipient_test_domain_blocked",
      "recipient_domain_not_allowed",
      "mail_content_invalid",
      "sender_configuration_invalid",
      "smtp_unconfigured",
    ] as const) {
      expect(newsletterFailureProvenBeforeExternalHandoff(category)).toBe(true);
    }

    for (const category of [
      "smtp_auth_error",
      "smtp_connection_error",
      "smtp_timeout",
      "smtp_response_error",
      "smtp_unknown_error",
    ] as const) {
      expect(newsletterFailureProvenBeforeExternalHandoff(category)).toBe(false);
    }
    expect(newsletterFailureProvenBeforeExternalHandoff(null)).toBe(false);
    expect(newsletterFailureProvenBeforeExternalHandoff("unknown_future_failure")).toBe(false);
  });

  it("suppresses only deterministic recipient-policy hard failures", () => {
    expect(shouldSuppressNewsletterRecipient("recipient_invalid")).toBe(true);
    expect(shouldSuppressNewsletterRecipient("recipient_placeholder_domain")).toBe(true);
    expect(shouldSuppressNewsletterRecipient("smtp_response_error")).toBe(false);
    expect(shouldSuppressNewsletterRecipient("smtp_timeout")).toBe(false);
  });

  it("keeps delivery ledger retention bounded", () => {
    expect(newsletterDeliveryRetentionUntil({ from: now, retentionDays: 180 }).toISOString()).toBe("2027-03-16T12:00:00.000Z");
    expect(newsletterDeliveryRetentionUntil({ from: now, retentionDays: 1 }).getTime()).toBeGreaterThan(now.getTime());
  });

  it("emits one-click metadata only for HTTPS endpoints", () => {
    expect(buildNewsletterListUnsubscribeHeaders("https://edebatte.org/api/public/updates/unsubscribe?token=abc")).toEqual({
      "List-Unsubscribe": "<https://edebatte.org/api/public/updates/unsubscribe?token=abc>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(buildNewsletterListUnsubscribeHeaders("http://localhost:3000/api/public/updates/unsubscribe?token=abc")).toEqual({});
  });
});
