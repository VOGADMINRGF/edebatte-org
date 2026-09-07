"use client";

import * as React from "react";

import {
  canConnectToExistingTopic,
  canPrepareMatchForReview,
  canStartNewBranch,
  getExistingTopicMatchCtaLabel,
  getExistingTopicMatchGuardrailNote,
  getPrimaryExistingTopicMatch,
  getVisibleExistingTopicMatches,
  type ExistingTopicMatch,
  type ExistingTopicMatchPanelModel,
} from "@/features/create/existingTopicMatches";
import type { ExistingMatchUserDecision } from "@/features/create/createContributionPackageContract";

export type CitizenMatchDecision = Extract<
  ExistingMatchUserDecision,
  "count_my_position" | "count_as_opposition" | "add_as_nuance" | "keep_separate"
>;

const CITIZEN_MATCH_DECISIONS: ReadonlyArray<{
  id: CitizenMatchDecision;
  label: string;
}> = [
  { id: "count_my_position", label: "Unterstützen" },
  { id: "count_as_opposition", label: "Widersprechen" },
  { id: "add_as_nuance", label: "Ergänzen / Nuance" },
  { id: "keep_separate", label: "Separat weiterführen" },
];

export type ExistingTopicMatchesPanelProps = {
  model: ExistingTopicMatchPanelModel;
  onSelectMatch?: (matchId: string) => void;
  onStartNewBranch?: () => void;
  onCountSimilarOpinion?: (matchId: string) => void;
  onPrepareReview?: (matchId: string) => void;
  onMatchDecision?: (matchId: string, decision: CitizenMatchDecision) => void;
  decisions?: Readonly<Record<string, CitizenMatchDecision>>;
};

function getStrengthLabel(strength: ExistingTopicMatch["strength"]): string {
  if (strength === "strong") return "stark";
  if (strength === "medium") return "mittel";
  return "schwach";
}

function getDecisionLabel(
  decision: ExistingTopicMatchPanelModel["suggestedDecision"],
): string {
  if (decision === "connect_to_existing") {
    return "An bestehenden Anschluss weiterarbeiten";
  }
  if (decision === "count_only") {
    return "Als ähnliche Meinung vorsichtig mitzählen";
  }
  if (decision === "prepare_dossier_candidate") {
    return "Dossier-Anknüpfung vorbereitend prüfen";
  }
  if (decision === "prepare_anlassraum_candidate") {
    return "Anlass- oder Beteiligungsraum vorbereitend prüfen";
  }
  if (decision === "ask_for_review") {
    return "Vor einer Weitergabe zuerst prüfen";
  }
  return "Bei Bedarf einen neuen Zweig starten";
}

function resolveMatchAction(
  match: ExistingTopicMatch,
  props: ExistingTopicMatchesPanelProps,
): { label: string; onClick?: () => void } | null {
  if (match.kind === "opinion_cluster" && match.status !== "rejected") {
    return {
      label: getExistingTopicMatchCtaLabel(match),
      onClick: props.onCountSimilarOpinion
        ? () => props.onCountSimilarOpinion?.(match.id)
        : undefined,
    };
  }

  if (match.kind === "source_question" && canPrepareMatchForReview(match)) {
    return {
      label: getExistingTopicMatchCtaLabel(match),
      onClick: props.onPrepareReview
        ? () => props.onPrepareReview?.(match.id)
        : undefined,
    };
  }

  if (
    (match.kind === "dossier" || match.kind === "participation_space") &&
    canPrepareMatchForReview(match)
  ) {
    return {
      label: getExistingTopicMatchCtaLabel(match),
      onClick: props.onPrepareReview
        ? () => props.onPrepareReview?.(match.id)
        : undefined,
    };
  }

  if (canConnectToExistingTopic(match)) {
    return {
      label: getExistingTopicMatchCtaLabel(match),
      onClick: props.onSelectMatch ? () => props.onSelectMatch?.(match.id) : undefined,
    };
  }

  return null;
}

export default function ExistingTopicMatchesPanel(
  props: ExistingTopicMatchesPanelProps,
) {
  const [decisions, setDecisions] = React.useState<Record<string, CitizenMatchDecision>>({});
  const activeDecisions = props.decisions ?? decisions;
  const matches = getVisibleExistingTopicMatches(props.model);
  const guardrailNote = getExistingTopicMatchGuardrailNote(props.model);
  const primaryMatch = getPrimaryExistingTopicMatch(props.model);

  return (
    <section
      className="rounded-[24px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_95%,rgb(var(--bg))_5%)] px-4 py-4 text-sm dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]"
      aria-label="Ähnliche Themen und Anschlüsse"
      data-existing-topic-matches-panel
    >
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
          Anschlussvorschläge
        </p>
        <h3 className="text-base font-semibold text-[rgb(var(--fg))]">
          Anschluss prüfen
        </h3>
        <p className="text-sm leading-relaxed text-[rgb(var(--fg))]">
          {props.model.introText}
        </p>
        {props.model.sourceLabel ? (
          <p className="text-xs leading-relaxed text-[rgb(var(--muted))]">
            {props.model.sourceLabel}
          </p>
        ) : null}
      </div>

      <div className="mt-3 rounded-2xl border border-amber-300/35 bg-amber-500/[0.08] px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-300/25 dark:bg-amber-500/[0.12] dark:text-amber-50">
        {guardrailNote}
      </div>

      {primaryMatch ? (
        <p className="mt-3 text-xs font-medium text-[rgb(var(--muted))]">
          Stärkster Anschlussvorschlag: {primaryMatch.title}. Empfohlene Richtung:{" "}
          {getDecisionLabel(props.model.suggestedDecision)}.
        </p>
      ) : null}

      {matches.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {matches.map((match) => {
            const action = resolveMatchAction(match, props);

            return (
              <article
                key={match.id}
                className="rounded-2xl border border-slate-200/80 bg-[rgb(var(--bg))] px-4 py-3 dark:border-[rgb(var(--border))]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))] dark:border-[rgb(var(--border))]">
                        {match.kind}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        Stärke: {getStrengthLabel(match.strength)}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-[rgb(var(--fg))]">
                      {match.title}
                    </h4>
                    {match.relation === "opposing" ? (
                      <p className="text-xs font-medium text-violet-800 dark:text-violet-200">
                        Mögliche Gegenposition
                      </p>
                    ) : null}
                  </div>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--fg))]">
                  {match.summary}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[rgb(var(--muted))]">
                  Grund: {match.reason}
                </p>

                {typeof match.countedOpinions === "number" ? (
                  <p className="mt-2 text-xs leading-relaxed text-[rgb(var(--muted))]">
                    Ähnliche Meinungen bisher gezählt: {match.countedOpinions}. Das ist
                    keine repräsentative Statistik.
                  </p>
                ) : null}

                {match.kind === "source_question" ? (
                  <p className="mt-2 text-xs leading-relaxed text-[rgb(var(--muted))]">
                    Quellenprüfungsbedarf: Dieser Vorschlag bleibt beim Review und ist
                    keine bestätigte Tatsachenbehauptung.
                  </p>
                ) : null}

                {match.requiresReview ? (
                  <p className="mt-2 text-xs leading-relaxed text-[rgb(var(--muted))]">
                    Review-first: Dossier-, Anlass- und Beteiligungsanschlüsse bleiben
                    vorbereitend und brauchen eine bewusste Prüfung.
                  </p>
                ) : null}

                {match.kind !== "source_question" ? (
                  <fieldset className="mt-3">
                    <legend className="text-xs font-semibold text-[rgb(var(--fg))]">
                      Wie möchtest du damit weitergehen?
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2" data-existing-match-decisions>
                      {CITIZEN_MATCH_DECISIONS.map((decision) => {
                        const selected = activeDecisions[match.id] === decision.id;
                        return (
                          <button
                            key={decision.id}
                            type="button"
                            className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                              selected
                                ? "border-cyan-500 bg-cyan-500/[0.14] text-cyan-950 dark:text-cyan-50"
                                : "border-slate-300 text-[rgb(var(--fg))] hover:border-slate-400 dark:border-[rgb(var(--border))]"
                            }`}
                            aria-pressed={selected}
                            onClick={() => {
                              if (!props.decisions) {
                                setDecisions((current) => ({ ...current, [match.id]: decision.id }));
                              }
                              props.onMatchDecision?.(match.id, decision.id);
                            }}
                          >
                            {decision.label}
                          </button>
                        );
                      })}
                    </div>
                    {activeDecisions[match.id] ? (
                      <p className="mt-2 text-xs text-[rgb(var(--muted))]" role="status">
                        Deine Auswahl bleibt ein Entwurf. Es wurde nichts zusammengeführt oder veröffentlicht.
                      </p>
                    ) : null}
                  </fieldset>
                ) : null}

                {action ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={action.onClick}
                      className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-[rgb(var(--fg))] transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[rgb(var(--border))]"
                      disabled={!action.onClick}
                    >
                      {action.label}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : props.model.emptyStateText ? (
        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-[rgb(var(--bg))] px-4 py-3 text-sm leading-relaxed text-[rgb(var(--fg))] dark:border-[rgb(var(--border))]">
          {props.model.emptyStateText}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={props.onStartNewBranch}
          disabled={!canStartNewBranch(props.model) || !props.onStartNewBranch}
          className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-[rgb(var(--fg))] transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[rgb(var(--border))]"
        >
          Eigenen Strang weiterführen
        </button>
      </div>

      {props.model.openQuestions.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200/80 px-4 py-3 dark:border-[rgb(var(--border))]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
            Noch offen
          </p>
          <ul className="mt-2 space-y-2 text-sm text-[rgb(var(--fg))]">
            {props.model.openQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
