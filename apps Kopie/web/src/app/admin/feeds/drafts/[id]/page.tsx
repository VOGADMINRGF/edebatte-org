"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type DraftDetailResponse = {
  ok: true;
  draft: any;
  candidate: any;
  analyzeResult: any;
};

export default function AdminDraftDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<DraftDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let abort = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/feeds/drafts/${params.id}`, { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || res.statusText);
        }
        const json = (await res.json()) as DraftDetailResponse;
        if (!abort) setData(json);
      } catch (err: any) {
        if (!abort) setError(err?.message ?? "Fehler beim Laden des Drafts");
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => {
      abort = true;
    };
  }, [params.id]);

  async function mutateStatus(nextStatus: "draft" | "review" | "discarded") {
    if (!data) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/feeds/drafts/${params.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || res.statusText);
      }
      const response = await res.json();
      setData({
        ...data,
        draft: { ...data.draft, status: response.draft.status, reviewNote: response.draft.reviewNote },
      });
    } catch (err: any) {
      alert(err?.message ?? "Status konnte nicht geändert werden.");
    } finally {
      setActionLoading(false);
    }
  }

  async function publishDraft() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/feeds/drafts/${params.id}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || res.statusText);
      }
      await res.json();
      setData(
        (prev) =>
          prev && {
            ...prev,
            draft: { ...prev.draft, status: "published", publishedAt: new Date().toISOString() },
          },
      );
      alert("Draft veröffentlicht.");
      router.refresh();
    } catch (err: any) {
      alert(err?.message ?? "Publish fehlgeschlagen.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Lädt Draft <span className="font-mono">{params.id}</span> …
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-sm text-rose-600">
        {error ?? "Draft nicht gefunden."}
      </div>
    );
  }

  const { draft, candidate, analyzeResult } = data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Admin · Draft Detail
        </p>
        <h1 className="text-2xl font-bold text-slate-900">{draft.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <StatusBadge status={draft.status} />
          <span className="text-slate-400">·</span>
          <span>{draft.regionName ?? "Global/Offen"}</span>
          {draft.sourceUrl && (
            <>
              <span className="text-slate-400">·</span>
              <a href={draft.sourceUrl} target="_blank" className="text-sky-600 hover:underline" rel="noreferrer">
                Quelle öffnen
              </a>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <section className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Original – Feed</h2>
          <p className="mt-2 text-xs text-slate-500">
            Locale {candidate.sourceLocale ?? "unbekannt"} · Region {candidate.regionCode ?? "Global"}
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-900">Titel</p>
              <p>{candidate.sourceTitle ?? "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Zusammenfassung</p>
              <p>{candidate.sourceSummary ?? "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Inhalt</p>
              <p className="whitespace-pre-line">{candidate.sourceContent ?? "—"}</p>
            </div>
          </div>
        </section>

        <section className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Draft</h2>
          <p className="text-xs text-slate-500">
            Claims aus der Analyse (Top 3), Summary und Meta-Daten.
          </p>
          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-900">Summary</p>
              <p>{draft.summary ?? "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Claims</p>
              <ul className="mt-2 space-y-2">
                {draft.claims?.map((claim: any) => (
                  <li key={claim.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-2">
                    <p className="font-medium text-slate-900">{claim.title ?? claim.text}</p>
                    <p className="text-xs text-slate-600">{claim.text}</p>
                    <p className="text-[11px] text-slate-500">
                      Zuständigkeit: {claim.responsibility ?? "n/a"} · Topic {claim.topic ?? "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-3">
            <button
              className="btn border border-slate-300 bg-white px-4 py-2 text-sm"
              disabled={actionLoading}
              onClick={() => mutateStatus("review")}
            >
              Zur Review markieren
            </button>
            <button
              className="btn border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
              disabled={actionLoading}
              onClick={() => mutateStatus("discarded")}
            >
              Verwerfen
            </button>
            <button
              className="btn bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              disabled={actionLoading || draft.status === "published"}
              onClick={publishDraft}
            >
              Veröffentlichen
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <header>
          <h2 className="text-sm font-semibold text-slate-900">Analyse – Claims & Notizen</h2>
          <p className="text-xs text-slate-500">
            Vollständiges Analyse-Resultat zur Nachvollziehbarkeit der automatischen Drafts.
          </p>
        </header>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-xs uppercase text-slate-500">Alle Claims</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              {analyzeResult.claims.map((claim: any) => (
                <li key={claim.id} className="rounded border border-slate-100 p-2">
                  <p className="font-semibold text-slate-900">{claim.title ?? claim.text}</p>
                  <p className="text-xs text-slate-600">{claim.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <h3 className="text-xs uppercase text-slate-500">Notes</h3>
              <ul className="space-y-2">
                {analyzeResult.notes.map((note: any) => (
                  <li key={note.id} className="rounded border border-slate-100 p-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">{note.kind}</p>
                    <p>{note.text}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase text-slate-500">Fragen</h3>
              <ul className="space-y-2">
                {analyzeResult.questions.map((question: any) => (
                  <li key={question.id} className="rounded border border-slate-100 p-2">
                    <p className="font-semibold text-slate-900">{question.dimension ?? "Frage"}</p>
                    <p>{question.text}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase text-slate-500">Knoten</h3>
              <ul className="space-y-2">
                {analyzeResult.knots.map((knot: any) => (
                  <li key={knot.id} className="rounded border border-slate-100 p-2">
                    <p className="font-semibold text-slate-900">{knot.label}</p>
                    <p className="text-xs text-slate-600">{knot.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-800",
    review: "bg-amber-100 text-amber-800",
    published: "bg-emerald-100 text-emerald-800",
    discarded: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[status] ?? "bg-slate-100"}`}>
      {status}
    </span>
  );
}
