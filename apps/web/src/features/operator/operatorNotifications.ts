import "server-only";

import { after } from "next/server";
import { coreCol, getCol, ObjectId } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import { sendMail, type SendMailResult } from "@/utils/mailer";
import { renderTransactionalMail } from "@/utils/mailRenderer";

export const OPERATOR_RECIPIENTS = {
  createSubmission: "social@edebatte.org",
  supportTicket: "qa-auth@edebatte.org",
  memberRegistration: "members@edebatte.org",
  dailyDigest: "rgf@voiceopengov.org",
} as const;

export type OperatorNotificationKind =
  | "create_submission"
  | "support_ticket"
  | "member_registration";

export type OperatorNotificationRecoveryDisposition =
  | "pending"
  | "confirmed_not_attempted"
  | "confirmed_failed_before_delivery"
  | "partial_delivery"
  | "ambiguous_attempted"
  | "confirmed_sent";

type DeliveryStatus = "pending" | "sent" | "partial" | "failed";

type DeliveryEvidence = {
  deliveryStatus: Exclude<DeliveryStatus, "pending">;
  messageId: string | null;
  failureCategory: string | null;
  mailerRetryable: boolean;
  attemptedCount: number;
  deliveredCount: number;
  failedCount: number;
  recoveryDisposition: Exclude<
    OperatorNotificationRecoveryDisposition,
    "pending"
  >;
};

type Event = {
  _id: string;
  kind: OperatorNotificationKind;
  recipient: string;
  subject: string;
  summary: string;
  details: Record<string, string | null>;
  berlinDate: string;
  createdAt: Date;
  deliveryStatus: DeliveryStatus;
  messageId: string | null;
  failureCategory: string | null;
  mailerRetryable: boolean | null;
  attemptedCount: number | null;
  deliveredCount: number | null;
  failedCount: number | null;
  recoveryDisposition: OperatorNotificationRecoveryDisposition;
};

type Digest = {
  _id: string;
  berlinDate: string;
  createdAt: Date;
  deliveryStatus: "claimed" | "sent" | "partial" | "failed";
  messageId: string | null;
  failureCategory: string | null;
  mailerRetryable: boolean | null;
  attemptedCount: number | null;
  deliveredCount: number | null;
  failedCount: number | null;
  recoveryDisposition: OperatorNotificationRecoveryDisposition;
};

const EVENTS = "operator_notification_events";
const DIGESTS = "operator_notification_digests";

function berlin(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

export function isBerlinDigestHour(date = new Date()) {
  return berlin(date).hour === 18;
}

function compact(value: unknown, max = 1200) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function mail(input: {
  subject: string;
  title: string;
  summary: string;
  details: Record<string, string | null>;
}) {
  return renderTransactionalMail({
    locale: "de",
    subject: input.subject,
    preheader: input.summary,
    title: input.title,
    greeting: "Interne eDebatte-Information",
    blocks: [
      { kind: "paragraph", text: input.summary },
      ...(Object.keys(input.details).length
        ? [
            {
              kind: "details" as const,
              rows: Object.entries(input.details)
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => ({ label, value: value! })),
            },
          ]
        : []),
    ],
    reason: "eine interne Betriebsbenachrichtigung für eDebatte ausgelöst wurde.",
  });
}

function recoveryDisposition(
  result: SendMailResult,
): DeliveryEvidence["recoveryDisposition"] {
  if (result.ok) return "confirmed_sent";
  if (result.status === "partial" || result.deliveredCount > 0) {
    return "partial_delivery";
  }
  if (result.attemptedCount === 0) return "confirmed_not_attempted";
  if (
    result.deliveredCount === 0 &&
    result.failedCount > 0 &&
    result.retryable === false &&
    result.messageId === null
  ) {
    return "confirmed_failed_before_delivery";
  }
  return "ambiguous_attempted";
}

function deliveryEvidence(result: SendMailResult): DeliveryEvidence {
  return {
    deliveryStatus: result.ok
      ? "sent"
      : result.status === "partial"
        ? "partial"
        : "failed",
    messageId: result.messageId ?? null,
    failureCategory: result.ok ? null : result.category,
    mailerRetryable: result.retryable,
    attemptedCount: result.attemptedCount,
    deliveredCount: result.deliveredCount,
    failedCount: result.failedCount,
    recoveryDisposition: recoveryDisposition(result),
  };
}

async function persistAndDeliver(input: {
  idempotencyKey: string;
  kind: OperatorNotificationKind;
  recipient: string;
  subject: string;
  title: string;
  summary: string;
  details?: Record<string, unknown>;
}) {
  const col = await coreCol<Event>(EVENTS);
  const now = new Date();
  const _id = stableHash({
    scope: "operator_notification",
    key: input.idempotencyKey,
  });
  const details = Object.fromEntries(
    Object.entries(input.details ?? {}).map(([key, value]) => [
      key,
      value == null ? null : compact(value, 4000),
    ]),
  );
  const record: Event = {
    _id,
    kind: input.kind,
    recipient: input.recipient,
    subject: input.subject,
    summary: compact(input.summary),
    details,
    berlinDate: berlin(now).date,
    createdAt: now,
    deliveryStatus: "pending",
    messageId: null,
    failureCategory: null,
    mailerRetryable: null,
    attemptedCount: null,
    deliveredCount: null,
    failedCount: null,
    recoveryDisposition: "pending",
  };
  const inserted = await col.updateOne(
    { _id },
    { $setOnInsert: record },
    { upsert: true },
  );
  if (!inserted.upsertedId) return;

  // Mark the external-attempt boundary durably before handing control to SMTP.
  // A crash after this point remains manual-review-required instead of being
  // mistaken for a safe automatic retry opportunity.
  await col.updateOne(
    { _id },
    { $set: { recoveryDisposition: "ambiguous_attempted" } },
  );

  const result = await sendMail({
    to: input.recipient,
    mail: mail({
      subject: record.subject,
      title: input.title,
      summary: record.summary,
      details,
    }),
    delivery: "best_effort_delivery",
    tag: `operator_${input.kind}`,
  });
  await col.updateOne({ _id }, { $set: deliveryEvidence(result) });
}

function schedule(work: () => Promise<void>) {
  try {
    after(async () => {
      try {
        await work();
      } catch (error) {
        console.error("[operator-notifications] delivery failed", error);
      }
    });
  } catch (error) {
    console.error("[operator-notifications] scheduling unavailable", error);
  }
}

export function scheduleCreateSubmissionNotification(input: {
  draftId: string;
  safeText: string;
  locale?: string | null;
}) {
  if (!compact(input.safeText)) return;
  schedule(() =>
    persistAndDeliver({
      idempotencyKey: `create:${input.draftId}`,
      kind: "create_submission",
      recipient: OPERATOR_RECIPIENTS.createSubmission,
      subject: "[eDebatte] Neuer /create-Eintrag",
      title: "Neuer Eintrag in /create",
      summary: compact(input.safeText, 4000),
      details: { Sprache: input.locale ?? null },
    }),
  );
}

export function scheduleSupportTicketNotification(input: {
  ticketNumber: string;
  technicalErrorCode?: string | null;
  provider?: string | null;
  reason?: string | null;
}) {
  schedule(() =>
    persistAndDeliver({
      idempotencyKey: `support:${input.ticketNumber}`,
      kind: "support_ticket",
      recipient: OPERATOR_RECIPIENTS.supportTicket,
      subject: `[eDebatte QA/Auth] ${input.ticketNumber}`,
      title: "Neuer technischer /create-Fall",
      summary: `Technischer Fall ${input.ticketNumber} wurde erfasst.`,
      details: {
        Ticket: input.ticketNumber,
        Fehlercode: input.technicalErrorCode ?? null,
        Provider: input.provider ?? null,
        Ursache: input.reason ?? null,
      },
    }),
  );
}

export function scheduleMemberRegistrationNotification(userId: string) {
  if (!ObjectId.isValid(userId)) return;
  schedule(async () => {
    const users = await getCol<{
      _id: ObjectId;
      email?: string | null;
      name?: string | null;
      profile?: { locale?: string | null };
    }>("users");
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1, name: 1, "profile.locale": 1 } },
    );
    if (!user) return;
    await persistAndDeliver({
      idempotencyKey: `member:${userId}`,
      kind: "member_registration",
      recipient: OPERATOR_RECIPIENTS.memberRegistration,
      subject: "[eDebatte] Neue Registrierung",
      title: "Neue Registrierung bei eDebatte",
      summary: `${compact(user.name ?? "Neue Person", 160)} hat sich registriert.`,
      details: {
        Name: compact(user.name, 160) || null,
        "E-Mail": compact(user.email, 320) || null,
        Sprache: compact(user.profile?.locale, 20) || null,
      },
    });
  });
}

export async function sendDailyOperatorDigest(now = new Date()) {
  const current = berlin(now);
  const digests = await coreCol<Digest>(DIGESTS);
  const events = await coreCol<Event>(EVENTS);
  const _id = `operator-digest:${current.date}`;
  const claim = await digests.updateOne(
    { _id },
    {
      $setOnInsert: {
        _id,
        berlinDate: current.date,
        createdAt: now,
        deliveryStatus: "claimed",
        messageId: null,
        failureCategory: null,
        mailerRetryable: null,
        attemptedCount: null,
        deliveredCount: null,
        failedCount: null,
        recoveryDisposition: "pending",
      },
    },
    { upsert: true },
  );
  if (!claim.upsertedId) {
    return {
      ok: true as const,
      skipped: "already_claimed" as const,
      berlinDate: current.date,
    };
  }

  const rows = await events
    .find({ berlinDate: current.date })
    .sort({ createdAt: 1 })
    .limit(500)
    .toArray();
  const counts = {
    create: rows.filter((event) => event.kind === "create_submission").length,
    support: rows.filter((event) => event.kind === "support_ticket").length,
    members: rows.filter((event) => event.kind === "member_registration").length,
  };

  await digests.updateOne(
    { _id },
    { $set: { recoveryDisposition: "ambiguous_attempted" } },
  );

  const result = await sendMail({
    to: OPERATOR_RECIPIENTS.dailyDigest,
    mail: mail({
      subject: `[eDebatte] Tageszusammenfassung ${current.date}`,
      title: "eDebatte Tageszusammenfassung",
      summary: `${counts.create} Create-Einträge, ${counts.members} Registrierungen, ${counts.support} Technikfälle`,
      details: {
        "Create-Einträge": String(counts.create),
        Registrierungen: String(counts.members),
        Technikfälle: String(counts.support),
      },
    }),
    delivery: "best_effort_delivery",
    tag: "operator_daily_digest",
  });
  const evidence = deliveryEvidence(result);
  await digests.updateOne({ _id }, { $set: evidence });
  return {
    ok: result.ok,
    berlinDate: current.date,
    eventCount: rows.length,
    category: result.ok ? null : result.category,
    recoveryDisposition: evidence.recoveryDisposition,
  };
}
