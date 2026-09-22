import "server-only";

import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIp } from "@/utils/rateLimitHelpers";
import type {
  PersistentRateLimitInput,
  PersistentRateLimitResult,
} from "@/utils/persistentRateLimit";
import {
  VOG_BALLOT_CSRF_HEADER,
  VOG_BALLOT_CSRF_VALUE,
  VOG_RELEASE_CSRF_HEADER,
  VOG_RELEASE_CSRF_VALUE,
} from "@features/vog/publicBallotContract";

export {
  VOG_BALLOT_CSRF_HEADER,
  VOG_BALLOT_CSRF_VALUE,
  VOG_RELEASE_CSRF_HEADER,
  VOG_RELEASE_CSRF_VALUE,
} from "@features/vog/publicBallotContract";

export const VOG_GUEST_PARTICIPATION_COOKIE = "vog_guest_participation";

const GUEST_TOKEN_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
const GUEST_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_VOTE_BYTES = 4 * 1024;
const MAX_RELEASE_BYTES = 64 * 1024;

export type VogLimitedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; response: Response };

type PersistentLimiter = (
  input: PersistentRateLimitInput,
) => Promise<PersistentRateLimitResult>;

type VogCookieResponse = {
  cookies: {
    set: (
      name: string,
      value: string,
      options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "lax";
        path: string;
        maxAge: number;
      },
    ) => unknown;
  };
};

async function loadPersistentLimiter(): Promise<PersistentLimiter | null> {
  if (process.env.NEXT_RUNTIME === "edge") return null;
  const module = await import("@/utils/persistentRateLimit");
  return typeof module.consumePersistentRateLimit === "function"
    ? module.consumePersistentRateLimit
    : null;
}

export function hashVogGuestToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isValidVogGuestToken(token: unknown): token is string {
  return typeof token === "string" && GUEST_TOKEN_PATTERN.test(token);
}

export function resolveVogGuestToken(req: NextRequest) {
  const existing = req.cookies.get(VOG_GUEST_PARTICIPATION_COOKIE)?.value;
  const token = isValidVogGuestToken(existing)
    ? existing
    : crypto.randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashVogGuestToken(token),
    isNew: token !== existing,
  };
}

export function setVogGuestParticipationCookie<T extends VogCookieResponse>(
  response: T,
  token: string,
) {
  response.cookies.set(VOG_GUEST_PARTICIPATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_TOKEN_MAX_AGE_SECONDS,
  });
  return response;
}

function expectedOrigin(req: NextRequest) {
  return new URL(req.url).origin;
}

function validSameOriginIntent(input: {
  req: NextRequest;
  headerName: string;
  headerValue: string;
}) {
  return (
    input.req.headers.get("origin")?.trim() === expectedOrigin(input.req) &&
    input.req.headers.get("sec-fetch-site")?.trim().toLowerCase() ===
      "same-origin" &&
    input.req.headers.get(input.headerName)?.trim() === input.headerValue
  );
}

function contentLengthWithin(req: NextRequest, maximum: number) {
  const raw = req.headers.get("content-length");
  if (!raw) return true;
  const length = Number(raw);
  return Number.isInteger(length) && length >= 0 && length <= maximum;
}

function securityResponse(
  status: 403 | 413 | 429 | 503,
  error:
    | "request_rejected"
    | "request_too_large"
    | "rate_limited"
    | "rate_limit_unavailable",
  retryAfterSeconds?: number,
) {
  const response = NextResponse.json({ ok: false, error }, { status });
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    response.headers.set("Retry-After", String(retryAfterSeconds));
  }
  return response;
}

async function readLimitedJson(
  req: NextRequest,
  maximum: number,
): Promise<VogLimitedJsonResult> {
  const raw = await req.text().catch(() => null);
  if (raw === null) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "invalid_payload" },
        { status: 400 },
      ),
    };
  }
  if (Buffer.byteLength(raw, "utf8") > maximum) {
    return {
      ok: false,
      response: securityResponse(413, "request_too_large"),
    };
  }
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "invalid_payload" },
        { status: 400 },
      ),
    };
  }
}

export function readVogPublicBallotVoteJson(req: NextRequest) {
  return readLimitedJson(req, MAX_VOTE_BYTES);
}

export function readVogPublicBallotReleaseJson(req: NextRequest) {
  return readLimitedJson(req, MAX_RELEASE_BYTES);
}

export async function enforceVogPublicBallotVoteSecurity(input: {
  req: NextRequest;
  guestTokenHash: string;
}): Promise<Response | null> {
  if (
    !validSameOriginIntent({
      req: input.req,
      headerName: VOG_BALLOT_CSRF_HEADER,
      headerValue: VOG_BALLOT_CSRF_VALUE,
    })
  ) {
    return securityResponse(403, "request_rejected");
  }
  if (!contentLengthWithin(input.req, MAX_VOTE_BYTES)) {
    return securityResponse(413, "request_too_large");
  }

  try {
    const limiter = await loadPersistentLimiter();
    if (!limiter) return securityResponse(503, "rate_limit_unavailable");
    const ipHash = crypto
      .createHash("sha256")
      .update(`vog-public-ballot:ip:${getClientIp(input.req)}`)
      .digest("hex");
    const [guestLimit, ipLimit] = await Promise.all([
      limiter({
        namespace: "vog-public-ballot:guest",
        subjectHash: input.guestTokenHash,
        limit: 12,
        windowMs: 60_000,
      }),
      limiter({
        namespace: "vog-public-ballot:ip",
        subjectHash: ipHash,
        limit: 30,
        windowMs: 60_000,
      }),
    ]);
    const limited = !guestLimit.ok ? guestLimit : !ipLimit.ok ? ipLimit : null;
    if (limited) {
      return securityResponse(
        429,
        "rate_limited",
        Math.max(1, Math.ceil(limited.retryIn / 1_000)),
      );
    }
  } catch {
    return securityResponse(503, "rate_limit_unavailable");
  }
  return null;
}

export function enforceVogPublicBallotReleaseSecurity(
  req: NextRequest,
): Response | null {
  if (
    !validSameOriginIntent({
      req,
      headerName: VOG_RELEASE_CSRF_HEADER,
      headerValue: VOG_RELEASE_CSRF_VALUE,
    })
  ) {
    return securityResponse(403, "request_rejected");
  }
  if (!contentLengthWithin(req, MAX_RELEASE_BYTES)) {
    return securityResponse(413, "request_too_large");
  }
  return null;
}
