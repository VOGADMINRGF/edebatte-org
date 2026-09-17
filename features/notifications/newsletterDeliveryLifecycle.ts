import type { MailFailureCategory } from "../../apps/web/src/utils/mailer";

export type NewsletterRetryDecision = {
  allowed: boolean;
  reason:
    | "first_attempt"
    | "retry_allowed"
    | "retry_backoff"
    | "retry_exhausted"
    | "non_retryable";
  nextAttemptAt: Date | null;
};

function safeDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveNewsletterRetryDecision(input: {
  attemptCount?: number | null;
  retryable?: boolean | null;
  lastAttemptAt?: Date | string | null;
  now: Date;
  maxAttempts?: number;
  baseBackoffMinutes?: number;
}): NewsletterRetryDecision {
  const attemptCount = Math.max(0, Math.floor(input.attemptCount ?? 0));
  if (attemptCount === 0) {
    return { allowed: true, reason: "first_attempt", nextAttemptAt: null };
  }
  if (input.retryable === false) {
    return { allowed: false, reason: "non_retryable", nextAttemptAt: null };
  }

  const maxAttempts = Math.max(1, Math.min(10, Math.floor(input.maxAttempts ?? 4)));
  if (attemptCount >= maxAttempts) {
    return { allowed: false, reason: "retry_exhausted", nextAttemptAt: null };
  }

  const lastAttemptAt = safeDate(input.lastAttemptAt);
  if (!lastAttemptAt) {
    return { allowed: true, reason: "retry_allowed", nextAttemptAt: null };
  }

  const base = Math.max(5, Math.min(120, Math.floor(input.baseBackoffMinutes ?? 15)));
  const backoffMinutes = Math.min(12 * 60, base * 2 ** Math.max(0, attemptCount - 1));
  const nextAttemptAt = new Date(lastAttemptAt.getTime() + backoffMinutes * 60 * 1000);
  if (input.now.getTime() < nextAttemptAt.getTime()) {
    return { allowed: false, reason: "retry_backoff", nextAttemptAt };
  }

  return { allowed: true, reason: "retry_allowed", nextAttemptAt };
}

export function shouldSuppressNewsletterRecipient(category: MailFailureCategory) {
  return category === "recipient_invalid" || category === "recipient_placeholder_domain";
}

export function newsletterDeliveryRetentionUntil(input: {
  from: Date;
  retentionDays?: number;
}) {
  const days = Math.max(30, Math.min(730, Math.floor(input.retentionDays ?? 180)));
  return new Date(input.from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function buildNewsletterListUnsubscribeHeaders(oneClickUrl: string) {
  let url: URL;
  try {
    url = new URL(oneClickUrl);
  } catch {
    return {} as Record<string, string>;
  }
  if (url.protocol !== "https:") return {} as Record<string, string>;
  return {
    "List-Unsubscribe": `<${url.toString()}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
