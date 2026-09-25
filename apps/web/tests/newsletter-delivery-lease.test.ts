import { describe, expect, it } from "vitest";

import {
  acquireNewsletterDeliveryLease,
  createInMemoryNewsletterDeliveryLeaseStore,
} from "@/features/newsletter/newsletterDeliveryLease";
import {
  acquireNewsletterSubscriberCoordination,
  createInMemoryNewsletterSubscriberCoordinationStore,
  newsletterCandidateSnapshotMatches,
} from "@/features/newsletter/newsletterSubscriberCoordination";

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
