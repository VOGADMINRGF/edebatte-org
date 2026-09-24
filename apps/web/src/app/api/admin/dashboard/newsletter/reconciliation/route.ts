import { NextRequest, NextResponse } from "next/server";
import type { Collection } from "mongodb";
import { getCol, coreCol } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  normalizeNewsletterEmail,
  type NewsletterAudienceTier,
  type NewsletterPreferences,
  type NewsletterSubscriptionStatus,
} from "@features/notifications/newsletterSubscriptionContract";
import {
  reconcileNewsletterSubscription,
  type CanonicalNewsletterSubscriberState,
  type LegacyNewsletterUserState,
} from "@features/notifications/newsletterSubscriptionReconciliation";

type UserDoc = {
  _id?: unknown;
  email?: string | null;
  name?: string | null;
  newsletterOptIn?: boolean | null;
  settings?: {
    newsletterOptIn?: boolean | null;
    preferredLocale?: string | null;
  };
  preferredLocale?: string | null;
  locale?: string | null;
  roles?: Array<string | { role?: string | null }> | null;
  role?: string | null;
  accessTier?: string | null;
  tier?: string | null;
  edebatte?: { package?: string | null } | null;
  emailVerified?: boolean | null;
};

type SubscriberDoc = {
  email: string;
  userId?: string | null;
  name?: string | null;
  status: NewsletterSubscriptionStatus;
  consentVersion: string;
  consentedAt?: Date | null;
  unsubscribedAt?: Date | null;
  locale?: string | null;
  audienceTier?: NewsletterAudienceTier | null;
  preferences?: Partial<NewsletterPreferences> | null;
  confirmedAt?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

function rolesFromUser(doc: UserDoc): string[] {
  const roles = Array.isArray(doc.roles)
    ? doc.roles
        .map((entry) => (typeof entry === "string" ? entry : entry?.role ?? null))
        .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
  if (roles.length > 0) return roles;
  return doc.role ? [doc.role] : [];
}

function userIdFromDoc(doc: UserDoc): string | null {
  if (doc._id === undefined || doc._id === null) return null;
  return String(doc._id);
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const users = await getCol<UserDoc>("users");
  const subscriptions = (await coreCol("public_updates_subscribers")) as Collection<SubscriberDoc>;

  const [legacyDocs, canonicalDocs] = await Promise.all([
    users
      .find(
        {
          $or: [
            { "settings.newsletterOptIn": { $in: [true, false] } },
            { newsletterOptIn: { $in: [true, false] } },
          ],
        },
        {
          projection: {
            email: 1,
            name: 1,
            newsletterOptIn: 1,
            "settings.newsletterOptIn": 1,
            "settings.preferredLocale": 1,
            preferredLocale: 1,
            locale: 1,
            roles: 1,
            role: 1,
            accessTier: 1,
            tier: 1,
            edebatte: 1,
            emailVerified: 1,
          },
        },
      )
      .toArray(),
    subscriptions
      .find(
        {},
        {
          projection: {
            email: 1,
            userId: 1,
            name: 1,
            status: 1,
            consentVersion: 1,
            consentedAt: 1,
            unsubscribedAt: 1,
            locale: 1,
            audienceTier: 1,
            preferences: 1,
            confirmedAt: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      )
      .toArray(),
  ]);

  const legacyByEmail = new Map<string, LegacyNewsletterUserState>();
  let invalidLegacyEmails = 0;
  for (const doc of legacyDocs) {
    const email = normalizeNewsletterEmail(doc.email ?? "");
    if (!email) {
      invalidLegacyEmails += 1;
      continue;
    }
    legacyByEmail.set(email, {
      userId: userIdFromDoc(doc),
      email,
      name: doc.name ?? null,
      newsletterOptIn: doc.newsletterOptIn ?? null,
      settingsNewsletterOptIn: doc.settings?.newsletterOptIn ?? null,
      locale: doc.settings?.preferredLocale ?? doc.preferredLocale ?? doc.locale ?? null,
      roles: rolesFromUser(doc),
      accessTier: doc.accessTier ?? doc.tier ?? null,
      packageId: doc.edebatte?.package ?? null,
      emailVerified: doc.emailVerified ?? null,
    });
  }

  const canonicalByEmail = new Map<string, CanonicalNewsletterSubscriberState>();
  let invalidCanonicalEmails = 0;
  for (const doc of canonicalDocs) {
    const email = normalizeNewsletterEmail(doc.email ?? "");
    if (!email) {
      invalidCanonicalEmails += 1;
      continue;
    }
    canonicalByEmail.set(email, {
      email,
      userId: doc.userId ?? null,
      name: doc.name ?? null,
      status: doc.status,
      consentVersion: doc.consentVersion,
      consentedAt: doc.consentedAt ?? null,
      unsubscribedAt: doc.unsubscribedAt ?? null,
      locale: doc.locale ?? null,
      audienceTier: doc.audienceTier ?? null,
      preferences: doc.preferences ?? null,
      confirmedAt: doc.confirmedAt ?? null,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    });
  }

  const emails = new Set([...legacyByEmail.keys(), ...canonicalByEmail.keys()]);
  const report = {
    totalUniqueEmails: emails.size,
    canonicalTotal: canonicalByEmail.size,
    canonicalActive: 0,
    canonicalPending: 0,
    canonicalUnsubscribed: 0,
    canonicalSuppressed: 0,
    legacyTotal: legacyByEmail.size,
    legacyOptInTrue: 0,
    legacyOnlyNeedsReconfirmation: 0,
    conflictLegacyTrueCanonicalInactive: 0,
    conflictLegacyFalseCanonicalActive: 0,
    invalidLegacyEmails,
    invalidCanonicalEmails,
  };

  for (const email of emails) {
    const canonical = canonicalByEmail.get(email) ?? null;
    const legacyUser = legacyByEmail.get(email) ?? null;
    const decision = reconcileNewsletterSubscription({ canonical, legacyUser });

    if (canonical?.status === "active") report.canonicalActive += 1;
    if (canonical?.status === "pending") report.canonicalPending += 1;
    if (canonical?.status === "unsubscribed") report.canonicalUnsubscribed += 1;
    if (canonical?.status === "suppressed") report.canonicalSuppressed += 1;

    const legacyOptIn = legacyUser?.settingsNewsletterOptIn ?? legacyUser?.newsletterOptIn ?? null;
    if (legacyOptIn === true) report.legacyOptInTrue += 1;
    if (decision.migrationAction === "reconfirm_legacy_opt_in") {
      report.legacyOnlyNeedsReconfirmation += 1;
    }
    if (decision.conflict === "legacy_true_canonical_inactive") {
      report.conflictLegacyTrueCanonicalInactive += 1;
    }
    if (decision.conflict === "legacy_false_canonical_active") {
      report.conflictLegacyFalseCanonicalActive += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    mode: "read_only",
    sourceOfTruth: "public_updates_subscribers",
    legacySource: "users.newsletterOptIn",
    report,
  });
}
