import crypto from "node:crypto";

import { upsertStatementCandidates } from "./storage";
import type { NormalizedOpenDataEvent } from "./openDataConnector";
import type { FeedItemInput, StatementCandidate } from "./types";
import { buildStatementCandidate } from "./utils";

export type OpenDataCandidateSink = (
  candidates: StatementCandidate[],
) => Promise<{ inserted: number }>;

function stableAttributes(attributes: Record<string, string | number | boolean | null>) {
  return Object.fromEntries(
    Object.entries(attributes).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function buildOpenDataEventFingerprint(event: NormalizedOpenDataEvent): string {
  const canonical = {
    providerId: event.providerId,
    eventId: event.eventId,
    entityType: event.entityType,
    role: event.role,
    label: event.label,
    sourceUrl: event.sourceUrl,
    occurredAt: event.occurredAt,
    parentEventId: event.parentEventId,
    jurisdictionCode: event.jurisdictionCode,
    topicIds: [...event.topicIds].sort(),
    organizationIds: [...event.organizationIds].sort(),
    attributes: stableAttributes(event.attributes),
  };
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function isOpenDataTopicCandidate(event: NormalizedOpenDataEvent): boolean {
  if (event.entityType !== "poll") return false;
  return event.role === "official_event_record" || event.role === "civic_event_record";
}

function eventSummary(event: NormalizedOpenDataEvent): string {
  const parts = ["Strukturierter Open-Data-Hinweis auf eine Abstimmung."];
  if (event.occurredAt) {
    const date = new Date(event.occurredAt);
    if (!Number.isNaN(date.getTime())) parts.push(`Datum: ${date.toISOString().slice(0, 10)}.`);
  }
  if (typeof event.attributes.accepted === "boolean") {
    parts.push(`Ergebnis laut Datenquelle: ${event.attributes.accepted ? "angenommen" : "abgelehnt"}.`);
  }
  parts.push("Vor Veröffentlichung bleiben Primärquellenabgleich und Review erforderlich.");
  return parts.join(" ");
}

export function openDataEventToStatementCandidate(
  event: NormalizedOpenDataEvent,
): StatementCandidate | null {
  if (!isOpenDataTopicCandidate(event)) return null;

  const item: FeedItemInput = {
    url: event.sourceUrl,
    title: event.label,
    summary: eventSummary(event),
    content: JSON.stringify({
      eventId: event.eventId,
      entityType: event.entityType,
      role: event.role,
      occurredAt: event.occurredAt,
      topicIds: event.topicIds,
      organizationIds: event.organizationIds,
      attributes: stableAttributes(event.attributes),
      provenance: event.provenance,
    }),
    publishedAt: event.occurredAt,
    sourceName: event.providerId,
    sourceType: `open_data:${event.providerId}:${event.entityType}`,
    regionCode: event.jurisdictionCode,
    sourceLocale: "de",
    topicHint: event.label,
  };

  const candidate = buildStatementCandidate(item, buildOpenDataEventFingerprint(event));
  candidate.createdAt = event.provenance.retrievedAt;
  candidate.priority = "normal";
  return candidate;
}

export function buildOpenDataStatementCandidates(
  events: NormalizedOpenDataEvent[],
): StatementCandidate[] {
  return events
    .map(openDataEventToStatementCandidate)
    .filter((candidate): candidate is StatementCandidate => Boolean(candidate));
}

export async function persistOpenDataStatementCandidates(input: {
  events: NormalizedOpenDataEvent[];
  sink?: OpenDataCandidateSink;
}): Promise<{ candidates: StatementCandidate[]; inserted: number }> {
  const candidates = buildOpenDataStatementCandidates(input.events);
  if (!candidates.length) return { candidates, inserted: 0 };
  const sink = input.sink ?? upsertStatementCandidates;
  const result = await sink(candidates);
  return { candidates, inserted: result.inserted };
}
