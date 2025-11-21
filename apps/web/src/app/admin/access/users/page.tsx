"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminUser = {
  _id: string;
  email?: string;
  name?: string;
  role?: string;
};

export default function AccessUsersPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!query.trim()) {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users/list?q=${encodeURIComponent(query.trim())}&limit=25`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || res.statusText);
        if (!ignore) setUsers(body.items ?? []);
      } catch (err: any) {
        if (!ignore) setError(err?.message ?? "Suche fehlgeschlagen");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    const tid = setTimeout(load, 400);
    return () => {
      ignore = true;
      clearTimeout(tid);
    };
  }, [query]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access Center</p>
        <h1 className="text-2xl font-bold text-slate-900">User Overrides</h1>
        <p className="text-sm text-slate-600">Suche eine Person und passe individuelle Route-Rechte an.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Name oder E-Mail suchen"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <div className="space-y-2">
        {loading && query && <p className="text-sm text-slate-500">Suche …</p>}
        {!loading &&
          users.map((user) => (
            <Link
              key={user._id}
              href={`/admin/access/users/${user._id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-semibold text-slate-900">{user.name ?? "N/A"}</p>
                <p className="text-xs text-slate-500">{user.email ?? "ohne E-Mail"}</p>
              </div>
              <span className="text-xs uppercase text-slate-500">{user.role ?? "user"}</span>
            </Link>
          ))}
      </div>
    </main>
  );
}
