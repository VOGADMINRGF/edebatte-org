export const NEWSLETTER_CHANNELS = ["email"] as const;
export type NewsletterChannel = (typeof NEWSLETTER_CHANNELS)[number];

export const NEWSLETTER_FREQUENCIES = [
  "important_only",
  "daily",
  "weekly",
] as const;
export type NewsletterFrequency = (typeof NEWSLETTER_FREQUENCIES)[number];

export const NEWSLETTER_AUDIENCE_TIERS = [
  "public",
  "member",
  "plus",
  "pro",
  "organization",
  "staff",
] as const;
export type NewsletterAudienceTier = (typeof NEWSLETTER_AUDIENCE_TIERS)[number];

export const NEWSLETTER_SUBSCRIPTION_STATUSES = [
  "pending",
  "active",
  "unsubscribed",
  "suppressed",
] as const;
export type NewsletterSubscriptionStatus =
  (typeof NEWSLETTER_SUBSCRIPTION_STATUSES)[number];

export type NewsletterPreferences = {
  frequency: NewsletterFrequency;
  productUpdates: boolean;
  topicUpdates: boolean;
  regionUpdates: boolean;
  watchlistUpdates: boolean;
  ownWorkUpdates: boolean;
  importantAlerts: boolean;
  topicKeys: string[];
  regionKeys: string[];
};

export type NewsletterSubscription = {
  email: string;
  userId?: string | null;
  status: NewsletterSubscriptionStatus;
  consentVersion: string;
  consentedAt?: Date | null;
  unsubscribedAt?: Date | null;
  locale: string;
  channel: NewsletterChannel;
  audienceTier: NewsletterAudienceTier;
  preferences: NewsletterPreferences;
  lastSentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewsletterEligibilityInput = Pick<
  NewsletterSubscription,
  "status" | "consentVersion" | "channel" | "email"
> & {
  requiredConsentVersion: string;
  emailVerified?: boolean;
  suppressed?: boolean;
};

export type NewsletterEligibility = {
  eligible: boolean;
  reason:
    | "eligible"
    | "invalid_email"
    | "not_active"
    | "consent_version_mismatch"
    | "suppressed"
    | "email_not_verified";
};

export const DEFAULT_NEWSLETTER_PREFERENCES: NewsletterPreferences = {
  frequency: "weekly",
  productUpdates: true,
  topicUpdates: true,
  regionUpdates: true,
  watchlistUpdates: true,
  ownWorkUpdates: true,
  importantAlerts: true,
  topicKeys: [],
  regionKeys: [],
};

export function normalizeNewsletterEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  return email;
}

export function resolveNewsletterEligibility(
  input: NewsletterEligibilityInput,
): NewsletterEligibility {
  if (!normalizeNewsletterEmail(input.email)) {
    return { eligible: false, reason: "invalid_email" };
  }
  if (input.suppressed === true || input.status === "suppressed") {
    return { eligible: false, reason: "suppressed" };
  }
  if (input.status !== "active") {
    return { eligible: false, reason: "not_active" };
  }
  if (!input.consentVersion || input.consentVersion !== input.requiredConsentVersion) {
    return { eligible: false, reason: "consent_version_mismatch" };
  }
  if (input.emailVerified === false) {
    return { eligible: false, reason: "email_not_verified" };
  }
  return { eligible: true, reason: "eligible" };
}

export function deriveNewsletterAudienceTier(input: {
  roles?: readonly string[] | null;
  accessTier?: string | null;
  packageId?: string | null;
}): NewsletterAudienceTier {
  const roles = new Set((input.roles ?? []).map((value) => value.toLowerCase()));
  if (roles.has("admin") || roles.has("superadmin") || roles.has("staff") || roles.has("moderator")) {
    return "staff";
  }

  const packageId = (input.packageId ?? "").toLowerCase();
  const accessTier = (input.accessTier ?? "").toLowerCase();

  if (
    packageId.startsWith("b2b_") ||
    packageId.startsWith("b2g_") ||
    accessTier.startsWith("institution")
  ) {
    return "organization";
  }
  if (packageId === "pro" || accessTier === "citizenpro" || accessTier === "citizenultra") {
    return "pro";
  }
  if (
    packageId === "start" ||
    accessTier === "citizenpremium"
  ) {
    return "plus";
  }
  if (packageId === "basis" || accessTier === "citizenbasic") {
    return "member";
  }
  return "public";
}

export function mergeNewsletterPreferences(
  value?: Partial<NewsletterPreferences> | null,
): NewsletterPreferences {
  const frequency = NEWSLETTER_FREQUENCIES.includes(value?.frequency as NewsletterFrequency)
    ? (value?.frequency as NewsletterFrequency)
    : DEFAULT_NEWSLETTER_PREFERENCES.frequency;

  return {
    frequency,
    productUpdates: value?.productUpdates ?? DEFAULT_NEWSLETTER_PREFERENCES.productUpdates,
    topicUpdates: value?.topicUpdates ?? DEFAULT_NEWSLETTER_PREFERENCES.topicUpdates,
    regionUpdates: value?.regionUpdates ?? DEFAULT_NEWSLETTER_PREFERENCES.regionUpdates,
    watchlistUpdates: value?.watchlistUpdates ?? DEFAULT_NEWSLETTER_PREFERENCES.watchlistUpdates,
    ownWorkUpdates: value?.ownWorkUpdates ?? DEFAULT_NEWSLETTER_PREFERENCES.ownWorkUpdates,
    importantAlerts: value?.importantAlerts ?? DEFAULT_NEWSLETTER_PREFERENCES.importantAlerts,
    topicKeys: Array.from(new Set((value?.topicKeys ?? []).map((entry) => entry.trim()).filter(Boolean))),
    regionKeys: Array.from(new Set((value?.regionKeys ?? []).map((entry) => entry.trim()).filter(Boolean))),
  };
}
