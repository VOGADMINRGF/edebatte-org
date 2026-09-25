import "server-only";

import crypto from "node:crypto";

export const CREATE_ANON_SESSION_COOKIE = "edebatte_create_session";
export const CREATE_ANON_SESSION_MAX_AGE_SECONDS = 30 * 60;

const TOKEN_VERSION = "v1";
const MAX_TOKEN_LENGTH = 320;
const MAX_CLOCK_SKEW_MS = 60_000;
const MIN_SECRET_BYTES = 32;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACEHOLDER_VALUES = new Set([
  "__set_in_secret_manager__",
  "__set_for_production__",
  "replace_me",
  "changeme",
]);

function readSigningSecret() {
  const value = String(process.env.CREATE_ANON_SESSION_SECRET ?? "").trim();
  if (
    !value ||
    PLACEHOLDER_VALUES.has(value.toLowerCase()) ||
    Buffer.byteLength(value, "utf8") < MIN_SECRET_BYTES
  ) {
    return null;
  }
  return value;
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(leftValue: string, rightValue: string) {
  try {
    const left = Buffer.from(leftValue, "utf8");
    const right = Buffer.from(rightValue, "utf8");
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function parseBase36Timestamp(value: string) {
  if (!/^[0-9a-z]+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 36);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export type CreateAnonymousSession = {
  id: string;
  issuedAtMs: number;
  expiresAtMs: number;
};

export function createAnonymousSession(nowMs = Date.now()): {
  value: string;
  session: CreateAnonymousSession;
} | null {
  const secret = readSigningSecret();
  if (!secret || !Number.isSafeInteger(nowMs) || nowMs < 0) return null;

  const session: CreateAnonymousSession = {
    id: crypto.randomUUID(),
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + CREATE_ANON_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payload = [
    TOKEN_VERSION,
    session.issuedAtMs.toString(36),
    session.expiresAtMs.toString(36),
    session.id,
  ].join(".");

  return {
    value: `${payload}.${sign(payload, secret)}`,
    session,
  };
}

export function verifyAnonymousSession(
  value: string | null | undefined,
  nowMs = Date.now(),
): CreateAnonymousSession | null {
  const secret = readSigningSecret();
  const token = String(value ?? "").trim();
  if (
    !secret ||
    !token ||
    token.length > MAX_TOKEN_LENGTH ||
    !Number.isSafeInteger(nowMs) ||
    nowMs < 0
  ) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== TOKEN_VERSION) return null;
  const [version, issuedRaw, expiresRaw, id, signature] = parts;
  if (!version || !issuedRaw || !expiresRaw || !id || !signature) return null;
  if (!UUID_PATTERN.test(id)) return null;

  const issuedAtMs = parseBase36Timestamp(issuedRaw);
  const expiresAtMs = parseBase36Timestamp(expiresRaw);
  if (issuedAtMs === null || expiresAtMs === null) return null;
  if (issuedAtMs > nowMs + MAX_CLOCK_SKEW_MS || expiresAtMs <= nowMs) return null;
  if (expiresAtMs <= issuedAtMs) return null;
  if (
    expiresAtMs - issuedAtMs >
    CREATE_ANON_SESSION_MAX_AGE_SECONDS * 1000 + MAX_CLOCK_SKEW_MS
  ) {
    return null;
  }

  const payload = [version, issuedRaw, expiresRaw, id].join(".");
  if (!safeEqual(signature, sign(payload, secret))) return null;

  return { id, issuedAtMs, expiresAtMs };
}

export function createAnonymousSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/create",
    maxAge: CREATE_ANON_SESSION_MAX_AGE_SECONDS,
  };
}

export function clearAnonymousSessionCookieOptions() {
  return {
    ...createAnonymousSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  };
}
