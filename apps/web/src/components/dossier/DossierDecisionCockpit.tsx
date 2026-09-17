"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dossier } from "@features/dossier";
import { buildCreateHref } from "@/features/create/intents";
import { buildDossierWorkspaceModel } from "./workspaceModel";

export default function DossierDecisionCockpit({ dossier }: { dossier: Dossier }) {
  const model = buildDossierWorkspaceModel(dossier);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const openQuestions = model.questions.filter((item) => item.status === "open").length;
  const inReviewQuestions = model.questions.filter((item) => item.status === "in_review").length;
  const answeredQuestions = model.questions.filter((item) => item.status === "answered" || item.status === "closed").length;
  const reviewedSources = model.sources.filter((item) => item.reviewState === "reviewed").length;
  const linkedClaims = model.claims.filter((item) => item.sourceLinks.length > 0).length;
  const unsupportedClaims = model.claims.filter((item) => item.sourceLinks.length === 0).length;
  const voteEnabled = dossier.voteConfig?.enabled === true;
  const contributionHref = buildCreateHref({ intent: "source", dossierId: dossier.meta.id });

  async function shareDossier() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: model.title, text: model.coreQuestion, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {}
  }

  return (
    <section aria-labelledby="dossier-cockpit-title" data-testid="dossier-decision-cockpit" className="mx-auto w-full max-w-[1180px] px-4 pt-6 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Entscheidungsdossier · Lagebild</p>
            <h1 id="dossier-cockpit-title" className="mt-2 text-2xl font-bold tracking-tight text-[rgb(var(--fg))] sm:text-3xl">{model.title}</h1>
            <p className="mt-3 text-base font-semibold leading-7 text-[rgb(var(--fg))]">{model.coreQuestion}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">{model.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
            {voteEnabled ? <a href="#dossier-participation" className="rounded-full bg-[rgb(var(--fg))] px-4 py-2 text-sm font-semibold text-[rgb(var(--bg))]">Abstimmen</a> : <span title="Für dieses Dossier ist noch keine belastbare Abstimmung freigegeben." className="cursor-not-allowed rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--muted))]">Abstimmung noch nicht freigegeben</span>}
            <Link href={contributionHref} className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--grad-from))]">Beitragen</Link>
            <button type="button" onClick={shareDossier} className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--grad-from))]">{shareState === "copied" ? "Link kopiert" : "Teilen"}</button>
            <span title="Eine echte Folgen-Funktion ist für dieses Dossier noch nicht verfügbar." className="cursor-not-allowed rounded-full border border-dashed border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--muted))]">Folgen · noch nicht verfügbar</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Dossierstatus">
          <StatusCard label="Verfahrensstand" value={model.statusLabel} detail={model.updatedAtLabel} />
          <StatusCard label="Evidenz" value={`${linkedClaims}/${model.claims.length} Aussagen mit Quellenbezug`} detail={`${reviewedSources}/${model.sources.length} Quellen geprüft`} />
          <StatusCard label="Prüfstatus" value={`${inReviewQuestions} in Prüfung · ${openQuestions} offen`} detail={`${answeredQuestions} beantwortet oder geschlossen`} />
          <StatusCard label="Bürgerstimmung" value="Nicht aus Dossierinhalten abgeleitet" detail={voteEnabled ? "Nur reale abgegebene Stimmen werden separat ausgewiesen." : "Noch keine freigegebene Abstimmung."} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <h2 className="text-sm font-bold text-[rgb(var(--fg))]">In 30 Sekunden</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <SummaryItem term="Was passiert gerade?" text={model.statusLabel} />
              <SummaryItem term="Was steht zur Entscheidung?" text={model.coreQuestion} />
              <SummaryItem term="Was ist belastbar verknüpft?" text={`${linkedClaims} von ${model.claims.length} Aussagen haben einen direkten Quellenbezug.`} />
              <SummaryItem term="Was ist noch offen?" text={`${openQuestions} offene Fragen, ${inReviewQuestions} weitere Punkte in Prüfung.`} />
            </dl>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <h2 className="text-sm font-bold text-[rgb(var(--fg))]">Jetzt beteiligen</h2>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">Ergänzungen laufen über den bestehenden Create- und Review-Prozess. Sie verändern das öffentliche Dossier nicht ungeprüft.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ContributionLink dossierId={dossier.meta.id} intent="source" label="Quelle ergänzen" />
              <ContributionLink dossierId={dossier.meta.id} intent="question" label="Frage einreichen" />
              <ContributionLink dossierId={dossier.meta.id} intent="perspective" label="Perspektive ergänzen" />
              <ContributionLink dossierId={dossier.meta.id} intent="objection" label="Widerspruch melden" />
              <ContributionLink dossierId={dossier.meta.id} intent="factcheck" label="Factcheck anstoßen" />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2" data-testid="dossier-decision-research-layer">
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-[rgb(var(--fg))]">Was steht zur Entscheidung?</h2><p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">Nur im Dossier vorhandene Entscheidungsoptionen – keine künstliche Ja/Nein-Frage.</p></div><span className="rounded-full border border-[rgb(var(--border))] px-2.5 py-1 text-xs text-[rgb(var(--muted))]">{model.options.length} Optionen</span></div>
            {model.options.length ? <ul className="mt-3 space-y-2">{model.options.slice(0, 6).map((option) => <li key={option.id} className="rounded-xl border border-[rgb(var(--border))] p-3"><p className="text-sm font-semibold text-[rgb(var(--fg))]">{option.label}</p><p className="mt-1 text-xs text-[rgb(var(--muted))]">{option.claimIds.length ? `${option.claimIds.length} Aussagen zugeordnet` : "Noch ohne zugeordnete Aussage"}</p></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">Noch keine belastbaren Entscheidungsoptionen modelliert. Deshalb bleibt die Abstimmung fail-closed.</p>}
          </div>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-[rgb(var(--fg))]">Was wird gerade geprüft?</h2><p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">Offene Recherche bleibt sichtbar, statt als erledigt zu erscheinen.</p></div><span className="rounded-full border border-[rgb(var(--border))] px-2.5 py-1 text-xs text-[rgb(var(--muted))]">{openQuestions + inReviewQuestions} offen/Prüfung</span></div>
            {model.questions.length ? <ul className="mt-3 space-y-2">{model.questions.filter((q) => q.status === "in_review" || q.status === "open" || q.status === "unknown").slice(0, 5).map((question) => <li key={question.id} className="rounded-xl border border-[rgb(var(--border))] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><p className="max-w-[80%] text-sm font-semibold text-[rgb(var(--fg))]">{question.text}</p><span className="text-xs font-semibold text-[rgb(var(--muted))]">{question.statusLabel}</span></div><p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{question.sourceLinks.length ? `${question.sourceLinks.length} Quellen/Befunde zugeordnet` : "Noch kein belastbarer Quellenbezug"}{question.responsibility ? ` · Zuständig: ${question.responsibility}` : ""}</p></li>)}</ul> : <p className="mt-3 text-sm text-[rgb(var(--muted))]">Keine Prüfaufgaben ausgewiesen.</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Evidenzlücken">
          <StatusCard label="Ohne Quellenbezug" value={`${unsupportedClaims} Aussagen`} detail="Bleiben als Evidenzlücke sichtbar." />
          <StatusCard label="Fehlende Perspektiven" value={`${model.perspectives.length} ausgewiesen`} detail="Keine automatische Vollständigkeitsbehauptung." />
          <StatusCard label="Konflikte" value={`${model.conflicts.length} dokumentiert`} detail="Widersprüche werden nicht zu Konsens geglättet." />
        </div>
      </div>
    </section>
  );
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{label}</p><p className="mt-2 text-sm font-bold leading-5 text-[rgb(var(--fg))]">{value}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{detail}</p></div>; }
function SummaryItem({ term, text }: { term: string; text: string }) { return <div><dt className="text-xs font-semibold text-[rgb(var(--muted))]">{term}</dt><dd className="mt-1 text-sm leading-5 text-[rgb(var(--fg))]">{text}</dd></div>; }
function ContributionLink({ dossierId, intent, label }: { dossierId: string; intent: "source" | "question" | "perspective" | "objection" | "factcheck"; label: string }) { return <Link href={buildCreateHref({ intent, dossierId })} className="rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--grad-from))]">{label}</Link>; }
