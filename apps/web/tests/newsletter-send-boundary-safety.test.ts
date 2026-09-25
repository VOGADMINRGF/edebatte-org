import { describe, expect, it } from "vitest";

import {
  acquireNewsletterSubscriberCoordination,
  createInMemoryNewsletterSubscriberCoordinationStore,
  newsletterCandidateSnapshotMatches,
} from "@/features/newsletter/newsletterSubscriberCoordination";

describe("newsletter final send boundary safety", () => {
  it("serializes a send boundary against opt-out/preference mutations", async () => {
    const store = createInMemoryNewsletterSubscriberCoordinationStore([
      {
        email: "member@example.org",
        userId: "user-1",
        status: "active",
        consentVersion: "updates_v1",
      },
    ]);
    const now = new Date("2026-09-25T12:00:00.000Z");

    const send = await acquireNewsletterSubscriberCoordination({
      email: "member@example.org",
      purpose: "send",
      requiredConsentVersion: "updates_v1",
      now,
      store,
    });
    expect(send.acquired).toBe(true);

    const mutationWhileSending = await acquireNewsletterSubscriberCoordination({
      email: "member@example.org",
      userId: "user-1",
      purpose: "mutation",
      now,
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
      now,
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
    const now = new Date("2026-09-25T12:00:00.000Z");

    await expect(
      acquireNewsletterSubscriberCoordination({
        email: "unsubscribed@example.org",
        purpose: "send",
        requiredConsentVersion: "updates_v1",
        now,
        store,
      }),
    ).resolves.toEqual({ acquired: false, reason: "subscriber_not_eligible" });

    await expect(
      acquireNewsletterSubscriberCoordination({
        email: "stale@example.org",
        purpose: "send",
        requiredConsentVersion: "updates_v1",
        now,
        store,
      }),
    ).resolves.toEqual({ acquired: false, reason: "subscriber_not_eligible" });
  });

  it("binds the selected newsletter content to the exact approved revision", () => {
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
