"use client";

import { useCallback, useEffect, useState } from "react";

type OperationsResponse = {
  ok: boolean;
  snapshot: {
    health: "ready" | "degraded" | "blocked";
    productionReady: boolean;
    observedAt: string;
    blockers: string[];
    warnings: string[];
    heartbeat: {
      present: boolean;
      stale: boolean;
      ageMs: number | null;
      record: {
        workerId: string;
        state: string;
        heartbeatAt: string;
        processedCount: number;
        lastSafeErrorCode: string | null;
      } | null;
    };
    queue: {
      queued: number;
      rendering: number;
      rendered: number;
      failed: number;
      reviewReady: number;
      orphanRendering: number;
      staleRendered: number;
      oldestQueuedAgeMs: number | null;
      repeatedSafeFailureCodes: string[];
    };
  };
  advisories: Array<{
    roleId: string;
    verdict: "pass" | "attention" | "blocked";
    focus: string;
    reasons: string[];
    mayMutate: false;
    mayUpgradeHealth: false;
    providerInvocationUsed: false;
  }>;
};

function duration(value: number | null) {
  if (value === null) return "–";
  if (value < 60_000) return `${Math.round(value / 1_000)} s`;
  return `${Math.round(value / 60_000)} min`;
}

function label(value: string) {
  return value.replaceAll("_", " ").replaceAll(":", " · ");
}

export default function VoxyStudioOperationsPanel() {
  const [data, setData] = useState<OperationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio/operations", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as OperationsResponse | null;
      if (!response.ok || !payload?.ok) throw new Error("voxy_operations_not_loaded");
      setData(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_operations_not_loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ready = data?.snapshot.productionReady === true;

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
            Voxy · Production Operations
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
            Runtime-, Worker- und Agenten-Betriebsbereitschaft
          </h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
            Die Freigabe wird ausschließlich deterministisch aus Persistenz, Queue, Recovery und Worker-Heartbeat berechnet. Agenten prüfen advisory mit, dürfen den Health-Status aber weder hochstufen noch Reparatur, Restart, Deploy, Rollback oder Publishing auslösen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))]"
        >
          Status aktualisieren
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/25 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {loading && !data ? <p className="text-sm text-[rgb(var(--muted))]">Betriebsstatus wird geladen …</p> : null}

      {data ? (
        <>
          <div className={`rounded-xl border p-4 ${ready ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/25" : "border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-950/25"}`}>
            <p className="font-semibold text-[rgb(var(--fg))]">
              {ready ? "Production-Ready" : "Production blockiert"} · {data.snapshot.health}
            </p>
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">Stand {data.snapshot.observedAt}</p>
            {data.snapshot.blockers.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[rgb(var(--fg))]">
                {data.snapshot.blockers.map((item) => <li key={item}>{label(item)}</li>)}
              </ul>
            ) : null}
            {data.snapshot.warnings.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[rgb(var(--fg))]">
                {data.snapshot.warnings.map((item) => <li key={item}>{label(item)}</li>)}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
              <p className="font-semibold text-[rgb(var(--fg))]">Worker Heartbeat</p>
              <p className="mt-1 text-[rgb(var(--muted))]">
                {data.snapshot.heartbeat.present ? `${data.snapshot.heartbeat.record?.state ?? "unknown"} · ${duration(data.snapshot.heartbeat.ageMs)}` : "fehlt"}
              </p>
            </div>
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
              <p className="font-semibold text-[rgb(var(--fg))]">Queue</p>
              <p className="mt-1 text-[rgb(var(--muted))]">{data.snapshot.queue.queued} wartend · ältester {duration(data.snapshot.queue.oldestQueuedAgeMs)}</p>
            </div>
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
              <p className="font-semibold text-[rgb(var(--fg))]">Recovery</p>
              <p className="mt-1 text-[rgb(var(--muted))]">{data.snapshot.queue.orphanRendering} orphan · {data.snapshot.queue.staleRendered} stale rendered</p>
            </div>
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
              <p className="font-semibold text-[rgb(var(--fg))]">Outputs</p>
              <p className="mt-1 text-[rgb(var(--muted))]">{data.snapshot.queue.reviewReady} review-ready · {data.snapshot.queue.failed} failed</p>
            </div>
          </div>

          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <p className="text-sm font-semibold text-[rgb(var(--fg))]">Agentische Betriebsprüfung</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {data.advisories.map((advisory) => (
                <div key={advisory.roleId} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-xs">
                  <p className="font-semibold text-[rgb(var(--fg))]">{advisory.roleId} · {advisory.verdict}</p>
                  <p className="mt-1 text-[rgb(var(--muted))]">{label(advisory.focus)}</p>
                  <p className="mt-2 text-[rgb(var(--muted))]">{advisory.reasons.map(label).join(" · ")}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[rgb(var(--muted))]">Alle Rollen sind read-only/advisory. Provideraufruf: nein. Mutation: nein. Health-Hochstufung: nein.</p>
          </div>
        </>
      ) : null}
    </section>
  );
}
