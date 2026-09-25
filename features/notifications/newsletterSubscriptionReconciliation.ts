import {
  DEFAULT_NEWSLETTER_PREFERENCES,
  deriveNewsletterAudienceTier,
  mergeNewsletterPreferences,
  normalizeNewsletterEmail,
  type NewsletterAudienceTier,
  type NewsletterPreferences,
  type NewsletterSubscriptionStatus,
} from "./newsletterSubscriptionContract";

export type LegacyNewsletterUserState = {
  userId?: string | null;
  email: string;
  name?: string | null;
  newsletterOptIn?: boolean | null;
  settingsNewsletterOptIn?: boolean | null;
  locale?: string | null;
  roles?: readonly string[] | null;
  accessTier?: string | null;
  packageId?: string | null;
  emailVerified?: boolean | null;
};

export type CanonicalNewsletterSubscriberState = {
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

export type NewsletterReconciliationDecision = {
  email: string | null;
  sourceOfTruth: "canonical" | "legacy_only" | "none";
  effectiveStatus: NewsletterSubscriptionStatus | "none";
  audienceTier: NewsletterAudienceTier;
  preferences: NewsletterPreferences;
  locale: string;
  userId: string | null;
  migrationAction:
    | "none"
    | "reconfirm_legacy_opt_in"
    | "preserve_canonical"
    | "preserve_unsubscribed"
    | "preserve_suppressed";
  conflict:
    | "none"
    | "legacy_true_canonical_inactive"
    | "legacy_false_canonical_active";
};

function legacyOptIn(user?: LegacyNewsletterUserState | null): boolean | null {
  if (!user) return null;
  if (typeof user.settingsNewsletterOptIn === "boolean") return user.settingsNewsletterOptIn;
  if (typeof user.newsletterOptIn === "boolean") return user.newsletterOptIn;
  return null;
}

export function reconcileNewsletterSubscription(input: {
  canonical?: CanonicalNewsletterSubscriberState | null;
  legacyUser?: LegacyNewsletterUserState | null;
}): NewsletterReconciliationDecision {
  const { canonical, legacyUser } = input;
  const email = normalizeNewsletterEmail(canonical?.email ?? legacyUser?.email ?? "");
  const legacy = legacyOptIn(legacyUser);

  const audienceTier = canonical?.audienceTier ?? deriveNewsletterAudienceTier({
    roles: legacyUser?.roles,
    accessTier: legacyUser?.accessTier,
    packageId: legacyUser?.packageId,
  });
  const preferences = mergeNewsletterPreferences(canonical?.preferences ?? DEFAULT_NEWSLETTER_PREFERENCES);
  const locale = canonical?.locale?.trim() || legacyUser?.locale?.trim() || "de";
  const userId = canonical?.userId ?? legacyUser?.userId ?? null;

  if (canonical) {
    let migrationAction: NewsletterReconciliationDecision["migrationAction"] = "preserve_canonical";
    if (canonical.status === "unsubscribed") migrationAction = "preserve_unsubscribed";
    if (canonical.status === "suppressed") migrationAction = "preserve_suppressed";

    let conflict: NewsletterReconciliationDecision["conflict"] = "none";
    if (legacy === true && canonical.status !== "active") {
      conflict = "legacy_true_canonical_inactive";
    } else if (legacy === false && canonical.status === "active") {
      conflict = "legacy_false_canonical_active";
    }

    return {
      email,
      sourceOfTruth: "canonical",
      effectiveStatus: canonical.status,
      audienceTier,
      preferences,
      locale,
      userId,
      migrationAction,
      conflict,
    };
  }

  if (legacy === true) {
    return {
      email,
      sourceOfTruth: "legacy_only",
      effectiveStatus: "pending",
      audienceTier,
      preferences,
      locale,
      userId,
      migrationAction: "reconfirm_legacy_opt_in",
      conflict: "none",
    };
  }

  return {
    email,
    sourceOfTruth: "none",
    effectiveStatus: "none",
    audienceTier,
    preferences,
    locale,
    userId,
    migrationAction: "none",
    conflict: "none",
  };
}

export function shouldExportAsNewsletterRecipient(decision: NewsletterReconciliationDecision) {
  return decision.sourceOfTruth === "canonical" && decision.effectiveStatus === "active";
}
