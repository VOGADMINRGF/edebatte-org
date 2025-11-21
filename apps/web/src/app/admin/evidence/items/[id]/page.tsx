"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function EvidenceItemDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ shortTitle: "", shortSummary: "", quoteSnippet: "", licenseHint: "unknown", isActive: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/evidence/items/${params.id}`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || res.statusText);
        if (!ignore) {
          setData(body.item);
          setForm({
            shortTitle: body.item.shortTitle ?? "",
            shortSummary: body.item.shortSummary ?? "",
            quoteSnippet: body.item.quoteSnippet ?? "",
            licenseHint: body.item.licenseHint ?? "unknown",
            isActive: body.item.isActive !== false,
          });
        }
      } catch (err: any) {
        if (!ignore) setError(err?.message ?? "Fehler beim Laden");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/evidence/items/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setData(body.item);
      alert("Gespeichert");
    } catch (err: any) {
      alert(err?.message ?? "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Lädt Quelle …</div>;
  if (error || !data) return <div className="p-6 text-sm text-rose-600">{error ?? "Quelle nicht gefunden."}</div>;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Evidence Item</p>
        <h1 className="text-2xl font-bold text-slate-900">{data.shortTitle}</h1>
        <p className="text-sm text-slate-600">
          {data.publisher} · {data.sourceKind} ·{" "}
          {data.publishedAt ? new Date(data.publishedAt).toLocaleDateString("de-DE") : "Datum unbekannt"}
        </p>
        <a href={data.url} target="_blank" rel="noreferrer" className="text-sky-600 underline text-sm">
          Originalquelle öffnen
        </a>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Metadaten</h2>
        <dl className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Publisher</dt>
            <dd>{data.publisher}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Locale / Region</dt>
            <dd>
              {data.locale ?? "–"} / {data.regionCode ?? "–"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Status</dt>
            <dd>{form.isActive ? "aktiv" : "deaktiviert"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Verknüpfte Claims</dt>
            <dd>{data.linkedClaims ?? 0}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Bearbeiten</h2>
        <label className="text-xs font-medium uppercase text-slate-500">Kurztitel</label>
        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.shortTitle}
          onChange={(e) => setForm((prev) => ({ ...prev, shortTitle: e.target.value }))}
        />
        <label className="text-xs font-medium uppercase text-slate-500">Kurzfassung</label>
        <textarea
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          rows={4}
          value={form.shortSummary}
          onChange={(e) => setForm((prev) => ({ ...prev, shortSummary: e.target.value }))}
        />
        <label className="text-xs font-medium uppercase text-slate-500">Snippet</label>
        <textarea
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          rows={2}
          value={form.quoteSnippet}
          onChange={(e) => setForm((prev) => ({ ...prev, quoteSnippet: e.target.value }))}
        />
        <label className="text-xs font-medium uppercase text-slate-500">Lizenzhinweis</label>
        <select
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.licenseHint}
          onChange={(e) => setForm((prev) => ({ ...prev, licenseHint: e.target.value }))}
        >
          <option value="unknown">unbekannt</option>
          <option value="cc_by">CC BY</option>
          <option value="cc_by_sa">CC BY-SA</option>
          <option value="public_domain">Public Domain</option>
          <option value="paywalled">Paywall</option>
          <option value="restricted">Restricted</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          Quelle öffentlich sichtbar
        </label>
        <button
          className="btn bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={handleSave}
          disabled={saving}
        >
          Speichern
        </button>
      </section>
    </div>
  );
}
