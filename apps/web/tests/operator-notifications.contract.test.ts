import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const afterCallbacks: Array<() => Promise<void> | void> = [];
  const events = new Map<string, any>();
  const digests = new Map<string, any>();
  const collection = (store: Map<string, any>) => ({
    updateOne: vi.fn(async (filter: any, update: any) => {
      const key = String(filter._id);
      const existing = store.get(key);
      if (!existing && update.$setOnInsert) {
        store.set(key, { ...update.$setOnInsert });
        return { upsertedId: key };
      }
      if (existing && update.$set) {
        store.set(key, { ...existing, ...update.$set });
      }
      return { upsertedId: null };
    }),
    find: vi.fn(() => ({
      sort: () => ({
        limit: () => ({ toArray: async () => [...store.values()] }),
      }),
    })),
  });
  return {
    afterCallbacks,
    events,
    digests,
    collection,
    sendMail: vi.fn(async () => ({
      ok: true as const,
      status: "delivered" as const,
      transport: "smtp" as const,
      category: null,
      retryable: false,
      attemptedCount: 1,
      deliveredCount: 1,
      failedCount: 0 as const,
      messageId: "mail-1",
    })),
  };
});

vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (callback: () => Promise<void> | void) =>
    mocks.afterCallbacks.push(callback),
}));
vi.mock("@core/db/triMongo", async () => {
  const { ObjectId } = await import("mongodb");
  return {
    ObjectId,
    coreCol: async (name: string) =>
      name === "operator_notification_events"
        ? mocks.collection(mocks.events)
        : mocks.collection(mocks.digests),
    getCol: async () => ({
      findOne: async () => ({
        name: "Ada Beispiel",
        email: "ada@edebatte.org",
        profile: { locale: "de" },
      }),
    }),
  };
});
vi.mock("@/utils/mailer", () => ({
  sendMail: (...args: any[]) => mocks.sendMail(...args),
}));

import {
  isBerlinDigestHour,
  OPERATOR_RECIPIENTS,
  scheduleCreateSubmissionNotification,
  scheduleMemberRegistrationNotification,
  scheduleSupportTicketNotification,
  sendDailyOperatorDigest,
} from "@/features/operator/operatorNotifications";

async function runLast() {
  await mocks.afterCallbacks.at(-1)?.();
}

function failure(input: {
  status?: "failed" | "partial";
  category?: string;
  retryable?: boolean;
  attemptedCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  messageId?: string | null;
}) {
  return {
    ok: false as const,
    status: input.status ?? ("failed" as const),
    transport: (input.attemptedCount ?? 0) > 0 ? ("smtp" as const) : ("none" as const),
    code: ((input.attemptedCount ?? 0) > 0
      ? "mail_transport_error"
      : "mail_transport_unavailable") as
      | "mail_transport_error"
      | "mail_transport_unavailable",
    category: input.category ?? "smtp_unconfigured",
    retryable: input.retryable ?? false,
    attemptedCount: input.attemptedCount ?? 0,
    deliveredCount: input.deliveredCount ?? 0,
    failedCount: input.failedCount ?? 1,
    messageId: input.messageId ?? null,
  };
}

describe("operator notification contract", () => {
  beforeEach(() => {
    mocks.afterCallbacks.length = 0;
    mocks.events.clear();
    mocks.digests.clear();
    vi.clearAllMocks();
  });

  it("pins recipients and Berlin 18:00 DST boundaries", () => {
    expect(OPERATOR_RECIPIENTS).toEqual({
      createSubmission: "social@edebatte.org",
      supportTicket: "qa-auth@edebatte.org",
      memberRegistration: "members@edebatte.org",
      dailyDigest: "rgf@voiceopengov.org",
    });
    expect(isBerlinDigestHour(new Date("2026-09-05T16:00:00.000Z"))).toBe(
      true,
    );
    expect(isBerlinDigestHour(new Date("2026-01-05T17:00:00.000Z"))).toBe(
      true,
    );
    expect(isBerlinDigestHour(new Date("2026-09-05T17:00:00.000Z"))).toBe(
      false,
    );
  });

  it("sends exactly one redacted durable create notification without its draft id", async () => {
    scheduleCreateSubmissionNotification({
      draftId: "draft-secret",
      safeText: "Kontakt [E-MAIL ENTFERNT] zum Thema Rente",
      locale: "de",
    });
    await runLast();

    const sent = mocks.sendMail.mock.calls[0][0];
    expect(sent).toMatchObject({
      to: "social@edebatte.org",
      delivery: "best_effort_delivery",
      tag: "operator_create_submission",
    });
    expect(sent.mail.text).toContain("[E-MAIL ENTFERNT]");
    expect(sent.mail.text).not.toContain("draft-secret");

    const [event] = [...mocks.events.values()];
    expect(event).toMatchObject({
      deliveryStatus: "sent",
      messageId: "mail-1",
      failureCategory: null,
      mailerRetryable: false,
      attemptedCount: 1,
      deliveredCount: 1,
      failedCount: 0,
      recoveryDisposition: "confirmed_sent",
    });

    scheduleCreateSubmissionNotification({
      draftId: "draft-secret",
      safeText: "Kontakt [E-MAIL ENTFERNT] zum Thema Rente",
    });
    await runLast();
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });

  it("routes a persisted technical ticket to QA without contribution content", async () => {
    scheduleSupportTicketNotification({
      ticketNumber: "CREATE-42",
      technicalErrorCode: "CREATE_AI_FAILED",
      reason: "provider_timeout",
    });
    await runLast();
    const sent = mocks.sendMail.mock.calls[0][0];
    expect(sent).toMatchObject({
      to: "qa-auth@edebatte.org",
      tag: "operator_support_ticket",
    });
    expect(sent.mail.text).toContain("CREATE-42");
    expect(sent.mail.text).toContain("CREATE_AI_FAILED");
    expect(sent.mail.text).not.toContain("Rentenbeiträge");
  });

  it("classifies confirmed non-attempts without retrying duplicate events", async () => {
    mocks.sendMail.mockResolvedValueOnce(
      failure({
        category: "smtp_unconfigured",
        retryable: false,
        attemptedCount: 0,
        deliveredCount: 0,
        failedCount: 1,
      }) as any,
    );

    scheduleCreateSubmissionNotification({
      draftId: "draft-no-transport",
      safeText: "Redigierter Inhalt",
    });
    await runLast();

    const [event] = [...mocks.events.values()];
    expect(event).toMatchObject({
      deliveryStatus: "failed",
      failureCategory: "smtp_unconfigured",
      mailerRetryable: false,
      attemptedCount: 0,
      deliveredCount: 0,
      failedCount: 1,
      recoveryDisposition: "confirmed_not_attempted",
    });

    scheduleCreateSubmissionNotification({
      draftId: "draft-no-transport",
      safeText: "Redigierter Inhalt",
    });
    await runLast();
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });

  it("keeps attempted timeout and partial outcomes manual-review-only", async () => {
    mocks.sendMail.mockResolvedValueOnce(
      failure({
        category: "smtp_timeout",
        retryable: true,
        attemptedCount: 1,
        deliveredCount: 0,
        failedCount: 1,
      }) as any,
    );
    scheduleSupportTicketNotification({ ticketNumber: "CREATE-AMBIGUOUS" });
    await runLast();
    expect([...mocks.events.values()][0]).toMatchObject({
      deliveryStatus: "failed",
      recoveryDisposition: "ambiguous_attempted",
      attemptedCount: 1,
      deliveredCount: 0,
      failedCount: 1,
    });

    mocks.afterCallbacks.length = 0;
    mocks.events.clear();
    mocks.sendMail.mockResolvedValueOnce(
      failure({
        status: "partial",
        category: "smtp_response_error",
        retryable: false,
        attemptedCount: 2,
        deliveredCount: 1,
        failedCount: 1,
        messageId: "partial-mail",
      }) as any,
    );
    scheduleSupportTicketNotification({ ticketNumber: "CREATE-PARTIAL" });
    await runLast();
    expect([...mocks.events.values()][0]).toMatchObject({
      deliveryStatus: "partial",
      recoveryDisposition: "partial_delivery",
      attemptedCount: 2,
      deliveredCount: 1,
      failedCount: 1,
    });
  });

  it("records a definite non-retryable attempted rejection distinctly", async () => {
    mocks.sendMail.mockResolvedValueOnce(
      failure({
        category: "smtp_auth_error",
        retryable: false,
        attemptedCount: 1,
        deliveredCount: 0,
        failedCount: 1,
      }) as any,
    );
    scheduleSupportTicketNotification({ ticketNumber: "CREATE-AUTH-REJECT" });
    await runLast();
    expect([...mocks.events.values()][0]).toMatchObject({
      deliveryStatus: "failed",
      failureCategory: "smtp_auth_error",
      mailerRetryable: false,
      recoveryDisposition: "confirmed_failed_before_delivery",
    });
  });

  it("routes approved member fields and has a once-per-day digest claim", async () => {
    scheduleMemberRegistrationNotification("65f000000000000000000011");
    await runLast();
    expect(mocks.sendMail.mock.calls[0][0]).toMatchObject({
      to: "members@edebatte.org",
      tag: "operator_member_registration",
    });

    const now = new Date("2026-09-05T16:00:00.000Z");
    await expect(sendDailyOperatorDigest(now)).resolves.toMatchObject({
      ok: true,
      berlinDate: "2026-09-05",
      recoveryDisposition: "confirmed_sent",
    });
    await expect(sendDailyOperatorDigest(now)).resolves.toMatchObject({
      skipped: "already_claimed",
    });
  });

  it("persists truthful digest failure evidence and never reclaims the day", async () => {
    mocks.sendMail.mockResolvedValueOnce(
      failure({
        category: "smtp_timeout",
        retryable: true,
        attemptedCount: 1,
        deliveredCount: 0,
        failedCount: 1,
      }) as any,
    );
    const now = new Date("2026-09-05T16:00:00.000Z");

    await expect(sendDailyOperatorDigest(now)).resolves.toMatchObject({
      ok: false,
      category: "smtp_timeout",
      recoveryDisposition: "ambiguous_attempted",
    });
    expect([...mocks.digests.values()][0]).toMatchObject({
      deliveryStatus: "failed",
      failureCategory: "smtp_timeout",
      mailerRetryable: true,
      attemptedCount: 1,
      deliveredCount: 0,
      failedCount: 1,
      recoveryDisposition: "ambiguous_attempted",
    });

    await expect(sendDailyOperatorDigest(now)).resolves.toMatchObject({
      ok: true,
      skipped: "already_claimed",
    });
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });
});
