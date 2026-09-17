"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Dossier } from "@features/dossier";
import type { DossierPublicUpdateContext } from "@features/dossier/updateReadModel";
import VotePanel from "./VotePanel";
import { buildDossierWorkspaceModel } from "./workspaceModel";
import { resolvePublicDossierVotePolicy } from "@/features/dossier/publicVotePolicy";

type VoteSummary = {
  ok: true;
  enabled: boolean;
  totalVotes: number;
  myOptionId: string | null;
  options: Array<{ id: string; label: string; count: number; pct: number }>;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "nicht ausgewiesen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function contributionHref(dossierId: string, intent: "source" | "question" | "claim") {
  const returnTo = `/dossier/${encodeURIComponent(dossierId)}`;
  const params = new URLSearchParams({
    intent,
    dossierId,
    returnTo,
  });
  return `/create?${params.toString()}`;
}

export default function DossierDecisionCockpit({
  dossier,
  updateContext = null,
  sourceStatusLabel = null,
}: {
  dossier: Dossier;
  updateContext?: DossierPublicUpdateContext | null;
  sourceStatusLabel?: string | null;
}) {
  const model = useMemo(
    () => buildDossierWorkspaceModel(dossier, sourceStatusLabel),
    [dossier, sourceStatusLabel],
  );
  const votePolicy = useMemo(() => resolvePublicDossierVotePolicy(dossier), [dossier]);
  const [voteSummary, setVoteSummary] = useState<VoteSummary | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [savedOptionId, setSavedOptionId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const supportedClaims = model.claims.filter((claim) => claim.evidenceTone === "positive");
  const reviewQuestions = model.questions.filter((question) => question.status === "in_review");
  const openQuestions = model.questions.filter((question) => question.status === "open");
  const answeredQuestions = model.questions.filter(
    (question) => question.status === "answered" || question.status === "closed",
  );
  const reviewQueueCount = updateContext?.reviewItems.length ?? 0;
  const impacts = dossier.analyze.impactAndResponsibility?.impacts ?? [];
  const decisionOptions = votePolicy.options;

  useEffect(() => {
    if (!votePolicy.enabled) return;
    let cancelled = false;
    fetch(`/api/dossier/${encodeURIComponent(dossier.meta.id)}/vote`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: VoteSummary | { ok?: false }) => {
        if (cancelled || !payload || payload.ok !== true) return;
        setVoteSummary(payload);
        setSelectedOptionId(payload.myOptionId);
        setSavedOptionId(payload.myOptionId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dossier.meta.id, votePolicy.enabled]);

  async function saveVote() {
    if (!selectedOptionId || savePending || !votePolicy.enabled) return;
    setSavePending(true);
    setSaveError(null);
    setSaveNotice(false);
    try {
      const response = await fetch(`/api/dossier/${encodeURIComponent(dossier.meta.id)}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionId: selectedOptionId }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (VoteSummary & { updatedAt?: string; message?: string })
        | { ok?: false; message?: string; error?: string }
        | null;
      if (!response.ok || !payload || payload.ok !== true) {
        setSaveError(payload?.message ?? "Die Stimme konnte nicht gespeichert werden.");
        return;
      }
      setVoteSummary(payload);
      setSavedOptionId(payload.myOptionId ?? selectedOptionId);
      setSavedAt(payload.updatedAt ?? new Date().toISOString());
      setSaveNotice(true);
      window.setTimeout(() => setSaveNotice(false), 2200);
    } catch {
      setSaveError("Die Stimme konnte gerade nicht gespeichert werden.");
    } finally {
      setSavePending(false);
    }
  }

  async function shareDossier() {
    const url = window.location.href;
    const data = {
      title: dossier.meta.title,
      text: model.coreQuestion,
      url,
    };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(data);
        setShareStatus("Geteilt");
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus("Link kopiert");
      }
    } catch {
      setShareStatus(null);
    }
    window.setTimeout(() => setShareStatus(null), 2200);
  }

  const moodLabel = !voteSummary || voteSummary.totalVotes === 0
    ? "Noch keine Bürgerstimmen"
    : voteSummary.totalVotes < 30
      ? "Noch keine belastbare Beteiligungsbasis"
      : `${voteSummary.totalVotes} eDebatte-Stimmen`;

  return (
    <section className="mx-auto w-full max-w-[1560px] px-4 pt-7 sm:px-6 sm:pt-9 lg:px-8 xl:px-10">
      <div className="overflow-hidden rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_22px_60px_rgba(2,6,23,0.08)]">
        <div className="p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-amber-300/70 bg-amber-500/10 px-3 py-1 text-amber-950 dark:text-amber-200">
              Sachstand mit offenen Prüfungen
            </span>
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-1 text-[rgb(var(--fg))]">
              {model.statusLabel}
            </span>
            <span className="text-[rgb(var(--muted))]">Stand {model.updatedAtLabel}</span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Entscheidungsdossier</p>
              <h1 className="mt-2 max-w-5xl text-3xl font-bold leading-tight tracking-tight text-[rgb(var(--fg))] sm:text-4xl">
                {model.title}
              </h1>
              <p className="mt-3 max-w-5xl text-lg font-semibold leading-8 text-[rgb(var(--fg))]">
                {model.coreQuestion}
              </p>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
                {model.summary}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:max-w-[320px] lg:justify-end">
              <a href="#dossier-vote" className="btn-primary min-h-11 px-4 py-2 text-sm">Abstimmen</a>
              <Link href={contributionHref(dossier.meta.id, "source")} className="btn-secondary min-h-11 px-4 py-2 text-sm">
                Beitrag leisten
              </Link>
              <button type="button" onClick={() => void shareDossier()} className="btn-secondary min-h-11 px-4 py-2 text-sm">
                {shareStatus ?? "Teilen"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatusCard label="Verfahrens-/Dossierstand" value={openQuestions.length ? `${openQuestions.length} Kernfragen offen` : "Keine offene Kernfrage dokumentiert"} hint="Keine automatische Schlussfolgerung aus parlamentarischen oder politischen Positionen." />
            <StatusCard label="Bürgerstimmung" value={moodLabel} hint="eDebatte-Beteiligung ist keine repräsentative Bevölkerungsumfrage." />
            <StatusCard label="Evidenzlage" value={`${supportedClaims.length} von ${model.claims.length} Aussagen mit stützendem Befund`} hint={model.sourceTrustLabel} />
            <StatusCard label="Prüfstatus" value={`${reviewQuestions.length + reviewQueueCount} in Prüfung · ${openQuestions.length} offen`} hint={`${answeredQuestions.length} beantwortet oder abgeschlossen`} />
          </div>
        </div>

        <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))]/55 p-5 sm:p-7 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="space-y-6">
              <section>
                <SectionHeading kicker="In 30 Sekunden" title="Was ist gerade wichtig?" />
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InfoBlock title="Belastbar dokumentiert" items={supportedClaims.slice(0, 3).map((claim) => claim.title)} empty="Noch keine Aussage mit stützendem Befund ausgewiesen." />
                  <InfoBlock title="Noch offen oder in Prüfung" items={[...reviewQuestions, ...openQuestions].slice(0, 4).map((question) => question.text)} empty="Keine offene Prüfungsfrage dokumentiert." />
                </div>
              </section>

              <section id="dossier-decisions" className="scroll-mt-28">
                <SectionHeading kicker="Entscheidungsraum" title="Was steht zur Entscheidung?" />
                {decisionOptions.length ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {decisionOptions.map((option, index) => (
                      <article key={option.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                        <p className="text-xs font-semibold text-[rgb(var(--muted))]">Option {index + 1}</p>
                        <h3 className="mt-1 text-sm font-semibold leading-6 text-[rgb(var(--fg))]">{option.label}</h3>
                        <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">Explizite Option aus der dokumentierten Entscheidungsarchitektur; keine Empfehlung von eDebatte.</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl border border-amber-300/60 bg-amber-500/10 p-4 text-sm text-[rgb(var(--muted))]">Noch kein ausreichend differenzierter Entscheidungsraum dokumentiert.</p>
                )}
              </section>

              <section>
                <SectionHeading kicker="Auswirkungen & Prüffelder" title="Welche Risiken und Folgen müssen geprüft werden?" />
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {impacts.slice(0, 4).map((impact, index) => (
                    <article key={`${impact.type}-${index}`} className="rounded-2xl border border-amber-300/60 bg-amber-500/10 p-4">
                      <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">{impact.type}</h3>
                      <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">{impact.description}</p>
                      <p className="mt-2 text-xs text-[rgb(var(--muted))]">Prüffeld – kein automatisch berechneter Risikoscore.</p>
                    </article>
                  ))}
                  {model.conflicts.slice(0, Math.max(0, 4 - impacts.length)).map((conflict) => (
                    <article key={conflict} className="rounded-2xl border border-violet-300/60 bg-violet-500/10 p-4">
                      <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Zielkonflikt</h3>
                      <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">{conflict}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section id="dossier-vote" className="scroll-mt-28 rounded-3xl border border-teal-300/60 bg-teal-500/10 p-4 sm:p-5">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Bürgerposition</p>
                  <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">Deine Position abgeben</h2>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">Mehrere Regelungsrichtungen statt eines pauschalen „Pro/Contra Chatkontrolle“.</p>
                </div>
                <VotePanel
                  options={decisionOptions}
                  selectedOptionId={selectedOptionId}
                  savedOptionId={savedOptionId}
                  onSelect={setSelectedOptionId}
                  onSave={() => void saveVote()}
                  saveNotice={saveNotice}
                  saveError={saveError}
                  savePending={savePending}
                  savedAt={savedAt}
                  canVote={votePolicy.enabled}
                  roleLabel="öffentliche Bürgerbeteiligung"
                />
                <p className="mt-3 text-xs leading-5 text-[rgb(var(--muted))]">{votePolicy.reason}</p>
              </section>

              <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Aktuelle eDebatte-Stimmung</p>
                <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">{moodLabel}</h2>
                {voteSummary?.totalVotes ? (
                  <ul className="mt-4 space-y-3">
                    {voteSummary.options.map((option) => (
                      <li key={option.id}>
                        <div className="flex items-start justify-between gap-3 text-xs text-[rgb(var(--fg))]">
                          <span>{option.label}</span>
                          <strong>{option.count}</strong>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgb(var(--bg))]">
                          <div className="h-full rounded-full bg-[rgb(var(--grad-from))]" style={{ width: `${option.pct}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">Sobald Stimmen vorliegen, werden sie hier getrennt von parlamentarischen Abstimmungen dargestellt.</p>
                )}
                <p className="mt-3 text-xs leading-5 text-[rgb(var(--muted))]">Nicht repräsentativ. Keine Ableitung aus Abgeordnetenstimmen, Parteien oder Politikerantworten.</p>
                <a href="#parlamentarischer-kontext" className="mt-3 inline-flex text-sm font-semibold text-[rgb(var(--fg))] underline underline-offset-4">Parlamentarischen Kontext separat ansehen</a>
              </section>

              <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Mitwirken</p>
                <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">Dossier verbessern</h2>
                <div className="mt-4 grid gap-2">
                  <Link href={contributionHref(dossier.meta.id, "source")} className="btn-secondary min-h-11 px-4 py-2 text-sm">Quelle ergänzen</Link>
                  <Link href={contributionHref(dossier.meta.id, "claim")} className="btn-secondary min-h-11 px-4 py-2 text-sm">Aussage oder Argument ergänzen</Link>
                  <Link href={contributionHref(dossier.meta.id, "question")} className="btn-secondary min-h-11 px-4 py-2 text-sm">Offene Frage einreichen</Link>
                </div>
                <p className="mt-3 text-xs leading-5 text-[rgb(var(--muted))]">Beiträge gehen in den bestehenden Review-first-Create-Pfad und werden nicht automatisch als Wahrheit oder veröffentlichte Position übernommen.</p>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
      <dt className="text-xs font-semibold text-[rgb(var(--muted))]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-6 text-[rgb(var(--fg))]">{value}</dd>
      <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">{hint}</p>
    </div>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">{kicker}</p>
      <h2 className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">{title}</h2>
    </div>
  );
}

function InfoBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <article className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
      <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">{title}</h3>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[rgb(var(--muted))]">
          {items.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">{empty}</p>
      )}
    </article>
  );
}
