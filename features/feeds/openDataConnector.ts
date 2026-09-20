import type { DurableSourceSnapshot } from "./sourceSnapshot";
import type { SourceRef } from "./sourceRef";

export type OpenDataProvenance = {
  providerId: string;
  sourceId: string;
  snapshotId: string;
  retrievedAt: string;
  apiVersion: string | null;
  licence: string | null;
  licenceUrl: string | null;
  sourceUrl: string;
};

export type OpenDataEventRole =
  | "official_event_record"
  | "civic_event_record"
  | "individual_vote_record"
  | "organization_statement"
  | "self_statement"
  | "reference_data";

export type NormalizedOpenDataEvent = {
  eventId: string;
  providerId: string;
  entityType: string;
  role: OpenDataEventRole;
  label: string;
  sourceUrl: string;
  occurredAt: string | null;
  parentEventId: string | null;
  jurisdictionCode: string | null;
  topicIds: string[];
  organizationIds: string[];
  attributes: Record<string, string | number | boolean | null>;
  provenance: OpenDataProvenance;
  reviewRequired: true;
  autoPublishAllowed: false;
};

export type OpenDataParseResult = {
  events: NormalizedOpenDataEvent[];
  provenance: OpenDataProvenance;
  warnings: string[];
};

export type OpenDataConnector = {
  connectorId: string;
  providerLabel: string;
  buildSourceRef(input: {
    resourcePath: string;
    regionCode?: string | null;
    topicHints?: string[] | null;
    label?: string | null;
  }): SourceRef;
  parseSnapshot(input: {
    body: string;
    source: SourceRef;
    snapshot: DurableSourceSnapshot;
  }): OpenDataParseResult;
};
