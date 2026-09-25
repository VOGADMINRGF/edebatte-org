import crypto from "node:crypto";

import { coreCol } from "@core/db/triMongo";

const SUBSCRIBERS_COLLECTION = "public_updates_subscribers";
const DEFAULT_SEND_LOCK_MS = 2 * 60 * 1000;
const DEFAULT_MUTATION_WAIT_MS = 5_000;
const RETRY_DELAY_MS = 50;

export type NewsletterSubscriberCoordinationLock = {
  token: string;
  acquiredAt: Date;
  expiresAt: Date;
  purpose: "send" | "mutation";
};

type SubscriberCoordinationDoc = {
  email: string;
  userId?: string | null;
  status?: "pending" | "active" | "unsubscribed" | "suppressed" | string | null;
  consentVersion?: string | null;
  sendCoordinationLock?: NewsletterSubscriberCoordinationLock | null;
};

export type NewsletterSubscriberCoordinationStore = {
  tryAcquire(input: {
    email?: string | null;
    userId?: string | null;
    token: string;
    purpose: "send" | "mutation";
    now: Date;
    expiresAt: Date;
    requiredConsentVersion?: string | null;
  }): Promise<"acquired" | "busy" | "not_found" | "not_eligible">;
  release(input: { token: string }): Promise<void>;
};

function identityFilter(input: { email?: string | null; userId?: string | null }) {
  const email = input.email?.trim().toLowerCase() || null;
  const userId = input.userId?.trim() || null;
  if (email && userId) return { $or: [{ email }, { userId }] };
  if (email) return { email };
  if (userId) return { userId };
  return null;
}

function availableLockFilter(now: Date) {
  return {
    $or: [
      { sendCoordinationLock: { $exists: false } },
      { sendCoordinationLock: null },
      { "sendCoordinationLock.expiresAt": { $lte: now } },
    ],
  };
}

function mongoStore(): NewsletterSubscriberCoordinationStore {
  return {
    async tryAcquire(input) {
      const identity = identityFilter(input);
      if (!identity) return "not_found";
      const subscribers = await coreCol<SubscriberCoordinationDoc>(SUBSCRIBERS_COLLECTION);
      const eligibility =
        input.purpose === "send"
          ? {
              status: "active",
              consentVersion: input.requiredConsentVersion,
            }
          : {};
      const acquired = await subscribers.findOneAndUpdate(
        {
          ...identity,
          ...eligibility,
          ...availableLockFilter(input.now),
        } as never,
        {
          $set: {
            sendCoordinationLock: {
              token: input.token,
              purpose: input.purpose,
              acquiredAt: input.now,
              expiresAt: input.expiresAt,
            },
          },
        } as never,
        { returnDocument: "after" },
      );
      if (acquired) return "acquired";

      const current = await subscribers.findOne(identity as never);
      if (!current) return "not_found";
      if (
        input.purpose === "send" &&
        (current.status !== "active" || current.consentVersion !== input.requiredConsentVersion)
      ) {
        return "not_eligible";
      }
      return "busy";
    },
    async release(input) {
      const subscribers = await coreCol<SubscriberCoordinationDoc>(SUBSCRIBERS_COLLECTION);
      await subscribers.updateOne(
        { "sendCoordinationLock.token": input.token } as never,
        { $unset: { sendCoordinationLock: "" } } as never,
      );
    },
  };
}

function clampSendLockMs(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SEND_LOCK_MS;
  return Math.max(30_000, Math.min(10 * 60 * 1000, Math.floor(value)));
}

function clampWaitMs(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_MUTATION_WAIT_MS;
  return Math.max(0, Math.min(15_000, Math.floor(value)));
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function acquireNewsletterSubscriberCoordination(input: {
  email?: string | null;
  userId?: string | null;
  purpose: "send" | "mutation";
  requiredConsentVersion?: string | null;
  now?: Date;
  lockMs?: number;
  waitMs?: number;
  store?: NewsletterSubscriberCoordinationStore;
}) {
  const email = input.email?.trim().toLowerCase() || null;
  const userId = input.userId?.trim() || null;
  if (!email && !userId) {
    return { acquired: false as const, reason: "subscriber_identity_required" as const };
  }
  if (input.purpose === "send" && !input.requiredConsentVersion) {
    return { acquired: false as const, reason: "consent_version_required" as const };
  }

  const store = input.store ?? mongoStore();
  const startedAt = input.now ?? new Date();
  const waitMs = input.purpose === "mutation" ? clampWaitMs(input.waitMs ?? DEFAULT_MUTATION_WAIT_MS) : 0;
  const lockMs = clampSendLockMs(input.lockMs ?? Number(process.env.NEWSLETTER_SEND_BOUNDARY_LOCK_MS || DEFAULT_SEND_LOCK_MS));
  const deadline = startedAt.getTime() + waitMs;
  const token = crypto.randomUUID();

  while (true) {
    const now =
      input.purpose === "send"
        ? new Date(Math.max(Date.now(), input.now?.getTime() ?? 0))
        : input.now ?? new Date();
    const expiresAt = new Date(now.getTime() + lockMs);
    const result = await store.tryAcquire({
      email,
      userId,
      token,
      purpose: input.purpose,
      now,
      expiresAt,
      requiredConsentVersion: input.requiredConsentVersion ?? null,
    });
    if (result === "acquired") {
      return {
        acquired: true as const,
        token,
        expiresAt,
        release: () => store.release({ token }),
      };
    }
    if (result === "not_found") {
      return { acquired: false as const, reason: "subscriber_not_found" as const };
    }
    if (result === "not_eligible") {
      return { acquired: false as const, reason: "subscriber_not_eligible" as const };
    }
    if (input.purpose !== "mutation" || now.getTime() >= deadline) {
      return { acquired: false as const, reason: "subscriber_coordination_busy" as const };
    }
    await delay(Math.min(RETRY_DELAY_MS, Math.max(1, deadline - now.getTime())));
  }
}

type NewsletterCandidateRevision = {
  id: string;
  title: string;
  summary: string;
  href: string;
  updatedAt?: Date | string | null;
  verificationLabel?: string | null;
  limitations?: string[] | null;
};

export function newsletterCandidateRevisionFingerprint(candidate: NewsletterCandidateRevision) {
  const updatedAt = candidate.updatedAt instanceof Date
    ? candidate.updatedAt.toISOString()
    : candidate.updatedAt == null
      ? null
      : String(candidate.updatedAt);
  const payload = JSON.stringify({
    id: candidate.id,
    title: candidate.title,
    summary: candidate.summary,
    href: candidate.href,
    updatedAt,
    verificationLabel: candidate.verificationLabel ?? null,
    limitations: [...(candidate.limitations ?? [])],
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function newsletterCandidateSnapshotMatches(
  expected: NewsletterCandidateRevision[],
  current: NewsletterCandidateRevision[],
) {
  if (expected.length !== current.length) return false;
  const currentById = new Map(current.map((candidate) => [candidate.id, candidate]));
  return expected.every((candidate) => {
    const latest = currentById.get(candidate.id);
    return Boolean(
      latest &&
        newsletterCandidateRevisionFingerprint(latest) === newsletterCandidateRevisionFingerprint(candidate),
    );
  });
}

export function createInMemoryNewsletterSubscriberCoordinationStore(
  records: SubscriberCoordinationDoc[],
): NewsletterSubscriberCoordinationStore {
  const docs = records.map((record) => ({ ...record }));
  return {
    async tryAcquire(input) {
      const record = docs.find((entry) => {
        const email = input.email?.trim().toLowerCase();
        return (email && entry.email.trim().toLowerCase() === email) || (input.userId && entry.userId === input.userId);
      });
      if (!record) return "not_found";
      if (
        input.purpose === "send" &&
        (record.status !== "active" || record.consentVersion !== input.requiredConsentVersion)
      ) {
        return "not_eligible";
      }
      if (record.sendCoordinationLock && record.sendCoordinationLock.expiresAt.getTime() > input.now.getTime()) {
        return "busy";
      }
      record.sendCoordinationLock = {
        token: input.token,
        purpose: input.purpose,
        acquiredAt: new Date(input.now),
        expiresAt: new Date(input.expiresAt),
      };
      return "acquired";
    },
    async release(input) {
      const record = docs.find((entry) => entry.sendCoordinationLock?.token === input.token);
      if (record) record.sendCoordinationLock = null;
    },
  };
}
