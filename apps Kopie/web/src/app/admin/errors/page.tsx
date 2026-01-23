"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ErrorRow = {
  _id?: string;
  message: string;
  level?: "info" | "warn" | "error";
  resolved?: boolean;
  traceId?: string;
  path?: string;
  timestamp?: string;
  createdAt?: string;
};

type ApiResponse = {
  ok: boolean;
  items: ErrorRow[];
  page: number;
  pageSize: number;
  total: number;
};

const LEVEL_OPTIONS = [
  { value: "", label: "Alle Levels" },
  { value: "error", label: "Error" },
  { value: "warn", label: "Warn" },
  { value: "info", label: "Info" },
];

const RESOLVED_OPTIONS = [
  { value: "", label: "Alle Status" },
  { value: "false", label: "Offen" },
  { value: "true", label: "Erledigt" },
];

export default function AdminErrorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [resolved, setResolved] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  useEffect(() => {
    const qParam = searchParams.get("q") ?? "";
    const levelParam = searchParams.get("level") ?? "";
    const resolvedParam = searchParams.get("resolved") ?? "";
    const pageParam = Number(searchParams.get("page") ?? "1");
    setQuery(qParam);
    setLevel(levelParam);
    setResolved(resolvedParam);
    setPage(Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (level) params.set("level", level);
        if (resolved) params.set("resolved", resolved);
        params.set("page", String(page));
        params.set("pageSize", "20");
        const res = await fetch(`/api/admin/errors/list?${params.toString()}`, { cache: "no-store" });
        if (res.status === 401 || res.status === 403) {
          router.replace("/login?next=/admin/errors");
          return;
        }
        const body = (await res.json().catch(() => ({}))) as ApiResponse | null;
        if (!res.ok || !body?.ok) throw new Error((body as any)?.error || res.statusText);
        if (active) setData(body);
      } catch (err: any) {
        if (active) setError(err?.message ?? "Konnte Errors nicht laden.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [query, level, resolved, page, router]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (level) params.set("level", level);
    if (resolved) params.set("resolved", resolved);
    params.set("page", "1");
    const href = `/admin/errors?${params.toString()}`;
    router.replace(href as any);
  };

  const toggleResolved = async (row: ErrorRow, next: boolean) => {
    if (!row._id) return;
    try {
      const res = await fetch(`/api/admin/errors/${encodeURIComponent(String(row._id))}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolved: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || res.statusText);
      }
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item._id === row._id ? { ...item, resolved: next } : item,
          ),
        };
      });
    } catch (err: any) {
      setError(err?.message ?? "Update fehlgeschlagen.");
    }
  };

  const changePage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    const href = `/admin/errors?${params.toString()}`;
    router.replace(href as any);
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · System</p>
        <h1 className="text-2xl font-bold text-slate-900">Error Logs</h1>
        <p className="text-sm text-slate-600">
          Systemweite Fehler und Trace-IDs. Filtere nach Level oder Trace, um Ursache und Kontext zu finden.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche (Message, TraceId, Pfad)"
          className="w-64 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={resolved}
          onChange={(e) => setResolved(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {RESOLVED_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Anwenden
        </button>
        {loading && <span className="text-sm text-slate-500">Lade …</span>}
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Zeit</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Pfad</th>
              <th className="px-4 py-3">Trace</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Lädt …
                </td>
              </tr>
            )}
            {!loading && (!data?.items || data.items.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Keine Errors gefunden.
                </td>
              </tr>
            )}
            {!loading &&
              data?.items?.map((row) => (
                <tr key={row._id ?? `${row.traceId}-${row.timestamp}`}>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatDate(row.timestamp || row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <LevelBadge level={row.level ?? "info"} />
                  </td>
                  <td className="px-4 py-3 text-slate-800">{row.message}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.path ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.traceId ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {row._id && (
                        <a
                          href={`/admin/errors/${encodeURIComponent(String(row._id))}`}
                          className="text-xs font-semibold text-sky-600 hover:underline"
                        >
                          Details
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleResolved(row, !row.resolved)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        {row.resolved ? "Öffnen" : "Erledigen"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Seite {page} / {totalPages} · {data?.total ?? 0} Einträge
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changePage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 disabled:opacity-50"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => changePage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 disabled:opacity-50"
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function LevelBadge({ level }: { level: "info" | "warn" | "error" }) {
  const styles =
    level === "error"
      ? "bg-rose-100 text-rose-700"
      : level === "warn"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${styles}`}>
      {level}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return value;
  }
}
