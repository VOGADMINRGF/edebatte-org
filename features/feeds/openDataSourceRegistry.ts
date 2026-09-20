import { abgeordnetenwatchConnector } from "./connectors/abgeordnetenwatch";
import type { OpenDataConnector } from "./openDataConnector";
import type { SourceRef } from "./sourceRef";

export type OpenDataCoverage = {
  mode: "bounded_latest_window";
  sortBy: string;
  sortDirection: "asc" | "desc";
  limit: number;
  completenessClaim: false;
};

export type ScheduledOpenDataSource = {
  registryId: string;
  providerId: string;
  connectorId: string;
  sourceRole: "parliamentary_open_data" | "official_open_data" | "statistical_open_data";
  dataClass: string;
  connector: OpenDataConnector;
  source: SourceRef;
  intervalMinutes: number;
  timeoutMs: number;
  expectedLicence: string | null;
  expectedLicenceUrl: string | null;
  coverage: OpenDataCoverage;
  reviewRequired: true;
  autoPublishAllowed: false;
};

const abgeordnetenwatchPolls = abgeordnetenwatchConnector.buildSourceRef({
  resourcePath:
    "/api/v2/polls?sort_by=field_poll_date&sort_direction=desc&range_start=0&range_end=250",
  regionCode: "DE",
  topicHints: ["parliamentary_poll"],
  label: "abgeordnetenwatch.de – aktuelle Abstimmungen",
});

/**
 * Canonical registry for scheduled structured/open-data sources.
 *
 * The coverage field is deliberately explicit: a bounded rolling window is not
 * a completeness claim. Provider response metadata remains authoritative for
 * API version and licence observed at fetch time.
 */
const REGISTRY: readonly ScheduledOpenDataSource[] = Object.freeze([
  Object.freeze({
    registryId: "open-data:abgeordnetenwatch:polls:de",
    providerId: "abgeordnetenwatch",
    connectorId: abgeordnetenwatchConnector.connectorId,
    sourceRole: "parliamentary_open_data" as const,
    dataClass: "parliamentary_poll",
    connector: abgeordnetenwatchConnector,
    source: abgeordnetenwatchPolls,
    intervalMinutes: 6 * 60,
    timeoutMs: 20_000,
    expectedLicence: "CC0 1.0",
    expectedLicenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.de",
    coverage: Object.freeze({
      mode: "bounded_latest_window" as const,
      sortBy: "field_poll_date",
      sortDirection: "desc" as const,
      limit: 250,
      completenessClaim: false as const,
    }),
    reviewRequired: true as const,
    autoPublishAllowed: false as const,
  }),
]);

export function listScheduledOpenDataSources(): ScheduledOpenDataSource[] {
  return REGISTRY.map((entry) => ({
    ...entry,
    source: {
      ...entry.source,
      topicHints: [...entry.source.topicHints],
    },
    coverage: { ...entry.coverage },
  }));
}
