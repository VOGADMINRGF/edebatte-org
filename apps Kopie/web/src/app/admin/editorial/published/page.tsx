"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type EditorialItem = {
  id: string;
  status: string;
  title?: string | null;
  summary?: string | null;
  topicKey?: string | null;
  updatedAt?: string | null;
};

type EditorialResponse = {
  items: EditorialItem[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AdminEditorialPublishedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EditorialResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (query) params.set("q", query);
        params.set("status", "published");
        params.set("page", String(page));
        params.set("limit", "20");
        const res = await fetch(`/api/admin/editorial/items?${params.toString()}`, { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login?next=/admin/editorial/published");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || res.statusText);
        }
        const body = (await res.json()) as EditorialResponse;
        if (active) setData(body);
      } catch (err: any) {
        if (active) setError(err?.message ?? "published_load_failed");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [query, page, router]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Redaktion</p>
        <h1 className="text-2xl font-bold text-slate-900">Publiziert</h1>
        <p className="text-sm text-slate-600">Veröffentlichte Items und Revisionen.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche (Titel, Summary)"
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
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Titel</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Topic</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  Laedt...
                </td>
              </tr>
            )}
            {!loading && data?.items?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  Keine Items gefunden.
                </td>
              </tr>
            )}
            {!loading &&
              data?.items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/editorial/items/${item.id}`}
                      className="font-semibold text-slate-900 hover:underline"
                    >
                      {item.title ?? "(ohne Titel)"}
                    </Link>
                    <p className="text-xs text-slate-500">{item.summary ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.topicKey ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.updatedAt?.slice(0, 10) ?? "—"}</td>
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
