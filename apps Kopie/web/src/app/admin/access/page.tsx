"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AccessGroup, RoutePolicy } from "@features/access/types";
import type { AccessTier } from "@features/pricing/types";
import { ACCESS_TIER_CONFIG } from "@core/access/accessTiers";

type RouteRow = RoutePolicy & { overrides: number };

type InventoryItem = {
  path: string;
  file: string;
  kind: "page" | "api";
};

const ACCESS_GROUP_OPTIONS: AccessGroup[] = [
  ...(Object.keys(ACCESS_TIER_CONFIG) as AccessTier[]),
  "admin",
  "creator",
];

export default function AccessCenterPage() {
  const searchParams = useSearchParams();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setInventoryLoading(true);
      try {
        const [routesRes, inventoryRes] = await Promise.all([
          fetch("/api/admin/access/routes", { cache: "no-store" }),
          fetch("/api/admin/access/routes/inventory", { cache: "no-store" }),
        ]);

        const routesBody = await routesRes.json().catch(() => ({}));
        if (!routesRes.ok) throw new Error(routesBody?.error || routesRes.statusText);
        if (!ignore) setRoutes(routesBody.routes ?? []);

        const inventoryBody = await inventoryRes.json().catch(() => ({}));
        if (!inventoryRes.ok) throw new Error(inventoryBody?.error || inventoryRes.statusText);
        if (!ignore) setInventory(inventoryBody.items ?? []);
      } catch (err: any) {
        if (!ignore) {
          const message = err?.message ?? "Konnte Route-Policies nicht laden.";
          setError(message);
          setInventoryError(message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setInventoryLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam) {
      setQuery(qParam);
    }
  }, [searchParams]);

  const filteredRoutes = useMemo(() => {
    const base = [...routes].sort((a, b) => a.label.localeCompare(b.label));
    const normalized = query.trim().toLowerCase();
    if (!normalized) return base;
    const terms = normalized.split(/\s+/).filter(Boolean);

    return base.filter((route) => {
      const haystack = [
        route.label,
        route.routeId,
        route.pathPattern,
        route.defaultGroups.join(" "),
        route.allowAnonymous ? "öffentlich" : "privat",
        String(route.overrides ?? 0),
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [routes, query]);

  const unmanagedRoutes = useMemo(() => {
    if (!inventory.length) return [];
    return inventory
      .filter((item) => item.kind === "page")
      .filter((item) => !routes.some((route) => matchesPolicy(route, item.path)));
  }, [inventory, routes]);

  const filteredUnmanaged = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return unmanagedRoutes;
    const terms = normalized.split(/\s+/).filter(Boolean);
    return unmanagedRoutes.filter((item) => {
      const haystack = [item.path, item.file].join(" ").toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [unmanagedRoutes, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredRoutes.length / pageSize));
  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);
  const pageRoutes = filteredRoutes.slice((page - 1) * pageSize, page * pageSize);

  const updatePolicy = async (routeId: string, patch: Partial<RoutePolicy>) => {
    const res = await fetch(`/api/admin/access/routes/${routeId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || res.statusText);
    setRoutes((prev) =>
      prev.map((route) => (route.routeId === routeId ? { ...route, ...body.policy } : route)),
    );
  };

  const resetPolicy = async (routeId: string) => {
    const res = await fetch(`/api/admin/access/routes/${routeId}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || res.statusText);
    const refreshed = await fetch("/api/admin/access/routes", { cache: "no-store" });
    const data = await refreshed.json().catch(() => ({}));
    setRoutes(data.routes ?? []);
  };

  const createPolicy = async (item: InventoryItem) => {
    const res = await fetch("/api/admin/access/routes/custom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pathPattern: item.path,
        label: item.path,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || res.statusText);
    const refreshed = await fetch("/api/admin/access/routes", { cache: "no-store" });
    const data = await refreshed.json().catch(() => ({}));
    setRoutes(data.routes ?? []);
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access Center</p>
          <h1 className="text-2xl font-bold text-slate-900">Seitenzugriffe verwalten</h1>
          <p className="text-sm text-slate-600">
            Definiere, welche Gruppen und Nutzer einzelne Seiten sehen dürfen. Änderungen wirken sofort.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 text-slate-400"
          >
            <path
              d="m14.5 14.5 3 3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="9" cy="9" r="5.6" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <input
            aria-label="Routen durchsuchen"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen (Route, Pfad, Gruppe, Status)"
            className="w-64 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </header>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{filteredRoutes.length} Seitenregeln</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 disabled:opacity-50"
            >
              Zurück
            </button>
            <span>
              Seite {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 disabled:opacity-50"
            >
              Weiter
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Pfad</th>
              <th className="px-4 py-3">Gruppen</th>
              <th className="px-4 py-3">Anonym</th>
              <th className="px-4 py-3">Overrides</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Lädt …
                </td>
              </tr>
            ) : filteredRoutes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Keine Treffer für „{query}“.
                </td>
              </tr>
            ) : (
              pageRoutes.map((route) => (
                <tr key={route.routeId}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{route.label}</div>
                    <div className="text-xs text-slate-500">{route.routeId}</div>
                    {route.locked && (
                      <span className="mt-1 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
                        locked
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>{route.pathPattern}</span>
                      <a
                        className="text-[11px] font-semibold text-sky-700 underline-offset-2 hover:underline"
                        href={route.pathPattern.replace(/:.*$/, "") || "/"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        öffnen
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {ACCESS_GROUP_OPTIONS.map((group) => (
                        <label key={group} className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            disabled={route.locked}
                            checked={route.defaultGroups.includes(group)}
                            onChange={async () => {
                              try {
                                const nextGroups = route.defaultGroups.includes(group)
                                  ? route.defaultGroups.filter((g) => g !== group)
                                  : [...route.defaultGroups, group];
                                await updatePolicy(route.routeId, {
                                  defaultGroups: nextGroups,
                                  allowAnonymous: route.allowAnonymous,
                                });
                              } catch (err: any) {
                                setError(err?.message ?? "Aktualisierung fehlgeschlagen");
                              }
                            }}
                          />
                          {group}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        disabled={route.locked}
                        checked={route.allowAnonymous}
                        onChange={async () => {
                          try {
                            await updatePolicy(route.routeId, {
                              defaultGroups: route.defaultGroups,
                              allowAnonymous: !route.allowAnonymous,
                            });
                          } catch (err: any) {
                            setError(err?.message ?? "Aktualisierung fehlgeschlagen");
                          }
                        }}
                      />
                      öffentlich
                    </label>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {route.overrides}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!route.locked && (
                      <button
                        type="button"
                        disabled={!route.routeId.startsWith("custom:") && route.overrides === 0}
                        onClick={async () => {
                          if (!route.routeId.startsWith("custom:") && route.overrides === 0) return;
                          const label = route.routeId.startsWith("custom:")
                            ? "Custom-Policy entfernen?"
                            : "Overrides zuruecksetzen?";
                          if (!window.confirm(label)) return;
                          try {
                            await resetPolicy(route.routeId);
                          } catch (err: any) {
                            setError(err?.message ?? "Aktion fehlgeschlagen");
                          }
                        }}
                        className="text-xs font-semibold text-slate-600 underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        {route.routeId.startsWith("custom:") ? "Entfernen" : "Zuruecksetzen"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Unverwaltete Seiten
            </p>
            <h2 className="text-sm font-semibold text-slate-900">Route-Index</h2>
            <p className="text-xs text-slate-500">
              Seiten, die noch keine Access-Policy besitzen. Hinzufuegen erzeugt eine Custom-Policy.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {inventoryLoading ? "laedt" : `${filteredUnmanaged.length} Eintraege`}
          </span>
        </div>

        {inventoryError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {inventoryError}
          </div>
        )}

        <div className="mt-3 space-y-2">
          {filteredUnmanaged.length === 0 && !inventoryLoading && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Keine weiteren Seiten gefunden.
            </div>
          )}
          {filteredUnmanaged.map((item) => (
            <div
              key={item.path}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-semibold text-slate-900">{item.path}</div>
                <div className="text-[11px] text-slate-500">{item.file}</div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={item.path}
                  className="text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  oeffnen
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await createPolicy(item);
                    } catch (err: any) {
                      setError(err?.message ?? "Policy konnte nicht angelegt werden");
                    }
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-sky-200 hover:text-sky-700"
                >
                  Hinzufuegen
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function matchesPolicy(policy: RoutePolicy, pathname: string): boolean {
  const regex = new RegExp(pathPatternToRegex(policy.pathPattern, policy.matchMode));
  return regex.test(pathname);
}

function pathPatternToRegex(pattern: string, mode: RoutePolicy["matchMode"] = "prefix"): string {
  let safePattern = pattern;
  if (!safePattern.startsWith("/")) {
    safePattern = `/${safePattern}`;
  }
  const segments = safePattern.split("/").filter((seg, index) => !(index === 0 && seg.length === 0));
  const regexParts = segments.map((segment) => {
    if (!segment) return "";
    if (segment.startsWith(":")) {
      return "[^/]+";
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  const pathBody = regexParts.filter(Boolean).join("/");
  const base = pathBody.length ? `/${pathBody}` : "/";
  const suffix =
    mode === "exact"
      ? base === "/"
        ? ""
        : "/?"
      : "(?:/.*)?";
  return `^${base}${suffix}$`;
}
