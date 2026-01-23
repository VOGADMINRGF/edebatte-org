"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type OrgItem = {
  id: string;
  slug: string;
  name: string;
  archivedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type OrgResponse = {
  items: OrgItem[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AdminOrgsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OrgResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

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
        params.set("page", String(page));
        params.set("limit", "20");
        const res = await fetch(`/api/admin/orgs?${params.toString()}`, { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login?next=/admin/orgs");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || res.statusText);
        }
        const body = (await res.json()) as OrgResponse;
        if (active) setData(body);
      } catch (err: any) {
        if (active) setError(err?.message ?? "orgs_load_failed");
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

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, slug: createSlug || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "create_failed");
      }
      setCreateOpen(false);
      setCreateName("");
      setCreateSlug("");
      setPage(1);
    } catch (err: any) {
      setError(err?.message ?? "create_failed");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Admin · Organisationen
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Orgs & Teams</h1>
          <p className="text-sm text-slate-600">Organisationen anlegen, verwalten und Teams steuern.</p>
        </div>
        <button
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => setCreateOpen((prev) => !prev)}
        >
          {createOpen ? "Abbrechen" : "Neue Org"}
        </button>
      </header>

      {createOpen && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Neue Organisation</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Name"
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={createSlug}
              onChange={(e) => setCreateSlug(e.target.value)}
              placeholder="Slug (optional)"
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={handleCreate}
              disabled={createLoading}
            >
              {createLoading ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche nach Name oder Slug"
            className="w-64 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <span className="text-xs text-slate-500">{data?.total ?? 0} Orgs</span>
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
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Organisation</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Slug</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Aktualisiert</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Laedt Organisationen...
                </td>
              </tr>
            )}
            {!loading && data?.items?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Keine Organisationen gefunden.
                </td>
              </tr>
            )}
            {!loading &&
              data?.items?.map((org) => (
                <tr key={org.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orgs/${org.id}`}
                      className="font-semibold text-slate-900 hover:underline"
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{org.slug || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        org.archivedAt ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {org.archivedAt ? "archiviert" : "aktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{org.updatedAt?.slice(0, 10) ?? "—"}</td>
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
