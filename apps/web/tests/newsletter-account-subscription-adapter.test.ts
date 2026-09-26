import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock("@core/db/triMongo", () => ({
  coreCol: vi.fn(async () => ({
    findOne: (...args: unknown[]) => mocks.findOne(...args),
    updateOne: (...args: unknown[]) => mocks.updateOne(...args),
  })),
}));

import {
  applyAccountNewsletterPreference,
  readCanonicalNewsletterOptIn,
} from "@features/notifications/newsletterAccountSubscriptionAdapter";

describe("account newsletter canonical subscription adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UPDATES_CONSENT_VERSION = "updates_v1";
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
  });

  it("turns account opt-out into a canonical unsubscribe", async () => {
    mocks.findOne.mockResolvedValueOnce({
      _id: "subscriber-1",
      email: "citizen@example.org",
      userId: "user-1",
      status: "active",
      consentVersion: "updates_v1",
    });
    const now = new Date("2026-09-25T15:15:00.000Z");
    const result = await applyAccountNewsletterPreference({
      userId: "user-1",
      email: "citizen@example.org",
      optIn: false,
      now,
    });
    expect(result.active).toBe(false);
    expect(result.changed).toBe(true);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: "subscriber-1" },
      { $set: { status: "unsubscribed", unsubscribedAt: now, updatedAt: now } },
    );
  });

  it("never reactivates an inactive subscriber from the account toggle", async () => {
    mocks.findOne.mockResolvedValueOnce({
      _id: "subscriber-2",
      email: "citizen@example.org",
      userId: "user-1",
      status: "unsubscribed",
      consentVersion: "updates_v1",
    });
    const result = await applyAccountNewsletterPreference({
      userId: "user-1",
      email: "citizen@example.org",
      optIn: true,
    });
    expect(result).toEqual({ active: false, reconfirmationRequired: true, changed: false });
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("reads only active current-consent canonical subscriptions as opted in", async () => {
    mocks.findOne.mockResolvedValueOnce({
      email: "citizen@example.org",
      userId: "user-1",
      status: "active",
      consentVersion: "updates_v1",
    });
    await expect(
      readCanonicalNewsletterOptIn({ userId: "user-1", email: "citizen@example.org" }),
    ).resolves.toBe(true);

    mocks.findOne.mockResolvedValueOnce({
      email: "citizen@example.org",
      userId: "user-1",
      status: "active",
      consentVersion: "old_consent",
    });
    await expect(
      readCanonicalNewsletterOptIn({ userId: "user-1", email: "citizen@example.org" }),
    ).resolves.toBe(false);
  });
});
