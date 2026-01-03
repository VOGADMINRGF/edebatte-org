/**
 * E150-Orchestrator für Beitragsanalyse
 *
 * Aufgabe:
 * - Mehrere LLM-Provider (später OpenAI, Anthropic, Mistral, Gemini …) parallel
 *   ansprechen
 * - Ergebnisse als AnalyzeCandidates einsammeln
 * - bestes Ergebnis nach Score auswählen
 * - Fallbacks / Timeouts / Fehler sauber kapseln
 *
 * analyzeContribution validiert anschließend das JSON – dieser Orchestrator
 * liefert „nur“ Roh-JSON-Text zurück (plus Meta-Informationen).
 */

import { recordAiTelemetry } from "@features/ai/telemetry";
import { logAiUsage } from "@core/telemetry/aiUsage";
import type { AiErrorKind, AiPipelineName } from "@core/telemetry/aiUsageTypes";
import { callOpenAI as askOpenAI } from "@features/ai/providers/openai";
import {
  callAnthropic as askAnthropic,
} from "@features/ai/providers/anthropic";
import { anthropicProbe } from "./providers/anthropic";
import { callMistral as askMistral } from "@features/ai/providers/mistral";
import { callGemini as askGemini } from "@features/ai/providers/gemini";
import { callAriLLM as askAri } from "@features/ai/providers/ari_llm";
import { healthScore } from "@features/ai/orchestrator";
import { PROVIDER_CAPABILITIES, providerSupports } from "./e150/providers";
import { AnalyzeResultSchema, type AnalyzeResult } from "@features/analyze/schemas";
import { parseJsonLoose } from "@features/analyze/llmJson";

/* ------------------------------------------------------------------------- */
/* Typen                                                                     */
/* ------------------------------------------------------------------------- */

export type E150ProviderName = "openai" | "anthropic" | "mistral" | "gemini" | "ari";

type ProviderCallArgs = {
  prompt: string;
  signal: AbortSignal;
  maxTokens: number;
};

type ProviderCallResult = {
  text: string;
  modelName?: string;
  tokensIn?: number;
  tokensOut?: number;
  costEur?: number;
  strictJson?: boolean;
  formatUsed?: "json_schema" | "json_object";
  didFallback?: boolean;
  openaiErrorCode?: string | null;
  openaiErrorMessage?: string | null;
};

export type E150OrchestratorArgs = {
  systemPrompt: string;
  userPrompt: string;
  locale?: string | null;
  maxClaims?: number;
  maxTokens?: number;
  /**
   * Optional äußeres AbortSignal (z.B. Budget oder Request-Abbruch).
   * Wenn dies triggert, brechen laufende Provider-Aufrufe ab.
   */
  outerSignal?: AbortSignal;
  /**
   * Optional Validierung des Rohtexts (nach Sanitisierung).
   * Bei false/Fehler wird der Provider als BAD_JSON gewertet.
   */
  validateRaw?: (rawText: string) => boolean;
  requiredCapability?: ProviderProfile["capabilities"][number];
  /**
   * Gesamt-Timeout pro Provider (ms). Ohne Angabe wird
   * OPENAI_TIMEOUT_MS bzw. ein Default genutzt.
   */
  timeoutMs?: number;
  telemetry?: {
    userId?: string | null;
    tenantId?: string | null;
    region?: string | null;
    pipeline?: AiPipelineName;
  };
};

type ProviderRole =
  | "structure"
  | "context"
  | "questions"
  | "knots"
  | "mixed";

type ProviderProfile = {
  name: E150ProviderName;
  label: string;
  role: ProviderRole;
  weight: number;
  maxTokens: number;
  timeoutMs: number;
  enabled: () => boolean;
  disabledReason?: () => string | null;
  call: (args: ProviderCallArgs) => Promise<ProviderCallResult>;
  metricId?: string;
  promptHint?: string;
  capabilities: ("core_analysis" | "impact" | "responsibility" | "report" | "search")[];
  strictJson?: boolean;
  probe?: () => Promise<ProbeResult>;
};

type ProviderHealthState = "healthy" | "degraded" | "unknown" | "down";

type CancelReason =
  | "budget_abort"
  | "winner_abort"
  | "outer_abort"
  | "aborted_before_start"
  | "probe_blocked";

type ProviderSuccess = {
  ok: true;
  provider: E150ProviderName;
  rawText: string;
  durationMs: number;
  modelName?: string;
  tokensIn?: number;
  tokensOut?: number;
  costEur?: number;
  strictJson?: boolean;
  parsed?: AnalyzeResult;
  attempt: 1 | 2;
  formatUsed?: "json_schema" | "json_object";
  didFallback?: boolean;
  openaiErrorCode?: string | null;
  openaiErrorMessage?: string | null;
};

type ProviderFailure = {
  ok: false;
  provider: E150ProviderName;
  error: string;
  durationMs: number;
  errorKind: AiErrorKind;
  httpStatus?: number | null;
  errorMessageShort?: string;
  attempt?: 1 | 2;
  modelName?: string;
  cancelReason?: CancelReason | null;
  formatUsed?: "json_schema" | "json_object";
  didFallback?: boolean;
  openaiErrorCode?: string | null;
  openaiErrorMessage?: string | null;
};

type ProviderResult = ProviderSuccess | ProviderFailure;
type ProbeResult = {
  provider: E150ProviderName;
  ok: boolean;
  errorKind: AiErrorKind | null;
  status?: number | null;
  durationMs: number;
  checkedAt: number;
  modelKnown?: boolean;
};

export type E150OrchestratorCandidate = {
  provider: E150ProviderName;
  rawText: string;
  score: number;
  durationMs: number;
  modelName?: string;
  tokensIn?: number;
  tokensOut?: number;
  costEur?: number;
  parsed?: AnalyzeResult;
};

export type ProviderMatrixEntry = {
  provider: E150ProviderName;
  state: "running" | "ok" | "failed" | "cancelled" | "skipped" | "disabled";
  attempt?: number | null;
  errorKind?: AiErrorKind | null;
  status?: number | null;
  durationMs?: number | null;
  model?: string | null;
  reason?: string | null;
  formatUsed?: "json_schema" | "json_object" | null;
  didFallback?: boolean | null;
  openaiErrorCode?: string | null;
  openaiErrorMessage?: string | null;
};

export type E150OrchestratorMeta = {
  usedProviders: E150ProviderName[];
  failedProviders: { provider: E150ProviderName; error: string; errorKind?: AiErrorKind }[];
  timings: Record<E150ProviderName, number | null>;
  disabledProviders: { provider: E150ProviderName; reason: string }[];
  skippedProviders: { provider: E150ProviderName; reason: string }[];
  probes?: { provider: E150ProviderName; ok: boolean; errorKind: AiErrorKind | null; durationMs: number }[];
  providerMatrix?: ProviderMatrixEntry[];
};

/**
 * Rückgabe des Orchestrators.
 *
 * `rawText` bleibt für Legacy-Aufrufer erhalten und zeigt auf
 * `best.rawText`.
 */
export type E150OrchestratorResult = {
  /** @deprecated – Alias für best.rawText, für Legacy-Aufrufer beibehalten. */
  rawText: string;
  best: E150OrchestratorCandidate;
  candidates: E150OrchestratorCandidate[];
  meta: E150OrchestratorMeta;
};

export class OrchestratorNoProviderError extends Error {
  code = "NO_ANALYZE_PROVIDER";
  meta?: { disabled?: { provider: E150ProviderName; reason: string }[]; skipped?: { provider: E150ProviderName; reason: string }[]; providerMatrix?: ProviderMatrixEntry[] };
  constructor(message: string, meta?: OrchestratorNoProviderError["meta"]) {
    super(message);
    this.name = "OrchestratorNoProviderError";
    this.meta = meta;
  }
}

export class OrchestratorAllFailedError extends Error {
  code = "ANALYZE_PROVIDER_FAILED";
  meta?: OrchestratorNoProviderError["meta"] & { failedProviders?: { provider: E150ProviderName; error: string; errorKind?: AiErrorKind }[] };
  constructor(message: string, meta?: OrchestratorAllFailedError["meta"]) {
    super(message);
    this.name = "OrchestratorAllFailedError";
    this.meta = meta;
  }
}

/* ------------------------------------------------------------------------- */
/* Konfiguration                                                             */
/* ------------------------------------------------------------------------- */

function mapErrorToKind(error: unknown): AiErrorKind {
  if (!error) return "UNKNOWN";
  if ((error as any)?.errorKind === "CANCELLED") return "CANCELLED";
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as any).message ?? "")
      : typeof error === "string"
        ? error
        : "";

  const status = typeof (error as any)?.status === "number" ? (error as any).status : null;
  if ((error as any)?.name === "AbortError" || /timed out|timeout/i.test(message)) {
    return "TIMEOUT";
  }
  if (status === 404 || /model/i.test(message) && /404/.test(message)) return "MODEL_NOT_FOUND";
  if (status === 429) return "RATE_LIMIT";
  if (status === 402) return "UNAUTHORIZED";
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 400 && /api key|token/i.test(message)) return "INVALID_API_KEY";
  if (/api key/i.test(message) || /invalid token/i.test(message)) return "INVALID_API_KEY";
  if (status === 400 && /response_format|json_object not supported/i.test(message)) return "INTERNAL";
  if (/context_length|maximum context length|too long/i.test(message)) return "INTERNAL";
  if (/json/i.test(message) || /zod/i.test(message) || /parse/i.test(message)) return "BAD_JSON";
  return status ? "INTERNAL" : "UNKNOWN";
}

const OPENAI_TIMEOUT_DEFAULT = Number(process.env.OPENAI_TIMEOUT_MS ?? 45_000);
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const OPENAI_BASE_FOR_PROBE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
  /\/+$/,
  "",
);
const ORCHESTRATOR_BUDGET_MS = Number(process.env.E150_ANALYZE_BUDGET_MS ?? 25_000);
const PROVIDER_PROBE_TTL_MS = Number(process.env.PROVIDER_PROBE_TTL_MS ?? 60_000);
const PROVIDER_PROBE_DISABLE_SHORT_MS = 60_000;
const PROVIDER_PROBE_DISABLE_LONG_MS = 10 * 60_000;
const DEFAULT_ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

function isLikelyValidKey(provider: E150ProviderName, key: string | undefined | null): boolean {
  if (!key) return false;
  switch (provider) {
    case "anthropic":
      return /^sk-ant-/.test(key) && key.length > 40;
    case "openai":
      return /^sk-/.test(key) && key.length > 40;
    case "mistral":
      return key.length > 20;
    case "ari":
      return key.length > 20;
    case "gemini":
      return key.length > 20;
    default:
      return Boolean(key);
  }
}

const PROVIDERS: ProviderProfile[] = [
  {
    name: "openai",
    label: "OpenAI (E150 contrib analyzer)",
    role: "mixed",
    weight: 1,
    maxTokens: 2_600,
    timeoutMs: OPENAI_TIMEOUT_DEFAULT,
    metricId: "openai",
    strictJson: true,
    promptHint:
      "Deliver a balanced mix of claims, context notes, questions, and knots while keeping everything grounded in the source text.",
    enabled: () => isLikelyValidKey("openai", process.env.OPENAI_API_KEY),
    disabledReason: () => (!isLikelyValidKey("openai", process.env.OPENAI_API_KEY) ? "API key fehlt/ungültig" : null),
    capabilities: [...(PROVIDER_CAPABILITIES.openai ?? [])],
    probe: async () => probeOpenAI(),
    call: async ({ prompt, signal, maxTokens }) => {
      const { text, model } = await askOpenAI({
        prompt,
        asJson: true,
        forceJsonFormat: true,
        model: DEFAULT_OPENAI_MODEL,
        maxOutputTokens: maxTokens,
        signal,
      });
      return {
        text,
        modelName: model ?? DEFAULT_OPENAI_MODEL,
        strictJson: true,
      };
    },
  },
  {
    name: "anthropic",
    label: "Anthropic Claude",
    role: "context",
    weight: 0.9,
    maxTokens: 2_400,
    timeoutMs: Number(process.env.ANTHROPIC_TIMEOUT_MS ?? 12_000),
    metricId: "anthropic",
    strictJson: true,
    promptHint:
      "Extract rich background/context sections (facts, stakeholders, assumptions). Prioritize clarity and neutrality.",
    enabled: () =>
      process.env.ANTHROPIC_DISABLED !== "1" && isLikelyValidKey("anthropic", process.env.ANTHROPIC_API_KEY),
    disabledReason: () => {
      if (process.env.ANTHROPIC_DISABLED === "1") return "deaktiviert (ANTHROPIC_DISABLED=1)";
      if (!isLikelyValidKey("anthropic", process.env.ANTHROPIC_API_KEY)) return "API key fehlt/ungültig";
      return null;
    },
    capabilities: [...(PROVIDER_CAPABILITIES.anthropic ?? [])],
    call: async ({ prompt, signal, maxTokens }) => {
      const { text, model, tokensIn, tokensOut } = await askAnthropic({
        prompt,
        maxOutputTokens: maxTokens,
        signal,
      });
      return {
        text,
        modelName: model ?? DEFAULT_ANTHROPIC_MODEL,
        tokensIn,
        tokensOut,
        strictJson: true,
      };
    },
  },
  {
    name: "mistral",
    label: "Mistral Large",
    role: "structure",
    weight: 0.8,
    maxTokens: 2_000,
    timeoutMs: Number(process.env.MISTRAL_TIMEOUT_MS ?? 35_000),
    metricId: "mistral",
    promptHint:
      "Split the text into concise, testable claims (max one assertion per claim). Highlight responsibilities/topics clearly.",
    enabled: () => Boolean(process.env.MISTRAL_API_KEY),
    disabledReason: () => (!isLikelyValidKey("mistral", process.env.MISTRAL_API_KEY) ? "API key fehlt/ungültig" : null),
    capabilities: [...(PROVIDER_CAPABILITIES.mistral ?? [])],
    probe: async () => probeHttp("mistral", "https://api.mistral.ai/v1/models", {
      headers: { authorization: `Bearer ${process.env.MISTRAL_API_KEY ?? ""}` },
    }),
    call: async ({ prompt, signal, maxTokens }) => {
      const { text, model, tokensIn, tokensOut } = await askMistral({
        prompt,
        maxOutputTokens: maxTokens,
        signal,
      });
      return {
        text,
        modelName: model ?? process.env.MISTRAL_MODEL ?? "mistral-large-latest",
        tokensIn,
        tokensOut,
      };
    },
  },
  {
    name: "gemini",
    label: "Gemini Pro",
    role: "questions",
    weight: 0.75,
    maxTokens: 2_200,
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 18_000),
    metricId: "gemini",
    promptHint:
      "Focus on investigative, critical questions (finance, legal, impact). Each question must be grounded in the provided text.",
    enabled: () => {
      if (process.env.GEMINI_DISABLED === "1") return false;
      const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
      const hasKey = isLikelyValidKey("gemini", key);
      if (!process.env.VERCEL && !hasKey) return false;
      return hasKey;
    },
    disabledReason: () => {
      if (process.env.GEMINI_DISABLED === "1") return "deaktiviert (GEMINI_DISABLED=1)";
      const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
      if (!process.env.VERCEL && !hasKey) return "deaktiviert (lokal)";
      if (!hasKey) return "API key fehlt";
      return null;
    },
    capabilities: [...(PROVIDER_CAPABILITIES.gemini ?? [])],
    probe: async () => probeGeminiNow(),
    call: async ({ prompt, signal, maxTokens }) => {
      const { text, model, tokensIn, tokensOut } = await askGemini({
        prompt,
        maxOutputTokens: maxTokens,
        signal,
      });
      return {
        text,
        modelName: model ?? process.env.GEMINI_MODEL ?? "gemini-1.5-pro",
        tokensIn,
        tokensOut,
      };
    },
  },
  {
    name: "ari",
    label: "ARI",
    role: "mixed",
    weight: 0.85,
    maxTokens: 2_300,
    timeoutMs: Number(process.env.ARI_TIMEOUT_MS ?? 25_000),
    metricId: "ari",
    strictJson: true,
    promptHint:
      "Return concise, strictly grounded analysis with clear claims, impacts, and responsibilities in JSON.",
    enabled: () => {
      if (process.env.ARI_DISABLED === "1") return false;
      const base = process.env.ARI_BASE_URL || process.env.ARI_URL || process.env.ARI_API_URL || process.env.YOUCOM_ARI_API_URL;
      const key = process.env.ARI_API_KEY || process.env.YOUCOM_ARI_API_KEY;
      return Boolean(base && key);
    },
    disabledReason: () =>
      process.env.ARI_DISABLED === "1"
        ? "deaktiviert (ARI_DISABLED=1)"
        : !(process.env.ARI_BASE_URL || process.env.ARI_URL || process.env.ARI_API_URL || process.env.YOUCOM_ARI_API_URL)
          ? "Basis-URL fehlt"
          : !isLikelyValidKey("ari", (process.env.ARI_API_KEY || process.env.YOUCOM_ARI_API_KEY) ?? "")
            ? "API key fehlt/ungültig"
            : null,
    capabilities: [...(PROVIDER_CAPABILITIES.ari ?? [])],
    call: async ({ prompt, signal, maxTokens }) => {
      const { text, model, tokensIn, tokensOut } = await askAri({
        prompt,
        asJson: true,
        maxOutputTokens: maxTokens,
        signal,
      });
      return {
        text,
        modelName: model ?? process.env.ARI_MODEL ?? "ari-main",
        tokensIn,
        tokensOut,
        strictJson: true,
      };
    },
  },
];

function resolveProviderPool(
  requiredCapability: ProviderProfile["capabilities"][number] = "core_analysis",
): {
  active: ProviderProfile[];
  disabled: { provider: E150ProviderName; reason: string }[];
  skipped: { provider: E150ProviderName; reason: string }[];
  probes: ProbeResult[];
} {
  const disabled: { provider: E150ProviderName; reason: string }[] = [];
  const skipped: { provider: E150ProviderName; reason: string }[] = [];
  const probes: ProbeResult[] = [];

  const active = PROVIDERS.filter((profile) => {
    try {
      const enabled = profile.enabled();
      if (!enabled) {
        const reason = profile.disabledReason?.() ?? "disabled";
        disabled.push({ provider: profile.name, reason });
        return false;
      }
      if (!providerSupports(profile.name, requiredCapability)) {
        skipped.push({
          provider: profile.name,
          reason: `missing capability ${requiredCapability}`,
        });
        return false;
      }
      return true;
    } catch {
      disabled.push({ provider: profile.name, reason: "disabled" });
      return false;
    }
  });

  return { active, disabled, skipped, probes };
}

/* ------------------------------------------------------------------------- */
/* Hilfsfunktionen                                                           */
/* ------------------------------------------------------------------------- */

function buildProviderMatrix(
  outcomes: ProviderResult[],
  disabled: { provider: E150ProviderName; reason: string }[],
  skipped: { provider: E150ProviderName; reason: string }[],
  probes: ProbeResult[],
): ProviderMatrixEntry[] {
  const disabledSet = new Set(disabled.map((d) => d.provider));
  const skippedSet = new Set(skipped.map((s) => s.provider));
  const probeMap = new Map(probes.map((p) => [p.provider, p]));

  return PROVIDERS.map((p) => {
    const outcome = outcomes.find((o) => o.provider === p.name);
    const probe = probeMap.get(p.name);
    if (outcome && outcome.ok) {
      const o = outcome as ProviderSuccess;
      return {
        provider: p.name,
        state: "ok",
        attempt: o.attempt ?? null,
        errorKind: null,
        status: null,
        durationMs: o.durationMs,
        model: o.modelName ?? null,
        formatUsed: o.formatUsed ?? null,
        didFallback: o.didFallback ?? null,
        openaiErrorCode: o.openaiErrorCode ?? null,
        openaiErrorMessage: o.openaiErrorMessage ?? null,
      };
    }
    if (outcome && !outcome.ok) {
      const o = outcome as ProviderFailure;
      if (o.errorKind === "CANCELLED") {
        return {
          provider: p.name,
          state: "cancelled",
          attempt: o.attempt ?? null,
          errorKind: o.errorKind ?? null,
          status: o.httpStatus ?? null,
          durationMs: o.durationMs,
          model: o.modelName ?? null,
          reason: o.cancelReason ?? o.error ?? null,
          formatUsed: o.formatUsed ?? null,
          didFallback: o.didFallback ?? null,
          openaiErrorCode: o.openaiErrorCode ?? null,
          openaiErrorMessage: o.openaiErrorMessage ?? null,
        };
      }
    }
    if (outcome && !outcome.ok) {
      const o = outcome as ProviderFailure;
      return {
        provider: p.name,
        state: "failed",
        attempt: o.attempt ?? null,
        errorKind: o.errorKind ?? null,
        status: o.httpStatus ?? null,
        durationMs: o.durationMs,
        model: o.modelName ?? null,
        reason: o.cancelReason ?? null,
        formatUsed: o.formatUsed ?? null,
        didFallback: o.didFallback ?? null,
        openaiErrorCode: o.openaiErrorCode ?? null,
        openaiErrorMessage: o.openaiErrorMessage ?? null,
      };
    }
    if (disabledSet.has(p.name)) {
      return {
        provider: p.name,
        state: "disabled",
        errorKind: probe?.errorKind ?? null,
        status: probe?.status ?? null,
        model: null,
        reason: disabled.find((d) => d.provider === p.name)?.reason ?? null,
      };
    }
    if (skippedSet.has(p.name)) {
      return {
        provider: p.name,
        state: "skipped",
        errorKind: probe?.errorKind ?? null,
        status: probe?.status ?? null,
        model: null,
        reason: skipped.find((s) => s.provider === p.name)?.reason ?? null,
      };
    }
    return {
      provider: p.name,
      state: "running",
      errorKind: probe?.errorKind ?? null,
      status: probe?.status ?? null,
      model: null,
      reason: null,
      formatUsed: null,
      didFallback: null,
      openaiErrorCode: null,
      openaiErrorMessage: null,
    };
  });
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out nach ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const cleanup = () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      reject(abortError);
    };
    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort);
    }
  });
}

function hedgeDelay(provider: E150ProviderName): number {
  switch (provider) {
    case "openai":
      return 0;
    case "mistral":
      return 1_200;
    case "anthropic":
    case "ari":
      return 2_400;
    default:
      return 2_400;
  }
}

function resolveProviderHealth(profile: ProviderProfile): {
  state: ProviderHealthState;
  score: number;
} {
  if (!profile.metricId) {
    return { state: "unknown", score: 0.5 };
  }

  const raw = clamp(healthScore(profile.metricId), 0, 1);

  if (raw >= 0.75) return { state: "healthy", score: raw };
  if (raw >= 0.45) return { state: "degraded", score: raw };
  if (raw > 0) return { state: "down", score: raw };
  return { state: "unknown", score: raw };
}

const probeCache = new Map<
  E150ProviderName,
  { result: ProbeResult; disabledUntil: number | null }
>();

async function probeHttp(
  provider: E150ProviderName,
  url: string,
  options: { headers?: Record<string, string> },
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: options.headers ?? {},
      signal: controller.signal,
    });
    const durationMs = Date.now() - started;
    if (res.ok) {
      return { provider, ok: true, errorKind: null, status: res.status, durationMs, checkedAt: Date.now() };
    }
    let errorKind: AiErrorKind | null = "INTERNAL";
    if (res.status === 401 || res.status === 403) errorKind = "UNAUTHORIZED";
    else if (res.status === 404) errorKind = "MODEL_NOT_FOUND";
    else if (res.status === 429) errorKind = "RATE_LIMIT";
    return { provider, ok: false, errorKind, status: res.status, durationMs, checkedAt: Date.now() };
  } catch (err: any) {
    const durationMs = Date.now() - started;
    const errorKind: AiErrorKind =
      err?.name === "AbortError" ? "TIMEOUT" : "INTERNAL";
    return { provider, ok: false, errorKind, status: null, durationMs, checkedAt: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}


async function probeGeminiNow(): Promise<ProbeResult> {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  const provider: E150ProviderName = "gemini";
  if (!key) {
    return { provider, ok: false, errorKind: "INVALID_API_KEY", status: 0, durationMs: 0, checkedAt: Date.now() };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  const started = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    const durationMs = Date.now() - started;
    if (res.ok) {
      return { provider, ok: true, errorKind: null, status: res.status, durationMs, checkedAt: Date.now() };
    }
    // Gemini often returns 400 for invalid keys
    const errorKind: AiErrorKind =
      res.status === 401 || res.status === 403
        ? "UNAUTHORIZED"
        : res.status === 400
          ? "INVALID_API_KEY"
          : res.status === 429
            ? "RATE_LIMIT"
            : "INTERNAL";
    return { provider, ok: false, errorKind, status: res.status, durationMs, checkedAt: Date.now() };
  } catch (err: any) {
    const durationMs = Date.now() - started;
    const kind = mapErrorToKind(err);
    return { provider, ok: false, errorKind: kind, status: (err?.status as number | undefined) ?? null, durationMs, checkedAt: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
async function probeOpenAI(): Promise<ProbeResult> {
  const mode = (process.env.PROVIDER_PROBE_MODE ?? "light").toLowerCase();
  if (mode !== "deep") {
    const res = await probeHttp("openai", `${OPENAI_BASE_FOR_PROBE}/models`, {
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
    });
    return { ...res, provider: "openai" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  const started = Date.now();
  try {
    const res = await fetch(`${OPENAI_BASE_FOR_PROBE}/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: DEFAULT_OPENAI_MODEL,
        max_output_tokens: 1,
        input: [{ role: "user", content: "ping" }],
        text: { format: { type: "json_object" } },
      }),
      signal: controller.signal,
    });
    const durationMs = Date.now() - started;
    if (res.ok) {
      return { provider: "openai", ok: true, errorKind: null, status: res.status, durationMs, checkedAt: Date.now(), modelKnown: true };
    }
    let errorKind: AiErrorKind | null = "INTERNAL";
    if (res.status === 401 || res.status === 403) errorKind = "UNAUTHORIZED";
    else if (res.status === 429) errorKind = "RATE_LIMIT";
    return { provider: "openai", ok: false, errorKind, status: res.status, durationMs, checkedAt: Date.now(), modelKnown: true };
  } catch (err: any) {
    const durationMs = Date.now() - started;
    const errorKind: AiErrorKind =
      err?.name === "AbortError" ? "TIMEOUT" : "INTERNAL";
    return { provider: "openai", ok: false, errorKind, status: null, durationMs, checkedAt: Date.now(), modelKnown: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function runProviderProbeCached(
  profile: ProviderProfile,
  telemetry?: E150OrchestratorArgs["telemetry"],
): Promise<ProbeResult | null> {
  if (!profile.probe) return null;
  const cached = probeCache.get(profile.name);
  const now = Date.now();
  if (cached && cached.result.checkedAt + PROVIDER_PROBE_TTL_MS > now) {
    if (cached.disabledUntil && cached.disabledUntil > now) {
      return cached.result;
    }
    return cached.result;
  }
  const res = await profile.probe().catch(() => ({
    ok: false,
    errorKind: "INTERNAL" as AiErrorKind,
    status: null,
    durationMs: 0,
    checkedAt: Date.now(),
    provider: profile.name,
  }));
  const resultWithProvider = { ...res, provider: res.provider ?? profile.name };

  const disableDuration =
    resultWithProvider.ok
      ? null
      : resultWithProvider.errorKind === "UNAUTHORIZED" || resultWithProvider.errorKind === "INVALID_API_KEY"
        ? PROVIDER_PROBE_DISABLE_LONG_MS
        : PROVIDER_PROBE_DISABLE_SHORT_MS;

  const disabledUntil = disableDuration ? now + disableDuration : null;
  probeCache.set(profile.name, { result: resultWithProvider, disabledUntil });

  logAiUsage({
    createdAt: new Date(),
    provider: profile.name,
    model: "probe",
    pipeline: "provider_probe",
    userId: telemetry?.userId ?? null,
    tenantId: telemetry?.tenantId ?? null,
    region: telemetry?.region ?? null,
    locale: telemetry?.region ?? null,
    tokensInput: 0,
    tokensOutput: 0,
    costEur: 0,
    durationMs: resultWithProvider.durationMs,
    success: resultWithProvider.ok,
    errorKind: resultWithProvider.errorKind ?? null,
    strictJson: false,
  }).catch(() => {});

  return resultWithProvider;
}

function scoreCandidate(
  provider: ProviderProfile,
  rawText: string,
  durationMs: number,
): number {
  // Simple Heuristik:
  // - gültiges JSON wird höher gewichtet
  // - kürzere Laufzeit leicht bevorzugt
  let jsonOk = false;
  try {
    JSON.parse(rawText);
    jsonOk = true;
  } catch {
    // egal – analyzeContribution wird später strikt validieren
  }

  const base = provider.weight;
  const jsonBonus = jsonOk ? 0.5 : 0;
  const speedBonus =
    durationMs > 0 ? Math.min(0.5, Math.max(0, 8_000 - durationMs) / 8_000) : 0;
  const { state, score } = resolveProviderHealth(provider);
  const healthBoost = score * 0.25;
  const healthPenalty = state === "down" ? 0.3 : state === "degraded" ? 0.1 : 0;

  return base + jsonBonus + speedBonus + healthBoost - healthPenalty;
}

async function runProvider(
  profile: ProviderProfile,
  args: E150OrchestratorArgs,
): Promise<ProviderResult> {
  if (args.outerSignal?.aborted) {
    const reason = (args.outerSignal.reason as CancelReason | undefined) ?? "outer_abort";
    return {
      ok: false,
      provider: profile.name,
      error: `cancelled: ${reason}`,
      durationMs: 0,
      errorKind: "CANCELLED",
      cancelReason: reason,
      attempt: 1,
    };
  }

  const started = Date.now();
  const baseMaxTokens = Math.min(args.maxTokens ?? profile.maxTokens, profile.maxTokens);
  const baseTimeoutMs = args.timeoutMs ?? profile.timeoutMs;
  const prompt = buildPrompt(args.systemPrompt, args.userPrompt, profile);
  const outerSignal = args.outerSignal;
  let attemptAbortReason: CancelReason | "timeout" | null = null;

  const runAttempt = async (
    maxTokens: number,
    timeoutMs: number,
    attempt: 1 | 2,
    opts?: { disableJsonFormat?: boolean },
  ) => {
    attemptAbortReason = null;
    const controller = new AbortController();
    const outerAbortHandler = () => {
      attemptAbortReason =
        (outerSignal?.reason as CancelReason | undefined) ??
        attemptAbortReason ??
        "outer_abort";
      controller.abort(outerSignal?.reason);
    };

    if (outerSignal) {
      if (outerSignal.aborted) {
        outerAbortHandler();
      } else {
        outerSignal.addEventListener("abort", outerAbortHandler);
      }
    }

    const timeout = setTimeout(() => {
      attemptAbortReason = attemptAbortReason ?? "timeout";
      controller.abort();
    }, timeoutMs);
    try {
      const callPromise = profile.call({
        prompt: opts?.disableJsonFormat
          ? `${prompt}\n\nJSON only. No extra keys. No input echo.`
          : prompt,
        signal: controller.signal,
        maxTokens,
      });
      const result = await withTimeout(callPromise, timeoutMs + 1_000, profile.label);
      const strictJson = result.strictJson ?? profile.strictJson ?? false;
      return {
        ok: true as const,
        result,
        durationMs: Date.now() - started,
        strictJson,
        attempt,
      };
    } finally {
      clearTimeout(timeout);
      if (outerSignal && outerAbortHandler) {
        outerSignal.removeEventListener("abort", outerAbortHandler);
      }
    }
  };

  const allowedRetryKinds: AiErrorKind[] = ["TIMEOUT", "RATE_LIMIT", "INTERNAL", "BAD_JSON"];
  let lastError: any = null;
  let lastKind: AiErrorKind = "UNKNOWN";

  for (let attempt = 0; attempt < 2; attempt++) {
    const maxTokens =
      attempt === 0 ? baseMaxTokens : Math.min(900, Math.max(1, Math.floor(baseMaxTokens * 0.75)));
    const timeoutMs = attempt === 0 ? baseTimeoutMs : baseTimeoutMs + 5_000;
    const disableJsonFormat =
      profile.name === "openai" && attempt === 1 && lastKind === "INTERNAL";
    try {
      const {
        result,
        durationMs,
        strictJson,
        attempt: attemptIndex,
      } = await runAttempt(
        maxTokens,
        timeoutMs,
        (attempt + 1) as 1 | 2,
        { disableJsonFormat },
      );
      return {
        ok: true,
        provider: profile.name,
        rawText: result.text,
        durationMs,
        modelName: result.modelName,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costEur: result.costEur,
        strictJson,
        attempt: attemptIndex,
        formatUsed: result.formatUsed,
        didFallback: result.didFallback,
        openaiErrorCode: result.openaiErrorCode,
        openaiErrorMessage: result.openaiErrorMessage,
      };
    } catch (err: any) {
      lastError = err;
      const abortReason =
        attemptAbortReason && attemptAbortReason !== "timeout"
          ? attemptAbortReason
          : null;
      lastKind = abortReason ? "CANCELLED" : mapErrorToKind(err);
      const shouldRetry =
        attempt === 0 && allowedRetryKinds.includes(lastKind) && !abortReason;
      if (shouldRetry) continue;

      const durationMs = Date.now() - started;
      const message =
        abortReason === "budget_abort"
          ? `${profile.label} cancelled (budget)`
          : abortReason === "winner_abort"
            ? `${profile.label} cancelled (winner)`
            : abortReason
              ? `${profile.label} cancelled (${abortReason})`
              : err?.name === "AbortError"
                ? `${profile.label} timed out nach ${timeoutMs}ms`
                : typeof err?.message === "string"
                  ? err.message
                  : `Unbekannter Fehler bei ${profile.label}`;
      return {
        ok: false,
        provider: profile.name,
        error: message,
        durationMs,
        errorKind: lastKind,
        httpStatus: typeof err?.status === "number" ? err.status : null,
        errorMessageShort: typeof err?.message === "string" ? err.message.slice(0, 200) : undefined,
        attempt: (attempt + 1) as 1 | 2,
        modelName: (err as any)?.meta?.model ?? undefined,
        cancelReason: abortReason,
      };
    }
  }

  const durationMs = Date.now() - started;
  return {
    ok: false,
    provider: profile.name,
    error: lastError?.message ?? `Unbekannter Fehler bei ${profile.label}`,
    durationMs,
    errorKind: lastKind,
    httpStatus: typeof lastError?.status === "number" ? lastError.status : null,
    errorMessageShort:
      typeof lastError?.message === "string" ? lastError.message.slice(0, 200) : undefined,
    attempt: 2,
  };
}

function buildPrompt(
  system: string | undefined,
  user: string | undefined,
  profile: ProviderProfile,
): string {
  const sections: string[] = [];
  if (system?.trim()) sections.push(system.trim());
  const roleGuidance = buildRoleGuidance(profile.role, profile.promptHint);
  if (roleGuidance) sections.push("", roleGuidance);
  if (user?.trim()) sections.push("", user.trim());
  sections.push("", "Return ONLY valid JSON (RFC8259). No Markdown, no commentary.");
  sections.push(
    "Output must start with '{' and end with '}'. No trailing commas. Include all required keys; use null or [] when unsure.",
  );
  return sections.join("\n");
}

function buildRoleGuidance(role: ProviderRole, promptHint?: string): string | null {
  if (promptHint) return promptHint;
  switch (role) {
    case "structure":
      return [
        "Focus on extracting atomic, testable claims.",
        "Ensure each claim contains one responsibility/topic so voting later is possible.",
      ].join(" ");
    case "context":
      return [
        "Prioritize contextual notes that explain background, stakeholders, facts.",
        "Highlight contradictions or missing data only if grounded in the source.",
      ].join(" ");
    case "questions":
      return [
        "Surface critical questions citizens should ask (finance, legal, impact).",
        "Avoid opinionated language; keep questions concise.",
      ].join(" ");
    case "knots":
      return [
        "Identify conflict knots / trade-offs.",
        "Each knot should name the tension and describe it in 1-2 sentences.",
      ].join(" ");
    default:
      return null;
  }
}

/* ------------------------------------------------------------------------- */
/* Öffentliche API                                                           */
/* ------------------------------------------------------------------------- */

const LIMITS = {
  claims: 10,
  notes: 6,
  questions: 5,
  knots: 5,
  eventualities: 8,
  consequences: 8,
  responsibilities: 8,
  reportList: 7,
};

function sanitizeJsonText(raw: string): string {
  let text = raw?.trim?.() ?? "";
  if (text.startsWith("```")) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline !== -1) text = text.slice(firstNewline + 1);
    const lastFence = text.lastIndexOf("```");
    if (lastFence !== -1) text = text.slice(0, lastFence);
    text = text.trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }
  return text;
}

function repairJsonText(raw: string): string {
  let text = raw ?? "";
  // Replace smart quotes with ASCII quotes.
  text = text.replace(/[\u201C\u201D]/g, "\"").replace(/[\u2018\u2019]/g, "'");
  // Remove trailing commas before } or ].
  text = text.replace(/,\s*([}\]])/g, "$1");
  return text;
}

function tryParseJson<T = any>(raw: string): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    // ignore
  }

  try {
    const repaired = repairJsonText(raw);
    if (repaired !== raw) {
      return { ok: true, value: JSON.parse(repaired) };
    }
  } catch {
    // ignore
  }
  return { ok: false };
}

function clampAnalysis(data: any): AnalyzeResult {
  const isObj = (v: any): v is Record<string, any> => !!v && typeof v === "object";
  const isStr = (v: any): v is string => typeof v === "string";

  const clampStr = (val: unknown, n: number): string[] =>
    Array.isArray(val) ? val.filter(isStr).slice(0, n) : [];

  const clampObj = <T extends object>(val: unknown, n: number): T[] =>
    Array.isArray(val) ? (val.filter(isObj).slice(0, n) as T[]) : [];

  const reportIn = isObj(data?.report) ? data.report : {};
  const factsIn = isObj(reportIn.facts) ? reportIn.facts : {};

  const report: AnalyzeResult["report"] = {
    summary: isStr(reportIn.summary) ? reportIn.summary : null,
    keyConflicts: clampStr(reportIn.keyConflicts, LIMITS.reportList),
    facts: {
      local: clampStr(factsIn.local, LIMITS.reportList),
      international: clampStr(factsIn.international, LIMITS.reportList),
    },
    openQuestions: clampStr(reportIn.openQuestions, LIMITS.reportList),
    takeaways: clampStr(reportIn.takeaways, LIMITS.reportList),
  };

  const consIn = isObj(data?.consequences) ? data.consequences : {};
  const consequences: AnalyzeResult["consequences"] = {
    consequences: clampObj(consIn.consequences, LIMITS.consequences),
    responsibilities: clampObj(consIn.responsibilities, LIMITS.responsibilities),
  };

  return {
    mode: "E150",
    sourceText: isStr(data?.sourceText) ? data.sourceText : null,
    language: isStr(data?.language) ? data.language : "de",
    claims: clampObj(data?.claims, LIMITS.claims),
    notes: clampObj(data?.notes, LIMITS.notes),
    questions: clampObj(data?.questions, LIMITS.questions),
    knots: clampObj(data?.knots, LIMITS.knots),
    consequences,
    responsibilityPaths: Array.isArray(data?.responsibilityPaths) ? data.responsibilityPaths : [],
    decisionTrees: Array.isArray(data?.decisionTrees) ? data.decisionTrees : [],
    eventualities: clampObj(data?.eventualities, LIMITS.eventualities),
    impactAndResponsibility: isObj(data?.impactAndResponsibility)
      ? data.impactAndResponsibility
      : { impacts: [], responsibleActors: [] },
    report,
  } as AnalyzeResult;
}

function parseAnalyzeResult(
  rawText: string,
): { ok: true; value: AnalyzeResult } | { ok: false; reason: "BAD_JSON" } {
  const cleaned = rawText
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  const direct = tryParseJson(cleaned);
  if (direct.ok) {
    const validated = AnalyzeResultSchema.safeParse(direct.value);
    if (validated.success) return { ok: true, value: clampAnalysis(validated.data) };
  }

  const loose = parseJsonLoose(rawText, AnalyzeResultSchema);
  if (loose.ok) return { ok: true, value: clampAnalysis(loose.value) };

  return { ok: false, reason: "BAD_JSON" };
}

function validateCandidate(
  rawText: string,
  validateRaw?: (raw: string) => boolean,
): { ok: true; jsonText: string; parsed: AnalyzeResult } | { ok: false; reason: string } {
  const cleaned = sanitizeJsonText(rawText);

  if (validateRaw) {
    try {
      const valid = validateRaw(cleaned);
      if (valid === false) return { ok: false, reason: "BAD_JSON" };
    } catch {
      return { ok: false, reason: "BAD_JSON" };
    }
  }

  const parsed = parseAnalyzeResult(rawText);
  if (!parsed.ok) return { ok: false, reason: "BAD_JSON" };

  return {
    ok: true,
    jsonText: JSON.stringify(parsed.value),
    parsed: parsed.value,
  };
}

async function runProviderProbe(
  provider: E150ProviderName,
  telemetry?: E150OrchestratorArgs["telemetry"],
): Promise<{ provider: E150ProviderName; ok: boolean; errorKind: AiErrorKind | null; durationMs: number } | null> {
  const started = Date.now();
  try {
    if (provider === "anthropic") {
      const res = await anthropicProbe();
      await logAiUsage({
        createdAt: new Date(),
        provider,
        model: "probe",
        pipeline: "provider_probe",
        userId: telemetry?.userId ?? null,
        tenantId: telemetry?.tenantId ?? null,
        region: telemetry?.region ?? null,
        locale: telemetry?.region ?? null,
        tokensInput: 0,
        tokensOutput: 0,
        costEur: 0,
        durationMs: res.durationMs ?? Date.now() - started,
        success: res.ok,
        errorKind: res.errorKind ?? null,
        strictJson: false,
      }).catch(() => {});
      return {
        provider,
        ok: res.ok,
        errorKind: res.errorKind ?? null,
        durationMs: res.durationMs ?? Date.now() - started,
      };
    }
  } catch {
    await logAiUsage({
      createdAt: new Date(),
      provider,
      model: "probe",
      pipeline: "provider_probe",
      userId: telemetry?.userId ?? null,
      tenantId: telemetry?.tenantId ?? null,
      region: telemetry?.region ?? null,
      locale: telemetry?.region ?? null,
      tokensInput: 0,
      tokensOutput: 0,
      costEur: 0,
      durationMs: Date.now() - started,
      success: false,
      errorKind: "INTERNAL",
      strictJson: false,
    }).catch(() => {});
  }
  return {
    provider,
    ok: false,
    errorKind: "INTERNAL",
    durationMs: Date.now() - started,
  };
}

function logProviderTelemetry(matrix: ProviderMatrixEntry[]) {
  matrix.forEach((entry) => {
    // eslint-disable-next-line no-console
    console.log(
      `[analyze][telemetry] ${entry.provider} state=${entry.state} attempt=${entry.attempt ?? "null"} errorKind=${entry.errorKind ?? "null"} status=${entry.status ?? "null"} durationMs=${entry.durationMs ?? "null"} model=${entry.model ?? "null"} reason=${entry.reason ?? "null"}`,
    );
  });
}

/**
 * Orchestriert die E150-Analyse über mehrere Provider.
 *
 * Aktuell ist technisch nur OpenAI aktiv, die Struktur ist
 * jedoch von Anfang an auf Multi-Provider, Scoring und Health ausgelegt.
 */
export async function callE150Orchestrator(
  args: E150OrchestratorArgs,
): Promise<E150OrchestratorResult> {
  const capability = args.requiredCapability ?? "core_analysis";
  const { active: profiles, disabled, skipped } = resolveProviderPool(capability);
  if (!profiles.length) {
    const reason =
      disabled[0]?.reason || skipped[0]?.reason || "Kein aktiver Provider konfiguriert";
    throw new OrchestratorNoProviderError(
      `E150-Orchestrator: Kein aktiver Provider konfiguriert (${reason})`,
      { disabled, skipped },
    );
  }

  const probeResults = await Promise.all(
    profiles.map((profile) =>
      runProviderProbeCached(profile, args.telemetry).catch(() => null),
    ),
  );

  // Decide which providers to keep without mutating during iteration
  const hardBlockKinds: AiErrorKind[] = ["UNAUTHORIZED", "INVALID_API_KEY", "MODEL_NOT_FOUND"];
  const decisions = profiles.map((profile, idx) => ({
    profile,
    probe: probeResults[idx],
  }));

  const keptProfiles: ProviderProfile[] = [];

  decisions.forEach(({ profile, probe }) => {
    if (!probe || probe.ok) {
      keptProfiles.push(profile);
      return;
    }
    if (hardBlockKinds.includes(probe.errorKind ?? "UNKNOWN")) {
      const disabledUntil = probeCache.get(profile.name)?.disabledUntil ?? null;
      const reasonPrefix =
        disabledUntil && disabledUntil > Date.now()
          ? `probe block until ${new Date(disabledUntil).toISOString()}`
          : "probe failed";
      disabled.push({
        provider: profile.name,
        reason: probe.errorKind ? `${reasonPrefix} (${probe.errorKind})` : reasonPrefix,
      });
      return;
    }
    // degrade but keep for TIMEOUT/INTERNAL/RATE_LIMIT/UNKNOWN
    keptProfiles.push(profile);
  });

  profiles.length = 0;
  profiles.push(...keptProfiles);

  const budgetController = new AbortController();
  const budgetTimer = setTimeout(() => budgetController.abort("budget_abort"), ORCHESTRATOR_BUDGET_MS);

  const candidates: E150OrchestratorCandidate[] = [];
  const providerOutcomes: ProviderResult[] = [];
  const timings = Object.fromEntries(
    PROVIDERS.map((p) => [p.name, null]),
  ) as Record<E150ProviderName, number | null>;

  const failedProviders: { provider: E150ProviderName; error: string; errorKind?: AiErrorKind }[] = [];
  const dynamicDisabled: { provider: E150ProviderName; reason: string }[] = [];
  const providerControllers = new Map<E150ProviderName, AbortController>();
  const providerCancelReasons = new Map<E150ProviderName, CancelReason>();
  const controllerCleanups: (() => void)[] = [];

  const abortProvider = (provider: E150ProviderName, reason: CancelReason) => {
    const controller = providerControllers.get(provider);
    if (!controller) return;
    if (controller.signal.aborted) return;
    providerCancelReasons.set(provider, reason);
    controller.abort(reason);
  };

  const abortAllProviders = (reason: CancelReason, except?: E150ProviderName) => {
    profiles.forEach((p) => {
      if (except && p.name === except) return;
      abortProvider(p.name, reason);
    });
  };

  const linkAbortSources = (provider: E150ProviderName, controller: AbortController) => {
    const sources: { signal: AbortSignal; reason: CancelReason }[] = [
      { signal: budgetController.signal, reason: "budget_abort" },
    ];
    if (args.outerSignal) {
      sources.push({ signal: args.outerSignal, reason: "outer_abort" });
    }
    const cleanups: (() => void)[] = [];
    sources.forEach(({ signal, reason }) => {
      const handler = () => abortProvider(provider, reason);
      if (signal.aborted) {
        handler();
        return;
      }
      signal.addEventListener("abort", handler);
      cleanups.push(() => signal.removeEventListener("abort", handler));
    });
    return () => cleanups.forEach((fn) => fn());
  };

  profiles.forEach((profile) => {
    const controller = new AbortController();
    providerControllers.set(profile.name, controller);
    controllerCleanups.push(linkAbortSources(profile.name, controller));
  });

  const registerFailure = (failure: ProviderFailure) => {
    providerOutcomes.push(failure);
    timings[failure.provider] = failure.durationMs ?? timings[failure.provider];
    if (failure.errorKind === "MODEL_NOT_FOUND") {
      dynamicDisabled.push({ provider: failure.provider, reason: "Modell nicht gefunden" });
    } else {
      failedProviders.push({
        provider: failure.provider,
        error: failure.error,
        errorKind: failure.errorKind,
      });
    }
  };

  const validateAndNormalize = async (
    profile: ProviderProfile,
    result: ProviderResult,
    outerSignal: AbortSignal | undefined,
  ): Promise<{ outcome: ProviderResult; candidate?: E150OrchestratorCandidate }> => {
    const attemptValidation = (res: ProviderSuccess) =>
      validateCandidate(res.rawText, args.validateRaw);

    if (!result.ok) {
      timings[result.provider] = result.durationMs ?? timings[result.provider];
      return { outcome: result };
    }

    let current = result as ProviderSuccess;
    let validation = attemptValidation(current);

    const canRetryJson =
      !validation.ok &&
      !budgetController.signal.aborted &&
      !outerSignal?.aborted;

    if (validation.ok === false && canRetryJson) {
      const retryResult = await runProvider(profile, {
        ...args,
        maxTokens: 800,
        timeoutMs: (args.timeoutMs ?? profile.timeoutMs) + 5_000,
        userPrompt: `${args.userPrompt}\n\nJSON only. No extra keys. No input echo.`,
        outerSignal,
      });
      if (retryResult.ok) {
        current = retryResult as ProviderSuccess;
        validation = attemptValidation(retryResult as ProviderSuccess);
      } else {
        timings[retryResult.provider] = retryResult.durationMs ?? timings[retryResult.provider];
        return { outcome: retryResult };
      }
    }

    if (validation.ok === false) {
      const failure: ProviderFailure = {
        ok: false,
        provider: current.provider,
        error: validation.reason,
        durationMs: current.durationMs,
        errorKind: "BAD_JSON",
        attempt: current.attempt,
        errorMessageShort: validation.reason.slice(0, 200),
        formatUsed: current.formatUsed,
        didFallback: current.didFallback,
        openaiErrorCode: current.openaiErrorCode,
        openaiErrorMessage: current.openaiErrorMessage,
      };
      return { outcome: failure };
    }

    const score = scoreCandidate(profile, validation.jsonText, current.durationMs);
    const success: ProviderSuccess = {
      ...current,
      rawText: validation.jsonText,
      parsed: validation.parsed,
    };
    const candidate: E150OrchestratorCandidate = {
      provider: current.provider,
      rawText: validation.jsonText,
      score,
      durationMs: current.durationMs,
      modelName: current.modelName,
      tokensIn: current.tokensIn,
      tokensOut: current.tokensOut,
      costEur: current.costEur,
      parsed: validation.parsed,
    };
    timings[current.provider] = current.durationMs;
    return { outcome: success, candidate };
  };

  const hedgedRuns = profiles.map((profile) => {
    const controller = providerControllers.get(profile.name)!;
    return (async () => {
      try {
        await sleep(hedgeDelay(profile.name), controller.signal);
      } catch {
        const reason =
          providerCancelReasons.get(profile.name) ??
          ((controller.signal.reason as CancelReason | undefined) ?? "aborted_before_start");
        const failure: ProviderFailure = {
          ok: false,
          provider: profile.name,
          error: `cancelled: ${reason}`,
          durationMs: 0,
          errorKind: "CANCELLED",
          cancelReason: reason,
          attempt: undefined,
        };
        return { outcome: failure, candidate: undefined };
      }

      const baseResult = await runProvider(profile, { ...args, outerSignal: controller.signal });
      return validateAndNormalize(profile, baseResult, controller.signal);
    })().catch((err) => {
      const failure: ProviderFailure = {
        ok: false,
        provider: profile.name,
        error:
          err?.message ?? `Unbekannter Fehler bei ${profile.label}`,
        durationMs: 0,
        errorKind: mapErrorToKind(err),
        httpStatus: typeof err?.status === "number" ? err.status : null,
        errorMessageShort:
          typeof err?.message === "string"
            ? err.message.slice(0, 200)
            : undefined,
      };
      return { outcome: failure, candidate: undefined };
    });
  });

  let winner: E150OrchestratorCandidate | null = null;

  while (hedgedRuns.length) {
    const indexed = hedgedRuns.map((p, idx) =>
      p.then((res) => ({ idx, res })),
    );
    const { idx, res } = await Promise.race(indexed);
    hedgedRuns.splice(idx, 1);

    const { outcome, candidate } = res;
    if (outcome.ok && candidate) {
      providerOutcomes.push(outcome);
      candidates.push(candidate);
      if (!winner) {
        winner = candidate;
        abortAllProviders("winner_abort", outcome.provider);
      }
      continue;
    }

    const failure = outcome as ProviderFailure;
    registerFailure(failure);
  }

  controllerCleanups.forEach((fn) => fn());
  clearTimeout(budgetTimer);

  const telemetryMeta = args.telemetry ?? {};
  const pipelineName: AiPipelineName =
    telemetryMeta.pipeline ?? "contribution_analyze";

  const profileByName = new Map(profiles.map((p) => [p.name, p]));
  const usageLogs = providerOutcomes.map((outcome) => {
    const success = outcome.ok ? (outcome as ProviderSuccess) : null;
    const failure = outcome.ok ? null : (outcome as ProviderFailure);
    const profile = profileByName.get(outcome.provider);

    return logAiUsage({
      createdAt: new Date(),
      provider: outcome.provider,
      model: success?.modelName ?? "unknown",
      pipeline: pipelineName,
      userId: telemetryMeta.userId ?? null,
      tenantId: telemetryMeta.tenantId ?? null,
      region: telemetryMeta.region ?? null,
      locale: args.locale ?? null,
      tokensInput: success?.tokensIn ?? 0,
      tokensOutput: success?.tokensOut ?? 0,
      costEur: success?.costEur ?? 0,
      durationMs: outcome.durationMs,
      success: Boolean(success),
      errorKind: failure?.errorKind ?? null,
      strictJson: success?.strictJson ?? profile?.strictJson ?? false,
    }).catch((err) => {
      console.error("[E150] logAiUsage (provider outcome) failed", err);
    });
  });

  await Promise.all(usageLogs);

  if (!candidates.length) {
    const msg =
      budgetController.signal.aborted
        ? `E150-Orchestrator: Budget ${ORCHESTRATOR_BUDGET_MS}ms erreicht.`
        : failedProviders.length === 1
          ? `E150-Orchestrator: Provider ${failedProviders[0].provider} fehlgeschlagen.`
          : "E150-Orchestrator: Alle Provider fehlgeschlagen.";
    throw new OrchestratorAllFailedError(msg, {
      disabled: [...disabled, ...dynamicDisabled],
      skipped,
      failedProviders,
      providerMatrix: buildProviderMatrix(
        providerOutcomes,
        [...disabled, ...dynamicDisabled],
        skipped,
        probeResults.filter((p): p is ProbeResult => Boolean(p)),
      ),
    });
  }

  const best = winner ?? candidates[0];

  const telemetryEvents = providerOutcomes.map((outcome) => {
    const success = outcome.ok ? (outcome as ProviderSuccess) : null;
    const failure = outcome.ok ? null : (outcome as ProviderFailure);
    return recordAiTelemetry({
      task: "orchestrator:e150",
      pipeline: pipelineName,
      provider: outcome.provider,
      model: success?.modelName,
      success: outcome.ok,
      retries: 0,
      durationMs: outcome.durationMs,
      tokensIn: success?.tokensIn,
      tokensOut: success?.tokensOut,
      fallbackUsed: success ? success.provider !== best.provider : true,
      errorKind: failure?.errorKind ?? null,
    }).catch(() => {});
  });
  await Promise.all(telemetryEvents);

  const providerMatrix = buildProviderMatrix(
    providerOutcomes,
    [...disabled, ...dynamicDisabled],
    skipped,
    probeResults.filter((p): p is ProbeResult => Boolean(p)),
  );
  logProviderTelemetry(providerMatrix);

  return {
    rawText: best.rawText,
    best,
    candidates,
    meta: {
      usedProviders: profiles.map((p) => p.name),
      failedProviders,
      timings,
      disabledProviders: [...disabled, ...dynamicDisabled],
      skippedProviders: skipped,
      probes: probeResults.filter((p): p is ProbeResult => Boolean(p)),
      providerMatrix,
    },
  };
}
