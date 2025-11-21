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

import { callOpenAIJson } from "@features/ai";
import { logAiUsage } from "@core/telemetry/aiUsage";
import type { AiPipelineName } from "@core/telemetry/aiUsageTypes";

/* ------------------------------------------------------------------------- */
/* Typen                                                                     */
/* ------------------------------------------------------------------------- */

export type E150ProviderName = "openai"; // Platzhalter – später z.B. "anthropic"

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

type ProviderProfile = {
  name: E150ProviderName;
  label: string;
  weight: number;
  defaultMaxTokens: number;
  defaultTimeoutMs: number;
};

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
    weight: 1,
    defaultMaxTokens: 1_800,
    defaultTimeoutMs: OPENAI_TIMEOUT_DEFAULT,
  },
  // Später: Anthropic, Mistral, Gemini etc. hier ergänzen.
];

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

  return base + jsonBonus + speedBonus;
}

async function runProvider(
  profile: ProviderProfile,
  args: E150OrchestratorArgs,
): Promise<ProviderResult> {
  const started = Date.now();

  const maxTokens = Math.min(
    args.maxTokens ?? profile.defaultMaxTokens,
    profile.defaultMaxTokens,
  );
  const timeoutMs = args.timeoutMs ?? profile.defaultTimeoutMs;

  try {
    const coreCall = callOpenAIJson({
      system: args.systemPrompt,
      user: args.userPrompt,
      max_tokens: maxTokens,
    });

    const { text } = await withTimeout(coreCall, timeoutMs, profile.label);

    const durationMs = Date.now() - started;
    return {
      ok: true,
      provider: profile.name,
      rawText: text,
      durationMs,
      modelName: "gpt-4.1",
      tokensIn: maxTokens,
      tokensOut: Math.round(maxTokens * 0.4),
      costEur: 0,
    };
  } catch (err: any) {
    const durationMs = Date.now() - started;
    return {
      ok: false,
      provider: profile.name,
      error:
        typeof err?.message === "string"
          ? err.message
          : `Unbekannter Fehler bei ${profile.label}`,
      durationMs,
    };
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
  const results = await Promise.allSettled(
    PROVIDERS.map((profile) => runProvider(profile, args)),
  );

  const candidates: E150OrchestratorCandidate[] = [];
  const timings = Object.fromEntries(
    PROVIDERS.map((p) => [p.name, null]),
  ) as Record<E150ProviderName, number | null>;

  const failedProviders: { provider: E150ProviderName; error: string }[] = [];

  results.forEach((settled, idx) => {
    const profile = PROVIDERS[idx];

    if (settled.status !== "fulfilled") {
      failedProviders.push({
        provider: profile.name,
        error:
          settled.reason?.message ??
          `Unbekannter Fehler bei ${profile.label}`,
      });
      return;
    }

    const r = settled.value;
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

  const telemetryMeta = args.telemetry ?? {};
  const pipelineName: AiPipelineName =
    telemetryMeta.pipeline ?? "contribution_analyze";

  logAiUsage({
    createdAt: new Date(),
    provider: best.provider,
    model: best.modelName ?? "unknown",
    pipeline: pipelineName,
    userId: telemetryMeta.userId ?? null,
    tenantId: telemetryMeta.tenantId ?? null,
    region: telemetryMeta.region ?? null,
    locale: args.locale ?? null,
    tokensInput: best.tokensIn ?? 0,
    tokensOutput: best.tokensOut ?? 0,
    costEur: best.costEur ?? 0,
    durationMs: best.durationMs,
    success: true,
    errorKind: null,
  }).catch((err) => {
    console.error("[E150] logAiUsage failed", err);
  });

  return {
    rawText: best.rawText,
    best,
    candidates,
    meta: {
      usedProviders: PROVIDERS.map((p) => p.name),
      failedProviders,
      timings,
    },
  };
}
