"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type NewsletterEntry = {
  email: string;
  name?: string | null;
  createdAt?: string | null;
  confirmedAt?: string | null;
  locale?: string | null;
  audienceTier?: string | null;
  frequency?: string | null;
};

export default function AdminNewsletterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<NewsletterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
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
    if (qParam) setQuery(qParam);
  }, [searchParams]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.email} ${item.name ?? ""} ${item.audienceTier ?? ""} ${item.locale ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, query]);

  const downloadCsv = () => {
    const rows = [
      ["email", "name", "createdAt", "confirmedAt", "locale", "audienceTier", "frequency"],
      ...items.map((item) => [
        item.email,
        item.name ?? "",
        item.createdAt ?? "",
        item.confirmedAt ?? "",
        item.locale ?? "",
        item.audienceTier ?? "",
        item.frequency ?? "",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
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
      <h1 className="sr-only">Admin Newsletter</h1>
      {accessError && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {accessError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Newsletter</p>
          <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Aktiv bestätigte Abonnenten</h2>
          <p className="text-sm text-[rgb(var(--muted))]">{loading ? "Lade ..." : `${items.length} Einträge`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Suche"
            className="w-56 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm focus:border-sky-300 focus:outline-none"
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

      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Consent-sicherer Übergang</p>
        <p className="mt-1">
          Diese Ansicht liest nur die kanonisch bestätigten Updates-Abonnements. Manuelles Aktivieren oder Entfernen über den alten Legacy-Schreibweg ist während N2 bewusst deaktiviert. Neue Aktivierungen müssen per Double-Opt-in erfolgen; Abmeldung und Profilpräferenzen werden im nächsten N-Slice an denselben kanonischen Datensatz angeschlossen.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl bg-[rgb(var(--card))] shadow ring-1 ring-[rgb(var(--border))]">
        <table className="min-w-full divide-y divide-[rgb(var(--border))] text-sm">
          <thead className="bg-[rgb(var(--bg))]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-[rgb(var(--muted))]">E-Mail</th>
              <th className="px-3 py-2 text-left font-semibold text-[rgb(var(--muted))]">Name</th>
              <th className="px-3 py-2 text-left font-semibold text-[rgb(var(--muted))]">Bestätigt</th>
              <th className="px-3 py-2 text-left font-semibold text-[rgb(var(--muted))]">Segment</th>
              <th className="px-3 py-2 text-left font-semibold text-[rgb(var(--muted))]">Rhythmus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-[rgb(var(--muted))]">
                  Lädt …
                </td>
              </tr>
            )}
            {!loading &&
              filteredItems.map((item) => (
                <tr key={item.email} className="hover:bg-[rgb(var(--bg))]">
                  <td className="px-3 py-2">{item.email}</td>
                  <td className="px-3 py-2">{item.name ?? "—"}</td>
                  <td className="px-3 py-2 text-[rgb(var(--muted))]">
                    {item.confirmedAt?.slice(0, 10) ?? item.createdAt?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="px-3 py-2">{item.audienceTier ?? "public"}</td>
                  <td className="px-3 py-2">{item.frequency ?? "weekly"}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && filteredItems.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-[rgb(var(--muted))]">Keine Treffer.</p>
        )}
      </div>
    </div>
  );
}
