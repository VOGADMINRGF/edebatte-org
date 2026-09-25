import { coreCol } from "@core/db/triMongo";

const SUBSCRIBERS_COLLECTION = "public_updates_subscribers";
const REQUIRED_CONSENT_VERSION = process.env.UPDATES_CONSENT_VERSION || "updates_v1";

type CanonicalNewsletterSubscriber = {
  _id?: unknown;
  email: string;
  userId?: string | null;
  status?: "pending" | "active" | "unsubscribed" | "suppressed" | null;
  consentVersion?: string | null;
  unsubscribedAt?: Date | null;
  updatedAt?: Date | null;
};

function normalizedEmail(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

async function findCanonicalSubscriber(input: { userId: string; email?: string | null }) {
  const subscribers = await coreCol<CanonicalNewsletterSubscriber>(SUBSCRIBERS_COLLECTION);
  const byUserId = await subscribers.findOne({ userId: input.userId } as never);
  if (byUserId) return { subscribers, subscriber: byUserId };
  const email = normalizedEmail(input.email);
  if (!email) return { subscribers, subscriber: null };
  return { subscribers, subscriber: await subscribers.findOne({ email } as never) };
}

function isActiveCanonicalSubscription(subscriber: CanonicalNewsletterSubscriber | null) {
  return Boolean(
    subscriber &&
      subscriber.status === "active" &&
      subscriber.consentVersion === REQUIRED_CONSENT_VERSION,
  );
}

export async function readCanonicalNewsletterOptIn(input: { userId: string; email?: string | null }) {
  const { subscriber } = await findCanonicalSubscriber(input);
  return isActiveCanonicalSubscription(subscriber);
}

export async function applyAccountNewsletterPreference(input: {
  userId: string;
  email?: string | null;
  optIn: boolean;
  now?: Date;
}) {
  const { subscribers, subscriber } = await findCanonicalSubscriber(input);
  const active = isActiveCanonicalSubscription(subscriber);

  if (input.optIn) {
    return {
      active,
      reconfirmationRequired: !active,
      changed: false,
    };
  }

  if (!subscriber || subscriber.status === "suppressed") {
    return { active: false, reconfirmationRequired: false, changed: false };
  }

  const now = input.now ?? new Date();
  const selector = subscriber._id
    ? { _id: subscriber._id }
    : { email: normalizedEmail(subscriber.email), status: { $ne: "suppressed" } };
  const result = await subscribers.updateOne(
    selector as never,
    {
      $set: {
        status: "unsubscribed",
        unsubscribedAt: now,
        updatedAt: now,
      },
    },
  );
  return { active: false, reconfirmationRequired: false, changed: result.matchedCount === 1 };
}
