import { UsageKPIPanel, type UsageKPI } from "@/app/(components)/UsageKPIPanel";
import type { AiErrorKind } from "@core/telemetry/aiUsageTypes";

type TelemetryResponse = {
  ok: boolean;
  snapshot?: Snapshot;
};

type Snapshot = {
  tiles: UsageKPI[];
  recent: RecentEvent[];
  updatedAt: string;
  filters: {
    rangeDays: number;
    provider?: string;
    pipeline?: string;
    region?: string | null;
  };
};

type RecentEvent = {
  timestamp: string;
  provider: string;
  pipeline: string;
  model?: string | null;
  region?: string | null;
  tokens: number;
  tokensInput?: number;
  tokensOutput?: number;
  costEur: number;
  durationMs: number;
  success: boolean;
  errorKind?: AiErrorKind | null;
  strictJson?: boolean;
  promptSnippet?: string;
  responseSnippet?: string;
  rawError?: string;
};

function resolveBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function fetchUsageSnapshot(params: {
  range: string;
  provider: string;
  pipeline: string;
  region: string;
}): Promise<TelemetryResponse["snapshot"] | null> {
  try {
    const query = new URLSearchParams();
    if (params.range) query.set("range", params.range);
    if (params.provider) query.set("provider", params.provider);
    if (params.pipeline) query.set("pipeline", params.pipeline);
    if (params.region) query.set("region", params.region);

    const res = await fetch(
      `${resolveBaseUrl()}/api/admin/telemetry/ai?${query.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json: TelemetryResponse = await res.json();
    if (!json.ok) return null;
    return json.snapshot ?? null;
  } catch (error) {
    console.error("fetchUsageSnapshot failed", error);
    return null;
  }
}

const PROVIDER_OPTIONS = [
  { value: "all", label: "Alle Provider" },
  { value: "openai", label: "OpenAI / GPT‑4" },
  { value: "anthropic", label: "Claude / Anthropic" },
  { value: "mistral", label: "Mistral" },
  { value: "gemini", label: "Gemini" },
  { value: "ari", label: "ARI" },
  { value: "youcom", label: "ARI / You.com" },
];

const PIPELINE_OPTIONS = [
  { value: "all", label: "Alle Pipelines" },
  { value: "contribution_analyze", label: "Beiträge" },
  { value: "feeds_analyze", label: "Feeds/Batch" },
  { value: "factcheck", label: "Factcheck" },
  { value: "report_summarize", label: "Reports" },
];

function Filters(props: {
  range: string;
  provider: string;
  pipeline: string;
  region: string;
}) {
  return (
    <form
      className="grid gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-3"
      method="get"
    >
      <label className="flex flex-col gap-1">
        <span className="font-semibold uppercase">Zeitraum</span>
        <select
          name="range"
          defaultValue={props.range}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1"
        >
          <option value="day">Heute</option>
          <option value="week">7 Tage</option>
          <option value="month">30 Tage</option>
          <option value="quarter">90 Tage</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold uppercase">Provider</span>
        <select
          name="provider"
          defaultValue={props.provider}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1"
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold uppercase">Pipeline</span>
        <select
          name="pipeline"
          defaultValue={props.pipeline}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1"
        >
          {PIPELINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold uppercase">Region</span>
        <input
          type="text"
          name="region"
          defaultValue={props.region}
          placeholder="z.B. Berlin oder EU"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1"
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          className="rounded-full bg-slate-900 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Anwenden
        </button>
      </div>
    </form>
  );
}

function RecentEventsTable({ events }: { events: RecentEvent[] }) {
  if (!events.length) {
    return (
      <p className="text-xs text-slate-500">
        Noch keine Telemetrieevents vorhanden. Die Liste füllt sich automatisch,
        sobald AI-Aufrufe geloggt werden.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-full text-left text-xs text-slate-600">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase">
            <th className="px-4 py-2 font-semibold">Zeit</th>
            <th className="px-4 py-2 font-semibold">Pipeline</th>
            <th className="px-4 py-2 font-semibold">Provider</th>
            <th className="px-4 py-2 font-semibold">Region</th>
            <th className="px-4 py-2 font-semibold text-right">Tokens</th>
            <th className="px-4 py-2 font-semibold text-right">Kosten</th>
            <th className="px-4 py-2 font-semibold text-right">Dauer</th>
            <th className="px-4 py-2 font-semibold text-right">Status</th>
            <th className="px-4 py-2 font-semibold text-right">ErrorKind</th>
            <th className="px-4 py-2 font-semibold text-right">Details</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.timestamp} className="border-b border-slate-50 last:border-none">
              <td className="px-4 py-2">
                {new Date(event.timestamp).toLocaleString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-2 font-semibold">
                {PIPELINE_OPTIONS.find((opt) => opt.value === event.pipeline)?.label ??
                  event.pipeline}
              </td>
              <td className="px-4 py-2 capitalize">
                {PROVIDER_OPTIONS.find((opt) => opt.value === event.provider)?.label ??
                  event.provider}
              </td>
              <td className="px-4 py-2">{event.region ?? "–"}</td>
              <td className="px-4 py-2 text-right">{event.tokens}</td>
              <td className="px-4 py-2 text-right">
                {event.costEur.toFixed(2)} €
              </td>
              <td className="px-4 py-2 text-right">{event.durationMs} ms</td>
              <td className="px-4 py-2 text-right">
                {event.success ? (
                  <span className="text-emerald-600">ok</span>
                ) : (
                  <span className="text-rose-600">error</span>
                )}
              </td>
              <td className="px-4 py-2 text-right">
                {!event.success && event.errorKind ? (
                  <span className="inline-flex items-center justify-end rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700 ring-1 ring-rose-100">
                    {event.errorKind}
                  </span>
                ) : event.strictJson ? (
                  <span className="inline-flex items-center justify-end rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 ring-1 ring-sky-100">
                    JSON
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2 text-right">
                <details className="text-[11px] text-slate-600">
                  <summary className="cursor-pointer text-sky-700 underline-offset-2 hover:underline">Details</summary>
                  <div className="mt-1 space-y-1 text-left">
                    {event.model && <div>Modell: {event.model}</div>}
                    <div>Tokens In/Out: {event.tokensInput ?? 0} / {event.tokensOutput ?? 0}</div>
                    <div>Dauer: {event.durationMs} ms</div>
                    {event.promptSnippet && (
                      <pre className="max-h-24 overflow-y-auto rounded bg-slate-50 p-2 text-[10px] text-slate-700">{event.promptSnippet}</pre>
                    )}
                    {event.responseSnippet && (
                      <pre className="max-h-24 overflow-y-auto rounded bg-slate-50 p-2 text-[10px] text-slate-700">{event.responseSnippet}</pre>
                    )}
                    {event.rawError && <div className="text-rose-600">{event.rawError}</div>}
                  </div>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default async function UsageDashboardPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const range = typeof params.range === "string" ? params.range : "day";
  const provider = typeof params.provider === "string" ? params.provider : "all";
  const pipeline = typeof params.pipeline === "string" ? params.pipeline : "all";
  const region = typeof params.region === "string" ? params.region : "";

  const snapshot = await fetchUsageSnapshot({ range, provider, pipeline, region });
  const tiles = snapshot?.tiles ?? [
    {
      id: "placeholder",
      label: "Tokens heute – GPT‑4/OpenAI",
      value: "0",
      hint: "keine Daten",
    },
  ];
  const updatedAt = snapshot?.updatedAt ?? new Date().toISOString();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 pb-16">
      <section className="mx-auto max-w-5xl px-4 py-12 space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Telemetrie
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            AI-Verbräuche & Kosten im Blick
          </h1>
          <p className="text-sm text-slate-600">
            Read-only Übersicht. Alle Kennzahlen stammen aus dem internen
            Usage-Log und werden regelmäßig aggregiert.
          </p>
        </header>

        <Filters
          range={range}
          provider={provider}
          pipeline={pipeline}
          region={region}
        />

        <UsageKPIPanel items={tiles} />

        <p className="text-xs text-slate-500">
          Letzte Aktualisierung:{" "}
          {new Date(updatedAt).toLocaleString("de-DE", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </p>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Letzte AI-Anfragen
            </h2>
            <span className="text-xs text-slate-500">
              {snapshot?.filters?.provider
                ? `Provider: ${snapshot.filters.provider}`
                : "Quelle: ai_usage (triMongo core)"}
            </span>
          </div>
          <RecentEventsTable events={snapshot?.recent ?? []} />
        </section>
      </section>
    </main>
  );
}
