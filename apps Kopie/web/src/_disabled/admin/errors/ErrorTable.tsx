// apps/web/src/app/admin/errors/ErrorTable.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Row = {
  _id: string;
  traceId: string;
  code?: string;
  path?: string;
  status?: number;
  resolved: boolean;
  timestamp: string; // ISO oder parsebare Zeit
};

export default function ErrorTable({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "resolved">("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(initial.length);

  // Offene Requests abbrechen, wenn neue Suche startet
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const buildUrl = (path: string) => {
    // im Client immer relativ → mit Origin ergänzen
    return new URL(path, window.location.origin);
  };

  const fetchPage = useCallback(
    async (p = 1) => {
      // vorherige Anfragen abbrechen
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      try {
        const u = buildUrl("/api/errors/list");
        if (q) u.searchParams.set("q", q);
        if (status !== "all") u.searchParams.set("status", status);
        u.searchParams.set("page", String(p));
        u.searchParams.set("pageSize", String(pageSize));

        const r = await fetch(u, { cache: "no-store", signal: ac.signal });
        if (!r.ok) throw new Error(`List failed: ${r.status}`);
        const j = await r.json();
        setRows(j.items ?? []);
        setTotal(Number(j.total ?? 0));
        setPage(Number(j.page ?? p));
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error(e);
        }
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        setLoading(false);
      }
    },
    [q, status, pageSize],
  );

  // Debounced Suche/Filter
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(
      () => fetchPage(1),
      250,
    ) as unknown as number;
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q, status, fetchPage]);

  const toggleResolved = async (id: string) => {
    const idx = rows.findIndex((r) => r._id === id);
    if (idx < 0) return;

    const prev = rows[idx];
    const nextResolved = !prev.resolved;

    // Optimistisch updaten
    setBusy(id);
    let revertNeeded = false;

    // Wenn Filter aktiv ist, ggf. Zeile direkt entfernen
    const filterWouldHide =
      (status === "open" && nextResolved) ||
      (status === "resolved" && !nextResolved);

    if (filterWouldHide) {
      setRows((cur) => cur.filter((r) => r._id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } else {
      setRows((cur) => {
        const copy = [...cur];
        copy[idx] = { ...prev, resolved: nextResolved };
        return copy;
      });
    }

    try {
      const r = await fetch(buildUrl("/api/errors/resolve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, resolved: nextResolved }),
      });
      if (!r.ok) throw new Error(`Resolve failed: ${r.status}`);

      // Wenn Zeile ausgeblendet wurde und Liste jetzt leer ist, Seite ggf. zurückspringen
      if (filterWouldHide && rows.length === 1 && page > 1) {
        await fetchPage(page - 1);
      }
    } catch (e) {
      console.error(e);
      revertNeeded = true;
    } finally {
      setBusy(null);
      // Revert bei Fehler
      if (revertNeeded) {
        if (filterWouldHide) {
          // Neu laden, um konsistenten Zustand zu bekommen
          fetchPage(page);
        } else {
          setRows((cur) => {
            const copy = [...cur];
            copy[idx] = prev;
            return copy;
          });
        }
      }
    }
  };

  const exportCSV = () => {
    const header = ["Trace-ID", "Code", "Pfad", "Status", "Zuletzt"];
    const lines = rows.map((r) =>
      [
        safe(r.traceId),
        safe(r.code ?? ""),
        safe(r.path ?? ""),
        r.resolved ? "Gelöst" : "Offen",
        new Date(r.timestamp).toISOString(),
      ]
        .map(csvCell)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `errors_p${page}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const info = useMemo(
    () =>
      `${(page - 1) * pageSize + Math.min(1, total)}–${Math.min(page * pageSize, total)} von ${total}`,
    [page, pageSize, total],
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <input
          className="border rounded px-2 py-1 w-64"
          placeholder="Suche trace/code/pfad…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="all">Alle</option>
          <option value="open">Offen</option>
          <option value="resolved">Gelöst</option>
        </select>
        <button
          className="border rounded px-3 py-1"
          onClick={exportCSV}
          disabled={!rows.length}
        >
          CSV Export
        </button>
        <span className="text-sm text-gray-600">
          {loading ? "Lädt…" : info}
        </span>
      </div>

      <table className="table-auto w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-gray-100">
            <th className="py-2 px-4">Trace-ID</th>
            <th>Code</th>
            <th>Pfad</th>
            <th>Status</th>
            <th>Zuletzt</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((err) => (
            <tr key={err._id} className="border-b hover:bg-gray-50">
              <td className="px-4 font-mono text-xs">{err.traceId}</td>
              <td>{err.code ?? "—"}</td>
              <td className="truncate max-w-[320px]" title={err.path ?? ""}>
                {err.path ?? "—"}
              </td>
              <td>
                <span
                  className={`px-2 py-1 rounded ${
                    err.resolved
                      ? "bg-green-200 text-green-900"
                      : "bg-red-200 text-red-900"
                  }`}
                >
                  {err.resolved ? "Gelöst" : "Offen"}
                </span>
              </td>
              <td>{new Date(err.timestamp).toLocaleString()}</td>
              <td>
                <button
                  className="text-blue-600 underline disabled:opacity-50"
                  onClick={() => toggleResolved(err._id)}
                  disabled={busy === err._id}
                >
                  {err.resolved ? "Wieder öffnen" : "Als gelöst markieren"}
                </button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500">
                Keine Einträge
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center gap-2 justify-end">
        <button
          className="border rounded px-2 py-1 disabled:opacity-50"
          onClick={() => fetchPage(Math.max(1, page - 1))}
          disabled={page <= 1 || loading}
        >
          Zurück
        </button>
        <span className="text-sm">
          Seite {page} / {pages}
        </span>
        <button
          className="border rounded px-2 py-1 disabled:opacity-50"
          onClick={() => fetchPage(Math.min(pages, page + 1))}
          disabled={page >= pages || loading}
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

function safe(s: string) {
  return (s || "").replace(/\n/g, " ").slice(0, 2000);
}
function csvCell(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}
