"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EDEBATTE_PACKAGES_WITH_NONE } from "@/config/edebatte";
import { ACCESS_TIER_CONFIG } from "@core/access/accessTiers";
import type { AccessTier } from "@features/pricing/types";

const ACCESS_TIER_OPTIONS = Object.keys(ACCESS_TIER_CONFIG) as AccessTier[];

type AdminUser = {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
  packageCode?: string | null;
  membershipStatus?: string | null;
  newsletterOptIn: boolean;
  accessTier?: AccessTier | null;
  planCode?: string | null;
  createdAt?: string;
  lastSeenAt?: string;
};

type UsersResponse = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [pkg, setPkg] = useState("");
  const [newsletter, setNewsletter] = useState("");
  const [activeDays, setActiveDays] = useState<number | "">("");
  const [createdDays, setCreatedDays] = useState<number | "">("");
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    password: "",
    roles: ["user"],
    accessTier: "citizenBasic" as AccessTier,
    newsletterOptIn: false,
    sendVerification: true,
    sendPasswordLink: true,
  });

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  useEffect(() => {
    // initial filter from URL
    const roleParam = searchParams.get("role") ?? "";
    const pkgParam = searchParams.get("package") ?? "";
    const newsletterParam = searchParams.get("newsletter") ?? "";
    const activeDaysParam = searchParams.get("activeDays");
    const createdDaysParam = searchParams.get("createdDays");
    const qParam = searchParams.get("q") ?? "";
    if (roleParam) setRole(roleParam);
    if (pkgParam) setPkg(pkgParam);
    if (newsletterParam) setNewsletter(newsletterParam);
    if (qParam) setQuery(qParam);
    if (activeDaysParam) setActiveDays(Number(activeDaysParam) || "");
    if (createdDaysParam) setCreatedDays(Number(createdDaysParam) || "");
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    async function loadMe() {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        router.replace("/login?next=/admin/users");
        return;
      }
      const body = await res.json().catch(() => ({}));
      const roles: string[] = Array.isArray(body?.user?.roles) ? body.user.roles : [];
      if (alive) setIsSuperadmin(roles.includes("superadmin"));
    }
    loadMe();
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setAccessError(null);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (role) params.set("role", role);
      if (pkg) params.set("package", pkg);
      if (newsletter) params.set("newsletter", newsletter);
      if (activeDays) params.set("activeDays", String(activeDays));
      if (createdDays) params.set("createdDays", String(createdDays));
      params.set("page", String(page));
      params.set("pageSize", "25");
      const res = await fetch(`/api/admin/dashboard/users?${params.toString()}`, { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/admin/users");
        return;
      }
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === "two_factor_required") {
          router.replace("/login?next=/admin/users");
          return;
        }
        if (active) setAccessError("Kein Zugriff auf die Admin-Userliste.");
        setLoading(false);
        return;
      }
      const body = (await res.json()) as UsersResponse;
      if (active) {
        setData(body);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [query, role, pkg, newsletter, activeDays, createdDays, page, router, refreshToken]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch("/api/admin/dashboard/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selected.id,
        roles: selected.roles,
        packageCode: selected.packageCode,
        membershipStatus: selected.membershipStatus,
        newsletterOptIn: selected.newsletterOptIn,
        planCode: selected.accessTier,
        accessTier: selected.accessTier,
      }),
    });
    setSaving(false);
    setSelected(null);
    setPage(1);
    setRefreshToken((prev) => prev + 1);
  };

  const handleCreateUser = async () => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/dashboard/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "create_failed");
      }
      setCreateOpen(false);
      setCreateForm({
        email: "",
        name: "",
        password: "",
        roles: ["user"],
        accessTier: "citizenBasic",
        newsletterOptIn: false,
        sendVerification: true,
        sendPasswordLink: true,
      });
      setRefreshToken((prev) => prev + 1);
    } catch (err: any) {
      setCreateError(err?.message ?? "create_failed");
    } finally {
      setCreateLoading(false);
    }
  };

  if (accessError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {accessError}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche (E-Mail / Name)"
          className="w-48 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:border-sky-300 focus:outline-none"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Rolle: alle</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="superadmin">superadmin</option>
          <option value="moderator">moderator</option>
        </select>
        <select
          value={pkg}
          onChange={(e) => setPkg(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Paket: alle</option>
          {EDEBATTE_PACKAGES_WITH_NONE.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={newsletter}
          onChange={(e) => setNewsletter(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Newsletter: alle</option>
          <option value="true">nur Opt-in</option>
          <option value="false">kein Opt-in</option>
        </select>
        <input
          type="number"
          min={1}
          value={activeDays}
          onChange={(e) => setActiveDays(e.target.value ? Number(e.target.value) : "")}
          placeholder="Aktiv in letzten Tagen"
          className="w-44 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm"
        />
        <input
          type="number"
          min={1}
          value={createdDays}
          onChange={(e) => setCreatedDays(e.target.value ? Number(e.target.value) : "")}
          placeholder="Neu in letzten Tagen"
          className="w-44 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
        >
          + Nutzer anlegen
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white/90 shadow ring-1 ring-slate-100">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">E-Mail</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Name</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Rollen</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Tier</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Paket</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Newsletter</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Erstellt</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-slate-500">
                  Lädt …
                </td>
              </tr>
            )}
            {!loading &&
              data?.items?.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {u.accessTier ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{u.packageCode ?? "none"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: u.newsletterOptIn ? "#ecfdf3" : "#f8fafc", color: u.newsletterOptIn ? "#15803d" : "#475569" }}>
                      {u.newsletterOptIn ? "Opt-in" : "Kein Opt-in"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{u.createdAt?.slice(0, 10) ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline"
                      onClick={() => setSelected(u)}
                    >
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Seite {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
          >
            Zurück
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50"
          >
            Weiter
          </button>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-[0_32px_90px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Bearbeiten</p>
                <p className="text-sm font-semibold text-slate-900">{selected.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Rollen</label>
              <div className="flex flex-wrap gap-2">
                {["user", "moderator", "admin", "staff", "creator", ...(isSuperadmin ? ["superadmin"] : [])].map((r) => {
                  const active = selected.roles.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setSelected((prev) =>
                          prev
                            ? {
                                ...prev,
                                roles: active ? prev.roles.filter((x) => x !== r) : [...prev.roles, r],
                              }
                            : prev,
                        );
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        active ? "bg-sky-100 text-sky-800 ring-1 ring-sky-200" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Access Tier</label>
              <select
                value={selected.accessTier ?? "citizenBasic"}
                onChange={(e) =>
                  setSelected((prev) =>
                    prev
                      ? {
                          ...prev,
                          accessTier: e.target.value as AccessTier,
                        }
                      : prev,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                {ACCESS_TIER_OPTIONS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Paket</label>
              <select
                value={selected.packageCode ?? "none"}
                onChange={(e) =>
                  setSelected((prev) => (prev ? { ...prev, packageCode: e.target.value === "none" ? null : e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                {EDEBATTE_PACKAGES_WITH_NONE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Newsletter</label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selected.newsletterOptIn}
                  onChange={(e) => setSelected((prev) => (prev ? { ...prev, newsletterOptIn: e.target.checked } : prev))}
                />
                Opt-in aktiv
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] hover:brightness-105 disabled:opacity-60"
              >
                {saving ? "Speichern …" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-[0_32px_90px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Neuer Nutzer</p>
                <p className="text-sm font-semibold text-slate-900">Account anlegen</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">E-Mail</label>
              <input
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                placeholder="user@example.org"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Name</label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                placeholder="Vor- und Nachname"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Initiales Passwort</label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  placeholder={createForm.sendPasswordLink ? "wird automatisch erzeugt" : "min. 12 Zeichen, Zahl & Sonderzeichen"}
                  disabled={createForm.sendPasswordLink}
                />
                <button
                  type="button"
                  onClick={() => setCreateForm((prev) => ({ ...prev, password: generatePassword() }))}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  disabled={createForm.sendPasswordLink}
                >
                  Generieren
                </button>
              </div>
              {createForm.sendPasswordLink && (
                <p className="text-[11px] text-slate-500">
                  Passwort wird per Link gesetzt; ein Platzhalter wird serverseitig erzeugt.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Rollen</label>
              <div className="flex flex-wrap gap-2">
                {["user", "moderator", "admin", "staff", "creator", ...(isSuperadmin ? ["superadmin"] : [])].map(
                  (r) => {
                    const active = createForm.roles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setCreateForm((prev) => ({
                            ...prev,
                            roles: active ? prev.roles.filter((x) => x !== r) : [...prev.roles, r],
                          }));
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          active ? "bg-sky-100 text-sky-800 ring-1 ring-sky-200" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Access Tier</label>
              <select
                value={createForm.accessTier}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, accessTier: e.target.value as AccessTier }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                {ACCESS_TIER_OPTIONS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Newsletter</label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.newsletterOptIn}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, newsletterOptIn: e.target.checked }))}
                />
                Opt-in aktiv
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">E-Mail Verifikation</label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.sendVerification}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, sendVerification: e.target.checked }))}
                />
                Verifikations-E-Mail senden
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Passwort setzen</label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.sendPasswordLink}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      sendPasswordLink: e.target.checked,
                      password: e.target.checked ? "" : prev.password,
                    }))
                  }
                />
                Setz-Link per E-Mail senden (empfohlen)
              </label>
            </div>

            {createError && <p className="text-sm text-rose-600">{createError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleCreateUser}
                disabled={createLoading}
                className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] hover:brightness-105 disabled:opacity-60"
              >
                {createLoading ? "Anlegen …" : "Nutzer anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function generatePassword(length = 16) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%_-+=*";
  const all = `${letters}${digits}${symbols}`;
  const bytes = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * all.length);
    }
  }
  const core = Array.from(bytes, (b) => all[b % all.length]).join("");
  return `${core.slice(0, length - 3)}${digits[0]}${symbols[0]}${letters[0]}`;
}
