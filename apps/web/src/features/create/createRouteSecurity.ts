import "server-only";

import crypto from "node:crypto";
import { TextDecoder } from "node:util";
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
  CREATE_CLIENT_SIGNAL_HEADER,
  CREATE_CLIENT_SIGNAL_MAX_LENGTH,
  CREATE_HONEYPOT_HEADER,
  CREATE_HONEYPOT_MAX_LENGTH,
  CREATE_MUTATION_CSRF_HEADER,
  hasValidCreateMutationProvenance,
} from "@/features/create/createMutationSecurityContract";
import {
  CREATE_ANON_SESSION_COOKIE,
  verifyAnonymousSession,
} from "@/features/create/createAnonymousSession";
import { evaluateCreateAbusePayload } from "@/features/create/createAbuseGuard";

export type CreateMutationScope =
  | "create_save"
  | "create_intelligent_followup"
  | "create_link_analysis"
  | "create_guest_claim";

const RATE_LIMITS: Record<
  CreateMutationScope,
  {
    userLimit: number;
    ipLimit: number;
    sessionLimit: number;
    clientLimit: number;
    windowMs: number;
  }
> = {
  create_save: {
    userLimit: 60,
    ipLimit: 120,
    sessionLimit: 90,
    clientLimit: 90,
    windowMs: 15 * 60 * 1000,
  },
  create_intelligent_followup: {
    userLimit: 12,
    ipLimit: 30,
    sessionLimit: 18,
    clientLimit: 18,
    windowMs: 10 * 60 * 1000,
  },
  create_link_analysis: {
    userLimit: 12,
    ipLimit: 30,
    sessionLimit: 18,
    clientLimit: 18,
    windowMs: 10 * 60 * 1000,
  },
  create_guest_claim: {
    userLimit: 12,
    ipLimit: 30,
    sessionLimit: 18,
    clientLimit: 18,
    windowMs: 10 * 60 * 1000,
  },
};

const MAX_CREATE_MUTATION_BYTES = 64 * 1024;
const DUPLICATE_ACTOR_LIMIT = 4;
const DUPLICATE_IP_LIMIT = 12;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const SUSPICIOUS_REPEAT_WINDOW_MS = 60 * 1000;
const ALLOWED_BODY_FIELDS: Record<CreateMutationScope, ReadonlySet<string>> = {
  create_save: new Set([
    "draftId", "packageId", "text", "textOriginal", "textPrepared",
    "evidenceInput", "locale", "source", "createMode", "anlassraumId",
    "authorName", "useCase", "sourceUrls", "uploadIds", "materialItems",
    "analysis", "manualReviewRequested",
  ]),
  create_intelligent_followup: new Set([
    "text", "sourceText", "intakeText", "input", "locale", "anlassraumId",
    "dossierId", "intent", "sourceUrls", "materialItems", "correlationId",
    "draftId",
  ]),
  create_link_analysis: new Set([
    "text", "url", "locale", "additionalContext", "correlationId", "draftId",
  ]),
  create_guest_claim: new Set(["claim"]),
};

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

function genericSecurityFailure(
  status: 400 | 403 | 413 | 429 | 503,
  errorCode:
    | "CREATE_INVALID_REQUEST"
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
      message: "Die Anfrage konnte nicht verarbeitet werden.",
    },
    { status },
  );
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    response.headers.set("Retry-After", String(retryAfterSeconds));
  }
  return response;
}

function hasSupportedContentType(req: NextRequest) {
  return /^application\/json(?:\s*;\s*charset\s*=\s*utf-8)?$/i.test(
    req.headers.get("content-type")?.trim() ?? "",
  );
}

function declaredBodyIsTooLarge(req: NextRequest) {
  const value = req.headers.get("content-length")?.trim();
  if (!value) return false;
  return !/^\d+$/.test(value) || Number(value) > MAX_CREATE_MUTATION_BYTES;
}

function readClientSignal(req: NextRequest) {
  const rawValue = req.headers.get(CREATE_CLIENT_SIGNAL_HEADER);
  if (rawValue === null || !rawValue.trim()) {
    return { valid: true, value: null } as const;
  }
  const value = rawValue.trim();
  return {
    valid:
      value.length <= CREATE_CLIENT_SIGNAL_MAX_LENGTH &&
      /^[a-z0-9_-]{8,64}$/i.test(value),
    value,
  };
}

async function readBoundedJsonObject(
  req: NextRequest,
  scope: CreateMutationScope,
): Promise<
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; reason: "invalid" | "too_large" }
> {
  const reader = req.body?.getReader();
  if (!reader) return { ok: false, reason: "invalid" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      const remaining = MAX_CREATE_MUTATION_BYTES + 1 - size;
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(chunk);
      size += chunk.byteLength;
      if (size > MAX_CREATE_MUTATION_BYTES || value.byteLength > remaining) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
    }
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const payload: unknown = JSON.parse(decoded);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { ok: false, reason: "invalid" };
    }
    const allowedFields = ALLOWED_BODY_FIELDS[scope];
    if (Object.keys(payload).some((key) => !allowedFields.has(key))) {
      return { ok: false, reason: "invalid" };
    }
    Object.defineProperty(req, "json", {
      configurable: true,
      value: async () => payload,
    });
    return { ok: true, payload: payload as Record<string, unknown> };
  } catch {
    return { ok: false, reason: "invalid" };
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
  if (!hasValidCreateMutationProvenance({
    expectedOrigin: new URL(input.req.url).origin,
    origin: input.req.headers.get("origin"),
    fetchSite: input.req.headers.get("sec-fetch-site"),
    csrfIntent: input.req.headers.get(CREATE_MUTATION_CSRF_HEADER),
  })) {
    return genericSecurityFailure(403, "CREATE_REQUEST_REJECTED");
  }

  const honeypot = input.req.headers.get(CREATE_HONEYPOT_HEADER) ?? "";
  if (
    honeypot.length > CREATE_HONEYPOT_MAX_LENGTH ||
    honeypot.trim().length > 0
  ) {
    return genericSecurityFailure(403, "CREATE_REQUEST_REJECTED");
  }
  if (!hasSupportedContentType(input.req)) {
    return genericSecurityFailure(400, "CREATE_INVALID_REQUEST");
  }
  if (declaredBodyIsTooLarge(input.req)) {
    return genericSecurityFailure(413, "CREATE_REQUEST_TOO_LARGE");
  }
  const clientSignal = readClientSignal(input.req);
  if (!clientSignal.valid) {
    return genericSecurityFailure(403, "CREATE_REQUEST_REJECTED");
  }

  const policy = RATE_LIMITS[input.scope];
  let limiterContext: {
    limiter: CreateRateLimiter;
    ip: string;
    anonymousSession: ReturnType<typeof verifyAnonymousSession>;
  } | null = null;
  try {
    const limiter = await loadCreateRateLimiter();
    if (!limiter) {
      return genericSecurityFailure(503, "CREATE_RATE_LIMIT_UNAVAILABLE");
    }
    const ip = getClientIp(input.req);
    const anonymousSession = verifyAnonymousSession(
      input.req.cookies.get(CREATE_ANON_SESSION_COOKIE)?.value,
    );
    const baseChecks: Array<Promise<PersistentRateLimitResult>> = [
      limiter({
        namespace: `create:${input.scope}:actor`,
        subjectHash: digest(`${input.scope}:actor:${input.actorKey}`),
        limit: policy.userLimit,
        windowMs: policy.windowMs,
      }),
      limiter({
        namespace: `create:${input.scope}:ip`,
        subjectHash: digest(`${input.scope}:ip:${ip}`),
        limit: policy.ipLimit,
        windowMs: policy.windowMs,
      }),
    ];
    if (anonymousSession) {
      baseChecks.push(limiter({
        namespace: `create:${input.scope}:anonymous`,
        subjectHash: digest(`${input.scope}:anonymous:${anonymousSession.id}`),
        limit: policy.sessionLimit,
        windowMs: policy.windowMs,
      }));
    }
    if (clientSignal.value) {
      baseChecks.push(limiter({
        namespace: `create:${input.scope}:client`,
        subjectHash: digest(`${input.scope}:client:${clientSignal.value}`),
        limit: policy.clientLimit,
        windowMs: policy.windowMs,
      }));
    }
    const baseLimited = firstLimited(await Promise.all(baseChecks));
    if (baseLimited) {
      return genericSecurityFailure(
        429,
        "CREATE_RATE_LIMITED",
        Math.ceil(baseLimited.retryIn / 1000),
      );
    }
    limiterContext = { limiter, ip, anonymousSession };
  } catch {
    return genericSecurityFailure(503, "CREATE_RATE_LIMIT_UNAVAILABLE");
  }

  const boundedBody = await readBoundedJsonObject(input.req, input.scope);
  if ("reason" in boundedBody) {
    return boundedBody.reason === "too_large"
      ? genericSecurityFailure(413, "CREATE_REQUEST_TOO_LARGE")
      : genericSecurityFailure(400, "CREATE_INVALID_REQUEST");
  }
  const abuse = evaluateCreateAbusePayload(boundedBody.payload);
  if (abuse.risk === "block") {
    return genericSecurityFailure(403, "CREATE_REQUEST_REJECTED");
  }
  if (!limiterContext) {
    return genericSecurityFailure(503, "CREATE_RATE_LIMIT_UNAVAILABLE");
  }
  const { limiter, ip, anonymousSession } = limiterContext;

  try {
    if (input.scope !== "create_save" && abuse.fingerprint) {
      const duplicateLimited = firstLimited(await Promise.all([
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
      ]));
      if (duplicateLimited) {
        return genericSecurityFailure(
          429,
          "CREATE_RATE_LIMITED",
          Math.ceil(duplicateLimited.retryIn / 1000),
        );
      }
    }

    if (abuse.risk === "cooldown" && abuse.fingerprint) {
      const riskSubject = clientSignal.value ?? anonymousSession?.id ?? input.actorKey;
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

export function getVerifiedGuestClaimSubject(req: NextRequest): string | null {
  return verifyAnonymousSession(
    req.cookies.get(CREATE_ANON_SESSION_COOKIE)?.value,
  )?.id ?? null;
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
