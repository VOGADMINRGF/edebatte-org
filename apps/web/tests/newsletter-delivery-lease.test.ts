import { describe, expect, it } from "vitest";

import {
  acquireNewsletterDeliveryLease,
  createInMemoryNewsletterDeliveryLeaseStore,
} from "@/features/newsletter/newsletterDeliveryLease";

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
});
