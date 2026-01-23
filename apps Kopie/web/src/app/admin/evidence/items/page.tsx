"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type EvidenceItemSummary = {
  _id: string;
  publisher: string;
  shortTitle: string;
  sourceKind: string;
  locale?: string | null;
  regionCode?: string | null;
  publishedAt?: string | null;
  linkedClaims?: number;
  isActive?: boolean;
};

export default function EvidenceItemsAdminPage() {
  const [items, setItems] = useState<EvidenceItemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publisherFilter, setPublisherFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("true");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          pageSize: "50",
          ...(publisherFilter ? { publisher: publisherFilter } : {}),
          ...(kindFilter !== "all" ? { sourceKind: kindFilter } : {}),
          ...(activeFilter !== "all" ? { isActive: activeFilter } : {}),
        });
        const res = await fetch(`/api/admin/evidence/items?${params.toString()}`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || res.statusText);
        if (!ignore) setItems(body.items ?? []);
      } catch (err: any) {
        if (!ignore) setError(err?.message ?? "Fehler beim Laden der Quellen");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [publisherFilter, kindFilter, activeFilter]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Evidence Items</p>
        <h1 className="text-2xl font-bold text-slate-900">Quellen &amp; News</h1>
        <p className="text-sm text-slate-600">
          Übersicht aller eingehenden News-Quellen. Nur Metadaten/Kurztexte werden gespeichert.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <label className="flex flex-col">
          <span className="text-[11px] uppercase font-semibold">Publisher</span>
          <input
            value={publisherFilter}
            onChange={(e) => setPublisherFilter(e.target.value)}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm"
            placeholder="z.B. Tagesschau"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[11px] uppercase font-semibold">Quelle</span>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm"
          >
            <option value="all">Alle</option>
            <option value="news_article">News</option>
            <option value="press_release">Presse</option>
            <option value="blog">Blog</option>
            <option value="official_doc">Offiziell</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-[11px] uppercase font-semibold">Aktive Quellen</span>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm"
          >
            <option value="true">Nur aktive</option>
            <option value="false">Nur deaktivierte</option>
            <option value="all">Alle</option>
          </select>
        </label>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Publisher</th>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Quelle</th>
              <th className="px-4 py-3">Region/Locale</th>
              <th className="px-4 py-3">Verlinkte Claims</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Lädt …
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.publisher}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/evidence/items/${item._id}`} className="text-sky-600 underline">
                      {item.shortTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{item.sourceKind}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.regionCode ?? "–"} / {item.locale ?? "–"}
                  </td>
                  <td className="px-4 py-3">{item.linkedClaims ?? 0}</td>
                  <td className="px-4 py-3">
                    {item.isActive === false ? (
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                        deaktiviert
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        aktiv
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
