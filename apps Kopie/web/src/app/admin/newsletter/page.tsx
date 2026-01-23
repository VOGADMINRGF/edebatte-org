"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type NewsletterEntry = {
  email: string;
  name?: string | null;
  createdAt?: string | null;
};

export default function AdminNewsletterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<NewsletterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setAccessError(null);
      const res = await fetch("/api/admin/dashboard/newsletter/export", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/admin/newsletter");
        return;
      }
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === "two_factor_required") {
          router.replace("/login?next=/admin/newsletter");
          return;
        }
        if (active) setAccessError("Kein Zugriff auf die Newsletter-Verwaltung.");
        setLoading(false);
        return;
      }
      const body = (await res.json()) as { items: NewsletterEntry[] };
      if (active) {
        setItems(body.items || []);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam) {
      setQuery(qParam);
    }
  }, [searchParams]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.email} ${i.name ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  const refreshList = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/dashboard/newsletter/export", { cache: "no-store" });
    const body = (await res.json()) as { items: NewsletterEntry[] };
    setItems(body.items || []);
    setLoading(false);
  };

  const upsertEntry = async (email: string, name?: string | null, subscribe = true) => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/dashboard/newsletter/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, subscribe }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Aktion fehlgeschlagen");
    } else {
      await refreshList();
    }
    setSaving(false);
  };

  const downloadCsv = () => {
    const rows = [["email", "name", "createdAt"], ...items.map((i) => [i.email, i.name ?? "", i.createdAt ?? ""])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "newsletter.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {accessError && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {accessError}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Newsletter</p>
          <h2 className="text-lg font-semibold text-slate-900">Abonnenten</h2>
          <p className="text-sm text-slate-600">{loading ? "Lade ..." : `${items.length} Einträge`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche (E-Mail / Name)"
            className="w-56 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] hover:brightness-105"
            disabled={loading}
          >
            CSV exportieren
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <p className="text-sm font-semibold text-slate-900">Abonnent hinzufügen</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="E-Mail"
            className="w-56 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (optional)"
            className="w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none"
          />
          <button
            type="button"
            disabled={saving || !newEmail.trim()}
            onClick={async () => {
              await upsertEntry(newEmail, newName || null, true);
              setNewEmail("");
              setNewName("");
            }}
            className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] hover:brightness-105 disabled:opacity-60"
          >
            {saving ? "Speichern …" : "Hinzufügen"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>

      <div className="overflow-hidden rounded-3xl bg-white/90 shadow ring-1 ring-slate-100">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">E-Mail</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Name</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Erstellt</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                  Lädt …
                </td>
              </tr>
            )}
            {!loading &&
              filteredItems.map((i) => (
                <tr key={i.email} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{i.email}</td>
                  <td className="px-3 py-2">{i.name ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{i.createdAt?.slice(0, 10) ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-sm font-semibold text-rose-600 underline-offset-2 hover:underline"
                      disabled={saving}
                      onClick={() => upsertEntry(i.email, i.name ?? null, false)}
                    >
                      Entfernen
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && filteredItems.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-slate-500">Keine Treffer.</p>
        )}
      </div>
    </div>
  );
}
