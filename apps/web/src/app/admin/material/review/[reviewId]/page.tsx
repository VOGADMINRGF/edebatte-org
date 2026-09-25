"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type ReviewAction = "reuse" | "continue" | "enrich" | "create_new";
type Selection = {
  questionId: string;
  selected: boolean;
  action: ReviewAction | null;
  theme: string;
  text: string;
  rationale: string;
  sourceAnchors: string[];
  options: Array<{ text: string; source: "document" | "ai_suggestion" | "human_edit" }>;
};
type Session = {
  id: string;
  materialLabel: string;
  status: "awaiting_review" | "prepared";
  provider: string;
  graphFirst: {
    matchedTopicIds: string[];
    matchedDossierIds: string[];
    matchedRoundIds: string[];
    matchedClaimIds: string[];
    openPointIds: string[];
    coverageSummary: string;
    gapSummary: string;
    recommendedAction: ReviewAction;
    noAutoMerge: true;
    noAutoGraphWrite: true;
    noAutoPublish: true;
  };
  themes: string[];
  uncertainties: string[];
  selections: Selection[];
  preparedWorkstateIds: string[];
  reviewRequired: true;
  draftOnly: true;
  publicOutputAllowed: false;
};

const ACTIONS: Array<{ value: ReviewAction; label: string }> = [
  { value: "reuse", label: "Bestehende Frage verwenden" },
  { value: "continue", label: "Als Folgefrage weiterführen" },
  { value: "enrich", label: "Um Perspektive oder Option ergänzen" },
  { value: "create_new", label: "Neue eigenständige Frage vorbereiten" },
];

function recommendationLabel(value: ReviewAction) {
  return ACTIONS.find((action) => action.value === value)?.label ?? value;
}

export default function MaterialDocumentReviewPage() {
  const params = useParams<{ reviewId: string }>();
  const reviewId = String(params.reviewId ?? "");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/material/reviews/${encodeURIComponent(reviewId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Review konnte nicht geladen werden.");
        if (active) setSession(body.session);
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Review konnte nicht geladen werden."));
    return () => {
      active = false;
    };
  }, [reviewId]);

  const selectedCount = useMemo(
    () => session?.selections.filter((selection) => selection.selected).length ?? 0,
    [session],
  );

  function updateSelection(questionId: string, update: (selection: Selection) => Selection) {
    setSession((current) =>
      current
        ? {
            ...current,
            selections: current.selections.map((selection) =>
              selection.questionId === questionId ? update(selection) : selection,
            ),
          }
        : current,
    );
  }

  async function saveReview() {
    if (!session) return false;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/material/reviews/${encodeURIComponent(reviewId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          selections: session.selections.map((selection) => ({
            questionId: selection.questionId,
            selected: selection.selected,
            action: selection.action,
            theme: selection.theme,
            text: selection.text,
            rationale: selection.rationale,
            options: selection.options.map((option) => option.text),
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Review konnte nicht gespeichert werden.");
      setSession(body.session);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Review konnte nicht gespeichert werden.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function prepareSelected() {
    if (!session || !confirmed) return;
    if (selectedCount === 0 || session.selections.some((selection) => selection.selected && !selection.action)) {
      setError("Wähle mindestens eine Frage und für jede Auswahl eine Weiterführung.");
      return;
    }
    if (!(await saveReview())) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/material/reviews/${encodeURIComponent(reviewId)}/prepare`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Auswahl konnte nicht vorbereitet werden.");
      setSession(body.session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Auswahl konnte nicht vorbereitet werden.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !session) {
    return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-bold">Dokument-Review</h1><p role="alert" className="mt-4 text-red-700">{error}</p></main>;
  }
  if (!session) {
    return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-bold">Dokument-Review wird geladen</h1></main>;
  }

  const graph = session.graphFirst;
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Premium · AI-Drafts in Prüfung</p>
          <h1 className="mt-2 text-3xl font-black">Fragen aus „{session.materialLabel}“ prüfen</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
            KI hat Vorschläge vorbereitet. Du entscheidest, bearbeitest und wählst aus. Fakten und Quellen werden nicht zur Abstimmung gestellt.
          </p>
        </div>
        <Link href="/admin/feeds#material-extraction-jobs" className="rounded-full border px-4 py-2 text-sm font-semibold">Zurück zu Material</Link>
      </div>

      <section aria-labelledby="graph-match" className="mt-8 rounded-2xl border border-cyan-600/30 bg-cyan-500/5 p-5">
        <h2 id="graph-match" className="text-lg font-bold">Zu diesem Thema gibt es bereits Wissen in eDebatte.</h2>
        <p className="mt-2 text-sm">{graph.coverageSummary}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {graph.matchedRoundIds.length > 0 ? <span className="rounded-full border px-3 py-1">{graph.matchedRoundIds.length} bestehende Fragen/Runden</span> : null}
          {graph.matchedDossierIds.length > 0 ? <span className="rounded-full border px-3 py-1">{graph.matchedDossierIds.length} Dossiers</span> : null}
          {graph.openPointIds.length > 0 ? <span className="rounded-full border px-3 py-1">{graph.openPointIds.length} offene Punkte</span> : null}
        </div>
        <p className="mt-4 text-sm"><strong>Graph-Empfehlung:</strong> {recommendationLabel(graph.recommendedAction)}</p>
        <p className="mt-1 text-xs text-[rgb(var(--muted))]">{graph.gapSummary} Die Empfehlung ist keine Entscheidung.</p>
      </section>

      <section aria-labelledby="drafts" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="drafts" className="text-2xl font-bold">Vorschläge prüfen</h2><p className="mt-1 text-sm text-[rgb(var(--muted))]">{selectedCount} von {session.selections.length} ausgewählt</p></div>
          <span className="rounded-full border px-3 py-1 text-xs">Provider: {session.provider} · Draft only</span>
        </div>
        <div className="mt-4 space-y-5">
          {session.selections.map((selection, index) => (
            <article key={selection.questionId} className="rounded-2xl border p-5">
              <label className="flex items-start gap-3 font-semibold">
                <input
                  type="checkbox"
                  className="mt-1 size-5"
                  checked={selection.selected}
                  disabled={session.status === "prepared"}
                  onChange={(event) => updateSelection(selection.questionId, (item) => ({ ...item, selected: event.target.checked }))}
                />
                <span>Vorschlag {index + 1} auswählen</span>
              </label>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">Thema
                  <input className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 font-normal" value={selection.theme} disabled={session.status === "prepared"} onChange={(event) => updateSelection(selection.questionId, (item) => ({ ...item, theme: event.target.value }))} />
                </label>
                <label className="text-sm font-semibold">Weiterführung
                  <select className="mt-1 w-full rounded-xl border bg-[rgb(var(--bg))] px-3 py-2 font-normal" value={selection.action ?? ""} disabled={session.status === "prepared"} onChange={(event) => updateSelection(selection.questionId, (item) => ({ ...item, action: (event.target.value || null) as ReviewAction | null }))}>
                    <option value="">Bitte entscheiden</option>
                    {ACTIONS.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-4 block text-sm font-semibold">Frage
                <textarea className="mt-1 min-h-24 w-full rounded-xl border bg-transparent px-3 py-2 font-normal" value={selection.text} disabled={session.status === "prepared"} onChange={(event) => updateSelection(selection.questionId, (item) => ({ ...item, text: event.target.value }))} />
              </label>
              <label className="mt-4 block text-sm font-semibold">Begründung
                <textarea className="mt-1 min-h-20 w-full rounded-xl border bg-transparent px-3 py-2 font-normal" value={selection.rationale} disabled={session.status === "prepared"} onChange={(event) => updateSelection(selection.questionId, (item) => ({ ...item, rationale: event.target.value }))} />
              </label>
              <fieldset className="mt-4"><legend className="text-sm font-semibold">Antwortoptionen</legend><div className="mt-2 space-y-2">
                {selection.options.map((option, optionIndex) => (
                  <label key={`${selection.questionId}-${optionIndex}`} className="flex items-center gap-2 text-xs"><span className="w-24 shrink-0 text-[rgb(var(--muted))]">{option.source === "document" ? "Aus Dokument" : option.source === "human_edit" ? "Bearbeitet" : "KI-Vorschlag"}</span><input className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm" value={option.text} disabled={session.status === "prepared"} onChange={(event) => updateSelection(selection.questionId, (item) => ({ ...item, options: item.options.map((entry, currentIndex) => currentIndex === optionIndex ? { ...entry, text: event.target.value, source: "human_edit" } : entry) }))} /></label>
                ))}
              </div></fieldset>
              <details className="mt-4 text-xs text-[rgb(var(--muted))]"><summary className="cursor-pointer font-semibold">Textanker anzeigen</summary><ul className="mt-2 list-disc space-y-1 pl-5">{selection.sourceAnchors.map((anchor) => <li key={anchor}>{anchor}</li>)}</ul></details>
            </article>
          ))}
        </div>
      </section>

      {session.status === "prepared" ? (
        <section className="mt-8 rounded-2xl border border-emerald-600/30 bg-emerald-500/5 p-5" aria-live="polite"><h2 className="text-lg font-bold">Auswahl vorbereitet</h2><p className="mt-2 text-sm">{session.preparedWorkstateIds.length} private Create-Arbeitsstände wurden gespeichert. Es wurde keine Runde erstellt oder veröffentlicht.</p><Link href="/account" className="mt-4 inline-flex rounded-full bg-cyan-700 px-4 py-2 text-sm font-bold text-white">Arbeitsstände öffnen</Link></section>
      ) : (
        <section className="mt-8 rounded-2xl border p-5">
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Ich bestätige meine Auswahl. Die Fragen werden nur als private, reviewpflichtige Arbeitsstände vorbereitet.</span></label>
          <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => void saveReview()} disabled={busy} className="rounded-full border px-5 py-2 text-sm font-bold disabled:opacity-50">Review speichern</button><button type="button" onClick={() => void prepareSelected()} disabled={busy || !confirmed || selectedCount === 0} className="rounded-full bg-cyan-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">Ausgewählte Fragen vorbereiten</button></div>
          <p className="mt-3 text-xs text-[rgb(var(--muted))]">Kein Auto-Publish, kein Auto-Merge, kein Auto-Graph-Write und keine automatische Runde.</p>
        </section>
      )}
      {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
    </main>
  );
}
