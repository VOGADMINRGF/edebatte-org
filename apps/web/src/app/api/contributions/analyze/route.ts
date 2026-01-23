// apps/web/src/app/api/contributions/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  analyzeContribution,
  type AnalyzeResultWithMeta,
} from "@features/analyze/analyzeContribution";
import { logger } from "@/utils/logger";
import { deriveContextNotes } from "@features/analyze/context";
import {
  deriveCriticalQuestions,
  deriveKnots,
} from "@features/analyze/questionizers";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";
import { syncAnalyzeResultToGraph } from "@core/graph";
import { persistEventualitiesSnapshot } from "@core/eventualities";
import { upsertRunReceipt } from "@/lib/db/runReceiptsRepo";
import { maskUserId } from "@core/pii/redact";
import type { ProviderMatrixEntry } from "@features/ai/orchestratorE150";
import type { AiErrorKind } from "@core/telemetry/aiUsageTypes";
import { buildHeuristicAnalyzeResult } from "@features/analyze/heuristics";
import crypto from "crypto";
import { parseAnalyzeRequestBody, type AnalyzeRequestParsed } from "./parseAnalyzeRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const ANALYZE_HARD_TIMEOUT_MS = Number(process.env.ANALYZE_HARD_TIMEOUT_MS ?? 55_000);

function withHardTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      const e: any = new Error("analyze_timeout");
      e.code = "ANALYZE_TIMEOUT";
      reject(e);
    }, ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

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

type AnalyzeJobInput = {
  text: string;
  locale: string;
  maxClaims: number;
  contributionId: string;
  userId?: string | null;
};

function sanitizeLocale(locale?: string): string {
  if (typeof locale === "string" && locale.trim()) {
    return locale.trim();
  }
  return "de";
}

function sanitizeMaxClaims(maxClaims?: number): number {
  if (typeof maxClaims === "number" && Number.isFinite(maxClaims) && maxClaims > 0) {
    return Math.min(50, Math.max(1, Math.floor(maxClaims)));
  }
  return DEFAULT_MAX_CLAIMS;
}

/**
 * E150 – Contribution-AI
 * - JSON: { ok: true, result: AnalyzeResult }
 * - SSE: progress/result/error-events mit identischem Result-Shape
 */
export async function POST(req: NextRequest): Promise<Response> {
  if (process.env.ANALYZE_ENABLED !== "true") {
    return NextResponse.json({
      ok: false,
      disabled: true,
      message: "Analyse derzeit deaktiviert.",
    });
  }

  const runId = crypto.randomUUID();
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return err("INVALID_JSON", "Ungültiger JSON-Body.", 400);
  }

  const parsed = parseAnalyzeRequestBody(rawBody);
  if (parsed.ok === false) {
    return err("BAD_INPUT", parsed.error.message, 400, { issues: parsed.error.issues });
  }

  const body = parsed.value;

  if (body.test === "ping") {
    return ok({ result: { ping: "pong" } });
  }

  const locale = sanitizeLocale(body.locale);
  const maxClaims = sanitizeMaxClaims(body.maxClaims);
  const text = body.text?.trim() || "";
  const userId = req.cookies.get("u_id")?.value ?? null;
  const contributionId = resolveContributionId(body.contributionId, text);
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();

  const rl = await rateLimitOrThrow(`analyze:ip:${ip}`, 15, 10 * 60 * 1000, { salt: "analyze" });
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
  };

  if (wantsSse(req, body)) {
    return startAnalyzeSseStream(analyzeInput);
  }

  try {
    const result = await withHardTimeout(runAnalyzeJob(analyzeInput), ANALYZE_HARD_TIMEOUT_MS);
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
    if ((error as any)?.code === "ANALYZE_TIMEOUT" || (error as any)?.message === "analyze_timeout") {
      return NextResponse.json(
        { ok: false, errorCode: "ANALYZE_TIMEOUT", message: "Analyze timed out" },
        { status: 504 },
      );
    }
    console.error("[contributions/analyze] failed", error);
    logErrorSafe({
      msg: "analyze.route.error",
      contributionId,
      userId: maskUserId(userId),
      err: error instanceof Error ? error.message : String(error),
    });
    const normalized = normalizeAnalyzerError(error);
    if (shouldUseFallback(normalized)) {
      const fallback = buildHeuristicAnalyzeResult({ text, locale });
      return NextResponse.json({
        ok: true,
        fallback: true,
        errorCode: normalized.code,
        message: normalized.message,
        result: fallback,
      });
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
        missingPerspectives: [],
        knots: [],
        consequences: { consequences: [], responsibilities: [] },
        responsibilityPaths: [],
        eventualities: [],
        decisionTrees: [],
        impactAndResponsibility: { impacts: [], responsibleActors: [] },
        participationCandidates: [],
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

function wantsSse(req: NextRequest, body: AnalyzeRequestParsed | null): boolean {
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

  const runReceipt = (result as any)?.runReceipt;
  if (runReceipt?.id) {
    await upsertRunReceipt(runReceipt).catch((err) => {
      logErrorSafe({
        msg: "analyze.route.runreceipt_persist_failed",
        contributionId: input.contributionId,
        err: err instanceof Error ? err.message : String(err),
      });
    });
  }

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

  return result;
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
        "AnalyzeContribution: Kein KI-Provider konfiguriert. Bitte wende dich an das eDebatte-Team.",
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
  "BAD_JSON",
  "ANALYZE_PROVIDER_FAILED",
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

function resolveContributionId(rawId: unknown, text: string): string {
  if (typeof rawId === "string") {
    const trimmed = rawId.trim();
    if (trimmed.length >= 8) {
      return trimmed.slice(0, 64);
    }
  }
  return crypto.createHash("sha1").update(text).digest("hex").slice(0, 32);
}
