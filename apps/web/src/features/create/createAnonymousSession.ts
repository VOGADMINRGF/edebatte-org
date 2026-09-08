import "server-only";

import crypto from "node:crypto";

export const CREATE_ANON_SESSION_COOKIE = "edebatte_create_session";
export const CREATE_ANON_SESSION_MAX_AGE_SECONDS = 30 * 60;

const PLACEHOLDER_VALUES = new Set([
  "__set_in_secret_manager__",
  "__set_for_production__",
  "replace_me",
  "changeme",
]);

function readSigningSecret() {
  const value = String(
    process.env.CREATE_ANON_SESSION_SECRET ?? process.env.JWT_SECRET ?? "",
  ).trim();
  if (!value || PLACEHOLDER_VALUES.has(value) || value.length < 16) return null;
  return value;
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export type CreateAnonymousSession = {
  id: string;
  issuedAtMs: number;
  expiresAtMs: number;
};

export type CreateAnonymousStorageContext = {
  namespace: string;
  expiresAt: string;
};

export function createAnonymousStorageContext(
  session: CreateAnonymousSession,
): CreateAnonymousStorageContext | null {
  const secret = readSigningSecret();
  if (!secret || session.expiresAtMs <= Date.now()) return null;
  const binding = `create-storage.v1.${session.id}.${session.expiresAtMs}`;
  return {
    namespace: `g1_${sign(binding, secret)}`,
    expiresAt: new Date(session.expiresAtMs).toISOString(),
  };
}

export function createAnonymousSession(nowMs = Date.now()): {
  value: string;
  session: CreateAnonymousSession;
} | null {
  const secret = readSigningSecret();
  if (!secret) return null;
  const session: CreateAnonymousSession = {
    id: crypto.randomUUID(),
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + CREATE_ANON_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payload = [
    "v1",
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
  if (!secret || !token || token.length > 320) return null;

  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") return null;
  const [version, issuedRaw, expiresRaw, id, signature] = parts;
  if (!version || !issuedRaw || !expiresRaw || !id || !signature) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const issuedAtMs = Number.parseInt(issuedRaw, 36);
  const expiresAtMs = Number.parseInt(expiresRaw, 36);
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs)) return null;
  if (issuedAtMs > nowMs + 60_000 || expiresAtMs <= nowMs) return null;
  if (expiresAtMs - issuedAtMs > CREATE_ANON_SESSION_MAX_AGE_SECONDS * 1000 + 60_000) {
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
    path: "/",
    maxAge: CREATE_ANON_SESSION_MAX_AGE_SECONDS,
  };
}
