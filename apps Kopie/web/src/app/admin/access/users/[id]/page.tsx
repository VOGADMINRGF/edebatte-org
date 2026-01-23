"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { RouteId, UserRouteOverride } from "@features/access/types";
import { DEFAULT_ROUTE_POLICIES } from "@features/access/types";

type AdminUserDetail = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

type OverrideRecord = UserRouteOverride & {
  createdAt?: string;
  updatedAt?: string;
};

const ROUTE_OPTIONS = DEFAULT_ROUTE_POLICIES.map((policy) => ({
  value: policy.routeId,
  label: policy.label,
}));

export default function AccessUserDetailPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [routeId, setRouteId] = useState<RouteId>("reports");
  const [mode, setMode] = useState<UserRouteOverride["mode"]>("allow");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const [userRes, overrideRes] = await Promise.all([
          fetch(`/api/admin/users/detail?id=${params.id}`, { cache: "no-store" }),
          fetch(`/api/admin/access/users/${params.id}/overrides`, { cache: "no-store" }),
        ]);
        const userBody = await userRes.json().catch(() => ({}));
        if (!userRes.ok) throw new Error(userBody?.error || userRes.statusText);
        const overridesBody = await overrideRes.json().catch(() => ({}));
        if (!overrideRes.ok) throw new Error(overridesBody?.error || overrideRes.statusText);
        if (!ignore) {
          setUser(userBody.user);
          setOverrides(overridesBody.overrides ?? []);
        }
      } catch (err: any) {
        if (!ignore) setError(err?.message ?? "Daten konnten nicht geladen werden.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [params.id]);

  async function refreshOverrides() {
    const res = await fetch(`/api/admin/access/users/${params.id}/overrides`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || res.statusText);
    setOverrides(body.overrides ?? []);
  }

  async function submitOverride() {
    try {
      await fetch(`/api/admin/access/users/${params.id}/overrides`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          routeId,
          mode,
          reason: reason || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });
      setReason("");
      setExpiresAt("");
      await refreshOverrides();
    } catch (err: any) {
      setError(err?.message ?? "Override konnte nicht gesetzt werden.");
    }
  }

  async function changeOverride(routeId: RouteId, updated: Partial<UserRouteOverride>) {
    await fetch(`/api/admin/access/users/${params.id}/overrides/${routeId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(updated),
    });
    await refreshOverrides();
  }

  async function removeOverride(routeId: RouteId) {
    await fetch(`/api/admin/access/users/${params.id}/overrides/${routeId}`, { method: "DELETE" });
    await refreshOverrides();
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access Center</p>
        <h1 className="text-2xl font-bold text-slate-900">Override für Nutzer</h1>
        {user && (
          <div className="mt-2 text-sm text-slate-600">
            {user.name} · {user.email ?? "keine E-Mail"} · Rolle: {user.role ?? "user"}
          </div>
        )}
      </header>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Neuen Override hinzufügen</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-500">
            Route
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value as RouteId)}
            >
              {ROUTE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Modus
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as UserRouteOverride["mode"])}
            >
              <option value="allow">allow</option>
              <option value="deny">deny</option>
            </select>
          </label>
        </div>
        <label className="text-xs font-semibold text-slate-500">
          Reason
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Expiry (optional)
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </label>
        <button
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={submitOverride}
        >
          Speichern
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Aktive Overrides</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Lädt …</p>
        ) : overrides.length === 0 ? (
          <p className="text-sm text-slate-500">Keine individuellen Overrides vorhanden.</p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-700">
            {overrides.map((item) => (
              <li key={item.routeId} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.routeId}</p>
                    <p className="text-xs text-slate-500">
                      Mode: {item.mode} · {item.reason ?? "kein Grund"}{" "}
                      {item.expiresAt ? `· bis ${new Date(item.expiresAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      className="rounded-full border border-slate-300 px-3 py-1"
                      onClick={() =>
                        changeOverride(item.routeId, {
                          mode: item.mode === "allow" ? "deny" : "allow",
                          reason: item.reason,
                          expiresAt: item.expiresAt,
                        })
                      }
                    >
                      {item.mode === "allow" ? "zu deny" : "zu allow"}
                    </button>
                    <button
                      className="rounded-full border border-rose-300 px-3 py-1 text-rose-600"
                      onClick={() => removeOverride(item.routeId)}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
