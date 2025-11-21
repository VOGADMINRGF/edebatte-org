"use client";

import { useEffect, useState } from "react";
import type { AccessGroup, RoutePolicy } from "@features/access/types";

type RouteRow = RoutePolicy & { overrides: number };

const ACCESS_GROUP_OPTIONS: AccessGroup[] = [
  "public",
  "citizenBasic",
  "citizenPremium",
  "institutionBasic",
  "institutionPremium",
  "staff",
  "admin",
  "creator",
];

export default function AccessCenterPage() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/access/routes", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || res.statusText);
        if (!ignore) setRoutes(body.routes ?? []);
      } catch (err: any) {
        if (!ignore) setError(err?.message ?? "Konnte Route-Policies nicht laden.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

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

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access Center</p>
        <h1 className="text-2xl font-bold text-slate-900">Seitenzugriffe verwalten</h1>
        <p className="text-sm text-slate-600">
          Definiere, welche Gruppen und Nutzer einzelne Seiten sehen dürfen. Änderungen wirken sofort.
        </p>
      </header>

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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Lädt …
                </td>
              </tr>
            ) : (
              routes.map((route) => (
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
                  <td className="px-4 py-3 text-xs text-slate-500">{route.pathPattern}</td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
