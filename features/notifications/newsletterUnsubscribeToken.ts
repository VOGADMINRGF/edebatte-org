import crypto from "node:crypto";

import { normalizeNewsletterEmail } from "./newsletterSubscriptionContract";

const TOKEN_VERSION = 1 as const;

export type NewsletterUnsubscribeTokenPayload = {
  v: typeof TOKEN_VERSION;
  email: string;
  exp: number;
};

export type NewsletterUnsubscribeTokenVerification =
  | { ok: true; payload: NewsletterUnsubscribeTokenPayload }
  | {
      ok: false;
      reason:
        | "missing_secret"
        | "invalid_token"
        | "invalid_email"
        | "invalid_signature"
        | "expired";
    };

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function createNewsletterUnsubscribeToken(input: {
  email: string;
  secret: string;
  expiresAt: Date;
}): string | null {
  const email = normalizeNewsletterEmail(input.email);
  const secret = input.secret.trim();
  if (!email || !secret) return null;

  const payload: NewsletterUnsubscribeTokenPayload = {
    v: TOKEN_VERSION,
    email,
    exp: Math.floor(input.expiresAt.getTime() / 1000),
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signature(encodedPayload, secret)}`;
}

export function verifyNewsletterUnsubscribeToken(input: {
  token: string;
  secret: string;
  now?: Date;
}): NewsletterUnsubscribeTokenVerification {
  const secret = input.secret.trim();
  if (!secret) return { ok: false, reason: "missing_secret" };

  const [encodedPayload, actualSignature, extra] = input.token.split(".");
  if (!encodedPayload || !actualSignature || extra !== undefined) {
    return { ok: false, reason: "invalid_token" };
  }

  const expectedSignature = signature(encodedPayload, secret);
  if (!signaturesMatch(actualSignature, expectedSignature)) {
    return { ok: false, reason: "invalid_signature" };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(decode(encodedPayload));
  } catch {
    return { ok: false, reason: "invalid_token" };
  }

  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "invalid_token" };
  }
  const candidate = raw as Partial<NewsletterUnsubscribeTokenPayload>;
  if (candidate.v !== TOKEN_VERSION || typeof candidate.email !== "string" || typeof candidate.exp !== "number") {
    return { ok: false, reason: "invalid_token" };
  }

  const email = normalizeNewsletterEmail(candidate.email);
  if (!email) return { ok: false, reason: "invalid_email" };

  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (!Number.isFinite(candidate.exp) || candidate.exp < nowSeconds) {
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    payload: {
      v: TOKEN_VERSION,
      email,
      exp: candidate.exp,
    },
  };
}
