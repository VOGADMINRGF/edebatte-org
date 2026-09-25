import { describe, expect, it } from "vitest";

import {
  createNewsletterUnsubscribeToken,
  verifyNewsletterUnsubscribeToken,
} from "@features/notifications/newsletterUnsubscribeToken";

describe("newsletter unsubscribe token", () => {
  const secret = "test-unsubscribe-secret";
  const now = new Date("2026-09-17T08:00:00.000Z");

  it("normalizes the email and verifies an unexpired signed token", () => {
    const token = createNewsletterUnsubscribeToken({
      email: " USER@Example.org ",
      secret,
      expiresAt: new Date("2026-10-17T08:00:00.000Z"),
    });

    expect(token).toBeTruthy();
    const result = verifyNewsletterUnsubscribeToken({
      token: token!,
      secret,
      now,
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        v: 1,
        email: "user@example.org",
        exp: Math.floor(new Date("2026-10-17T08:00:00.000Z").getTime() / 1000),
      },
    });
  });

  it("fails closed when the secret is missing", () => {
    const result = verifyNewsletterUnsubscribeToken({
      token: "anything.anything",
      secret: "",
      now,
    });
    expect(result).toEqual({ ok: false, reason: "missing_secret" });
  });

  it("rejects tampered tokens", () => {
    const token = createNewsletterUnsubscribeToken({
      email: "user@example.org",
      secret,
      expiresAt: new Date("2026-10-17T08:00:00.000Z"),
    });
    expect(token).toBeTruthy();

    const [payload, signature] = token!.split(".");
    const result = verifyNewsletterUnsubscribeToken({
      token: `${payload}.${signature}x`,
      secret,
      now,
    });
    expect(result).toEqual({ ok: false, reason: "invalid_signature" });
  });

  it("rejects expired tokens", () => {
    const token = createNewsletterUnsubscribeToken({
      email: "user@example.org",
      secret,
      expiresAt: new Date("2026-09-16T08:00:00.000Z"),
    });
    expect(token).toBeTruthy();

    const result = verifyNewsletterUnsubscribeToken({
      token: token!,
      secret,
      now,
    });
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("does not issue tokens for invalid addresses or an empty secret", () => {
    expect(
      createNewsletterUnsubscribeToken({
        email: "not-an-email",
        secret,
        expiresAt: new Date("2026-10-17T08:00:00.000Z"),
      }),
    ).toBeNull();
    expect(
      createNewsletterUnsubscribeToken({
        email: "user@example.org",
        secret: "",
        expiresAt: new Date("2026-10-17T08:00:00.000Z"),
      }),
    ).toBeNull();
  });
});
