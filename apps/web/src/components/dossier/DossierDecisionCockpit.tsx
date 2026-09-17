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
  const voteEnabled = dossier.voteConfig?.enabled === true;
  const contributionHref = buildCreateHref({ intent: "source", dossierId: dossier.meta.id });

  async function shareDossier() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: model.title, text: model.coreQuestion, url });
        return;
      } catch {
        // User cancellation or unavailable share target: keep the page unchanged.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      // No fake success state when clipboard access is unavailable.
    }
  }

  return (
    <section
      aria-labelledby="dossier-cockpit-title"
      data-testid="dossier-decision-cockpit"
      className="mx-auto w-full max-w-[1180px] px-4 pt-6 sm:px-6 lg:px-8"
    >
      <div className="rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Entscheidungsdossier · Lagebild</p>
            <h1 id="dossier-cockpit-title" className="mt-2 text-2xl font-bold tracking-tight text-[rgb(var(--fg))] sm:text-3xl">{model.title}</h1>
            <p className="mt-3 text-base font-semibold leading-7 text-[rgb(var(--fg))]">{model.coreQuestion}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">{model.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
            {voteEnabled ? (
              <a href="#dossier-participation" className="rounded-full bg-[rgb(var(--fg))] px-4 py-2 text-sm font-semibold text-[rgb(var(--bg))]">Abstimmen</a>
            ) : (
              <span title="Für dieses Dossier ist noch keine belastbare Abstimmung freigegeben." className="cursor-not-allowed rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--muted))]">Abstimmung noch nicht freigegeben</span>
            )}
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
      </div>
    </section>
  );
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{label}</p><p className="mt-2 text-sm font-bold leading-5 text-[rgb(var(--fg))]">{value}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{detail}</p></div>;
}

function SummaryItem({ term, text }: { term: string; text: string }) {
  return <div><dt className="text-xs font-semibold text-[rgb(var(--muted))]">{term}</dt><dd className="mt-1 text-sm leading-5 text-[rgb(var(--fg))]">{text}</dd></div>;
}

function ContributionLink({ dossierId, intent, label }: { dossierId: string; intent: "source" | "question" | "perspective" | "objection" | "factcheck"; label: string }) {
  return <Link href={buildCreateHref({ intent, dossierId })} className="rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--grad-from))]">{label}</Link>;
}
