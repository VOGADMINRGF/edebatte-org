"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Dossier } from "@features/dossier";
import type { DossierPublicUpdateContext } from "@features/dossier/updateReadModel";
import { usePrivacyGate } from "@/components/privacy/PrivacyGateProvider";
import { buildCreateHref, type CreateIntent } from "@/features/create/intents";
import { buildDossierWorkspaceModel } from "./workspaceModel";
import { getParliamentaryContextTopics } from "./parliamentaryContext";
import {
  getPublicDossierVoteConfig,
  getPublicDossierVoteOptions,
} from "./publicVotingContract";

type Props = {
  dossier: Dossier;
  updateContext?: DossierPublicUpdateContext | null;
  sourceStatusLabel?: string | null;
};

type VoteSummary = {
  ok: boolean;
  totalVotes?: number;
  counts?: Record<string, number>;
  selectedOptionId?: string | null;
  updatedAt?: string;
  message?: string;
};

type Tone = "good" | "open" | "review" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  good: "border-emerald-300/70 bg-emerald-500/10 dark:border-emerald-800",
  open: "border-violet-300/70 bg-violet-500/10 dark:border-violet-800",
  review: "border-amber-300/70 bg-amber-500/10 dark:border-amber-800",
  neutral: "border-[rgb(var(--border))] bg-[rgb(var(--bg))]",
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

function getProcedureClaim(dossier: Dossier) {
  return (
    dossier.analyze.claims.find((claim) =>
      `${claim.title ?? ""} ${claim.text}`
        .toLocaleLowerCase("de-DE")
        .match(/verfahren|verhandlung|ratsbefassung|gesetzgeb/),
    ) ?? dossier.analyze.claims[0] ?? null
  );
}

function getSupportedClaims(dossier: Dossier) {
  const supportedClaimIds = new Set(
    dossier.analyze.findings
      .filter((finding) => finding.finding === "supports")
      .map((finding) => finding.claimId),
  );
  return dossier.analyze.claims
    .filter((claim) => supportedClaimIds.has(claim.id))
    .slice(0, 4);
}

function buildContributionHref(
  dossierId: string,
  intent: CreateIntent = "perspective",
) {
  return buildCreateHref({ intent, dossierId });
}

function StatusCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${TONE_CLASSES[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{hint}</p>
    </div>
  );
}

export default function DossierDecisionCockpit({
  dossier,
  updateContext = null,
  sourceStatusLabel = null,
}: Props) {
  const privacyGate = usePrivacyGate();
  const model = useMemo(
    () => buildDossierWorkspaceModel(dossier, sourceStatusLabel),
    [dossier, sourceStatusLabel],
  );
  const parliamentaryTopic = useMemo(
    () => getParliamentaryContextTopics(dossier.sourceSet)[0] ?? null,
    [dossier.sourceSet],
  );
  const procedureClaim = useMemo(() => getProcedureClaim(dossier), [dossier]);
  const supportedClaimCards = useMemo(() => getSupportedClaims(dossier), [dossier]);
  const voteConfig = useMemo(() => getPublicDossierVoteConfig(dossier), [dossier]);
  const voteOptions = useMemo(() => getPublicDossierVoteOptions(dossier), [dossier]);
  const [voteSummary, setVoteSummary] = useState<VoteSummary | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [votePending, setVotePending] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  const questionCounts = useMemo(() => {
    const open = model.questions.filter((question) => question.status === "open").length;
    const review = model.questions.filter((question) => question.status === "in_review").length;
    const answered = model.questions.filter((question) =>
      ["answered", "closed"].includes(question.status),
    ).length;
    return {
      open,
      review: review + (updateContext?.reviewItems.length ?? 0),
      answered,
    };
  }, [model.questions, updateContext]);

  const supportedClaims = useMemo(
    () =>
      new Set(
        dossier.analyze.findings
          .filter((finding) => finding.finding === "supports")
          .map((finding) => finding.claimId),
      ).size,
    [dossier.analyze.findings],
  );

  const impacts = dossier.analyze.impactAndResponsibility.impacts.slice(0, 4);
  const gaps = dossier.analyze.missingPerspectives.slice(0, 4);
  const conflicts = dossier.analyze.report.keyConflicts.slice(0, 4);
  const parliamentaryPoll = parliamentaryTopic?.polls[0] ?? null;
  const votingAvailable =
    voteConfig.enabled && voteOptions.length >= voteConfig.minOptions && voteOptions.length >= 2;
  const totalVotes = voteSummary?.totalVotes ?? 0;
  const moodThreshold = 30;
  const showMoodBreakdown = totalVotes >= moodThreshold;

  useEffect(() => {
    if (!votingAvailable) return;
    let cancelled = false;
    fetch(`/api/dossier/${encodeURIComponent(dossier.meta.id)}/vote`, { cache: "no-store" })
      .then((response) => response.json() as Promise<VoteSummary>)
      .then((payload) => {
        if (cancelled || !payload.ok) return;
        setVoteSummary(payload);
        setSelectedOptionId(payload.selectedOptionId ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dossier.meta.id, votingAvailable]);

  async function submitVote() {
    if (!selectedOptionId || votePending) return;
    if (!privacyGate.ensureActiveProcessingAllowed("dossier-vote")) return;
    setVotePending(true);
    setVoteError(null);
    try {
      const response = await fetch(`/api/dossier/${encodeURIComponent(dossier.meta.id)}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionId: selectedOptionId }),
      });
      const payload = (await response.json().catch(() => null)) as VoteSummary | null;
      if (!response.ok || !payload?.ok) {
        setVoteError(payload?.message ?? "Die Stimme konnte nicht gespeichert werden.");
        return;
      }
      setVoteSummary(payload);
    } catch {
      setVoteError("Die Stimme konnte aktuell nicht gespeichert werden.");
    } finally {
      setVotePending(false);
    }
  }

  async function shareDossier() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: dossier.meta.title, text: model.summary, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      setShareState("idle");
    }
  }

  return (
    <section
      data-dossier-decision-cockpit="true"
      className="mx-auto w-full max-w-[1560px] px-4 pt-7 sm:px-6 sm:pt-9 lg:px-8 xl:px-10"
      aria-label="Dossier-Entscheidungscockpit"
    >
      <header className="overflow-hidden rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_22px_60px_rgba(2,6,23,0.08)]">
        <div className="p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-amber-300/70 bg-amber-500/10 px-3 py-1 text-[rgb(var(--fg))]">
              {parliamentaryTopic?.procedureStatus ?? model.statusLabel}
            </span>
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-1 text-[rgb(var(--fg))]">
              {dossier.meta.region ?? dossier.meta.jurisdiction.toUpperCase()}
            </span>
            <span className="text-[rgb(var(--muted))]">
              geprüft: {formatDate(dossier.meta.updatedAt)}
            </span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
                Entscheidungsdossier
              </p>
              <h1 className="mt-2 max-w-5xl text-3xl font-bold leading-tight tracking-tight text-[rgb(var(--fg))] sm:text-4xl lg:text-5xl">
                {model.title}
              </h1>
              <p className="mt-4 max-w-5xl text-lg font-semibold leading-8 text-[rgb(var(--fg))]">
                {model.coreQuestion}
              </p>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
                {model.summary}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-[390px] lg:justify-end">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("dossier-decision-vote")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="btn-primary min-h-11 px-4 py-2 text-sm"
              >
                {votingAvailable ? "Abstimmen" : "Position ansehen"}
              </button>
              <Link
                href={buildContributionHref(dossier.meta.id)}
                className="min-h-11 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-2.5 text-sm font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--grad-from))]"
              >
                Beitrag leisten
              </Link>
              <button
                type="button"
                onClick={() => void shareDossier()}
                className="min-h-11 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--grad-from))]"
              >
                {shareState === "copied" ? "Link kopiert" : "Teilen"}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))]/65 p-5 sm:p-6 lg:p-7">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatusCard
              label="Verfahrensstand"
              value={parliamentaryTopic?.procedureStatus ?? model.statusLabel}
              hint={procedureClaim?.title ?? "Der aktuelle Verfahrensstand ist im Dossier dokumentiert."}
              tone="review"
            />
            <StatusCard
              label="Bürgerstimmung"
              value={showMoodBreakdown ? `${totalVotes} Stimmen` : "Noch nicht belastbar"}
              hint={
                votingAvailable
                  ? `${totalVotes} gespeicherte Stimmen · Verteilung ab ${moodThreshold} Stimmen sichtbar.`
                  : "Für diesen Dossierstand ist noch keine öffentliche Abstimmung freigegeben."
              }
              tone={showMoodBreakdown ? "good" : "neutral"}
            />
            <StatusCard
              label="Evidenzlage"
              value={`${supportedClaims}/${model.claims.length} Kernaussagen gestützt`}
              hint={`${model.sources.length} Quellen · ${gaps.length} sichtbare Perspektiv- oder Evidenzlücken.`}
              tone={
                supportedClaims === model.claims.length && model.claims.length > 0
                  ? "good"
                  : "review"
              }
            />
            <StatusCard
              label="Prüfstatus"
              value={`${questionCounts.review} in Prüfung · ${questionCounts.open} offen`}
              hint={`${questionCounts.answered} Fragen sind beantwortet oder geschlossen.`}
              tone={
                questionCounts.review > 0
                  ? "review"
                  : questionCounts.open > 0
                    ? "open"
                    : "good"
              }
            />
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <div className="space-y-5">
          <section className="rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              In 30 Sekunden
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">
                  Was passiert gerade?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
                  {parliamentaryTopic?.procedureSummary ?? procedureClaim?.text ?? model.summary}
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Was ist strittig?</h2>
                {conflicts.length ? (
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-[rgb(var(--muted))]">
                    {conflicts.slice(0, 3).map((conflict) => (
                      <li key={conflict} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{conflict}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[rgb(var(--muted))]">
                    Keine Konfliktlinien ausgewiesen.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section
            id="dossier-decision-vote"
            className="scroll-mt-28 rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Was steht zur Entscheidung?
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">
                  Regelungsoptionen statt pauschalem Pro/Contra
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
                  Die Optionen stammen aus dem dokumentierten Entscheidungsrahmen des Dossiers. Eine Stimme beschreibt eine Präferenz und ersetzt keine Faktenbewertung.
                </p>
              </div>
              <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-1 text-xs font-semibold text-[rgb(var(--fg))]">
                {voteOptions.length} Optionen
              </span>
            </div>

            {voteOptions.length ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {voteOptions.map((option) => {
                  const selected = selectedOptionId === option.id;
                  const count = voteSummary?.counts?.[option.id] ?? 0;
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={!votingAvailable}
                      onClick={() => setSelectedOptionId(option.id)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        selected
                          ? "border-[rgb(var(--grad-from))] bg-[rgb(var(--grad-from))]/10"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--bg))] hover:border-[rgb(var(--grad-from))]"
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <span className="text-sm font-semibold leading-6 text-[rgb(var(--fg))]">
                        {option.label}
                      </span>
                      {showMoodBreakdown ? (
                        <span className="mt-2 block text-xs text-[rgb(var(--muted))]">
                          {pct}% · {count} Stimmen
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[rgb(var(--muted))]">
                Für diesen Dossierstand sind noch keine klar getrennten Entscheidungsoptionen hinterlegt.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {votingAvailable ? (
                <button
                  type="button"
                  disabled={!selectedOptionId || votePending}
                  onClick={() => void submitVote()}
                  className="btn-primary min-h-11 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {votePending
                    ? "Speichere…"
                    : voteSummary?.selectedOptionId
                      ? "Stimme aktualisieren"
                      : "Stimme speichern"}
                </button>
              ) : (
                <span className="rounded-xl border border-amber-300/70 bg-amber-500/10 px-3 py-2 text-sm text-[rgb(var(--fg))]">
                  Abstimmung noch nicht freigegeben.
                </span>
              )}
              <Link
                href={buildContributionHref(dossier.meta.id, "option")}
                className="text-sm font-semibold text-[rgb(var(--fg))] underline decoration-[rgb(var(--border))] underline-offset-4 hover:decoration-[rgb(var(--grad-from))]"
              >
                Fehlende Option ergänzen
              </Link>
              {voteError ? (
                <p className="w-full text-sm text-rose-700 dark:text-rose-300">{voteError}</p>
              ) : null}
              {voteSummary?.ok &&
              selectedOptionId &&
              voteSummary.selectedOptionId === selectedOptionId ? (
                <p className="w-full text-xs text-[rgb(var(--muted))]">
                  Deine aktuelle Auswahl ist gespeichert.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              Risiken, Auswirkungen und Prüfbedarf
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">
              Auswirkungen und Evidenzlücken getrennt
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
              Angezeigt werden dokumentierte Wirkungsdimensionen und offene Evidenzlücken. Das Dossier vergibt daraus keinen politischen Gesamtscore.
            </p>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {impacts.map((impact) => (
                <article
                  key={`${impact.type}-${impact.description}`}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Auswirkungsdimension
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">{impact.type}</h3>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
                    {impact.description}
                  </p>
                </article>
              ))}
              {gaps.map((gap) => (
                <article
                  key={gap.id ?? gap.text}
                  className="rounded-2xl border border-amber-300/70 bg-amber-500/10 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Evidenz- oder Perspektivlücke
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                    {gap.dimension ?? "Prüfbedarf"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">{gap.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Durch Evidenz gestützt
                </p>
                <div className="mt-3 space-y-3">
                  {supportedClaimCards.length ? (
                    supportedClaimCards.map((claim) => (
                      <article
                        key={claim.id}
                        className="rounded-2xl border border-emerald-300/60 bg-emerald-500/10 p-4"
                      >
                        <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">
                          {claim.title ?? claim.text}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
                          {claim.text}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-[rgb(var(--muted))]">
                      Noch keine gestützten Kernaussagen ausgewiesen.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Offene Prüfungen
                </p>
                <div className="mt-3 space-y-3">
                  {model.questions.length ? (
                    model.questions.slice(0, 5).map((question) => (
                      <article
                        key={question.id}
                        className={`rounded-2xl border p-4 ${
                          question.status === "in_review" ? TONE_CLASSES.review : TONE_CLASSES.open
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">
                            {question.text}
                          </h3>
                          <span className="rounded-full border border-[rgb(var(--border))] px-2 py-1 text-[11px] font-semibold text-[rgb(var(--muted))]">
                            {question.statusLabel}
                          </span>
                        </div>
                        {question.responsibility ? (
                          <p className="mt-2 text-xs text-[rgb(var(--muted))]">
                            Zuständig: {question.responsibility}
                          </p>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-[rgb(var(--muted))]">
                      Keine offenen Prüfungen dokumentiert.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <section className="rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              Stimmung und Parlament
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
                <p className="text-xs text-[rgb(var(--muted))]">Bürger:innen auf eDebatte</p>
                <p className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
                  {showMoodBreakdown ? `${totalVotes} Stimmen` : "Noch keine belastbare Stimmungslage"}
                </p>
                <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">
                  {votingAvailable
                    ? showMoodBreakdown
                      ? "Die Verteilung wird getrennt von parlamentarischem Abstimmungsverhalten dargestellt."
                      : `${totalVotes} von ${moodThreshold} Stimmen bis zur öffentlichen Verteilungsanzeige.`
                    : "Die Bürgerabstimmung ist für diesen Stand noch nicht freigegeben."}
                </p>
              </div>

              {parliamentaryPoll ? (
                <div className="rounded-2xl border border-blue-300/60 bg-blue-500/10 p-4">
                  <p className="text-xs text-[rgb(var(--muted))]">
                    Dokumentiertes parlamentarisches Verhalten
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                    {parliamentaryPoll.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--fg))]">
                    {parliamentaryPoll.overallResult}
                  </p>
                  {parliamentaryPoll.germanDelegationResult ? (
                    <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
                      {parliamentaryPoll.germanDelegationResult}
                    </p>
                  ) : null}
                  <a
                    href={parliamentaryPoll.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-xs font-semibold text-[rgb(var(--fg))] underline underline-offset-4"
                  >
                    Abstimmung bei abgeordnetenwatch öffnen
                  </a>
                </div>
              ) : (
                <p className="text-sm text-[rgb(var(--muted))]">
                  Keine eindeutig zuordenbare parlamentarische Abstimmung gefunden.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              Beitragen
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
              Dossier gemeinsam verbessern
            </h2>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
              Quellen, Argumente, Fragen und Korrekturhinweise laufen in den bestehenden Create-/Review-Prozess. Sie werden nicht automatisch als Evidenz veröffentlicht.
            </p>
            <div className="mt-4 grid gap-2">
              {([
                ["Quelle ergänzen", "source"],
                ["Argument oder Perspektive ergänzen", "perspective"],
                ["Offene Frage einreichen", "question"],
                ["Faktencheck anstoßen", "factcheck"],
              ] as const).map(([label, intent]) => (
                <Link
                  key={intent}
                  href={buildContributionHref(dossier.meta.id, intent)}
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--grad-from))]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              Dossier-Reife
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[rgb(var(--muted))]">Kernaussagen</dt>
                <dd className="font-semibold text-[rgb(var(--fg))]">{model.claims.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[rgb(var(--muted))]">Gestützt</dt>
                <dd className="font-semibold text-[rgb(var(--fg))]">{supportedClaims}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[rgb(var(--muted))]">In Prüfung</dt>
                <dd className="font-semibold text-[rgb(var(--fg))]">{questionCounts.review}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[rgb(var(--muted))]">Offen</dt>
                <dd className="font-semibold text-[rgb(var(--fg))]">{questionCounts.open}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[rgb(var(--muted))]">Quellen</dt>
                <dd className="font-semibold text-[rgb(var(--fg))]">{model.sources.length}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-3 z-40 mx-auto mt-5 flex w-fit gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/95 p-2 shadow-[0_16px_40px_rgba(2,6,23,0.16)] backdrop-blur-xl sm:hidden">
        <button
          type="button"
          onClick={() =>
            document
              .getElementById("dossier-decision-vote")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          className="btn-primary min-h-10 px-3 py-2 text-xs"
        >
          {votingAvailable ? "Abstimmen" : "Position"}
        </button>
        <Link
          href={buildContributionHref(dossier.meta.id)}
          className="min-h-10 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))]"
        >
          Beitragen
        </Link>
        <button
          type="button"
          onClick={() => void shareDossier()}
          className="min-h-10 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))]"
        >
          Teilen
        </button>
      </div>
    </section>
  );
}
