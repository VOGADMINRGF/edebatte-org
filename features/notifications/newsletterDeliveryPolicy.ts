import type { NewsletterAudienceTier, NewsletterFrequency } from "./newsletterSubscriptionContract";

export type NewsletterDeliveryPolicyInput = {
  frequency: NewsletterFrequency;
  audienceTier: NewsletterAudienceTier;
  isCritical?: boolean;
  now: Date;
  lastSentAt?: Date | string | null;
  lastCandidateIds?: readonly string[] | null;
  candidateId: string;
  quietHours?: {
    enabled: boolean;
    startHourLocal: number;
    endHourLocal: number;
    localHour: number;
  } | null;
};

export type NewsletterDeliveryPolicyDecision = {
  allowed: boolean;
  reason:
    | "allowed"
    | "duplicate"
    | "quiet_hours"
    | "daily_cap"
    | "weekly_cap";
};

function toDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursSince(now: Date, previous: Date) {
  return (now.getTime() - previous.getTime()) / (60 * 60 * 1000);
}

function insideQuietHours(input: NonNullable<NewsletterDeliveryPolicyInput["quietHours"]>) {
  if (!input.enabled) return false;
  const start = Math.max(0, Math.min(23, Math.floor(input.startHourLocal)));
  const end = Math.max(0, Math.min(23, Math.floor(input.endHourLocal)));
  const hour = Math.max(0, Math.min(23, Math.floor(input.localHour)));
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/**
 * This policy is pure/read-only. It does not schedule or send anything.
 * Audience tier can affect briefing depth later, but not bypass consent,
 * duplicate protection or quiet-hour safeguards.
 */
export function resolveNewsletterDeliveryPolicy(
  input: NewsletterDeliveryPolicyInput,
): NewsletterDeliveryPolicyDecision {
  if ((input.lastCandidateIds ?? []).includes(input.candidateId)) {
    return { allowed: false, reason: "duplicate" };
  }

  if (!input.isCritical && input.quietHours && insideQuietHours(input.quietHours)) {
    return { allowed: false, reason: "quiet_hours" };
  }

  const lastSentAt = toDate(input.lastSentAt);
  if (!lastSentAt || input.isCritical) {
    return { allowed: true, reason: "allowed" };
  }

  const elapsed = hoursSince(input.now, lastSentAt);
  if (input.frequency === "daily" && elapsed < 20) {
    return { allowed: false, reason: "daily_cap" };
  }
  if (input.frequency === "weekly" && elapsed < 144) {
    return { allowed: false, reason: "weekly_cap" };
  }

  return { allowed: true, reason: "allowed" };
}
