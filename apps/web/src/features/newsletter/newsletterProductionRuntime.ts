import crypto from "node:crypto";

import { coreCol } from "@core/db/triMongo";
import { resolveNewsletterDeliveryActivation } from "@features/notifications/newsletterDeliveryActivation";
import {
  newsletterDeliveryRetentionUntil,
  newsletterFailureProvenBeforeExternalHandoff,
  resolveNewsletterRetryDecision,
  shouldSuppressNewsletterRecipient,
} from "@features/notifications/newsletterDeliveryLifecycle";
import {
  buildNewsletterDigestPreviewForSubscriber,
  loadNewsletterCandidates,
  sendNewsletterDigestForSubscriber,
} from "./newsletterRuntime";
import { acquireNewsletterDeliveryLease } from "./newsletterDeliveryLease";

const SUBSCRIBERS_COLLECTION = "public_updates_subscribers";
const DELIVERY_COLLECTION = "newsletter_delivery_ledger";
const REQUIRED_CONSENT_VERSION = process.env.UPDATES_CONSENT_VERSION || "updates_v1";

type SubscriberDoc = Parameters<typeof buildNewsletterDigestPreviewForSubscriber>[0] & {
  suppressedAt?: Date | null;
  suppressionReason?: string | null;
};

type DeliveryDoc = {
  _id: string;
  status: "sending" | "sent" | "failed" | "skipped";
  attemptCount: number;
  retryable?: boolean | null;
  updatedAt: Date;
  failureCategory?: string | null;
  externalAttemptBoundaryAt?: Date | null;
  externalAttemptId?: string | null;
};

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}


function deliveryId(email: string, digestKey: string) {
  return digest(`${email.trim().toLowerCase()}|${digestKey}`).slice(0, 48);
}

function configuredNumber(name: string, fallback: number, min: number, max: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Math.max(min, Math.min(max, Number.isFinite(raw) ? Math.floor(raw) : fallback));
}

function deliveryBlock(existing: DeliveryDoc | null, now: Date) {
  if (!existing) return null;
  if (existing.status === "sent") {
    return { ok: true as const, status: "skipped" as const, reason: "already_sent" as const };
  }
  if (existing.status === "sending") {
    return { ok: true as const, status: "skipped" as const, reason: "ambiguous_previous_attempt" as const };
  }
  if (existing.status !== "failed") return null;

  if (!newsletterFailureProvenBeforeExternalHandoff(existing.failureCategory)) {
    return { ok: true as const, status: "skipped" as const, reason: "ambiguous_previous_attempt" as const };
  }

  const retry = resolveNewsletterRetryDecision({
    attemptCount: existing.attemptCount,
    retryable: existing.retryable,
    lastAttemptAt: existing.updatedAt,
    now,
    maxAttempts: configuredNumber("NEWSLETTER_MAX_ATTEMPTS", 4, 1, 10),
    baseBackoffMinutes: configuredNumber("NEWSLETTER_RETRY_BASE_MINUTES", 15, 5, 120),
  });
  if (retry.allowed) return null;
  return {
    ok: true as const,
    status: "skipped" as const,
    reason: retry.reason,
    nextAttemptAt: retry.nextAttemptAt?.toISOString() ?? null,
  };
}

export async function cleanupNewsletterDeliveryLedger(now = new Date()) {
  const ledger = await coreCol<DeliveryDoc>(DELIVERY_COLLECTION);
  const retentionUntil = newsletterDeliveryRetentionUntil({
    from: now,
    retentionDays: configuredNumber("NEWSLETTER_LEDGER_RETENTION_DAYS", 180, 30, 730),
  });
  const retentionMs = retentionUntil.getTime() - now.getTime();
  const cutoff = new Date(now.getTime() - retentionMs);
  const result = await ledger.deleteMany({
    status: { $in: ["sent", "failed", "skipped"] },
    updatedAt: { $lt: cutoff },
  } as never);
  return { deleted: result.deletedCount ?? 0, cutoff };
}

async function maybeSuppressHardFailure(subscriber: SubscriberDoc, category: string | null | undefined) {
  if (!category || !shouldSuppressNewsletterRecipient(category as Parameters<typeof shouldSuppressNewsletterRecipient>[0])) {
    return false;
  }
  const subscribers = await coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION);
  const now = new Date();
  await subscribers.updateOne(
    { email: subscriber.email, status: { $ne: "unsubscribed" } } as never,
    {
      $set: {
        status: "suppressed",
        suppressedAt: now,
        suppressionReason: `delivery:${category}`,
        updatedAt: now,
      },
    } as never,
  );
  return true;
}

export async function setNewsletterOperatorSuppression(input: {
  email: string;
  suppressed: boolean;
  reason?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false as const, error: "invalid_email" };
  const subscribers = await coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION);
  const existing = await subscribers.findOne({ email });
  if (!existing) return { ok: false as const, error: "subscriber_not_found" };
  const now = new Date();

  if (input.suppressed) {
    await subscribers.updateOne(
      { email },
      {
        $set: {
          status: "suppressed",
          suppressedAt: now,
          suppressionReason: input.reason?.trim() || "operator",
          updatedAt: now,
        },
      } as never,
    );
  } else {
    if (existing.status !== "suppressed") return { ok: true as const, changed: false };
    await subscribers.updateOne(
      { email, status: "suppressed" } as never,
      {
        $set: {
          status: "unsubscribed",
          updatedAt: now,
        },
        $unset: {
          suppressedAt: "",
          suppressionReason: "",
        },
      } as never,
    );
  }

  return { ok: true as const, changed: true };
}

async function deliverOne(subscriber: SubscriberDoc, candidates: Awaited<ReturnType<typeof loadNewsletterCandidates>>, now: Date) {
  const preview = await buildNewsletterDigestPreviewForSubscriber(subscriber, { now, candidates });
  if (!preview.deliveryAllowed || !preview.digestKey) {
    return { ok: true as const, status: "skipped" as const, reason: preview.deliveryReason };
  }

  const ledger = await coreCol<DeliveryDoc>(DELIVERY_COLLECTION);
  const id = deliveryId(preview.email, preview.digestKey);
  const initialBlock = deliveryBlock(await ledger.findOne({ _id: id }), now);
  if (initialBlock) return initialBlock;

  // A deterministic digest lease closes concurrent workers around the send boundary.
  const lease = await acquireNewsletterDeliveryLease({ id, now });
  if (!lease.acquired) {
    return {
      ok: true as const,
      status: "skipped" as const,
      reason: lease.reason,
    };
  }

  try {
    // Consent/status/preferences are re-read only after the lease is held. The batch
    // selection snapshot never authorizes an external handoff on its own.
    let freshSubscriber: SubscriberDoc | null;
    try {
      const subscribers = await coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION);
      freshSubscriber = await subscribers.findOne({ email: preview.email.trim().toLowerCase() });
    } catch {
      return { ok: false as const, status: "blocked" as const, reason: "subscriber_state_unavailable" as const };
    }
    if (!freshSubscriber) {
      return { ok: false as const, status: "blocked" as const, reason: "subscriber_not_found" as const };
    }

    const freshPreview = await buildNewsletterDigestPreviewForSubscriber(freshSubscriber, { now, candidates });
    if (!freshPreview.deliveryAllowed || !freshPreview.digestKey) {
      return { ok: true as const, status: "skipped" as const, reason: freshPreview.deliveryReason };
    }
    if (
      freshPreview.email !== preview.email ||
      freshPreview.digestKey !== preview.digestKey ||
      freshPreview.candidateIds.join("|") !== preview.candidateIds.join("|")
    ) {
      return { ok: true as const, status: "skipped" as const, reason: "subscriber_state_changed" as const };
    }

    // Missing unsubscribe configuration is a known local block and must be detected
    // before the durable external-attempt boundary is crossed.
    if (!String(process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ?? "").trim()) {
      return { ok: false as const, status: "blocked" as const, reason: "unsubscribe_secret_missing" as const };
    }

    // Re-check under the lease in case another historical/manual writer completed or
    // exposed an ambiguous attempt between the first ledger read and lease acquisition.
    const leasedBlock = deliveryBlock(await ledger.findOne({ _id: id }), now);
    if (leasedBlock) return leasedBlock;

    try {
      const result = await sendNewsletterDigestForSubscriber(freshSubscriber, {
        now,
        candidates,
        expectedEmail: freshPreview.email,
        expectedDigestKey: freshPreview.digestKey,
        expectedCandidateIds: freshPreview.candidateIds,
      });
      if (result.status === "failed" && "delivery" in result) {
        await maybeSuppressHardFailure(freshSubscriber, result.delivery.category);
      }
      return result;
    } catch {
      // The canonical sender persists the durable `sending` boundary before SMTP.
      // Any exception here is therefore reconciled conservatively and never auto-replayed.
      return { ok: false as const, status: "blocked" as const, reason: "ambiguous_delivery_state" as const };
    }
  } finally {
    await lease.release();
  }
}

export async function runNewsletterProductionBatch(options: { now?: Date; limit?: number } = {}) {
  const activation = resolveNewsletterDeliveryActivation(process.env.NEWSLETTER_DELIVERY_ENABLED);
  if (!activation.enabled) {
    return {
      ok: true as const,
      deliveryEnabled: false as const,
      status: activation.reason,
      checked: 0,
      candidates: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      reasons: { [activation.reason]: 1 },
      cleanup: null,
    };
  }

  const now = options.now ?? new Date();
  const limit = Math.max(1, Math.min(500, options.limit ?? configuredNumber("NEWSLETTER_BATCH_SIZE", 100, 1, 500)));
  const concurrency = configuredNumber("NEWSLETTER_SEND_CONCURRENCY", 4, 1, 10);
  const [subscribers, candidates] = await Promise.all([
    coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION),
    loadNewsletterCandidates(now),
  ]);
  const docs = await subscribers
    .find({ status: "active", consentVersion: REQUIRED_CONSENT_VERSION } as never)
    .sort({ lastSentAt: 1, confirmedAt: 1 })
    .limit(limit)
    .toArray();

  const results: Array<Awaited<ReturnType<typeof deliverOne>>> = [];
  for (let index = 0; index < docs.length; index += concurrency) {
    results.push(...(await Promise.all(docs.slice(index, index + concurrency).map((subscriber) => deliverOne(subscriber, candidates, now)))));
  }

  const cleanup = await cleanupNewsletterDeliveryLedger(now);
  return {
    ok: results.every((result) => result.ok),
    deliveryEnabled: true as const,
    status: "ran" as const,
    checked: docs.length,
    candidates: candidates.length,
    sent: results.filter((result) => result.status === "sent").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed" || result.status === "blocked").length,
    reasons: results.reduce<Record<string, number>>((acc, result) => {
      const reason = "reason" in result ? String(result.reason ?? result.status) : result.status;
      acc[reason] = (acc[reason] ?? 0) + 1;
      return acc;
    }, {}),
    cleanup: { deleted: cleanup.deleted, cutoff: cleanup.cutoff.toISOString() },
  };
}

export async function getNewsletterLifecycleSnapshot(now = new Date()) {
  const ledger = await coreCol<DeliveryDoc>(DELIVERY_COLLECTION);
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [failed, sending, ambiguous, exhaustedCandidates] = await Promise.all([
    ledger.countDocuments({ status: "failed", updatedAt: { $gte: since } } as never),
    ledger.countDocuments({ status: "sending", updatedAt: { $gte: new Date(now.getTime() - 15 * 60 * 1000) } } as never),
    ledger.countDocuments({
      updatedAt: { $gte: since },
      $or: [
        { status: "sending" },
        {
          status: "failed",
          failureCategory: {
            $nin: [
              "recipient_invalid",
              "recipient_placeholder_domain",
              "recipient_test_domain_blocked",
              "recipient_domain_not_allowed",
              "mail_content_invalid",
              "sender_configuration_invalid",
              "smtp_unconfigured",
            ],
          },
        },
      ],
    } as never),
    ledger.find({ status: "failed", retryable: true, updatedAt: { $gte: since } } as never).limit(200).toArray(),
  ]);
  const maxAttempts = configuredNumber("NEWSLETTER_MAX_ATTEMPTS", 4, 1, 10);
  return {
    deliveryActivation: resolveNewsletterDeliveryActivation(process.env.NEWSLETTER_DELIVERY_ENABLED),
    failed7d: failed,
    inProgress: sending,
    ambiguous7d: ambiguous,
    retryExhausted7d: exhaustedCandidates.filter((entry) => entry.attemptCount >= maxAttempts).length,
    maxAttempts,
    retryBaseMinutes: configuredNumber("NEWSLETTER_RETRY_BASE_MINUTES", 15, 5, 120),
    retentionDays: configuredNumber("NEWSLETTER_LEDGER_RETENTION_DAYS", 180, 30, 730),
    asynchronousBounceFeedback: "not_available_via_generic_smtp" as const,
  };
}
