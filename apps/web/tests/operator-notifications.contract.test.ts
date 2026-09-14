import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const afterCallbacks: Array<() => Promise<void> | void> = [];
  const events = new Map<string, any>();
  const digests = new Map<string, any>();
  const collection = (store: Map<string, any>) => ({
    updateOne: vi.fn(async (filter: any, update: any) => {
      const key = String(filter._id); const existing = store.get(key);
      if (!existing && update.$setOnInsert) { store.set(key, { ...update.$setOnInsert }); return { upsertedId: key }; }
      if (existing && update.$set) store.set(key, { ...existing, ...update.$set });
      return { upsertedId: null };
    }),
    find: vi.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => [...store.values()] }) }) })),
  });
  return { afterCallbacks, events, digests, collection, sendMail: vi.fn(async () => ({ ok: true, messageId: "mail-1", category: null })) };
});

vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after: (callback: () => Promise<void> | void) => mocks.afterCallbacks.push(callback) }));
vi.mock("@core/db/triMongo", async () => { const { ObjectId } = await import("mongodb"); return { ObjectId, coreCol: async (name: string) => name === "operator_notification_events" ? mocks.collection(mocks.events) : mocks.collection(mocks.digests), getCol: async () => ({ findOne: async () => ({ name: "Ada Beispiel", email: "ada@edebatte.org", profile: { locale: "de" } }) }) }; });
vi.mock("@/utils/mailer", () => ({ sendMail: (...args: any[]) => mocks.sendMail(...args) }));

import { isBerlinDigestHour, OPERATOR_RECIPIENTS, scheduleCreateSubmissionNotification, scheduleMemberRegistrationNotification, scheduleSupportTicketNotification, sendDailyOperatorDigest } from "@/features/operator/operatorNotifications";

async function runLast() { await mocks.afterCallbacks.at(-1)?.(); }

describe("operator notification contract", () => {
  beforeEach(() => { mocks.afterCallbacks.length = 0; mocks.events.clear(); mocks.digests.clear(); vi.clearAllMocks(); });

  it("pins recipients and Berlin 18:00 DST boundaries", () => {
    expect(OPERATOR_RECIPIENTS).toEqual({ createSubmission: "social@edebatte.org", supportTicket: "qa-auth@edebatte.org", memberRegistration: "members@edebatte.org", dailyDigest: "rgf@voiceopengov.org" });
    expect(isBerlinDigestHour(new Date("2026-09-05T16:00:00.000Z"))).toBe(true);
    expect(isBerlinDigestHour(new Date("2026-01-05T17:00:00.000Z"))).toBe(true);
    expect(isBerlinDigestHour(new Date("2026-09-05T17:00:00.000Z"))).toBe(false);
  });

  it("sends exactly one redacted durable create notification without its draft id", async () => {
    scheduleCreateSubmissionNotification({ draftId: "draft-secret", safeText: "Kontakt [E-MAIL ENTFERNT] zum Thema Rente", locale: "de" }); await runLast();
    const mail = mocks.sendMail.mock.calls[0][0];
    expect(mail).toMatchObject({ to: "social@edebatte.org", delivery: "best_effort_delivery", tag: "operator_create_submission" });
    expect(mail.mail.text).toContain("[E-MAIL ENTFERNT]"); expect(mail.mail.text).not.toContain("draft-secret");
    scheduleCreateSubmissionNotification({ draftId: "draft-secret", safeText: "Kontakt [E-MAIL ENTFERNT] zum Thema Rente" }); await runLast();
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });

  it("routes a persisted technical ticket to QA without contribution content", async () => {
    scheduleSupportTicketNotification({ ticketNumber: "CREATE-42", technicalErrorCode: "CREATE_AI_FAILED", reason: "provider_timeout" }); await runLast();
    const mail = mocks.sendMail.mock.calls[0][0];
    expect(mail).toMatchObject({ to: "qa-auth@edebatte.org", tag: "operator_support_ticket" });
    expect(mail.mail.text).toContain("CREATE-42"); expect(mail.mail.text).toContain("CREATE_AI_FAILED"); expect(mail.mail.text).not.toContain("Rentenbeiträge");
  });

  it("routes approved member fields and has a once-per-day digest claim", async () => {
    scheduleMemberRegistrationNotification("65f000000000000000000011"); await runLast();
    expect(mocks.sendMail.mock.calls[0][0]).toMatchObject({ to: "members@edebatte.org", tag: "operator_member_registration" });
    const now = new Date("2026-09-05T16:00:00.000Z");
    await expect(sendDailyOperatorDigest(now)).resolves.toMatchObject({ ok: true, berlinDate: "2026-09-05" });
    await expect(sendDailyOperatorDigest(now)).resolves.toMatchObject({ skipped: "already_claimed" });
  });
});
