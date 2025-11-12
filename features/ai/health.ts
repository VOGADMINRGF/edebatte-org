// features/ai/health.ts
// Health, scoring & circuit breaker for AI providers.
// - Rolling stats (success/fail, JSON validity, latency EMA)
// - Circuit states: closed | open | half-open (with exponential backoff)
// - Dynamic scoring to sort providers for hedge/sequence runs

export type ProviderId = "openai" | "anthropic" | "mistral" | "gemini";
type CircuitState = "closed" | "open" | "half-open";
type FailureReason = "timeout" | "http" | "json" | "validation" | "unknown";

type ProviderStats = {
  provider: ProviderId;
  // counters
  total: number;
  success: number;
  jsonOk: number;
  failure: number;
  // timing
  emaLatencyMs: number | null;   // exponential moving average
  lastLatencyMs: number | null;
  // circuit
  state: CircuitState;
  openUntil: number;             // ms epoch when we can probe again
  halfOpenProbeInFlight: boolean;
  // backoff
  backoffMs: number;             // current open duration
  // misc
  lastError?: string;
  lastFailureReason?: FailureReason;
  // scoring snapshot
  score: number;                 // 0..1
  // derived
  jsonRate: number;              // 0..1 (jsonOk / success)
  successRate: number;           // 0..1 (success / total)
};

const NOW = () => Date.now();

// Tunables via env or defaults
const cfg = {
  // scoring
  targetLatencyMs: Number(process.env.AI_TARGET_LATENCY_MS ?? 2500),
  wAvailability: Number(process.env.AI_SCORE_W_AVAIL ?? 0.45), // success rate
  wJson: Number(process.env.AI_SCORE_W_JSON ?? 0.35),          // JSON validity rate
  wLatency: Number(process.env.AI_SCORE_W_LAT ?? 0.20),        // latency fitness
  // EMA
  emaAlpha: Number(process.env.AI_LAT_EMA_ALPHA ?? 0.25),
  // circuit breaker
  minRequests: Number(process.env.AI_CIRCUIT_MIN_REQUESTS ?? 12),
  failRateThreshold: Number(process.env.AI_CIRCUIT_FAIL_RATE_THRESHOLD ?? 0.35),
  openMsBase: Number(process.env.AI_CIRCUIT_OPEN_MS_BASE ?? 20000),
  openMsMax: Number(process.env.AI_CIRCUIT_OPEN_MS_MAX ?? 120000),
  // half-open
  halfOpenProbeMs: Number(process.env.AI_CIRCUIT_HALFOPEN_MS ?? 4000),
};

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

function latencyFitness(ms: number | null, target: number) {
  if (ms == null) return 0.5; // neutral before we know
  // maps [0..target..∞] -> [1..~0.5..~0]
  return 1 / (1 + ms / target);
}

function newStats(provider: ProviderId): ProviderStats {
  return {
    provider,
    total: 0,
    success: 0,
    jsonOk: 0,
    failure: 0,
    emaLatencyMs: null,
    lastLatencyMs: null,
    state: "closed",
    openUntil: 0,
    halfOpenProbeInFlight: false,
    backoffMs: cfg.openMsBase,
    lastError: undefined,
    lastFailureReason: undefined,
    score: 0.5,
    jsonRate: 0,
    successRate: 0,
  };
}

class HealthRegistry {
  private map = new Map<ProviderId, ProviderStats>();

  get(provider: ProviderId): ProviderStats {
    if (!this.map.has(provider)) this.map.set(provider, newStats(provider));
    return this.map.get(provider)!;
  }

  private recomputeScore(s: ProviderStats) {
    s.successRate = s.total > 0 ? s.success / s.total : 0;
    s.jsonRate = s.success > 0 ? s.jsonOk / s.success : 0;
    const latFit = latencyFitness(s.emaLatencyMs, cfg.targetLatencyMs);

    const base = cfg.wAvailability * s.successRate
               + cfg.wJson * s.jsonRate
               + cfg.wLatency * latFit;

    // penalize if circuit is open
    const penalty = s.state === "open" ? 0.25 : s.state === "half-open" ? 0.1 : 0;
    s.score = clamp01(base - penalty);
  }

  private checkCircuitOpen(s: ProviderStats) {
    if (s.total < cfg.minRequests) return; // not enough data
    const failRate = s.failure / s.total;
    if (s.state === "closed" && failRate >= cfg.failRateThreshold) {
      s.state = "open";
      s.openUntil = NOW() + s.backoffMs;
      s.backoffMs = Math.min(s.backoffMs * 2, cfg.openMsMax); // exponential backoff
    }
  }

  private advanceHalfOpenIfDue(s: ProviderStats) {
    if (s.state === "open" && NOW() >= s.openUntil) {
      s.state = "half-open";
      s.halfOpenProbeInFlight = false; // allow one probe
      s.openUntil = NOW() + cfg.halfOpenProbeMs; // safety window
    }
  }

  canAttempt(provider: ProviderId): boolean {
    const s = this.get(provider);
    if (s.state === "open") {
      this.advanceHalfOpenIfDue(s);
      return s.state !== "open";
    }
    if (s.state === "half-open") {
      // allow a single probe at a time
      return !s.halfOpenProbeInFlight;
    }
    return true; // closed
  }

  markProbeStart(provider: ProviderId) {
    const s = this.get(provider);
    if (s.state === "half-open") s.halfOpenProbeInFlight = true;
  }

  recordSuccess(provider: ProviderId, latencyMs: number, jsonValid: boolean) {
    const s = this.get(provider);
    s.total += 1;
    s.success += 1;
    if (jsonValid) s.jsonOk += 1;

    s.lastLatencyMs = latencyMs;
    s.emaLatencyMs = s.emaLatencyMs == null
      ? latencyMs
      : s.emaLatencyMs + cfg.emaAlpha * (latencyMs - s.emaLatencyMs);

    s.lastError = undefined;
    s.lastFailureReason = undefined;

    if (s.state === "half-open") {
      // close on success and reset backoff
      s.state = "closed";
      s.halfOpenProbeInFlight = false;
      s.backoffMs = cfg.openMsBase;
      s.openUntil = 0;
    }

    this.recomputeScore(s);
  }

  recordFailure(provider: ProviderId, latencyMs: number | null, reason: FailureReason, errorMessage?: string) {
    const s = this.get(provider);
    s.total += 1;
    s.failure += 1;

    if (latencyMs != null) {
      s.lastLatencyMs = latencyMs;
      s.emaLatencyMs = s.emaLatencyMs == null
        ? latencyMs
        : s.emaLatencyMs + cfg.emaAlpha * (latencyMs - s.emaLatencyMs);
    }

    s.lastError = errorMessage;
    s.lastFailureReason = reason;

    if (s.state === "half-open") {
      // re-open on failed probe
      s.state = "open";
      s.halfOpenProbeInFlight = false;
      s.openUntil = NOW() + s.backoffMs;
      s.backoffMs = Math.min(s.backoffMs * 2, cfg.openMsMax);
    } else if (s.state === "closed") {
      this.checkCircuitOpen(s);
    }

    this.recomputeScore(s);
  }

  // Sort providers by highest score, skipping ineligible (open circuits)
  bestOrder(candidates: ProviderId[]): ProviderId[] {
    const eligible = candidates.filter((p) => this.canAttempt(p));
    const ineligible = candidates.filter((p) => !this.canAttempt(p));

    eligible.sort((a, b) => {
      const sa = this.get(a).score;
      const sb = this.get(b).score;
      if (sb !== sa) return sb - sa;
      return a.localeCompare(b);
    });

    // ineligible tacked to the end (still returned, but caller may skip)
    return eligible.concat(ineligible);
  }

  snapshot() {
    const obj: Record<ProviderId, ProviderStats> = {
      openai: this.get("openai"),
      anthropic: this.get("anthropic"),
      mistral: this.get("mistral"),
      gemini: this.get("gemini"),
    };
    return {
      now: NOW(),
      cfg,
      providers: obj,
      order: this.bestOrder(["openai", "anthropic", "mistral", "gemini"]),
    };
  }
}

export const Health = new HealthRegistry();

/* -------------------- Optional Utilities -------------------- */

// Universeller Wrapper für Messung + Circuit-Logik
export function withMetrics<Args extends any[], R>(
  id: ProviderId,
  fn: (...args: Args) => Promise<R>,
  opts?: {
    jsonOk?: (result: R) => boolean;
    classifyFailure?: (err: unknown) => FailureReason; // timeout/http/json/validation/unknown
  }
) {
  return async (...args: Args): Promise<R> => {
    const { performance } = await import("node:perf_hooks");

    if (!Health.canAttempt(id)) {
      throw Object.assign(new Error(`circuit-open: ${id}`), { reason: "circuit" });
    }
    Health.markProbeStart(id);

    const t0 = performance.now();
    try {
      const res = await fn(...args);
      const jsonValid = opts?.jsonOk ? !!opts.jsonOk(res) : true;
      Health.recordSuccess(id, performance.now() - t0, jsonValid);
      return res;
    } catch (e) {
      const reason: FailureReason = opts?.classifyFailure?.(e) ?? defaultFailureClassifier(e);
      Health.recordFailure(id, performance.now() - t0, reason, String((e as any)?.message ?? e));
      throw e;
    }
  };
}

// Einfache Heuristik zur Fehlerklassifikation
export function defaultFailureClassifier(err: unknown): FailureReason {
  const msg = String((err as any)?.message ?? err ?? "");
  if (/timed?out/i.test(msg)) return "timeout";
  if (/\b(4\d\d|5\d\d)\b|http/i.test(msg)) return "http";
  if (/json|parse/i.test(msg)) return "json";
  if (/schema|zod|validation/i.test(msg)) return "validation";
  return "unknown";
}

// Debug/Tooling
export function getMetricsSnapshot() { return Health.snapshot(); }
export function resetMetrics() {
  // vorsichtige Rücksetzung: neue Map erzwingen
  (Health as any).map = new Map<ProviderId, ProviderStats>();
}

// Persistenz-Hooks (leichtgewichtig)
export function toJSON(){ return Health.snapshot(); }
export function fromJSON(snap: any){
  const ids: ProviderId[] = ["openai","anthropic","mistral","gemini"];
  for (const id of ids) {
    const src = snap?.providers?.[id]; if (!src) continue;
    const dst = Health.get(id);
    Object.assign(dst, {
      total: src.total, success: src.success, jsonOk: src.jsonOk, failure: src.failure,
      emaLatencyMs: src.emaLatencyMs, lastLatencyMs: src.lastLatencyMs,
      state: src.state, openUntil: src.openUntil, halfOpenProbeInFlight: false,
      backoffMs: src.backoffMs, lastError: src.lastError, lastFailureReason: src.lastFailureReason,
      score: src.score, jsonRate: src.jsonRate, successRate: src.successRate,
    });
  }
}

/* -------------------- Bridge for simple helpers -------------------- */

// Einfache Bridge für health_check.ts
export function healthScore(id: ProviderId): number {
  return Health.get(id).score;
}
