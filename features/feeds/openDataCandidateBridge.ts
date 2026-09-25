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

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDate(value: unknown): boolean {
  if (!nonEmptyString(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function validHttpUrl(value: unknown): boolean {
  if (!nonEmptyString(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Hard evidence gate before structured Open Data is allowed into the existing
 * StatementCandidate queue. TypeScript shapes are not enough here because
 * connector/provider payloads cross runtime boundaries.
 *
 * The event URL may identify one entity while provenance.sourceUrl identifies
 * the fetched collection/resource that contained it. Both must be valid and
 * the durable source/snapshot identity must remain present, but equality is
 * deliberately not required.
 */
export function assertOpenDataCandidateEvidence(event: NormalizedOpenDataEvent): void {
  const provenance = event?.provenance;
  const complete =
    nonEmptyString(event?.eventId) &&
    nonEmptyString(event?.providerId) &&
    nonEmptyString(event?.label) &&
    validHttpUrl(event?.sourceUrl) &&
    provenance &&
    nonEmptyString(provenance.providerId) &&
    nonEmptyString(provenance.sourceId) &&
    nonEmptyString(provenance.snapshotId) &&
    validIsoDate(provenance.retrievedAt) &&
    validHttpUrl(provenance.sourceUrl) &&
    provenance.providerId === event.providerId;

  if (!complete) {
    throw new Error("open_data_candidate_provenance_incomplete");
  }
  if (event.reviewRequired !== true || event.autoPublishAllowed !== false) {
    throw new Error("open_data_candidate_review_gate_invalid");
  }
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
  assertOpenDataCandidateEvidence(event);

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
