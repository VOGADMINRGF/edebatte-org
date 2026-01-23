"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type RegionTopic = { topicKey: string; claimCount: number };
type RegionFeedItem = {
  id: string;
  title: string;
  url?: string | null;
  source?: string | null;
  publishedAt?: string | null;
};
type RegionSummary = {
  regionKey: string | null;
  feedItems: RegionFeedItem[];
  topics: RegionTopic[];
  lastUpdated: string | null;
  claimCount: number;
  decisionCount: number;
  newsSourceCount: number;
};

type SummaryResponse =
  | ({ ok: true } & RegionSummary)
  | { ok: false; error: string };

export default function AdminPitchPage() {
  const [regionCode, setRegionCode] = useState("DE:BE");
  const [scope, setScope] = useState<"de" | "global">("de");
  const [maxFeeds, setMaxFeeds] = useState(12);
  const [maxItemsPerFeed, setMaxItemsPerFeed] = useState(12);
  const [analyzeLimit, setAnalyzeLimit] = useState(12);
  const [summary, setSummary] = useState<RegionSummary | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const landingHref = useMemo(() => {
    const code = regionCode.trim();
    if (!code) return null;
    return `/region/${encodeURIComponent(code)}`;
  }, [regionCode]);

  async function loadSummary(code: string) {
    const res = await fetch(
      `/api/region/summary?regionCode=${encodeURIComponent(code)}&limit=5`,
    );
    const data = (await res.json()) as SummaryResponse;
    if (!res.ok || !data.ok) {
      throw new Error(data && "error" in data ? data.error : "summary_failed");
    }
    setSummary(data);
  }

  async function handleRefresh() {
    const code = regionCode.trim();
    if (!code) {
      setStatus("Region fehlt.");
      return;
    }
    setLoading(true);
    setStatus("Pull laeuft...");
    try {
      const pullRes = await fetch("/api/feeds/pull", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope,
          maxFeeds,
          maxItemsPerFeed,
          dryRun: false,
          regionCode: code,
        }),
      });
      const pullJson = await pullRes.json().catch(() => ({}));
      if (!pullRes.ok || !pullJson?.ok) {
        throw new Error(pullJson?.error ?? "pull_failed");
      }

      setStatus("Analyze pending...");
      const analyzeRes = await fetch("/api/feeds/analyze-pending", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: analyzeLimit }),
      });
      const analyzeJson = await analyzeRes.json().catch(() => ({}));
      if (!analyzeRes.ok || !analyzeJson?.ok) {
        throw new Error(analyzeJson?.error ?? "analyze_failed");
      }

      setStatus("Summary laden...");
      await loadSummary(code);
      setStatus("Fertig.");
    } catch (err: any) {
      setStatus(`Fehler: ${String(err?.message ?? err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSummary() {
    const code = regionCode.trim();
    if (!code) {
      setStatus("Region fehlt.");
      return;
    }
    setLoading(true);
    setStatus("Summary laden...");
    try {
      await loadSummary(code);
      setStatus("Fertig.");
    } catch (err: any) {
      setStatus(`Fehler: ${String(err?.message ?? err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin - Pitch Studio</p>
        <h1 className="text-2xl font-semibold text-slate-900">Region Pitch Builder</h1>
        <p className="text-sm text-slate-600">
          Region auswaehlen, Pull + Analyze anstossen und eine teilbare Landing generieren.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-4 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-500">Region</label>
              <input
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value)}
                placeholder="DE:BE:11000"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-500">Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "de" | "global")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="de">de</option>
                <option value="global">global</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-500">Max Feeds</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxFeeds}
                onChange={(e) => setMaxFeeds(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-500">Items pro Feed</label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxItemsPerFeed}
                onChange={(e) => setMaxItemsPerFeed(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-500">Analyze Limit</label>
              <input
                type="number"
                min={1}
                max={50}
                value={analyzeLimit}
                onChange={(e) => setAnalyzeLimit(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Aktualisieren (Pull + Analyze light)
            </button>
            <button
              onClick={handleLoadSummary}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Nur Summary laden
            </button>
            {landingHref && (
              <Link href={landingHref} className="text-sm font-semibold text-sky-600 underline">
                Landing teilen
              </Link>
            )}
          </div>
          {status && <p className="text-xs text-slate-500">Status: {status}</p>}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
          {summary ? (
            <div className="space-y-2 text-xs text-slate-600">
              <p>Region: {summary.regionKey ?? regionCode}</p>
              <p>Claims: {summary.claimCount}</p>
              <p>Decisions: {summary.decisionCount}</p>
              <p>News-Quellen: {summary.newsSourceCount}</p>
              <p>
                Last Update:{" "}
                {summary.lastUpdated
                  ? new Date(summary.lastUpdated).toLocaleDateString("de-DE")
                  : "n/a"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Noch keine Summary geladen.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Aktuelle Ereignisse</h2>
          {!summary || summary.feedItems.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Feed-Items.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.feedItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold uppercase">
                      {item.source ?? "Quelle"}
                    </span>
                    {item.publishedAt && (
                      <span>{new Date(item.publishedAt).toLocaleDateString("de-DE")}</span>
                    )}
                  </div>
                  <div className="font-semibold text-slate-900">
                    {item.url ? (
                      <a href={item.url} className="hover:underline">
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Themencluster</h2>
          {!summary || summary.topics.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Themen vorhanden.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {summary.topics.map((topic) => (
                <span
                  key={topic.topicKey}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                >
                  {topic.topicKey || "allgemein"} - {topic.claimCount}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
