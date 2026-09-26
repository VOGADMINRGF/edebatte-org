import Link from "next/link";
import { buildAlpha2MissionControlSnapshot } from "@/features/agenticRuntime/alpha2MissionControlReadModel";

export const dynamic = "force-dynamic";

function number(value: number, digits = 0) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: digits }).format(value);
}

function percent(value: number) {
  return `${number(value * 100, 1)} %`;
}

function dateTime(value: string | undefined | null) {
  if (!value) return "–";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "medium" }).format(
    new Date(value),
  );
}

export default async function Alpha2MissionControlPage() {
  const snapshot = await buildAlpha2MissionControlSnapshot();

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
            Alpha-Foxtrott 2.0
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[rgb(var(--fg))]">Mission Control</h1>
          <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--muted))]">
            Read-only Betreiberansicht für durable Runs, Human Gates, Agent-Flotte und validiertes Lernen.
            MongoDB bleibt Run-Wahrheit; BullMQ/Redis bleibt Execution-Layer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              snapshot.runtime.available
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
            }`}
          >
            {snapshot.runtime.available ? "Ledger verbunden" : "Ledger nicht verfügbar"}
          </span>
          <Link
            href="/admin/system"
            className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs font-semibold text-[rgb(var(--fg))]"
          >
            System Hub
          </Link>
        </div>
      </header>

      {!snapshot.runtime.available ? (
        <section className="rounded-3xl bg-[rgb(var(--card))] p-4 ring-1 ring-amber-200">
          <h2 className="font-semibold text-[rgb(var(--fg))]">Runtime nicht verfügbar</h2>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Die Oberfläche bleibt fail-closed und zeigt keine erfundenen Runs. Fehlercode:{" "}
            {snapshot.runtime.errorCode ?? "unbekannt"}.
          </p>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Runs gesamt" value={number(snapshot.runtime.totalRuns)} detail="persistiert" />
        <Metric
          label="Aktiv"
          value={number(snapshot.runtime.activeRuns)}
          detail="queued · running · waiting"
        />
        <Metric
          label="Human Inbox"
          value={number(snapshot.runtime.humanInbox)}
          detail="review + human gate"
          attention={snapshot.runtime.humanInbox > 0}
        />
        <Metric
          label="Fehler"
          value={number(snapshot.runtime.failedRuns)}
          detail="failed, separat von aktiv"
          attention={snapshot.runtime.failedRuns > 0}
        />
        <Metric label="Geplant" value={number(snapshot.runtime.scheduledRuns)} detail="zukünftiges resumeAt" />
        <Metric label="Leases" value={number(snapshot.runtime.leasedRuns)} detail="aktive Worker-Leases" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Agent-Flotte" subtitle="kanonische Registry">
          <dl className="space-y-3 text-sm">
            <Row label="Organisationsrollen" value={number(snapshot.fleet.organizationRoleCount)} />
            <Row label="Provider registriert" value={number(snapshot.fleet.providerCount)} />
            <Row label="Aktive Defaults" value={snapshot.fleet.enabledProviderIds.join(", ") || "–"} />
            <Row label="Max. Parallel-Worker" value={number(snapshot.fleet.maxParallelWorkers)} />
            <Row label="Tasks je Worker-Slice" value={`max. ${number(snapshot.fleet.workerSliceMaxTasks)}`} />
          </dl>
        </Panel>

        <Panel title="Shared Learning" subtitle="nur validierte Lessons">
          <dl className="space-y-3 text-sm">
            <Row label="Akzeptierte Lessons" value={number(snapshot.learning.acceptedLessonCount)} />
            <Row label="Eval-Samples" value={number(snapshot.learning.evalSampleCount)} />
            <Row label="Prinzip" value="candidate → independent check → accepted" />
          </dl>
        </Panel>

        <Panel title="Run-Status" subtitle={`Stand ${dateTime(snapshot.generatedAt)}`}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {Object.entries(snapshot.runtime.statusCounts).map(([status, count]) => (
              <Row key={status} label={status} value={number(count)} />
            ))}
          </dl>
        </Panel>
      </section>

      <section className="rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]">
        <h2 className="font-semibold text-[rgb(var(--fg))]">Provider Performance</h2>
        <p className="text-xs text-[rgb(var(--muted))]">
          Empirische Qualität pro Capability; keine Promotion ohne Mindest-Evidence und Policy-Compliance.
        </p>
        {snapshot.learning.providerPerformance.length === 0 ? (
          <p className="mt-4 text-sm text-[rgb(var(--muted))]">Noch keine Eval-Samples vorhanden.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[rgb(var(--muted))]">
                <tr>
                  <th className="px-2 py-2">Capability</th>
                  <th className="px-2 py-2">Provider</th>
                  <th className="px-2 py-2">Samples</th>
                  <th className="px-2 py-2">Erfolg</th>
                  <th className="px-2 py-2">Evidence</th>
                  <th className="px-2 py-2">Policy</th>
                  <th className="px-2 py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.learning.providerPerformance
                  .slice()
                  .sort((a, b) => b.qualityScore - a.qualityScore)
                  .map((entry) => (
                    <tr key={`${entry.capability}:${entry.providerId}`} className="border-t border-[rgb(var(--border))]">
                      <td className="px-2 py-2 font-medium text-[rgb(var(--fg))]">{entry.capability}</td>
                      <td className="px-2 py-2">{entry.providerId}</td>
                      <td className="px-2 py-2">{number(entry.sampleSize)}</td>
                      <td className="px-2 py-2">{percent(entry.successRate)}</td>
                      <td className="px-2 py-2">{percent(entry.averageEvidenceFidelity)}</td>
                      <td className="px-2 py-2">{percent(entry.averagePolicyCompliance)}</td>
                      <td className="px-2 py-2">{percent(entry.qualityScore)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]">
        <h2 className="font-semibold text-[rgb(var(--fg))]">Letzte Runs</h2>
        <p className="text-xs text-[rgb(var(--muted))]">
          Keine Prompts, Secrets oder Chain-of-Thought – nur operator-relevante Run-Metadaten.
        </p>
        {snapshot.runtime.recentRuns.length === 0 ? (
          <p className="mt-4 text-sm text-[rgb(var(--muted))]">Noch keine persistierten Alpha2-Runs.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[rgb(var(--muted))]">
                <tr>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Task</th>
                  <th className="px-2 py-2">Rolle</th>
                  <th className="px-2 py-2">Risiko</th>
                  <th className="px-2 py-2">Attempt</th>
                  <th className="px-2 py-2">Resume</th>
                  <th className="px-2 py-2">Aktualisiert</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.runtime.recentRuns.map((run) => (
                  <tr key={run.runId} className="border-t border-[rgb(var(--border))]">
                    <td className="px-2 py-2 font-semibold text-[rgb(var(--fg))]">{run.status}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-[rgb(var(--fg))]">{run.taskId}</div>
                      <div className="text-xs text-[rgb(var(--muted))]">{run.runId}</div>
                    </td>
                    <td className="px-2 py-2">{run.primaryRole}</td>
                    <td className="px-2 py-2">{run.riskClass}</td>
                    <td className="px-2 py-2">{number(run.attempt)}</td>
                    <td className="px-2 py-2">{dateTime(run.resumeAt)}</td>
                    <td className="px-2 py-2">{dateTime(run.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, detail, attention = false }: { label: string; value: string; detail: string; attention?: boolean }) {
  return (
    <div className={`rounded-3xl p-4 shadow ring-1 ${attention ? "bg-amber-50 ring-amber-200" : "bg-[rgb(var(--card))] ring-[rgb(var(--border))]"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[rgb(var(--fg))]">{value}</p>
      <p className="mt-1 text-xs text-[rgb(var(--muted))]">{detail}</p>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]">
      <h2 className="font-semibold text-[rgb(var(--fg))]">{title}</h2>
      <p className="mb-4 text-xs text-[rgb(var(--muted))]">{subtitle}</p>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[rgb(var(--muted))]">{label}</dt>
      <dd className="text-right font-medium text-[rgb(var(--fg))]">{value}</dd>
    </div>
  );
}
