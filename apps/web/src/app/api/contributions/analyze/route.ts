// apps/web/src/app/api/contributions/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  analyzeContribution,
  type AnalyzeResultWithMeta,
} from "@features/analyze/analyzeContribution";
import { rateLimit } from "@/utils/rateLimit";
import { logger } from "@/utils/logger";
import { deriveContextNotes } from "@features/analyze/context";
import {
  deriveCriticalQuestions,
  deriveKnots,
} from "@features/analyze/questionizers";
import { syncAnalyzeResultToGraph } from "@core/graph";
import { persistEventualitiesSnapshot } from "@core/eventualities";
import { maskUserId } from "@core/pii/redact";
import type { ProviderMatrixEntry } from "@features/ai/orchestratorE150";
import type { AiErrorKind } from "@core/telemetry/aiUsageTypes";
import crypto from "node:crypto";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_MAX_CLAIMS = 10;

type SuccessResponse<T extends Record<string, unknown>> = { ok: true } & T;
type ErrorResponse<TExtra extends Record<string, unknown> = Record<string, unknown>> = {
  ok: false;
  errorCode: string;
  message: string;
} & TExtra;

function ok<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data } satisfies SuccessResponse<T>, { status });
}

function err(
  code: string,
  message: string,
  status = 500,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json(
    { ok: false, errorCode: code, message, ...extra } satisfies ErrorResponse,
    { status },
  );
}

type NormalizedAnalyzerError = { code: string; message: string; status?: number };

function formatErrorResponse(error: NormalizedAnalyzerError, status = 500) {
  return err(error.code, error.message, error.status ?? status);
}

function logErrorSafe(payload: Record<string, unknown>) {
  try {
    logger.error(payload);
  } catch {
    // ignore logging failures
  }
}

const AnalyzeRequestSchema = z
  .object({
    text: z.string().min(1).max(10_000).optional(),
    preparedText: z.string().min(1).max(10_000).optional(),
    locale: z.string().min(2).max(8).optional(),
    maxClaims: z.number().int().min(1).max(50).optional(),
    stream: z.boolean().optional(),
    live: z.boolean().optional(),
    contributionId: z.string().min(3).max(100).optional(),
    detailPreset: z.string().max(120).optional(),
    test: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.test === "ping") return;
    const candidate = val.preparedText?.trim() || val.text?.trim() || "";
    if (!candidate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Feld 'text' ist erforderlich.",
        path: ["text"],
      });
      return;
    }
    if (candidate.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 10,
        inclusive: true,
        type: "string",
        origin: "string",
        message: "Der Beitrag ist zu kurz (mindestens 10 Zeichen).",
        path: ["text"],
      });
    }
  });

type AnalyzeBody = z.infer<typeof AnalyzeRequestSchema>;

type AnalyzeJobInput = {
  text: string;
  locale: string;
  maxClaims: number;
  contributionId: string;
  userId?: string | null;
  detailPreset?: string | null;
};

function sanitizeLocale(locale?: string): string {
  if (typeof locale === "string" && locale.trim()) {
    return locale.trim();
  }
  return "de";
}

function sanitizeMaxClaims(maxClaims?: number): number {
  if (
    typeof maxClaims === "number" &&
    Number.isFinite(maxClaims) &&
    maxClaims > 0
  ) {
    return Math.min(DEFAULT_MAX_CLAIMS, Math.max(1, Math.floor(maxClaims)));
  }
  return DEFAULT_MAX_CLAIMS;
}

/**
 * E150 – Contribution-AI
 * - JSON: { ok: true, result: AnalyzeResult }
 * - SSE: progress/result/error-events mit identischem Result-Shape
 */
export async function POST(req: NextRequest): Promise<Response> {
  const runId = crypto.randomUUID();
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return err("INVALID_JSON", "Ungültiger JSON-Body.", 400);
  }

  const parsed = AnalyzeRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return err(
      "BAD_INPUT",
      parsed.error?.issues?.[0]?.message ?? "Ungültige Eingabe für die Analyse.",
      400,
      { issues: parsed.error.issues },
    );
  }

  const body = parsed.data;

  if (body.test === "ping") {
    return ok({ result: { ping: "pong" } });
  }

  const locale = sanitizeLocale(body.locale);
  const maxClaims = sanitizeMaxClaims(body.maxClaims);
  const rawText = body.text?.trim() ?? "";
  const preparedText = body.preparedText?.trim();
  const text = preparedText && preparedText.length > 0 ? preparedText : rawText;
  const userId = req.cookies.get("u_id")?.value ?? null;
  const contributionId = resolveContributionId(body.contributionId, rawText || text);
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();

  const rl = await rateLimit(`analyze:ip:${ip}`, 15, 10 * 60 * 1000, { salt: "analyze" });
  if (!rl.ok) {
    return err("RATE_LIMITED", "Too many analyze requests. Please retry later.", 429, {
      retryInMs: rl.retryIn,
    });
  }
  const analyzeInput: AnalyzeJobInput = {
    text,
    locale,
    maxClaims,
    contributionId,
    userId,
    detailPreset: body.detailPreset ?? null,
  };

  if (wantsSse(req, body)) {
    return startAnalyzeSseStream(analyzeInput);
  }

  try {
    const result = await runAnalyzeJob(analyzeInput);
    await finalizeResultPayload(result, analyzeInput);
    const providerMatrix = buildProviderMatrixResponse(
      null,
      (result as any)?._meta?.providerMatrix,
      (result as any)?._meta,
    );
    return NextResponse.json(
      {
        ok: true,
        result,
        meta: {
          runId,
          providerMatrix,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[contributions/analyze] failed", error);
    logErrorSafe({
      msg: "analyze.route.error",
      contributionId,
      userId: maskUserId(userId),
      err: error instanceof Error ? error.message : String(error),
    });
    const normalized = normalizeAnalyzerError(error);
    if (shouldUseFallback(normalized) && process.env.E150_ANALYZE_FALLBACK === "1") {
      const fallback = buildFallbackResult(analyzeInput, normalized.code);
      return NextResponse.json(
        {
          ok: false,
          fallback: true,
          errorCode: normalized.code,
          message: normalized.message,
          result: fallback,
        },
        { status: normalized.status ?? 502 },
      );
    }
    if (normalized.code === "BAD_JSON" || normalized.code === "ANALYZE_PROVIDER_FAILED") {
      const meta = (error as any)?.meta ?? {};

      const providerMatrix = buildProviderMatrixResponse(
        error,
        meta?.providerMatrix ?? meta?.provider_matrix ?? null,
        meta,
      );

      const degradedResult: AnalyzeResultWithMeta = {
        mode: "E150",
        sourceText: null,
        language: locale,
        claims: [],
        notes: [
          {
            id: "n_degraded",
            kind: "FACTS",
            text: "KI temporär nicht erreichbar; Analyse wird später erneut versucht.",
          },
        ],
        questions: [],
        knots: [],
        consequences: { consequences: [], responsibilities: [] },
        responsibilityPaths: [],
        eventualities: [],
        decisionTrees: [],
        impactAndResponsibility: { impacts: [], responsibleActors: [] },
        report: {
          summary: null,
          keyConflicts: [],
          facts: { local: [], international: [] },
          openQuestions: [],
          takeaways: [],
        },
        _meta: {
          provider: null,
          model: null,
          pipeline: "contribution_analyze",
          contributionId,
        },
      };

      return NextResponse.json(
        {
          ok: true,
          degraded: true,
          warning: "KI temporär nicht erreichbar; Analyse wird später erneut versucht.",
          result: degradedResult,
          meta: {
            runId,
            providerMatrix,
            failedProviders: meta?.failedProviders ?? [],
            disabledProviders: meta?.disabledProviders ?? meta?.disabled ?? [],
            skippedProviders: meta?.skippedProviders ?? meta?.skipped ?? [],
            probes: meta?.probes ?? [],
          },
        },
        { status: 200 },
      );
    }
    return formatErrorResponse(normalized, normalized.status ?? 502);
  }
}

const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
} as const;

function wantsSse(req: NextRequest, body: AnalyzeBody | null): boolean {
  if (body?.stream === true || body?.live === true) return true;
  const accept = req.headers.get("accept")?.toLowerCase() ?? "";
  return accept.includes("text/event-stream");
}

function startAnalyzeSseStream(input: AnalyzeJobInput): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const sendProgress = (stage: string, pct: number) =>
        sendEvent("progress", { stage, pct });

      try {
        sendProgress("init", 5);
        sendProgress("dispatch", 15);

        sendProgress("analyzing", 35);
        const result = await runAnalyzeJob(input);
        await finalizeResultPayload(result, input);

        sendProgress("finalizing", 85);
        sendEvent("result", { result });
        sendProgress("complete", 100);
        controller.close();
      } catch (error) {
        logErrorSafe({
          msg: "analyze.route.sse_error",
          contributionId: input.contributionId,
          userId: maskUserId(input.userId ?? null),
          err: error instanceof Error ? error.message : String(error),
        });
        const normalized = normalizeAnalyzerError(error);
        sendEvent("error", { code: normalized.code, reason: normalized.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: SSE_HEADERS,
  });
}

async function runAnalyzeJob(input: AnalyzeJobInput): Promise<AnalyzeResultWithMeta> {
  const analyzed = await analyzeContribution({
    text: input.text,
    locale: input.locale,
    maxClaims: input.maxClaims,
  });
  return finalizeAnalyzeResult(analyzed);
}

async function finalizeResultPayload(
  result: AnalyzeResultWithMeta,
  input: AnalyzeJobInput,
) {
  const snapshot = await persistEventualitiesSnapshot({
    result,
    contributionId: input.contributionId,
    locale: input.locale,
    userId: input.userId,
  }).catch((err) => {
    logErrorSafe({
      msg: "analyze.route.eventuality_persist_failed",
      contributionId: input.contributionId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  result._meta = {
    ...(result._meta ?? {}),
    contributionId: input.contributionId,
    eventualitiesReviewed: snapshot?.reviewed ?? false,
    eventualitiesReviewedAt: snapshot?.reviewedAt
      ? snapshot.reviewedAt.toISOString()
      : null,
  };

  syncAnalyzeResultToGraph({
    result,
    sourceId: input.contributionId,
    locale: input.locale,
  }).catch((err) => {
    logErrorSafe({
      msg: "analyze.route.graph_sync_failed",
      contributionId: input.contributionId,
      err: err instanceof Error ? err.message : String(err),
    });
  });
}

function finalizeAnalyzeResult(result: AnalyzeResultWithMeta): AnalyzeResultWithMeta {
  const notes = hasEntries(result.notes)
    ? result.notes
    : deriveContextNotes(result);
  const questions = hasEntries(result.questions)
    ? result.questions
    : deriveCriticalQuestions(result);
  const knots = hasEntries(result.knots) ? result.knots : deriveKnots(result);
  const consequencesBundle = normalizeConsequenceBundle(result.consequences);
  const responsibilityPaths = Array.isArray(result.responsibilityPaths)
    ? result.responsibilityPaths
    : [];
  const eventualities = Array.isArray(result.eventualities)
    ? result.eventualities
    : [];
  const decisionTrees = Array.isArray(result.decisionTrees)
    ? result.decisionTrees
    : [];

  return {
    ...result,
    notes,
    questions,
    knots,
    consequences: {
      consequences: consequencesBundle.consequences ?? [],
      responsibilities: consequencesBundle.responsibilities ?? [],
    },
    responsibilityPaths,
    eventualities,
    decisionTrees,
  };
}

function hasEntries<T>(value?: T[] | null): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

function normalizeConsequenceBundle(
  bundle: AnalyzeResultWithMeta["consequences"],
): NonNullable<AnalyzeResultWithMeta["consequences"]> {
  return {
    consequences: Array.isArray(bundle?.consequences) ? bundle!.consequences : [],
    responsibilities: Array.isArray(bundle?.responsibilities) ? bundle!.responsibilities : [],
  };
}

function normalizeAnalyzerError(error: unknown): NormalizedAnalyzerError {
  const code = typeof (error as any)?.code === "string" ? (error as any).code : null;
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : typeof error === "string"
        ? error
        : "";

  if (code === "NO_ANALYZE_PROVIDER" || (message.includes("Orchestrator") && message.includes("Kein aktiver Provider"))) {
    return {
      code: "NO_ANALYZE_PROVIDER",
      message:
        "AnalyzeContribution: Kein KI-Provider konfiguriert. Bitte wende dich an das VoiceOpenGov-Team.",
      status: 503,
    };
  }

  if (/OPENAI_API_KEY fehlt/i.test(message) || /API_KEY fehlt/i.test(message)) {
    return {
      code: "MISSING_ENV",
      message:
        "AnalyzeContribution: Ein notwendiger API-Schlüssel fehlt auf dem Server.",
      status: 500,
    };
  }

  if (message.includes("KI-Antwort war kein gültiges JSON")) {
    return {
      code: "INVALID_AI_RESPONSE",
      message:
        "AnalyzeContribution: KI-Antwort war kein gültiges JSON. Bitte später erneut versuchen.",
      status: 502,
    };
  }
  if (code === "BAD_JSON") {
    return {
      code: "BAD_JSON",
      message: "KI-Antwort war nicht valide. Bitte erneut versuchen.",
      status: 502,
    };
  }
  if (code === "ANALYZE_PROVIDER_FAILED") {
    return {
      code: "ANALYZE_PROVIDER_FAILED",
      message: "KI-Dienst temporär nicht erreichbar. Bitte erneut versuchen.",
      status: 502,
    };
  }
  return {
    code: "ANALYZE_FAILED",
    message:
      "AnalyzeContribution: Fehler im Analyzer. Bitte später erneut versuchen.",
    status: 502,
  };
}

const FALLBACK_ELIGIBLE_CODES = new Set([
  "NO_ANALYZE_PROVIDER",
  "MISSING_ENV",
  "INVALID_AI_RESPONSE",
  "ANALYZE_FAILED",
]);

function shouldUseFallback(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as { errorCode?: string; code?: string };
  const code = anyErr.errorCode ?? anyErr.code;
  return typeof code === "string" && FALLBACK_ELIGIBLE_CODES.has(code);
}

const PROVIDER_LIST: ProviderMatrixEntry["provider"][] = [
  "openai",
  "mistral",
  "anthropic",
  "ari",
  "gemini",
];

const AI_ERROR_KINDS: ReadonlySet<AiErrorKind> = new Set<AiErrorKind>([
  "BAD_JSON",
  "CANCELLED",
  "INTERNAL",
  "INVALID_API_KEY",
  "MODEL_NOT_FOUND",
  "RATE_LIMIT",
  "TIMEOUT",
  "UNAUTHORIZED",
  "UNKNOWN",
]);

function asAiErrorKind(value: unknown): AiErrorKind | null {
  if (typeof value !== "string") return null;
  return AI_ERROR_KINDS.has(value as AiErrorKind) ? (value as AiErrorKind) : null;
}

function buildProviderMatrixResponse(
  source: any,
  existing: ProviderMatrixEntry[] | undefined | null,
  meta?: any,
): ProviderMatrixEntry[] {
  if (Array.isArray(existing) && existing.length) return existing;
  const m = meta ?? source?.meta ?? {};
  const disabled: { provider: string; reason?: string }[] =
    m.disabledProviders ?? m.disabled ?? [];
  const skipped: { provider: string; reason?: string }[] =
    m.skippedProviders ?? m.skipped ?? [];
  const failed: {
    provider: string;
    errorKind?: unknown;
    error?: string;
    httpStatus?: number | null;
    errorMessageShort?: string | null;
  }[] = m.failedProviders ?? [];
  const timings: Record<string, number | null> = m.timings ?? {};
  const successProviders: string[] = m.usedProviders ?? [];

  return PROVIDER_LIST.map((provider) => {
    const disabledEntry = disabled.find((d) => d.provider === provider);
    if (disabledEntry) {
      return {
        provider,
        state: "disabled",
        errorKind: null,
        status: null,
        durationMs: timings[provider] ?? null,
        model: null,
        reason: disabledEntry.reason ?? null,
      };
    }
    const skippedEntry = skipped.find((s) => s.provider === provider);
    if (skippedEntry) {
      return {
        provider,
        state: "skipped",
        errorKind: null,
        status: null,
        durationMs: timings[provider] ?? null,
        model: null,
        reason: skippedEntry.reason ?? null,
      };
    }
    const failedEntry = failed.find((f) => f.provider === provider);
    if (failedEntry) {
      const errorKind = asAiErrorKind(failedEntry.errorKind);
      return {
        provider,
        state: "failed",
        attempt: null,
        errorKind,
        status: (failedEntry as any)?.httpStatus ?? null,
        durationMs: timings[provider] ?? null,
        model: null,
        reason: failedEntry.errorMessageShort ?? failedEntry.error ?? null,
      };
    }
    if (successProviders.includes(provider)) {
      return {
        provider,
        state: "ok",
        attempt: 1,
        errorKind: null,
        status: null,
        durationMs: timings[provider] ?? null,
        model: null,
        reason: null,
      };
    }
    return {
      provider,
      state: "failed",
      errorKind: null,
      status: null,
      durationMs: null,
      model: null,
      reason: "KI temporär nicht erreichbar",
    };
  });
}

function buildFallbackResult(
  input: AnalyzeJobInput,
  reason: string,
): AnalyzeResultWithMeta {
  const sentences = input.text
    .split(/[\n\r.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const fallbackClaims =
    sentences.length > 0
      ? sentences
      : [input.text.trim().slice(0, 240)];

  const claims = fallbackClaims.slice(0, input.maxClaims).map((sentence, idx) => ({
    id: `fb-${input.contributionId}-${idx + 1}`,
    text: sentence,
    title: sentence.slice(0, 60) || `Statement ${idx + 1}`,
    responsibility: "unbestimmt",
    importance: 3,
    stance: "neutral" as const,
  }));

  return {
    mode: "E150",
    sourceText: input.text,
    language: input.locale,
    claims,
    notes: [
      {
        id: `note-fallback`,
        text:
          "Fallback-Analyse: Der KI-Orchestrator war nicht verfügbar. Die Aussagen wurden automatisch aus deinem Text extrahiert.",
        kind: reason,
      },
    ],
    questions: [],
    knots: [],
    consequences: { consequences: [], responsibilities: [] },
    responsibilityPaths: [],
    eventualities: [],
    decisionTrees: [],
    impactAndResponsibility: { impacts: [], responsibleActors: [] },
    report: {
      summary: null,
      keyConflicts: [],
      facts: { local: [], international: [] },
      openQuestions: [],
      takeaways: [],
    },
    _meta: {
      provider: "fallback",
      model: reason,
      pipeline: "contribution_analyze",
    },
  };
}

function resolveContributionId(rawId: unknown, text: string): string {
  if (typeof rawId === "string") {
    const trimmed = rawId.trim();
    if (trimmed.length >= 8) {
      return trimmed.slice(0, 64);
    }
  }
  return crypto.createHash("sha1").update(text).digest("hex").slice(0, 32);
}
