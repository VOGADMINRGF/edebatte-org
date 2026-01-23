"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const KIND_OPTIONS = ["topic", "region", "custom"] as const;
const STATUS_OPTIONS = ["draft", "review", "published", "archived"] as const;

type AssetItem = {
  id: string;
  kind: string;
  status: string;
  key: { topicKey?: string | null; regionCode?: string | null; slug?: string | null };
  currentRev: number;
  updatedAt?: string | null;
  publishedAt?: string | null;
};

type AssetResponse = {
  items: AssetItem[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AdminReportAssetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AssetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<(typeof KIND_OPTIONS)[number]>("topic");
  const [createTopic, setCreateTopic] = useState("");
  const [createRegion, setCreateRegion] = useState("");
  const [createSlug, setCreateSlug] = useState("");

  useEffect(() => {
    const qParam = searchParams.get("q") ?? "";
    if (qParam) setQuery(qParam);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (kind !== "all") params.set("kind", kind);
        if (status !== "all") params.set("status", status);
        if (query) params.set("q", query);
        params.set("page", String(page));
        params.set("limit", "20");
        const res = await fetch(`/api/admin/reports/assets?${params.toString()}`, { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login?next=/admin/reports/assets");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || res.statusText);
        }
        const body = (await res.json()) as AssetResponse;
        if (active) setData(body);
      } catch (err: any) {
        if (active) setError(err?.message ?? "assets_load_failed");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [kind, status, query, page, router]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const handleCreate = async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: createKind,
          key: {
            topicKey: createTopic || undefined,
            regionCode: createRegion || undefined,
            slug: createSlug || undefined,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "create_failed");
      setCreateOpen(false);
      setCreateTopic("");
      setCreateRegion("");
      setCreateSlug("");
      setPage(1);
    } catch (err: any) {
      setError(err?.message ?? "create_failed");
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Reports</p>
          <h1 className="text-2xl font-bold text-slate-900">Report Assets</h1>
          <p className="text-sm text-slate-600">Assets anlegen, revisionieren und publizieren.</p>
        </div>
        <button
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => setCreateOpen((prev) => !prev)}
        >
          {createOpen ? "Abbrechen" : "Neues Asset"}
        </button>
      </header>

      {createOpen && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Neues Asset</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <select
              value={createKind}
              onChange={(e) => setCreateKind(e.target.value as (typeof KIND_OPTIONS)[number])}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              value={createTopic}
              onChange={(e) => setCreateTopic(e.target.value)}
              placeholder="Topic Key"
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={createRegion}
              onChange={(e) => setCreateRegion(e.target.value)}
              placeholder="Region Code"
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={createSlug}
              onChange={(e) => setCreateSlug(e.target.value)}
              placeholder="Slug"
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            className="mt-3 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={handleCreate}
          >
            Speichern
          </button>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
        >
          <option value="all">Alle Kinds</option>
          {KIND_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
        >
          <option value="all">Alle Status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche (topic, region, slug)"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Key</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Kind</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Rev</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Laedt Assets...
                </td>
              </tr>
            )}
            {!loading && data?.items?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Keine Assets gefunden.
                </td>
              </tr>
            )}
            {!loading &&
              data?.items?.map((asset) => (
                <tr key={asset.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/reports/assets/${asset.id}`}
                      className="font-semibold text-slate-900 hover:underline"
                    >
                      {asset.key.topicKey || asset.key.regionCode || asset.key.slug || asset.id.slice(-6)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{asset.kind}</td>
                  <td className="px-4 py-3 text-slate-600">{asset.status}</td>
                  <td className="px-4 py-3 text-slate-600">{asset.currentRev}</td>
                  <td className="px-4 py-3 text-slate-600">{asset.updatedAt?.slice(0, 10) ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <button
          className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        >
          Zurueck
        </button>
        <span>
          Seite {page} / {totalPages}
        </span>
        <button
          className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
