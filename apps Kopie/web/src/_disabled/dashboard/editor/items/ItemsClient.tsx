"use client";

import { useEffect, useState } from "react";
import { fetchWithToken } from "../components/fetchWithToken";

type Item = {
  id: string;
  kind: "SWIPE" | "EVENT" | "SUNDAY_POLL";
  status: "draft" | "review" | "published" | "archived";
  locale: string;
  title: string | null;
  text: string;
  createdAt: string;
  topic?: { id: string; slug: string; title: string } | null;
};

export default function ItemsClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<string>(""); // Filter
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (kind) qs.set("kind", kind);
      const res = await fetchWithToken(`/api/editor/items?${qs.toString()}`);
      const text = await res.text();

      // robust gegen Non‑JSON/Fehler
      let data: unknown = [];
      try {
        data = text ? JSON.parse(text) : [];
      } catch {
        throw new Error("Ungültige Server-Antwort");
      }

      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in (data as any)
            ? (data as any).error
            : `Request failed: ${res.status}`;
        throw new Error(String(msg));
      }

      if (!Array.isArray(data)) {
        throw new Error("Unerwartetes Antwortformat");
      }
      setItems(data as Item[]);
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial + bei Filterwechsel laden
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load();
  }, [kind]);

  const createDraft = async () => {
    try {
      const topicRes = await fetch("/api/topics?take=1"); // irgendein Topic für Draft
      const topics = await topicRes.json();
      const topicId = topics?.[0]?.id;
      if (!topicId) return alert("Bitte zuerst ein Topic anlegen.");

      const res = await fetchWithToken("/api/editor/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "SWIPE",
          topicId,
          text: "Neues Statement – bitte bearbeiten.",
          locale: "de",
          regionMode: "AUTO",
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Fehler ${res.status}`);
      }

      const item = await res.json();
      window.location.href = `/dashboard/editor/items/${item.id}`;
    } catch (e: any) {
      alert(e?.message || "Erstellen fehlgeschlagen");
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Items</h1>
        <div className="flex gap-2">
          <select
            className="border rounded px-2 py-1"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">Alle Arten</option>
            <option value="SWIPE">SWIPE</option>
            <option value="EVENT">EVENT</option>
            <option value="SUNDAY_POLL">SUNDAY_POLL</option>
          </select>
          <button onClick={createDraft} className="border rounded px-3 py-2">
            + Draft
          </button>
          <button onClick={load} className="border rounded px-3 py-2">
            Refresh
          </button>
        </div>
      </div>

      {loading && <p>Lade…</p>}
      {error && (
        <div className="text-red-600 mb-4">
          Fehler: {error} ·{" "}
          <a href="/dashboard/editor/login" className="underline">
            Editor‑Token setzen
          </a>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Kind</th>
                <th className="py-2">Status</th>
                <th className="py-2">Text</th>
                <th className="py-2">Topic</th>
                <th className="py-2">Bearbeiten</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="py-3" colSpan={5}>
                    Keine Items gefunden.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-b">
                    <td className="py-2">{it.kind}</td>
                    <td className="py-2">{it.status}</td>
                    <td className="py-2 max-w-[520px] truncate">{it.text}</td>
                    <td className="py-2">{it.topic?.title ?? "-"}</td>
                    <td className="py-2">
                      <a
                        className="underline"
                        href={`/dashboard/editor/items/${it.id}`}
                      >
                        Öffnen
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
