import { describe, expect, it, vi } from "vitest";

import { coreCol } from "@core/db/triMongo";
import {
  acquireNewsletterDeliveryLease,
  createInMemoryNewsletterDeliveryLeaseStore,
} from "@/features/newsletter/newsletterDeliveryLease";
import {
  acquireNewsletterSubscriberCoordination,
  createInMemoryNewsletterSubscriberCoordinationStore,
  newsletterCandidateSnapshotMatches,
} from "@/features/newsletter/newsletterSubscriberCoordination";

vi.mock("@core/db/triMongo", () => ({
  coreCol: vi.fn(),
}));

describe("newsletter delivery lease", () => {
  const now = new Date("2026-09-20T10:00:00.000Z");

  it("allows exactly one concurrent claimant for the same digest", async () => {
    const store = createInMemoryNewsletterDeliveryLeaseStore();
    const claims = await Promise.all(
      Array.from({ length: 8 }, () =>
        acquireNewsletterDeliveryLease({
          id: "recipient-hash:digest-key",
          now,
          store,
        }),
      ),
    );

    expect(claims.filter((claim) => claim.acquired)).toHaveLength(1);
    expect(claims.filter((claim) => !claim.acquired)).toHaveLength(7);
    expect(claims.filter((claim) => !claim.acquired).every((claim) => claim.reason === "delivery_in_progress")).toBe(true);
  });

  it("releases only with the owning token and can then be reacquired", async () => {
    const store = createInMemoryNewsletterDeliveryLeaseStore();
    const first = await acquireNewsletterDeliveryLease({ id: "same", now, store });
    expect(first.acquired).toBe(true);
    if (!first.acquired) throw new Error("expected lease");

    const blocked = await acquireNewsletterDeliveryLease({ id: "same", now, store });
    expect(blocked.acquired).toBe(false);

    await first.release();
    const next = await acquireNewsletterDeliveryLease({ id: "same", now, store });
    expect(next.acquired).toBe(true);
  });

  it("recovers an expired lease after a crashed worker", async () => {
    const store = createInMemoryNewsletterDeliveryLeaseStore();
    const first = await acquireNewsletterDeliveryLease({
      id: "stale",
      now,
      leaseMs: 5 * 60 * 1000,
      store,
    });
    expect(first.acquired).toBe(true);

    const beforeExpiry = await acquireNewsletterDeliveryLease({
      id: "stale",
      now: new Date("2026-09-20T10:04:59.000Z"),
      leaseMs: 5 * 60 * 1000,
      store,
    });
    expect(beforeExpiry.acquired).toBe(false);

    const afterExpiry = await acquireNewsletterDeliveryLease({
      id: "stale",
      now: new Date("2026-09-20T10:05:00.000Z"),
      leaseMs: 5 * 60 * 1000,
      store,
    });
    expect(afterExpiry.acquired).toBe(true);
  });

  it("serializes the final send boundary against opt-out and preference mutations", async () => {
    const store = createInMemoryNewsletterSubscriberCoordinationStore([
      {
        email: "member@example.org",
        userId: "user-1",
        status: "active",
        consentVersion: "updates_v1",
      },
    ]);
    const boundaryNow = new Date("2026-09-25T12:00:00.000Z");

    const send = await acquireNewsletterSubscriberCoordination({
      email: "member@example.org",
      purpose: "send",
      requiredConsentVersion: "updates_v1",
      now: boundaryNow,
      store,
    });
    expect(send.acquired).toBe(true);

    const mutationWhileSending = await acquireNewsletterSubscriberCoordination({
      email: "member@example.org",
      userId: "user-1",
      purpose: "mutation",
      now: boundaryNow,
      waitMs: 0,
      store,
    });
    expect(mutationWhileSending).toEqual({
      acquired: false,
      reason: "subscriber_coordination_busy",
    });

    if (send.acquired) await send.release();

    const mutationAfterSend = await acquireNewsletterSubscriberCoordination({
      email: "member@example.org",
      userId: "user-1",
      purpose: "mutation",
      now: boundaryNow,
      waitMs: 0,
      store,
    });
    expect(mutationAfterSend.acquired).toBe(true);
    if (mutationAfterSend.acquired) await mutationAfterSend.release();
  });

  it("keeps the Mongo coordination lock bound to the requested subscriber", async () => {
    vi.mocked(coreCol).mockReset();
    const boundaryNow = new Date("2026-09-25T12:00:00.000Z");
    const lockedSubscriber = {
      email: "member-a@example.org",
      userId: "user-a",
      status: "active",
      consentVersion: "updates_v1",
      sendCoordinationLock: {
        token: "send-a",
        purpose: "send",
        acquiredAt: new Date("2026-09-25T11:59:00.000Z"),
        expiresAt: new Date("2026-09-25T12:01:00.000Z"),
      },
    };
    const otherSubscriber: Record<string, unknown> = {
      email: "member-b@example.org",
      userId: "user-b",
      status: "active",
      consentVersion: "updates_v1",
    };

    const findOneAndUpdate = vi.fn(async (filter: any, update: any) => {
      const clauses = Array.isArray(filter?.$and) ? filter.$and : [];
      const hasRequestedIdentity = clauses.some(
        (clause: any) =>
          Array.isArray(clause?.$or) &&
          clause.$or.some((entry: any) => entry?.email === "member-a@example.org") &&
          clause.$or.some((entry: any) => entry?.userId === "user-a"),
      );
      const hasLockAvailability = clauses.some(
        (clause: any) =>
          Array.isArray(clause?.$or) &&
          clause.$or.some((entry: any) => entry?.sendCoordinationLock?.$exists === false),
      );

      if (!hasRequestedIdentity || !hasLockAvailability) {
        otherSubscriber.sendCoordinationLock = update.$set.sendCoordinationLock;
        return otherSubscriber;
      }
      return null;
    });
    const findOne = vi.fn(async (filter: any) => {
      const matchesRequestedIdentity =
        Array.isArray(filter?.$or) &&
        filter.$or.some(
          (entry: any) =>
            entry?.email === "member-a@example.org" || entry?.userId === "user-a",
        );
      return matchesRequestedIdentity ? lockedSubscriber : null;
    });

    vi.mocked(coreCol).mockResolvedValue({
      findOneAndUpdate,
      findOne,
      updateOne: vi.fn(),
    } as any);

    await expect(
      acquireNewsletterSubscriberCoordination({
        email: "member-a@example.org",
        userId: "user-a",
        purpose: "mutation",
        now: boundaryNow,
        waitMs: 0,
      }),
    ).resolves.toEqual({
      acquired: false,
      reason: "subscriber_coordination_busy",
    });

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(otherSubscriber.sendCoordinationLock).toBeUndefined();
  });

  it("fails closed when current consent or subscription status is not sendable", async () => {
    const store = createInMemoryNewsletterSubscriberCoordinationStore([
      {
        email: "unsubscribed@example.org",
        status: "unsubscribed",
        consentVersion: "updates_v1",
      },
      {
        email: "stale@example.org",
        status: "active",
        consentVersion: "updates_v0",
      },
    ]);
    const boundaryNow = new Date("2026-09-25T12:00:00.000Z");

    await expect(
      acquireNewsletterSubscriberCoordination({
        email: "unsubscribed@example.org",
        purpose: "send",
        requiredConsentVersion: "updates_v1",
        now: boundaryNow,
        store,
      }),
    ).resolves.toEqual({ acquired: false, reason: "subscriber_not_eligible" });

    await expect(
      acquireNewsletterSubscriberCoordination({
        email: "stale@example.org",
        purpose: "send",
        requiredConsentVersion: "updates_v1",
        now: boundaryNow,
        store,
      }),
    ).resolves.toEqual({ acquired: false, reason: "subscriber_not_eligible" });
  });

  it("binds selected content to the exact approved revision", () => {
    const selected = [
      {
        id: "post-1",
        title: "Titel",
        summary: "Freigegebener Stand",
        href: "/dossier/1",
        updatedAt: new Date("2026-09-25T10:00:00.000Z"),
        verificationLabel: "analysiert",
        limitations: ["offene Frage"],
      },
    ];

    expect(newsletterCandidateSnapshotMatches(selected, selected)).toBe(true);
    expect(
      newsletterCandidateSnapshotMatches(selected, [
        {
          ...selected[0],
          summary: "Nachträglich geänderter Stand",
          updatedAt: new Date("2026-09-25T10:05:00.000Z"),
        },
      ]),
    ).toBe(false);
    expect(newsletterCandidateSnapshotMatches(selected, [])).toBe(false);
  });
});
