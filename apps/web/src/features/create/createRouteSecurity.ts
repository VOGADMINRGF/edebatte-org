import "server-only";

import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { stableHash } from "@core/utils/hash";
import { getClientIp } from "@/utils/rateLimitHelpers";
import type {
  PersistentRateLimitInput,
  PersistentRateLimitResult,
} from "@/utils/persistentRateLimit";
import { getCreateContributionDraftForResumeRecord } from "@/server/serverDrafts";
import {
  CREATE_CLIENT_SESSION_HEADER,
  CREATE_HONEYPOT_HEADER,
  CREATE_MUTATION_CSRF_HEADER,
  CREATE_MUTATION_CSRF_VALUE,
} from "@/features/create/createMutationSecurityContract";
import {
  CREATE_ANON_SESSION_COOKIE,
  verifyAnonymousSession,
} from "@/features/create/createAnonymousSession";
import { evaluateCreateAbusePayload } from "@/features/create/createAbuseGuard";

export type CreateMutationScope =
  | "create_save"
  | "create_intelligent_followup"
  | "create_link_analysis";

const RATE_LIMITS: Record<
  CreateMutationScope,
  {
    userLimit: number;
    ipLimit: number;
    anonymousIpLimit?: number;
    anonymousLimit: number;
    clientLimit: number;
    windowMs: number;
  }
> = {
  create_save: {
    userLimit: 60,
    ipLimit: 120,
    anonymousLimit: 90,
    clientLimit: 90,
    windowMs: 15 * 60 * 1000,
  },
  create_intelligent_followup: {
    userLimit: 12,
    ipLimit: 30,
    anonymousIpLimit: 12,
    anonymousLimit: 18,
    clientLimit: 18,
    windowMs: 10 * 60 * 1000,
  },
  create_link_analysis: {
    userLimit: 12,
    ipLimit: 30,
    anonymousLimit: 18,
    clientLimit: 18,
    windowMs: 10 * 60 * 1000,
  },
};

const MAX_CREATE_MUTATION_BYTES = 64 * 1024;
const DUPLICATE_ACTOR_LIMIT = 4;
const DUPLICATE_IP_LIMIT = 12;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const SUSPICIOUS_REPEAT_WINDOW_MS = 60 * 1000;

type CreateRateLimiter = (
  input: PersistentRateLimitInput,
) => Promise<PersistentRateLimitResult>;

async function loadCreateRateLimiter(): Promise<CreateRateLimiter | null> {
  if (process.env.NEXT_RUNTIME === "edge") return null;
  const module = await import("@/utils/persistentRateLimit");
  return typeof module.consumePersistentRateLimit === "function"
    ? module.consumePersistentRateLimit
    : null;
}

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeLocale(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .startsWith("en")
    ? "en"
    : "de";
}

function expectedRequestOrigin(req: NextRequest) {
  return new URL(req.url).origin;
}

function readClientSession(req: NextRequest) {
  const value = req.headers.get(CREATE_CLIENT_SESSION_HEADER)?.trim() ?? "";
  return /^[a-z0-9-]{8,120}$/i.test(value) ? value : null;
}

function genericSecurityFailure(
  status: 403 | 413 | 429 | 503,
  errorCode:
    | "CREATE_REQUEST_REJECTED"
    | "CREATE_REQUEST_TOO_LARGE"
    | "CREATE_RATE_LIMITED"
    | "CREATE_RATE_LIMIT_UNAVAILABLE",
  retryAfterSeconds?: number,
) {
  const response = NextResponse.json(
    {
      ok: false,
      errorCode,
      message:
        status === 429
          ? "Das waren gerade sehr viele Anfragen. Bitte versuche es in einem Moment noch einmal."
          : "Die Anfrage konnte nicht verarbeitet werden.",
    },
    { status },
  );
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    response.headers.set("Retry-After", String(retryAfterSeconds));
  }
  return response;
}

async function readAbuseEvaluation(req: NextRequest, scope: CreateMutationScope) {
  if (scope === "create_save") return null;
  try {
    const payload = await req.clone().json();
    return evaluateCreateAbusePayload(payload);
  } catch {
    return null;
  }
}

function firstLimited(results: PersistentRateLimitResult[]) {
  return results.find((result) => !result.ok) ?? null;
}

export async function enforceCreateMutationSecurity(input: {
  req: NextRequest;
  scope: CreateMutationScope;
  actorKey: string;
}): Promise<Response | null> {
  const origin = input.req.headers.get("origin")?.trim() ?? "";
  const fetchSite = input.req.headers.get("sec-fetch-site")?.trim().toLowerCase() ?? "";
  const csrfIntent = input.req.headers.get(CREATE_MUTATION_CSRF_HEADER)?.trim() ?? "";
  if (
    !origin ||
    origin !== expectedRequestOrigin(input.req) ||
    fetchSite !== "same-origin" ||
    csrfIntent !== CREATE_MUTATION_CSRF_VALUE
  ) {
    return genericSecurityFailure(403, "CREATE_REQUEST_REJECTED");
  }

  if ((input.req.headers.get(CREATE_HONEYPOT_HEADER)?.trim() ?? "").length > 0) {
    return genericSecurityFailure(403, "CREATE_REQUEST_REJECTED");
  }

  const contentLength = Number(input.req.headers.get("content-length") ?? "0");
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_CREATE_MUTATION_BYTES
  ) {
    return genericSecurityFailure(413, "CREATE_REQUEST_TOO_LARGE");
  }

  const abuse = await readAbuseEvaluation(input.req, input.scope);
  if (abuse?.risk === "block") {
    return genericSecurityFailure(403, "CREATE_REQUEST_REJECTED");
  }

  const policy = RATE_LIMITS[input.scope];
  try {
    const limiter = await loadCreateRateLimiter();
    if (!limiter) {
      return genericSecurityFailure(503, "CREATE_RATE_LIMIT_UNAVAILABLE");
    }

    const ip = getClientIp(input.req);
    const actorHash = digest(`${input.scope}:actor:${input.actorKey}`);
    const ipHash = digest(`${input.scope}:ip:${ip}`);
    const anonymousSession = verifyAnonymousSession(
      input.req.cookies.get(CREATE_ANON_SESSION_COOKIE)?.value,
    );
    const clientSession = readClientSession(input.req);

    const baseChecks: Array<Promise<PersistentRateLimitResult>> = [
      limiter({
        namespace: `create:${input.scope}:actor`,
        subjectHash: actorHash,
        limit: policy.userLimit,
        windowMs: policy.windowMs,
      }),
      limiter({
        namespace: `create:${input.scope}:ip`,
        subjectHash: ipHash,
        limit: policy.ipLimit,
        windowMs: policy.windowMs,
      }),
    ];

    if (anonymousSession) {
      baseChecks.push(
        limiter({
          namespace: `create:${input.scope}:anonymous`,
          subjectHash: digest(`${input.scope}:anonymous:${anonymousSession.id}`),
          limit: policy.anonymousLimit,
          windowMs: policy.windowMs,
        }),
      );
    }

    if (
      anonymousSession &&
      input.scope === "create_intelligent_followup" &&
      input.actorKey.startsWith("anonymous:") &&
      policy.anonymousIpLimit
    ) {
      baseChecks.push(
        limiter({
          namespace: `create:${input.scope}:anonymous-ip`,
          subjectHash: ipHash,
          limit: policy.anonymousIpLimit,
          windowMs: policy.windowMs,
        }),
      );
    }

    if (clientSession) {
      baseChecks.push(
        limiter({
          namespace: `create:${input.scope}:client`,
          subjectHash: digest(`${input.scope}:client:${clientSession}`),
          limit: policy.clientLimit,
          windowMs: policy.windowMs,
        }),
      );
    }

    const baseResults = await Promise.all(baseChecks);
    const baseLimited = firstLimited(baseResults);
    if (baseLimited) {
      return genericSecurityFailure(
        429,
        "CREATE_RATE_LIMITED",
        Math.ceil(baseLimited.retryIn / 1000),
      );
    }

    if (abuse?.fingerprint) {
      const duplicateResults = await Promise.all([
        limiter({
          namespace: `create:${input.scope}:duplicate:actor`,
          subjectHash: digest(
            `${input.scope}:duplicate:actor:${input.actorKey}:${abuse.fingerprint}`,
          ),
          limit: DUPLICATE_ACTOR_LIMIT,
          windowMs: DUPLICATE_WINDOW_MS,
        }),
        limiter({
          namespace: `create:${input.scope}:duplicate:ip`,
          subjectHash: digest(
            `${input.scope}:duplicate:ip:${ip}:${abuse.fingerprint}`,
          ),
          limit: DUPLICATE_IP_LIMIT,
          windowMs: DUPLICATE_WINDOW_MS,
        }),
      ]);
      const duplicateLimited = firstLimited(duplicateResults);
      if (duplicateLimited) {
        return genericSecurityFailure(
          429,
          "CREATE_RATE_LIMITED",
          Math.ceil(duplicateLimited.retryIn / 1000),
        );
      }
    }

    if (abuse?.risk === "cooldown" && abuse.fingerprint) {
      const riskSubject =
        clientSession ?? anonymousSession?.id ?? input.actorKey;
      const suspicious = await limiter({
        namespace: `create:${input.scope}:suspicious-repeat`,
        subjectHash: digest(
          `${input.scope}:suspicious:${riskSubject}:${abuse.fingerprint}`,
        ),
        limit: 1,
        windowMs: SUSPICIOUS_REPEAT_WINDOW_MS,
      });
      if (!suspicious.ok) {
        return genericSecurityFailure(
          429,
          "CREATE_RATE_LIMITED",
          Math.ceil(suspicious.retryIn / 1000),
        );
      }
    }
  } catch {
    return genericSecurityFailure(503, "CREATE_RATE_LIMIT_UNAVAILABLE");
  }
  return null;
}

export type VerifiedCreateDraftBinding = {
  draftId: string;
  userId: string;
  payloadHash: string;
  inputHash: string;
};

function readDraftPayloadHash(analysis: unknown) {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
    return null;
  }
  const runtime = (analysis as Record<string, unknown>).draftWriteRuntime;
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) {
    return null;
  }
  const payloadHash = String(
    (runtime as Record<string, unknown>).payloadHash ?? "",
  ).trim();
  return payloadHash || null;
}

export async function verifyCreateDraftBinding(input: {
  draftId: string;
  userId: string;
  text: string;
  locale?: string | null;
  anlassraumId?: string | null;
}): Promise<VerifiedCreateDraftBinding | null> {
  const normalizedText = input.text.trim();
  const normalizedLocale = normalizeLocale(input.locale);
  if (!normalizedText) return null;

  const draft = await getCreateContributionDraftForResumeRecord(
    input.draftId.trim(),
    input.userId,
  ).catch(() => null);
  if (
    !draft ||
    draft.storage !== "drafts" ||
    draft.status !== "draft" ||
    draft.userId !== input.userId ||
    normalizeLocale(draft.locale) !== normalizedLocale ||
    (input.anlassraumId !== undefined &&
      String(draft.anlassraumId ?? "") !== String(input.anlassraumId ?? ""))
  ) {
    return null;
  }

  const payloadHash = readDraftPayloadHash(draft.analysis);
  if (!payloadHash) return null;
  const storedTexts = [draft.text, draft.textOriginal, draft.textPrepared]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  if (!storedTexts.includes(normalizedText)) return null;

  return {
    draftId: draft.id,
    userId: input.userId,
    payloadHash,
    inputHash: stableHash({
      userId: input.userId,
      draftId: draft.id,
      status: draft.status,
      text: normalizedText,
      locale: normalizedLocale,
      anlassraumId: draft.anlassraumId ?? null,
      payloadHash,
      updatedAt: draft.updatedAt?.toISOString() ?? null,
    }),
  };
}
