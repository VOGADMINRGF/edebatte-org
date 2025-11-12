// features/ai/orchestrator.ts
type Metric = { ok: number; fail: number; jsonOk: number; p95ms: number[]; state: "closed" | "open" | "half" };
const METRICS: Record<string, Metric> = {};

export function beforeCall(id: string) {
  METRICS[id] ??= { ok: 0, fail: 0, jsonOk: 0, p95ms: [], state: "closed" };
}

export function afterCall(id: string, ms: number, ok: boolean, jsonOk: boolean) {
  const m = (METRICS[id] ??= { ok: 0, fail: 0, jsonOk: 0, p95ms: [], state: "closed" });
  m.p95ms.push(ms);
  if (ok) m.ok++; else m.fail++;
  if (jsonOk) m.jsonOk++;
}

export function healthScore(id: string): number {
  const m = METRICS[id] ?? { ok: 0, fail: 0, jsonOk: 0, p95ms: [] as number[] };
  const total = Math.max(1, m.ok + m.fail);
  const succ = m.ok / total;
  const json = m.ok ? m.jsonOk / m.ok : 0;
  const p95 = m.p95ms.length ? p95Of(m.p95ms) : 2000;
  return succ * 0.6 + json * 0.3 + (1 / (1 + p95)) * 0.1;
}

function p95Of(arr: number[]): number {
  const a = [...arr].sort((x, y) => x - y);
  const i = Math.max(0, Math.floor(a.length * 0.95) - 1);
  return a[i];
}

// ✅ Universeller Wrapper: misst Dauer/Erfolg/JSON-Erfolg und reported
export function withMetrics<Args extends any[], R>(
  id: string,
  fn: (...args: Args) => Promise<R>,
  opts?: { jsonOk?: (result: R) => boolean }
) {
  return async (...args: Args): Promise<R> => {
    // performance.now() in Node:
    const { performance } = await import("node:perf_hooks");
    beforeCall(id);
    const t0 = performance.now();
    let ok = false, jsonOk = false;
    try {
      const res = await fn(...args);
      ok = true;
      try { jsonOk = opts?.jsonOk ? opts.jsonOk(res) : true; } catch {}
      return res;
    } catch (e) {
      ok = false; jsonOk = false;
      throw e;
    } finally {
      const ms = performance.now() - t0;
      afterCall(id, ms, ok, jsonOk);
    }
  };
}

// Optional fürs Debuggen:
export function getMetricsSnapshot(){ return JSON.parse(JSON.stringify(METRICS)); }
export function resetMetrics(){ for(const k of Object.keys(METRICS)) delete (METRICS as any)[k]; }
