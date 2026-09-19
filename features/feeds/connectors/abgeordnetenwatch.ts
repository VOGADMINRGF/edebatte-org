import {
  type NormalizedOpenDataEvent,
  type OpenDataConnector,
  type OpenDataParseResult,
  type OpenDataProvenance,
} from "../openDataConnector";
import type { DurableSourceSnapshot } from "../sourceSnapshot";
import { normalizeSourceRef, type SourceRef } from "../sourceRef";

const PROVIDER_ID = "abgeordnetenwatch";
const CONNECTOR_ID = "abgeordnetenwatch:v2";
const ORIGIN = "https://www.abgeordnetenwatch.de";
const API_PREFIX = "/api/v2/";

const VOTE_VALUES = new Set(["yes", "no", "abstain", "no_show"]);

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function clean(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function idOf(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  const object = record(value);
  if (!object) return null;
  return idOf(object.id ?? object.entity_id ?? object.target_id);
}

function idsOf(value: unknown): string[] {
  if (!Array.isArray(value)) {
    const one = idOf(value);
    return one ? [one] : [];
  }
  return Array.from(new Set(value.map(idOf).filter((id): id is string => Boolean(id))));
}

function absoluteApiUrl(value: unknown, fallback: string): string {
  const raw = clean(value) ?? fallback;
  try {
    return new URL(raw, ORIGIN).toString();
  } catch {
    return new URL(fallback, ORIGIN).toString();
  }
}

function normalizeDate(value: unknown): string | null {
  const raw = clean(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function metaRecord(payload: JsonRecord) {
  const meta = record(payload.meta);
  return record(meta?.abgeordnetenwatch_api) ?? null;
}

function provenance(input: {
  payload: JsonRecord;
  source: SourceRef;
  snapshot: DurableSourceSnapshot;
}): OpenDataProvenance {
  const meta = metaRecord(input.payload);
  return {
    providerId: PROVIDER_ID,
    sourceId: input.source.sourceId,
    snapshotId: input.snapshot.snapshotId,
    retrievedAt: input.snapshot.retrievedAt,
    apiVersion: clean(meta?.version),
    licence: clean(meta?.licence) ?? input.snapshot.licence,
    licenceUrl: clean(meta?.licence_link) ?? input.snapshot.licenceUrl,
    sourceUrl: input.source.href,
  };
}

function entities(payload: JsonRecord): JsonRecord[] {
  if (Array.isArray(payload.data)) {
    return payload.data.map(record).filter((entry): entry is JsonRecord => Boolean(entry));
  }
  const single = record(payload.data);
  return single ? [single] : [];
}

function entityType(entity: JsonRecord): string {
  return clean(entity.entity_type)?.toLowerCase() ?? "unknown";
}

function pollEvent(entity: JsonRecord, source: SourceRef, p: OpenDataProvenance): NormalizedOpenDataEvent | null {
  const id = idOf(entity.id);
  if (!id) return null;
  const accepted = typeof entity.field_accepted === "boolean" ? entity.field_accepted : null;
  const attributes: Record<string, string | number | boolean | null> = {
    accepted,
    legislatureId: idOf(entity.field_legislature),
  };
  return {
    eventId: `${PROVIDER_ID}:poll:${id}`,
    providerId: PROVIDER_ID,
    entityType: "poll",
    role: "official_event_record",
    label: clean(entity.label) ?? `Abstimmung ${id}`,
    sourceUrl: absoluteApiUrl(entity.api_url, `/api/v2/polls/${id}`),
    occurredAt: normalizeDate(entity.field_poll_date),
    parentEventId: null,
    jurisdictionCode: source.regionCode,
    topicIds: idsOf(entity.field_topics).map((topicId) => `${PROVIDER_ID}:topic:${topicId}`),
    organizationIds: idsOf(entity.field_committees).map(
      (committeeId) => `${PROVIDER_ID}:committee:${committeeId}`,
    ),
    attributes,
    provenance: p,
    reviewRequired: true,
    autoPublishAllowed: false,
  };
}

function voteEvent(entity: JsonRecord, source: SourceRef, p: OpenDataProvenance): NormalizedOpenDataEvent | null {
  const id = idOf(entity.id);
  const pollId = idOf(entity.poll);
  if (!id || !pollId) return null;
  const rawVote = clean(entity.vote)?.toLowerCase() ?? null;
  const vote = rawVote && VOTE_VALUES.has(rawVote) ? rawVote : null;
  return {
    eventId: `${PROVIDER_ID}:vote:${id}`,
    providerId: PROVIDER_ID,
    entityType: "vote",
    role: "individual_vote_record",
    label: clean(entity.label) ?? `Einzelstimme ${id}`,
    sourceUrl: absoluteApiUrl(entity.api_url, `/api/v2/votes/${id}`),
    occurredAt: null,
    parentEventId: `${PROVIDER_ID}:poll:${pollId}`,
    jurisdictionCode: source.regionCode,
    topicIds: [],
    organizationIds: [
      ...idsOf(entity.fraction).map((fractionId) => `${PROVIDER_ID}:fraction:${fractionId}`),
      ...idsOf(entity.mandate).map((mandateId) => `${PROVIDER_ID}:mandate:${mandateId}`),
    ],
    attributes: {
      vote,
      noShowReason: clean(entity.reason_no_show),
      noShowReasonOther: clean(entity.reason_no_show_other),
      pollId,
      mandateId: idOf(entity.mandate),
      fractionId: idOf(entity.fraction),
    },
    provenance: p,
    reviewRequired: true,
    autoPublishAllowed: false,
  };
}

function referenceEvent(entity: JsonRecord, source: SourceRef, p: OpenDataProvenance): NormalizedOpenDataEvent | null {
  const type = entityType(entity);
  const id = idOf(entity.id);
  if (!id || type === "unknown") return null;
  return {
    eventId: `${PROVIDER_ID}:${type}:${id}`,
    providerId: PROVIDER_ID,
    entityType: type,
    role: "reference_data",
    label: clean(entity.label) ?? `${type} ${id}`,
    sourceUrl: absoluteApiUrl(entity.api_url, source.href),
    occurredAt: null,
    parentEventId: null,
    jurisdictionCode: source.regionCode,
    topicIds: [],
    organizationIds: [],
    attributes: {},
    provenance: p,
    reviewRequired: true,
    autoPublishAllowed: false,
  };
}

function parseSnapshot(input: {
  body: string;
  source: SourceRef;
  snapshot: DurableSourceSnapshot;
}): OpenDataParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.body);
  } catch {
    throw new Error("abgeordnetenwatch_invalid_json");
  }
  const payload = record(parsed);
  if (!payload) throw new Error("abgeordnetenwatch_invalid_payload");
  const p = provenance({ payload, source: input.source, snapshot: input.snapshot });
  const warnings: string[] = [];
  const events = entities(payload)
    .map((entity) => {
      const type = entityType(entity);
      if (type === "poll") return pollEvent(entity, input.source, p);
      if (type === "vote") return voteEvent(entity, input.source, p);
      return referenceEvent(entity, input.source, p);
    })
    .filter((entry): entry is NormalizedOpenDataEvent => Boolean(entry));

  if (!events.length) warnings.push("abgeordnetenwatch_no_normalizable_entities");
  if (!p.licence) warnings.push("abgeordnetenwatch_licence_missing");
  if (!p.apiVersion) warnings.push("abgeordnetenwatch_api_version_missing");

  return { events, provenance: p, warnings };
}

export const abgeordnetenwatchConnector: OpenDataConnector = {
  connectorId: CONNECTOR_ID,
  providerLabel: "abgeordnetenwatch.de",
  buildSourceRef(input) {
    const rawPath = String(input.resourcePath ?? "").trim();
    const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    if (!path.startsWith(API_PREFIX)) {
      throw new Error("abgeordnetenwatch_api_v2_path_required");
    }
    const source = normalizeSourceRef({
      kind: "open_data",
      href: new URL(path, ORIGIN).toString(),
      regionCode: input.regionCode ?? "DE",
      topicHints: input.topicHints ?? [],
      label: input.label ?? null,
      connector: CONNECTOR_ID,
    });
    if (!source) throw new Error("abgeordnetenwatch_invalid_source_ref");
    return source;
  },
  parseSnapshot,
};
