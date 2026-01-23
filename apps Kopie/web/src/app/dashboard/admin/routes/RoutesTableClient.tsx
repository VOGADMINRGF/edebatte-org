// apps/web/src/app/dashboard/admin/routes/RoutesTableClient.tsx
"use client";

import * as React from "react";

type RouteAccess = "public" | "auth" | "admin" | "system";

type RouteRow = {
  route: string;
  file: string;
  depth: number;
  access: RouteAccess;
  comment: string;
  isOverride: boolean;
  outgoing: string[];
  incoming: string[];
  outgoingCount: number;
  incomingCount: number;
};

type Props = {
  initialRows: RouteRow[];
  appRoot: string; // nur für Info im UI
};

function badgeClasses(access: RouteAccess): string {
  switch (access) {
    case "admin":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    case "auth":
      return "bg-amber-50 text-amber-800 border border-amber-100";
    case "system":
      return "bg-slate-900 text-slate-50 border border-slate-700";
    case "public":
    default:
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
  }
}

export default function RoutesTableClient({ initialRows }: Props) {
  const [rows, setRows] = React.useState<RouteRow[]>(initialRows);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [expandedRoute, setExpandedRoute] = React.useState<string | null>(null);

  const updateAccess = (route: string, access: RouteAccess) => {
    setRows((list) =>
      list.map((r) =>
        r.route === route ? { ...r, access, isOverride: true } : r,
      ),
    );
  };

  const updateComment = (route: string, comment: string) => {
    setRows((list) =>
      list.map((r) =>
        r.route === route ? { ...r, comment, isOverride: true } : r,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const resp = await fetch("/api/admin/route-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routes: rows.map((r) => ({
            route: r.route,
            access: r.access,
            comment: r.comment,
          })),
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || "Speichern fehlgeschlagen");
      }
      setStatus("Gespeichert.");
    } catch (e: any) {
      setStatus(e?.message || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: RouteRow) => {
    const ok = window.confirm(
      `Seite wirklich löschen?\n\nRoute: ${row.route}\nDatei: ${row.file}`,
    );
    if (!ok) return;

    setStatus(null);

    try {
      const resp = await fetch("/api/admin/routes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: row.file, route: row.route }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || "Löschen fehlgeschlagen");
      }

      setRows((list) => list.filter((r) => r.route !== row.route));
      if (expandedRoute === row.route) setExpandedRoute(null);
      setStatus("Seite gelöscht.");
    } catch (e: any) {
      setStatus(e?.message || "Fehler beim Löschen.");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-600">
          Access, Kommentare und Link-Infos pro Route. Änderungen werden in{" "}
          <code>config/routeAccess.json</code> gespeichert. Löschen entfernt die
          jeweilige <code>page.tsx</code>.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {saving ? "Speichere …" : "Änderungen speichern"}
        </button>
      </div>

      {status && (
        <p className="mt-2 text-xs text-slate-700" aria-live="polite">
          {status}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 font-semibold text-slate-700">Route</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Access</th>
              <th className="px-3 py-2 font-semibold text-slate-700">
                Kommentar
              </th>
              <th className="px-3 py-2 font-semibold text-slate-700">
                Links (→ / ←)
              </th>
              <th className="px-3 py-2 font-semibold text-slate-700">Datei</th>
              <th className="px-3 py-2 font-semibold text-slate-700">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <React.Fragment key={r.file}>
                <tr className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 font-mono text-xs text-slate-900">
                    {r.route}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={r.access}
                        onChange={(e) =>
                          updateAccess(r.route, e.target.value as RouteAccess)
                        }
                        className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      >
                        <option value="public">public</option>
                        <option value="auth">auth</option>
                        <option value="admin">admin</option>
                        <option value="system">system</option>
                      </select>
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                          badgeClasses(r.access)
                        }
                      >
                        {r.isOverride ? "Override" : "Inferiert"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={r.comment}
                      onChange={(e) =>
                        updateComment(r.route, e.target.value)
                      }
                      placeholder="Kommentar / Notizen"
                      className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span>
                        → {r.outgoingCount} / ← {r.incomingCount}
                      </span>
                      {(r.outgoingCount > 0 || r.incomingCount > 0) && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRoute(
                              expandedRoute === r.route ? null : r.route,
                            )
                          }
                          className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700 hover:border-sky-400"
                        >
                          Details
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                    {r.file}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={r.route}
                        className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700 hover:border-sky-400"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Öffnen
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700 hover:border-rose-400"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>

                {expandedRoute === r.route && (
                  <tr className="border-t border-slate-100 bg-slate-50/60">
                    <td
                      colSpan={6}
                      className="px-4 py-3 text-xs text-slate-700"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-1 font-semibold text-slate-800">
                            Verlinkt nach (Outgoing)
                          </p>
                          {r.outgoing.length === 0 ? (
                            <p className="text-slate-500">Keine internen Links.</p>
                          ) : (
                            <ul className="space-y-1">
                              {r.outgoing.map((t) => (
                                <li key={t} className="flex items-center gap-2">
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  <code className="text-[11px]">{t}</code>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 font-semibold text-slate-800">
                            Verlinkt von (Incoming)
                          </p>
                          {r.incoming.length === 0 ? (
                            <p className="text-slate-500">
                              Keine gefundenen Quell-Routen.
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {r.incoming.map((t) => (
                                <li key={t} className="flex items-center gap-2">
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  <code className="text-[11px]">{t}</code>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
