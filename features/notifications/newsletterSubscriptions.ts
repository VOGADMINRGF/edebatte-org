import { getCol } from "@core/db/triMongo";

export type NewsletterSubscriptionStatus = "pending" | "active" | "unsubscribed";
export type NewsletterBriefingLevel = "standard" | "personalized" | "deep";

export type NewsletterSubscriber = {
  email: string;
  name: string | null;
  createdAt: Date | null;
  locale: string | null;
  status: NewsletterSubscriptionStatus;
  sources: string[];
  userId: string | null;
  briefingLevel: NewsletterBriefingLevel;
};

type CanonicalSubscriberDoc = {
  email?: string | null;
  name?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  locale?: string | null;
  status?: NewsletterSubscriptionStatus | string | null;
  source?: string | null;
  userId?: string | null;
  consentVersion?: string | null;
  confirmedAt?: Date | null;
  unsubscribedAt?: Date | null;
  confirmTokenHash?: string | null;
  confirmTokenExpiresAt?: Date | null;
};

type LegacyUserDoc = {
  _id?: unknown;
  email?: string | null;
  name?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  accessTier?: string | null;
  tier?: string | null;
  b2cPlanId?: string | null;
  edebatte?: { package?: string | null } | null;
  profile?: { locale?: string | null } | null;
  settings?: {
    newsletterOptIn?: boolean | null;
    preferredLocale?: string | null;
    uiLocale?: string | null;
    readingLocale?: string | null;
  } | null;
  newsletterOptIn?: boolean | null;
};

export function normalizeNewsletterEmail(value?: string | null): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

function normalizeStatus(value?: string | null): NewsletterSubscriptionStatus {
  if (value === "active" || value === "unsubscribed") return value;
  return "pending";
}

function toDate(value?: Date | null): Date | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
}

export function deriveNewsletterBriefingLevel(user?: LegacyUserDoc | null): NewsletterBriefingLevel {
  if (!user) return "standard";
  const keys = [user.accessTier, user.tier, user.b2cPlanId, user.edebatte?.package]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase());

  if (keys.some((key) => key === "citizenpro" || key === "citizenultra" || key === "pro")) {
    return "deep";
  }
  if (keys.some((key) => key === "citizenpremium" || key === "plus" || key === "start")) {
    return "personalized";
  }
  return "standard";
}

export function mergeNewsletterSubscriberTruth(input: {
  legacyUsers: LegacyUserDoc[];
  canonicalSubscribers: CanonicalSubscriberDoc[];
}): NewsletterSubscriber[] {
  const merged = new Map<string, NewsletterSubscriber>();

  for (const user of input.legacyUsers) {
    const email = normalizeNewsletterEmail(user.email);
    const optedIn = user.settings?.newsletterOptIn === true || user.newsletterOptIn === true;
    if (!email || !optedIn) continue;

    merged.set(email, {
      email,
      name: user.name?.trim() || null,
      createdAt: toDate(user.createdAt),
      locale:
        user.settings?.readingLocale?.trim() ||
        user.settings?.preferredLocale?.trim() ||
        user.settings?.uiLocale?.trim() ||
        user.profile?.locale?.trim() ||
        null,
      status: "active",
      sources: ["legacy_user_opt_in"],
      userId: user._id ? String(user._id) : null,
      briefingLevel: deriveNewsletterBriefingLevel(user),
    });
  }

  // Canonical public_updates_subscribers state always wins over the legacy user mirror.
  // In particular, pending/unsubscribed must suppress an older legacy opt-in.
  for (const doc of input.canonicalSubscribers) {
    const email = normalizeNewsletterEmail(doc.email);
    if (!email) continue;
    const previous = merged.get(email);
    const source = doc.source?.trim() || "public_updates";

    merged.set(email, {
      email,
      name: doc.name?.trim() || previous?.name || null,
      createdAt: toDate(doc.createdAt) ?? previous?.createdAt ?? null,
      locale: doc.locale?.trim() || previous?.locale || null,
      status: normalizeStatus(doc.status),
      sources: Array.from(new Set([...(previous?.sources ?? []), source])),
      userId: doc.userId?.trim() || previous?.userId || null,
      briefingLevel: previous?.briefingLevel ?? "standard",
    });
  }

  return [...merged.values()].sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime || a.email.localeCompare(b.email);
  });
}

export async function listCanonicalNewsletterSubscribers(options?: {
  includeInactive?: boolean;
}): Promise<NewsletterSubscriber[]> {
  const users = await getCol<LegacyUserDoc>("users");
  const subscribers = await getCol<CanonicalSubscriberDoc>("public_updates_subscribers");

  const [legacyUsers, canonicalSubscribers] = await Promise.all([
    users
      .find(
        {
          $or: [
            { "settings.newsletterOptIn": true },
            { newsletterOptIn: true },
          ],
        },
        {
          projection: {
            email: 1,
            name: 1,
            createdAt: 1,
            accessTier: 1,
            tier: 1,
            b2cPlanId: 1,
            edebatte: 1,
            profile: 1,
            settings: 1,
            newsletterOptIn: 1,
          },
        },
      )
      .toArray(),
    subscribers
      .find(
        {},
        {
          projection: {
            email: 1,
            name: 1,
            createdAt: 1,
            updatedAt: 1,
            locale: 1,
            status: 1,
            source: 1,
            userId: 1,
          },
        },
      )
      .toArray(),
  ]);

  const merged = mergeNewsletterSubscriberTruth({ legacyUsers, canonicalSubscribers });
  return options?.includeInactive ? merged : merged.filter((entry) => entry.status === "active");
}

export async function setAdminNewsletterSubscription(input: {
  email: string;
  name?: string | null;
  subscribe: boolean;
}): Promise<{ ok: true; entry: NewsletterSubscriber | null } | { ok: false; reason: "explicit_unsubscribe" }> {
  const email = normalizeNewsletterEmail(input.email);
  if (!email) throw new Error("invalid_email");

  const users = await getCol<LegacyUserDoc>("users");
  const subscribers = await getCol<CanonicalSubscriberDoc>("public_updates_subscribers");
  const now = new Date();
  const existingCanonical = await subscribers.findOne({ email });

  if (input.subscribe && existingCanonical?.status === "unsubscribed") {
    return { ok: false, reason: "explicit_unsubscribe" };
  }

  const existingUser = await users.findOne({ email });
  if (input.subscribe) {
    await users.updateOne(
      { email },
      {
        $set: {
          email,
          name: input.name?.trim() || existingUser?.name || null,
          "settings.newsletterOptIn": true,
          newsletterOptIn: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    await subscribers.updateOne(
      { email },
      {
        $set: {
          email,
          name: input.name?.trim() || existingCanonical?.name || existingUser?.name || null,
          status: "active",
          source: "admin_recorded",
          consentVersion: "admin_recorded_v1",
          confirmedAt: existingCanonical?.status === "active" ? existingCanonical.confirmedAt ?? now : now,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  } else {
    if (existingUser) {
      await users.updateOne(
        { email },
        {
          $set: {
            "settings.newsletterOptIn": false,
            newsletterOptIn: false,
            updatedAt: now,
          },
        },
      );
    }
    await subscribers.updateOne(
      { email },
      {
        $set: {
          email,
          name: input.name?.trim() || existingCanonical?.name || existingUser?.name || null,
          status: "unsubscribed",
          source: "admin_suppression",
          unsubscribedAt: now,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
        $unset: { confirmTokenHash: "", confirmTokenExpiresAt: "" },
      },
      { upsert: true },
    );
  }

  const entries = await listCanonicalNewsletterSubscribers({ includeInactive: true });
  return { ok: true, entry: entries.find((entry) => entry.email === email) ?? null };
}
