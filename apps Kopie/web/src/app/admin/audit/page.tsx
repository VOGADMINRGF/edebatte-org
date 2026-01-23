"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SCOPE_OPTIONS = ["admin", "org", "editorial", "access", "report", "graph", "user"] as const;

type AuditItem = {
  id: string;
  at?: string | null;
  scope: string;
  action: string;
  target: { type: string; id?: string | null };
  actor: { userId?: string | null; ipHash?: string | null };
  reason?: string | null;
};

type AuditResponse = {
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AdminAuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qParam = searchParams.get("q") ?? "";
    const scopeParam = searchParams.get("scope") ?? "";
    if (qParam) setQuery(qParam);
    if (scopeParam) setScope(scopeParam);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (scope !== "all") params.set("scope", scope);
        params.set("page", String(page));
        params.set("limit", "30");
        const res = await fetch(`/api/admin/audit?${params.toString()}`, { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login?next=/admin/audit");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || res.statusText);
        }
        const body = (await res.json()) as AuditResponse;
        if (active) setData(body);
      } catch (err: any) {
        if (active) setError(err?.message ?? "audit_load_failed");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [scope, query, page, router]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Audit</p>
        <h1 className="text-2xl font-bold text-slate-900">Audit Events</h1>
        <p className="text-sm text-slate-600">Alle Mutationen und Administrative Eingriffe.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
        >
          <option value="all">Alle Scopes</option>
          {SCOPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche (action, target)"
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
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Zeit</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Scope</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Action</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Target</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Laedt Audit...
                </td>
              </tr>
            )}
            {!loading && data?.items?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Keine Events gefunden.
                </td>
              </tr>
            )}
            {!loading &&
              data?.items?.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-slate-600">{entry.at?.slice(0, 19) ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.scope}</td>
                  <td className="px-4 py-3 text-slate-900">{entry.action}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {entry.target?.type}
                    {entry.target?.id ? ` · ${entry.target.id}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{entry.actor?.userId ?? "—"}</td>
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
