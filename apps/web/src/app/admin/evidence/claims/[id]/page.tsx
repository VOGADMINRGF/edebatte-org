"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function EvidenceClaimDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ claimText: "", topicKey: "", regionCode: "", visibility: "public" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let abort = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/evidence/claims/${params.id}`, { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || res.statusText);
        }
        const body = await res.json();
        if (!abort) {
          setData(body);
          setForm({
            claimText: body.claim.text,
            topicKey: body.claim.topicKey ?? "",
            regionCode: body.claim.regionCode ?? "",
            visibility: body.claim.visibility ?? "public",
          });
        }
      } catch (err: any) {
        if (!abort) setError(err?.message ?? "Fehler beim Laden");
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => {
      abort = true;
    };
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/evidence/claims/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || res.statusText);
      }
      const body = await res.json();
      setData((prev: any) => ({ ...prev, claim: body.claim }));
      alert("Gespeichert");
    } catch (err: any) {
      alert(err?.message ?? "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Lädt Claim …</div>;
  if (error || !data) return <div className="p-6 text-sm text-rose-600">{error ?? "Claim nicht gefunden."}</div>;

  const claim = data.claim;
  const links = data.links ?? [];
  const decisions = data.decisions ?? [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence · Claim</p>
        <h1 className="text-2xl font-bold text-slate-900">{claim.text.slice(0, 200)}</h1>
        <p className="text-sm text-slate-600">
          Region {claim.regionCode ?? "Global"} · Locale {claim.locale} · Source {claim.sourceType}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Claim bearbeiten</h2>
        <label className="text-xs font-medium uppercase text-slate-500">Claim-Text</label>
        <textarea
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          rows={4}
          value={form.claimText}
          onChange={(e) => setForm((prev) => ({ ...prev, claimText: e.target.value }))}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium uppercase text-slate-500">Topic</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.topicKey}
              onChange={(e) => setForm((prev) => ({ ...prev, topicKey: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase text-slate-500">Region</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.regionCode}
              onChange={(e) => setForm((prev) => ({ ...prev, regionCode: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase text-slate-500">Visibility</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.visibility}
              onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
            >
              <option value="public">public</option>
              <option value="internal">internal</option>
              <option value="hidden">hidden</option>
            </select>
          </div>
        </div>
        <button
          className="btn bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={handleSave}
          disabled={saving}
        >
          Speichern
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Links / Evidence</h2>
        {links.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Belege verknüpft.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-700">
            {links.map((link: any) => (
              <li key={link._id} className="rounded border border-slate-100 p-2">
                Relation: {link.relation}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Decisions</h2>
        {decisions.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Entscheidungen erfasst.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-700">
            {decisions.map((decision: any) => (
              <li key={decision._id} className="rounded border border-slate-100 p-2">
                <p className="font-semibold text-slate-900">
                  {Math.round(decision.outcome.yesShare * 100)}% Ja · {Math.round(decision.outcome.noShare * 100)}% Nein
                </p>
                <p className="text-xs text-slate-500">Majority {decision.outcome.majorityKind}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Verknüpfte Quellen</h2>
        {data.evidenceItems?.length ? (
          <ul className="space-y-2 text-sm text-slate-700">
            {data.evidenceItems.map((item: any) => (
              <li key={item._id} className="rounded border border-slate-100 p-2">
                <div className="font-semibold text-slate-900">{item.publisher}</div>
                <p>{item.shortTitle}</p>
                <p className="text-xs text-slate-500">
                  {item.sourceKind} · {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("de-DE") : "—"}
                </p>
                <a href={item.url} target="_blank" rel="noreferrer" className="text-sky-600 underline text-xs">
                  Zur Quelle
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Keine aktiven Quellen verknüpft.</p>
        )}
      </section>
    </div>
  );
}
