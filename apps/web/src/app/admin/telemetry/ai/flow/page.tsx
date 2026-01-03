"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

type FlowHealth = {
  ok: boolean;
  now: string;
  env: {
    triMongo: Record<string, boolean>;
    openai: { key: boolean; model: string | null };
    ari: { key: boolean; baseUrl: boolean; mode: string | null };
    gemini: { key: boolean };
  };
  feeds: {
    candidates: { byStatus: Record<string, number>; total: number };
    drafts: { byStatus: Record<string, number>; total: number };
    statements: { byStatus: Record<string, number>; total: number };
    latest: {
      candidateError: null | { id: string; sourceUrl: string; sourceTitle: string; analyzeError: string | null };
      draft: null | { id: string; title: string; status: string; createdAt: string; sourceUrl: string | null };
      statement: null | { id: string; title: string; status: string; createdAt: string; sourceUrl: string | null };
    };
  };
  factcheck: any;
  links: Record<string, string>;
};

function pill(ok: boolean) {
  return ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";
}

export default function FlowHealthPage() {
  const [data, setData] = useState<FlowHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/admin/telemetry/flow-health", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as FlowHealth | null;
      if (!res.ok || !body?.ok) throw new Error((body as any)?.error ?? res.statusText);
      setData(body);
    } catch (e: any) {
      setError(e?.message ?? "Flow health nicht erreichbar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  const candidates = data?.feeds.candidates.byStatus ?? {};
  const drafts = data?.feeds.drafts.byStatus ?? {};
  const statements = data?.feeds.statements.byStatus ?? {};

  const hasCandidateErrors = (candidates["error"] ?? 0) > 0;
  const pending = candidates["pending"] ?? 0;
  const processing = candidates["processing"] ?? 0;
  const success = candidates["success"] ?? 0;
  const ready = statements["readyForLive"] ?? 0;

  const envBadges = useMemo(() => {
    if (!data) return [];
    return [
      { label: "TriMongo core", ok: Boolean(data.env.triMongo.core) },
      { label: "TriMongo votes", ok: Boolean(data.env.triMongo.votes) },
      { label: "TriMongo pii", ok: Boolean(data.env.triMongo.pii) },
      { label: "OpenAI key", ok: Boolean(data.env.openai.key) },
      { label: `OpenAI model: ${data.env.openai.model ?? "-"}`, ok: Boolean(data.env.openai.model) },
      { label: "ARI key", ok: Boolean(data.env.ari.key) },
      { label: "ARI baseUrl", ok: Boolean(data.env.ari.baseUrl) },
      { label: "Gemini key", ok: Boolean(data.env.gemini.key) },
    ];
  }, [data]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Admin / Telemetry / AI
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Flow Health (Feeds {" > "} Orchestrator {" > "} Swipe {" > "} Factcheck)
          </h1>
          <p className="text-sm text-slate-600">
            Eine Seite, die dir sofort zeigt, wo der Flow haengt. Auto-refresh alle ~6s.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/telemetry/ai/orchestrator"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Orchestrator Smoke
          </Link>
          <Link
            href="/admin/feeds/drafts"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Feed Drafts
          </Link>
          <Link
            href="/swipes"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Swipe
          </Link>
        </div>
      </header>

      {loading && <div className="text-sm text-slate-600">Laedt ...</div>}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <section className="flex flex-wrap gap-2">
            {envBadges.map((b) => (
              <span
                key={b.label}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${pill(
                  b.ok,
                )}`}
              >
                {b.ok ? "OK" : "FAIL"} {b.label}
              </span>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Kpi title="Candidates total" value={String(data.feeds.candidates.total)} hint="statement_candidates" />
            <Kpi title="Analyze pending" value={String(pending)} hint="analyzeStatus=pending" warn={pending > 0} />
            <Kpi title="Analyze processing" value={String(processing)} hint="analyzeStatus=processing" warn={processing > 0} />
            <Kpi title="Analyze success" value={String(success)} hint="analyzeStatus=success" ok={success > 0} />
            <Kpi
              title="Candidate errors"
              value={String(candidates["error"] ?? 0)}
              hint="analyzeStatus=error"
              warn={hasCandidateErrors}
            />
            <Kpi title="Drafts total" value={String(data.feeds.drafts.total)} hint="vote_drafts" />
            <Kpi title="Published statements" value={String(ready)} hint="feed_statements readyForLive" ok={ready > 0} />
            <Kpi title="Factcheck jobs" value={String(data.factcheck?.total ?? 0)} hint="factcheck_jobs" />
          </section>

          {(data.feeds.latest.candidateError || data.factcheck?.lastError) && (
            <section className="grid gap-4 lg:grid-cols-2">
              {data.feeds.latest.candidateError && (
                <Card title="Letzter Candidate-Error">
                  <p className="text-sm font-semibold text-slate-900">
                    {data.feeds.latest.candidateError.sourceTitle}
                  </p>
                  <a
                    className="text-sm text-sky-700 underline"
                    href={data.feeds.latest.candidateError.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Quelle oeffnen
                  </a>
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
{data.feeds.latest.candidateError.analyzeError ?? "-"}
                  </pre>
                </Card>
              )}
              {data.factcheck?.lastError && (
                <Card title="Letzter Factcheck-Error">
                  <p className="text-xs text-slate-600">Job: {data.factcheck.lastError.jobId ?? "-"}</p>
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
{data.factcheck.lastError.error ?? "-"}
                  </pre>
                </Card>
              )}
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Quick Actions (curl-aequivalent)
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <ActionCard
                title="Feeds Pull (dryRun=false)"
                desc="holt neue Feed-Items und schreibt Candidates"
                cmd={`curl -sS -X POST "http://localhost:3000/api/feeds/pull" -H "content-type: application/json" -d '{"scope":"de","maxFeeds":20,"maxItemsPerFeed":12,"dryRun":false}' | jq`}
              />
              <ActionCard
                title="Analyze Pending (limit=10)"
                desc="fuehrt KI-Analyse auf Candidates aus und erzeugt vote_drafts"
                cmd={`curl -sS -X POST "http://localhost:3000/api/feeds/analyze-pending" -H "content-type: application/json" -d '{"limit":10}' | jq`}
              />
              <ActionCard
                title="Drafts (Admin UI)"
                desc="review & publish"
                cmd={`open http://localhost:3000/admin/feeds/drafts`}
              />
              <ActionCard
                title="SwipeStatements"
                desc="muss nach Publish etwas liefern"
                cmd={`curl -sS "http://localhost:3000/api/swipeStatements?limit=20" | jq`}
              />
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Kpi({
  title,
  value,
  hint,
  warn,
  ok,
}: {
  title: string;
  value: string;
  hint?: string;
  warn?: boolean;
  ok?: boolean;
}) {
  const tone = ok ? "border-emerald-200 bg-emerald-50" : warn ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${tone}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-600">{hint}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ActionCard({ title, desc, cmd }: { title: string; desc: string; cmd: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{desc}</div>
      <pre className="mt-3 overflow-auto rounded-xl bg-white p-3 text-xs text-slate-800">
{cmd}
      </pre>
    </div>
  );
}
