"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ErrorRow = {
  _id: string;
  message: string;
  level?: "info" | "warn" | "error";
  resolved?: boolean;
  traceId?: string | null;
  path?: string | null;
  timestamp?: string | null;
  createdAt?: string | null;
  ctx?: any;
};

type ApiResponse = {
  ok: boolean;
  item?: ErrorRow;
  related?: ErrorRow[];
  error?: string;
};

export default function AdminErrorDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [item, setItem] = useState<ErrorRow | null>(null);
  const [related, setRelated] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [traceSaving, setTraceSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/errors/${encodeURIComponent(id)}`, { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok || !body.ok || !body.item) {
          throw new Error(body?.error || res.statusText);
        }
        if (active) {
          setItem(body.item);
          setRelated(Array.isArray(body.related) ? body.related : []);
        }
      } catch (err: any) {
        if (active) setError(err?.message ?? "Fehler beim Laden");
      } finally {
        if (active) setLoading(false);
      }
    }
    if (id) load();
    return () => {
      active = false;
    };
  }, [id]);

  const toggleResolved = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/errors/${encodeURIComponent(item._id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolved: !item.resolved }),
      });
      const body = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok || !body.ok || !body.item) {
        throw new Error(body?.error || res.statusText);
      }
      setItem(body.item);
    } catch (err: any) {
      setError(err?.message ?? "Update fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const toggleTraceResolved = async () => {
    if (!item?.traceId) return;
    const nextResolved = !item.resolved;
    setTraceSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/errors/trace", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ traceId: item.traceId, resolved: nextResolved }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || res.statusText);
      }
      setItem((prev) => (prev ? { ...prev, resolved: nextResolved } : prev));
      setRelated((prev) => prev.map((row) => ({ ...row, resolved: nextResolved })));
    } catch (err: any) {
      setError(err?.message ?? "Trace-Update fehlgeschlagen");
    } finally {
      setTraceSaving(false);
    }
  };

  const relatedRows = useMemo(() => {
    return related.filter((row) => row._id !== item?._id);
  }, [related, item]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · System</p>
        <h1 className="text-2xl font-bold text-slate-900">Error Detail</h1>
        <p className="text-sm text-slate-600">
          Trace-Kontext und Metadaten zum ausgewählten Error.
        </p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
          Lädt …
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      {!loading && item && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <LevelBadge level={item.level ?? "info"} />
                <p className="mt-2 text-lg font-semibold text-slate-900">{item.message}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(item.timestamp || item.createdAt)} · {item.path ?? "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={toggleResolved}
                  disabled={saving}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {item.resolved ? "Als offen markieren" : "Als erledigt markieren"}
                </button>
                {item.traceId && (
                  <button
                    onClick={toggleTraceResolved}
                    disabled={traceSaving}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {item.resolved ? "Trace öffnen" : "Trace erledigen"}
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-400">Trace ID</p>
                <p>{item.traceId ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Status</p>
                <p>{item.resolved ? "Erledigt" : "Offen"}</p>
              </div>
            </div>

            {item.ctx && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <pre className="whitespace-pre-wrap">{JSON.stringify(item.ctx, null, 2)}</pre>
              </div>
            )}
          </section>

          {relatedRows.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Trace-Verlauf</h2>
              <div className="mt-3 space-y-2">
                {relatedRows.map((row) => (
                  <Link
                    key={row._id}
                    href={`/admin/errors/${encodeURIComponent(row._id)}`}
                    className="block rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-800 hover:border-sky-200 hover:bg-sky-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {row.message.length > 120 ? `${row.message.slice(0, 120)}…` : row.message}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(row.timestamp || row.createdAt)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {row.level ?? "info"} · {row.path ?? "—"}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${styles}`}>
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
