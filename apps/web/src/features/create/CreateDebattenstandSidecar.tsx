"use client";

import * as React from "react";
import {
  type CreateDebattenstandModel,
  type CreateDebattenstandStatusTone,
  type CreateDebattenstandTopicState,
} from "@/features/create/createDebattenstandSelector";

type CreateDebattenstandSidecarProps = {
  model: CreateDebattenstandModel;
  density?: "compact" | "expanded";
  onExpandTopics?: () => void;
};

function toneClassName(tone: CreateDebattenstandStatusTone): string {
  if (tone === "positive") {
    return "border-emerald-300/45 bg-emerald-500/[0.08] text-emerald-950 dark:text-emerald-100";
  }
  if (tone === "warning") {
    return "border-amber-300/45 bg-amber-500/[0.08] text-amber-950 dark:text-amber-100";
  }
  if (tone === "danger") {
    return "border-rose-300/45 bg-rose-500/[0.08] text-rose-950 dark:text-rose-100";
  }
  return "border-cyan-300/35 bg-cyan-500/[0.08] text-cyan-950 dark:text-cyan-100";
}

function topicStateClassName(state: CreateDebattenstandTopicState): string {
  if (state === "primary") {
    return "border-cyan-400/70 bg-cyan-500/[0.12] text-cyan-950 dark:text-cyan-100";
  }
  if (state === "focused") {
    return "border-sky-300/60 bg-sky-500/[0.1] text-sky-950 dark:text-sky-100";
  }
  if (state === "grouped") {
    return "border-emerald-300/60 bg-emerald-500/[0.1] text-emerald-950 dark:text-emerald-100";
  }
  if (state === "parked") {
    return "border-amber-300/60 bg-amber-500/[0.1] text-amber-950 dark:text-amber-100";
  }
  return "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]";
}

function StatusPair(props: { label: string; detail: string }) {
  return (
    <div className="space-y-1.5 rounded-[1.05rem] border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
        {props.label}
      </p>
      <p className="text-[13px] leading-relaxed text-[rgb(var(--muted))]">{props.detail}</p>
    </div>
  );
}

export function CreateDebattenstandStatusBar(props: {
  model: CreateDebattenstandModel;
  onOpen: () => void;
}) {
  return (
    <div
      data-create-debattenstand-statusbar
      className="xl:hidden rounded-[1.35rem] border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[rgb(var(--fg))]">{props.model.nextStepLabel}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[rgb(var(--muted))]">
            {props.model.topicSummaryLabel} · {props.model.progressLabel}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary min-h-[40px] shrink-0 px-3 py-2 text-sm"
          onClick={props.onOpen}
          aria-haspopup="dialog"
          aria-controls="create-debattenstand-sheet"
        >
          Details
        </button>
      </div>
    </div>
  );
}

export default function CreateDebattenstandSidecar({
  model,
  density = "compact",
  onExpandTopics,
}: CreateDebattenstandSidecarProps) {
  const isExpanded = density === "expanded";
  return (
    <div
      data-create-debattenstand-sidecar
      data-create-debattenstand-density={density}
      className="space-y-3.5"
    >
      <div className="rounded-[1.2rem] border border-cyan-300/35 bg-cyan-500/[0.06] px-3.5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-cyan-950 dark:text-cyan-100">Jetzt wichtig</p>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClassName(model.statusTone)}`}>
            {model.progressLabel}
          </span>
        </div>
        <p className="mt-2 text-base font-semibold text-[rgb(var(--fg))]">{model.nextStepLabel}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[rgb(var(--muted))]">
          {model.nextStepDetail}
        </p>
      </div>

      {model.errorLabel && model.errorDetail ? (
        <div className="rounded-[1.2rem] border border-rose-300/45 bg-rose-500/[0.08] px-3.5 py-3 text-rose-950 dark:text-rose-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{model.errorLabel}</p>
          <p className="mt-1 text-[13px] leading-relaxed">{model.errorDetail}</p>
        </div>
      ) : null}

      <div className="rounded-[1.2rem] border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3.5 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[rgb(var(--fg))]">{model.topicSummaryLabel}</p>
            {isExpanded ? (
              <p className="mt-1 text-[13px] leading-relaxed text-[rgb(var(--muted))]">{model.topicPreviewLabel}</p>
            ) : null}
          </div>
          <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-[12px] font-medium text-[rgb(var(--muted))]">
            {model.visibleTopicCount}/{model.totalTopicCount}
          </span>
        </div>
        {model.visibleTopics.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {model.visibleTopics.map((topic) => (
              <span
                key={topic.label}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${topicStateClassName(topic.state)}`}
              >
                {topic.label}
              </span>
            ))}
          </div>
        ) : null}
        {model.topicActionLabel && onExpandTopics ? (
          <button
            type="button"
            className="btn-secondary mt-3 min-h-[40px] w-full px-3 py-2 text-sm"
            onClick={onExpandTopics}
          >
            {model.topicActionLabel}
          </button>
        ) : null}
      </div>

      <details
        className="rounded-[1.2rem] border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-3.5 py-3"
        open={isExpanded || undefined}
      >
        <summary className="cursor-pointer text-sm font-medium text-[rgb(var(--fg))]">
          Einordnung und Quellen
        </summary>
        <div className="mt-3 grid gap-3">
          <StatusPair label={model.analysisStatusLabel} detail={model.analysisStatusDetail} />
          <StatusPair label={model.validationStatusLabel} detail={model.validationStatusDetail} />
          <StatusPair label={model.sourceStatusLabel} detail={model.sourceStatusDetail} />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[rgb(var(--muted))]">{model.phaseDetail}</p>
      </details>
    </div>
  );
}
