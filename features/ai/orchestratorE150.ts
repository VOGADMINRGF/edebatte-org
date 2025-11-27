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
import type { AiPipelineName } from "@core/telemetry/aiUsageTypes";
import { callOpenAI as askOpenAI } from "@features/ai/providers/openai";
import { callAnthropic as askAnthropic } from "@features/ai/providers/anthropic";
import { callMistral as askMistral } from "@features/ai/providers/mistral";
import { callGemini as askGemini } from "@features/ai/providers/gemini";
import { healthScore } from "@features/ai/orchestrator";

/* ------------------------------------------------------------------------- */
/* Typen                                                                     */
/* ------------------------------------------------------------------------- */

export type E150ProviderName = "openai" | "anthropic" | "mistral" | "gemini";

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
};

export type E150OrchestratorArgs = {
  systemPrompt: string;
  userPrompt: string;
  locale?: string | null;
  maxClaims?: number;
  maxTokens?: number;
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
  call: (args: ProviderCallArgs) => Promise<ProviderCallResult>;
  metricId?: string;
  promptHint?: string;
};

type ProviderHealthState = "healthy" | "degraded" | "unknown" | "down";

type ProviderSuccess = {
  ok: true;
  provider: E150ProviderName;
  rawText: string;
  durationMs: number;
  modelName?: string;
  tokensIn?: number;
  tokensOut?: number;
  costEur?: number;
};

type ProviderFailure = {
  ok: false;
  provider: E150ProviderName;
  error: string;
  durationMs: number;
};

type ProviderResult = ProviderSuccess | ProviderFailure;

export type E150OrchestratorCandidate = {
  provider: E150ProviderName;
  rawText: string;
  score: number;
  durationMs: number;
  modelName?: string;
  tokensIn?: number;
  tokensOut?: number;
  costEur?: number;
};

export type E150OrchestratorMeta = {
  usedProviders: E150ProviderName[];
  failedProviders: { provider: E150ProviderName; error: string }[];
  timings: Record<E150ProviderName, number | null>;
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

/* ------------------------------------------------------------------------- */
/* Konfiguration                                                             */
/* ------------------------------------------------------------------------- */

const OPENAI_TIMEOUT_DEFAULT = Number(process.env.OPENAI_TIMEOUT_MS ?? 18_000);

const PROVIDERS: ProviderProfile[] = [
  {
    name: "openai",
    label: "OpenAI (E150 contrib analyzer)",
    role: "mixed",
    weight: 1,
    maxTokens: 1_800,
    timeoutMs: OPENAI_TIMEOUT_DEFAULT,
    metricId: "openai",
    promptHint:
      "Deliver a balanced mix of claims, context notes, questions, and knots while keeping everything grounded in the source text.",
    enabled: () => Boolean(process.env.OPENAI_API_KEY),
    call: async ({ prompt, signal, maxTokens }) => {
      const { text } = await askOpenAI({
        prompt,
        asJson: true,
        maxOutputTokens: maxTokens,
        signal,
      });
      return {
        text,
        modelName: process.env.OPENAI_MODEL ?? "gpt-4.1",
      };
    },
  },
  {
    name: "anthropic",
    label: "Anthropic Claude",
    role: "context",
    weight: 0.9,
    maxTokens: 1_500,
    timeoutMs: Number(process.env.ANTHROPIC_TIMEOUT_MS ?? 20_000),
    metricId: "anthropic",
    promptHint:
      "Extract rich background/context sections (facts, stakeholders, assumptions). Prioritize clarity and neutrality.",
    enabled: () => Boolean(process.env.ANTHROPIC_API_KEY),
    call: async ({ prompt, signal, maxTokens }) => {
      const { text, model, tokensIn, tokensOut } = await askAnthropic({
        prompt,
        maxOutputTokens: maxTokens,
        signal,
      });
      return {
        text,
        modelName: model ?? process.env.ANTHROPIC_MODEL ?? "claude",
        tokensIn,
        tokensOut,
      };
    },
  },
  {
    name: "mistral",
    label: "Mistral Large",
    role: "structure",
    weight: 0.8,
    maxTokens: 1_200,
    timeoutMs: Number(process.env.MISTRAL_TIMEOUT_MS ?? 18_000),
    metricId: "mistral",
    promptHint:
      "Split the text into concise, testable claims (max one assertion per claim). Highlight responsibilities/topics clearly.",
    enabled: () => Boolean(process.env.MISTRAL_API_KEY),
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
    maxTokens: 1_400,
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 18_000),
    metricId: "gemini",
    promptHint:
      "Focus on investigative, critical questions (finance, legal, impact). Each question must be grounded in the provided text.",
    enabled: () => Boolean(process.env.GEMINI_API_KEY),
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
];

function activeProviders(): ProviderProfile[] {
  return PROVIDERS.filter((profile) => {
    try {
      return profile.enabled();
    } catch {
      return false;
    }
  });
}

/* ------------------------------------------------------------------------- */
/* Hilfsfunktionen                                                           */
/* ------------------------------------------------------------------------- */

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
  const started = Date.now();

  const maxTokens = Math.min(args.maxTokens ?? profile.maxTokens, profile.maxTokens);
  const timeoutMs = args.timeoutMs ?? profile.timeoutMs;
  const prompt = buildPrompt(args.systemPrompt, args.userPrompt, profile);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const callPromise = profile.call({
      prompt,
      signal: controller.signal,
      maxTokens,
    });
    const result = await withTimeout(callPromise, timeoutMs + 1_000, profile.label);

    const durationMs = Date.now() - started;
    return {
      ok: true,
      provider: profile.name,
      rawText: result.text,
      durationMs,
      modelName: result.modelName,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costEur: result.costEur,
    };
  } catch (err: any) {
    const durationMs = Date.now() - started;
    const message =
      err?.name === "AbortError"
        ? `${profile.label} timed out nach ${timeoutMs}ms`
        : typeof err?.message === "string"
          ? err.message
          : `Unbekannter Fehler bei ${profile.label}`;
    return {
      ok: false,
      provider: profile.name,
      error: message,
      durationMs,
    };
  } finally {
    clearTimeout(timeout);
  }
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

/**
 * Orchestriert die E150-Analyse über mehrere Provider.
 *
 * Aktuell ist technisch nur OpenAI aktiv, die Struktur ist
 * jedoch von Anfang an auf Multi-Provider, Scoring und Health ausgelegt.
 */
export async function callE150Orchestrator(
  args: E150OrchestratorArgs,
): Promise<E150OrchestratorResult> {
  const profiles = activeProviders();
  if (!profiles.length) {
    throw new Error("E150-Orchestrator: Kein aktiver Provider konfiguriert");
  }

  const results = await Promise.allSettled(
    profiles.map((profile) => runProvider(profile, args)),
  );

  const candidates: E150OrchestratorCandidate[] = [];
  const providerOutcomes: ProviderResult[] = [];
  const timings = Object.fromEntries(
    profiles.map((p) => [p.name, null]),
  ) as Record<E150ProviderName, number | null>;

  const failedProviders: { provider: E150ProviderName; error: string }[] = [];

  results.forEach((settled, idx) => {
    const profile = profiles[idx];
    if (!profile) return;

    if (settled.status !== "fulfilled") {
      const failure: ProviderFailure = {
        ok: false,
        provider: profile.name,
        error:
          settled.reason?.message ?? `Unbekannter Fehler bei ${profile.label}`,
        durationMs: 0,
      };
      providerOutcomes.push(failure);
      failedProviders.push({
        provider: profile.name,
        error: failure.error,
      });
      return;
    }

    const r = settled.value;
    providerOutcomes.push(r);
    timings[r.provider] = r.durationMs;

    if (r.ok) {
      const score = scoreCandidate(profile, r.rawText, r.durationMs);
      candidates.push({
        provider: r.provider,
        rawText: r.rawText,
        score,
        durationMs: r.durationMs,
        modelName: r.modelName,
        tokensIn: r.tokensIn,
        tokensOut: r.tokensOut,
        costEur: r.costEur,
      });
    } else {
      const failure = r as ProviderFailure;
      failedProviders.push({ provider: failure.provider, error: failure.error });
    }
  });

  const telemetryMeta = args.telemetry ?? {};
  const pipelineName: AiPipelineName =
    telemetryMeta.pipeline ?? "contribution_analyze";

  const usageLogs = providerOutcomes.map((outcome) => {
    const success = outcome.ok ? (outcome as ProviderSuccess) : null;
    const failure = outcome.ok ? null : (outcome as ProviderFailure);

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
      errorKind: failure?.error ?? null,
    }).catch((err) => {
      console.error("[E150] logAiUsage (provider outcome) failed", err);
    });
  });

  await Promise.all(usageLogs);

  if (!candidates.length) {
    const msg =
      failedProviders.length === 1
        ? `E150-Orchestrator: Provider ${failedProviders[0].provider} fehlgeschlagen (${failedProviders[0].error}).`
        : "E150-Orchestrator: Alle Provider fehlgeschlagen.";
    throw new Error(msg);
  }

  const best = candidates
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.durationMs - b.durationMs;
    })[0];

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
      errorKind: failure?.error ?? null,
    }).catch(() => {});
  });
  await Promise.all(telemetryEvents);

  return {
    rawText: best.rawText,
    best,
    candidates,
    meta: {
      usedProviders: profiles.map((p) => p.name),
      failedProviders,
      timings,
    },
  };
}
