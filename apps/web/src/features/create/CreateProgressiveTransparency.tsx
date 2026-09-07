"use client";

import * as React from "react";
import {
  dedupeCreateProgressEvents,
  type CreateProgressEvent,
  type CreateProgressSegmentRef,
  type CreateProgressTopicRef,
} from "@/features/create/createProgressEventContract";

type Props = {
  events: CreateProgressEvent[];
  isRunning: boolean;
  locale: "de" | "en";
};

function eventSymbol(event: CreateProgressEvent) {
  if (event.status === "corrected") return "↺";
  if (event.status === "failed") return "!";
  if (event.status === "started" || event.status === "progress") return "◌";
  return "✓";
}

function eventClassName(event: CreateProgressEvent) {
  if (event.status === "corrected") return "text-amber-700 dark:text-amber-300";
  if (event.status === "failed") return "text-slate-700 dark:text-slate-200";
  if (event.status === "started" || event.status === "progress") {
    return "text-cyan-800 dark:text-cyan-200";
  }
  return "text-emerald-700 dark:text-emerald-300";
}

function topicRefs(events: CreateProgressEvent[]) {
  const seen = new Set<string>();
  return events.flatMap((event) =>
    (event.topicRefs ?? []).filter((topic) => {
      if (seen.has(topic.topicId)) return false;
      seen.add(topic.topicId);
      return true;
    }),
  );
}

function segmentMap(events: CreateProgressEvent[]) {
  const map = new Map<string, CreateProgressSegmentRef>();
  for (const event of events) {
    for (const segment of event.segmentRefs ?? []) map.set(segment.segmentId, segment);
  }
  return map;
}

function confidenceLabel(confidence: CreateProgressTopicRef["confidence"], locale: "de" | "en") {
  if (locale === "en") {
    if (confidence === "clear") return "clearly recognizable";
    if (confidence === "likely") return "likely";
    if (confidence === "open") return "still open";
    return "confirmation useful";
  }
  if (confidence === "clear") return "klar erkennbar";
  if (confidence === "likely") return "wahrscheinlich";
  if (confidence === "open") return "noch offen";
  return "Bestätigung sinnvoll";
}

export default function CreateProgressiveTransparency({ events, isRunning, locale }: Props) {
  const dedupedEvents = React.useMemo(() => dedupeCreateProgressEvents(events), [events]);
  const topics = React.useMemo(() => topicRefs(dedupedEvents), [dedupedEvents]);
  const segments = React.useMemo(() => segmentMap(dedupedEvents), [dedupedEvents]);
  const structureEvent = dedupedEvents.find((event) => event.type === "structure.detected");
  const isExpanded = Boolean(structureEvent) || topics.length >= 3;
  const visibleTopics = topics.slice(0, 4);
  const remainingTopics = Math.max(0, topics.length - visibleTopics.length);
  const structuralCount = structureEvent?.segmentRefs?.length ?? 0;
  const unresolvedAreas = isRunning ? Math.max(0, structuralCount - topics.length) : 0;
  const nonTopicEvents = dedupedEvents.filter((event) => event.type !== "topic.detected");
  const visibleEvents = isExpanded
    ? nonTopicEvents
    : nonTopicEvents.filter((event) =>
        ["draft.saved", "intake.classified", "result.ready", "result.partial"].includes(
          event.type,
        ),
      );
  const latestLabel = dedupedEvents.at(-1)?.label ?? "";
  const [announcedLabel, setAnnouncedLabel] = React.useState("");

  React.useEffect(() => {
    if (!latestLabel) return undefined;
    const timeout = window.setTimeout(() => setAnnouncedLabel(latestLabel), 400);
    return () => window.clearTimeout(timeout);
  }, [latestLabel]);

  if (dedupedEvents.length === 0) return null;

  return (
    <section
      data-create-progressive-transparency="true"
      className="rounded-2xl border border-cyan-200/80 bg-cyan-50/50 px-4 py-3.5 dark:border-cyan-900/70 dark:bg-cyan-950/20 md:px-5 md:py-4"
      aria-labelledby="create-progress-title"
    >
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcedLabel}
      </div>
      <p id="create-progress-title" className="text-sm font-semibold text-cyan-950 dark:text-cyan-100">
        {locale === "en" ? "Voxy is working on your concern" : "Voxy arbeitet an deinem Anliegen"}
      </p>
      <ul className="mt-3 space-y-2">
        {visibleEvents.map((event) => (
          <li key={event.eventId} className={`flex items-start gap-2 text-sm ${eventClassName(event)}`}>
            <span className="mt-px w-4 shrink-0 font-semibold">{eventSymbol(event)}</span>
            <span>{event.label}</span>
          </li>
        ))}
      </ul>

      {visibleTopics.length > 0 ? (
        <div className="mt-4 border-t border-cyan-200/70 pt-3 dark:border-cyan-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
            {locale === "en" ? "Already verified" : "Bereits geprüft"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleTopics.map((topic) => (
              <details key={topic.topicId} className="group rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-sm text-[rgb(var(--fg))]">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
                  <span>{topic.label}</span>
                  <span className="text-[10px] font-normal text-[rgb(var(--muted))]">
                    {locale === "en" ? "Why recognized?" : "Warum erkannt?"}
                  </span>
                </summary>
                <div className="mt-2 max-w-xs border-t border-[rgb(var(--border))] pt-2 text-xs font-normal text-[rgb(var(--muted))]">
                  <p>{confidenceLabel(topic.confidence, locale)}</p>
                  {(topic.segmentRefs ?? []).map((segmentId) => {
                    const segment = segments.get(segmentId);
                    if (!segment) return null;
                    return (
                      <p key={segmentId} className="mt-1">
                        {locale === "en" ? "Recognized from" : "Erkannt aus"}{" "}
                        {segment.sourceLine
                          ? locale === "en"
                            ? `section at line ${segment.sourceLine}`
                            : `Abschnitt in Zeile ${segment.sourceLine}`
                          : segment.label}
                      </p>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
          {remainingTopics > 0 ? (
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              + {remainingTopics} {locale === "en" ? "more verified topics" : "weitere geprüfte Themen"}
            </p>
          ) : null}
          {unresolvedAreas > 0 ? (
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              ◌ {unresolvedAreas}{" "}
              {locale === "en" ? "additional areas are being classified" : "weitere Bereiche werden eingeordnet"}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
