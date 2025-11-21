"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CORE_LOCALES, EXTENDED_LOCALES } from "@/config/locales";

const REGION_FILTERS = [
  { value: "all", label: "Alle Regionen" },
  { value: "global", label: "Global / offen" },
  { value: "EU", label: "EU" },
  { value: "DE", label: "Deutschland" },
  { value: "AT", label: "Österreich" },
  { value: "CH", label: "Schweiz" },
];

const LOCALE_FILTERS = ["all", ...CORE_LOCALES, ...EXTENDED_LOCALES];

const SOURCE_TYPES = [
  { value: "all", label: "Alle Quellen" },
  { value: "feed", label: "Feed" },
  { value: "contribution", label: "Contribution" },
  { value: "admin", label: "Admin" },
];

export default function EvidenceClaimsAdminPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState("all");
  const [locale, setLocale] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let aborted = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (region !== "all") params.set("regionCode", region);
        if (locale !== "all") params.set("locale", locale);
        if (sourceType !== "all") params.set("sourceType", sourceType);
        if (query.trim()) params.set("q", query.trim());
        const res = await fetch(`/api/admin/evidence/claims?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || res.statusText);
        }
        const body = await res.json();
        if (!aborted) setItems(body.items ?? []);
      } catch (err: any) {
        if (!aborted) setError(err?.message ?? "Fehler beim Laden der Claims");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    return () => {
      aborted = true;
    };
  }, [region, locale, sourceType, query]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Evidence</p>
        <h1 className="text-2xl font-bold text-slate-900">Aussagen im Evidence-Graph</h1>
        <p className="text-sm text-slate-600">
          Filtere Claims aus allen Pipelines und öffne die Details zur Überprüfung oder Korrektur.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
        >
          {REGION_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
        >
          {LOCALE_FILTERS.map((loc) => (
            <option key={loc} value={loc}>
              {loc === "all" ? "Alle Sprachen" : loc}
            </option>
          ))}
        </select>

        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
        >
          {SOURCE_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche im Claim-Text"
          className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Claim</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Region</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Locale</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Quelle</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Decisions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Lädt …
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Keine Claims gefunden.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/evidence/claims/${row.id}`} className="font-semibold text-slate-900 hover:underline">
                      {row.claimText?.slice(0, 120) ?? "(ohne Text)"}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {row.pipeline ?? "—"} · {formatDate(row.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{row.regionName ?? "Global"}</p>
                    <p className="text-xs text-slate-500">{row.regionCode ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">{row.locale}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{row.sourceType}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {row.decisionsSummary?.total || 0} · {row.decisionsSummary?.latestOutcome ?? "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "–";
  try {
    return new Date(value).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return value;
  }
}
