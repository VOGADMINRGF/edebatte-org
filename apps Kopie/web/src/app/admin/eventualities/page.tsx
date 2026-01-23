"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SnapshotRow = {
  contributionId: string;
  locale?: string | null;
  userIdMasked: string | null;
  nodesCount: number;
  treesCount: number;
  reviewed: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type FilterOption = "all" | "open" | "reviewed";

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: "Alle", value: "all" },
  { label: "Offen", value: "open" },
  { label: "Review ok", value: "reviewed" },
];

export default function AdminEventualitiesPage() {
  const [items, setItems] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>("open");
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/eventualities/list", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        if (!ignore) {
          setItems(Array.isArray(body?.items) ? body.items : []);
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message ?? "Laden der Eventualitäten-Snapshots fehlgeschlagen.");
          setItems([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const summary = useMemo(() => {
    const open = items.filter((row) => !row.reviewed).length;
    const reviewed = items.length - open;
    const nodes = items.reduce((acc, row) => acc + row.nodesCount, 0);
    const trees = items.reduce((acc, row) => acc + row.treesCount, 0);
    return { open, reviewed, nodes, trees, total: items.length };
  }, [items]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items
      .filter((row) => {
        if (filter === "open") return !row.reviewed;
        if (filter === "reviewed") return row.reviewed;
        return true;
      })
      .filter((row) => {
        if (!term) return true;
        return (
          row.contributionId.toLowerCase().includes(term) ||
          (row.locale?.toLowerCase().includes(term) ?? false) ||
          (row.userIdMasked?.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a, b) => {
        const tsA = Date.parse(a.updatedAt ?? a.createdAt ?? "") || 0;
        const tsB = Date.parse(b.updatedAt ?? b.createdAt ?? "") || 0;
        return tsB - tsA;
      });
  }, [items, filter, searchTerm]);

  const toggleReview = async (row: SnapshotRow, reviewed: boolean) => {
    setPendingId(row.contributionId);
    setError(null);
    try {
      const res = await fetch("/api/admin/eventualities/markReviewed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: row.contributionId, reviewed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setItems((prev) =>
        prev.map((entry) =>
          entry.contributionId === row.contributionId ? { ...entry, ...body.snapshot } : entry,
        ),
      );
    } catch (err: any) {
      setError(err?.message ?? "Review-Status konnte nicht aktualisiert werden.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Eventualitäten</p>
        <h1 className="text-2xl font-bold text-slate-900">Eventualitäten-Snapshots</h1>
        <p className="text-sm text-slate-600">
          Übersicht über alle gespeicherten Eventualitäten pro Beitrag. Filtere offene Reviews, prüfe
          DecisionTrees und springe direkt in die Detailansicht.
        </p>
      </header>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm sm:grid-cols-4">
        <SnapshotMetric label="Snapshots" value={summary.total.toString()} accent="text-slate-900" />
        <SnapshotMetric label="Offen" value={summary.open.toString()} accent="text-amber-600" />
        <SnapshotMetric label="Review ok" value={summary.reviewed.toString()} accent="text-emerald-600" />
        <SnapshotMetric
          label="Nodes · Trees"
          value={`${summary.nodes} · ${summary.trees}`}
          accent="text-slate-700"
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm">
          {FILTERS.map((entry) => (
            <button
              key={entry.value}
              onClick={() => setFilter(entry.value)}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                filter === entry.value ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Contribution-ID oder Nutzer:in suchen…"
          className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm sm:max-w-xs"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Contribution</th>
              <th className="px-4 py-3">Locale & Nutzer</th>
              <th className="px-4 py-3">Nodes · Trees</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Aktualisiert</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Lädt Snapshots …
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Keine Snapshots für die aktuellen Filter gefunden.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((row) => (
                <tr key={row.contributionId}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/eventualities/${encodeURIComponent(row.contributionId)}`}
                      className="font-semibold text-slate-900 hover:underline"
                    >
                      {row.contributionId}
                    </Link>
                    <p className="text-xs text-slate-500">
                      Erstellt {formatDate(row.createdAt)} · Update {formatDate(row.updatedAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div className="font-semibold text-slate-800">{row.locale ?? "–"}</div>
                    <div className="text-[11px] text-slate-500">User #{row.userIdMasked ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {row.nodesCount} · {row.treesCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ReviewBadge reviewed={row.reviewed} />
                    {row.reviewedBy && (
                      <p className="text-[11px] text-slate-500">
                        von {row.reviewedBy} · {formatDate(row.reviewedAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{formatDate(row.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-2 text-xs">
                      <button
                        type="button"
                        disabled={pendingId === row.contributionId}
                        onClick={() => toggleReview(row, !row.reviewed)}
                        className={`rounded-full px-3 py-1 font-semibold transition ${
                          row.reviewed
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        } ${pendingId === row.contributionId ? "opacity-50" : ""}`}
                      >
                        {row.reviewed ? "Review zurücksetzen" : "Review erledigt"}
                      </button>
                      <Link
                        href={`/admin/eventualities/${encodeURIComponent(row.contributionId)}`}
                        className="text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function SnapshotMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function ReviewBadge({ reviewed }: { reviewed: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        reviewed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
      }`}
    >
      {reviewed ? "Review OK" : "Offen"}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "–";
  try {
    return new Date(value).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}
