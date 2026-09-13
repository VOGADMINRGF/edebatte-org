import { z } from "zod";
import {
  buildOfficialRegionsFromDirectory,
  buildOfficialRegionalActorsFromDirectory,
  getDirectorySourceStatus,
  listRegionsFromRegistry,
  summarizeOfficialAdministrativeDirectory,
  type DirectorySourceStatus,
} from "./directory";
import {
  mapRegionIntelligenceToSignals,
  runRegionIntelligencePreparation,
  type RegionIntelligencePreparationResult,
  type RegionIntelligenceReviewSuggestion,
  type RegionIntelligenceSourceAdapterContract,
  type RegionIntelligenceSourceStatusSummary,
  type RegionIntelligenceWeightingSummary,
} from "./intelligence";
import {
  canAttachSignalToDossier,
  canCreateAnlassraumDraft,
  canCreateDossierDraft,
  canCreateRegionDraft,
  canReadRegionDashboard,
  canReviewRegionSignal,
  type RegionAllowedAction,
  type RegionAccessContext,
} from "./access";
import {
  type CommunitySignal,
  type CommunitySignalReviewStatus,
  type Region,
  type RegionalActor,
  type RegionalAdminCockpit,
  type RegionalAnlassraum,
  normalizeCommunitySignalReviewStatus,
  normalizeCommunitySignalSubmitterMode,
  normalizeCommunitySignalType,
  normalizeRegionalActorType,
  normalizeRegionalActorVerificationStatus,
  parseCommunitySignal,
  parseRegionalActor,
} from "./contracts";
import {
  getCommunitySignalById,
  getRegionalAdminCockpitById,
  listCommunitySignals,
  listRegions,
  listRegionalAnlassraeume,
} from "./fixtures";
import {
  buildRuntimeRegionSignalProvenance,
  type RegionAnlassraumSuggestion,
  type RegionDossierSuggestion,
  type RegionFeedSignal,
  type RegionSignalReviewState,
  type RegionTopicCluster,
  parseRegionAnlassraumSuggestion,
  parseRegionDossierSuggestion,
  parseRegionFeedSignal,
  parseRegionTopicCluster,
  REGION_FEED_SIGNAL_FIXTURES,
} from "./regionFeedSignals";
import {
  type RegionParticipationAggregate,
  type RegionParticipationAggregationMode,
  type RegionParticipationPrivacyMode,
  type RegionParticipationReviewItem,
  type RegionParticipationReviewStatus,
  type RegionParticipationSignal,
  parseRegionParticipationAggregate,
} from "./regionParticipationSignals";
import {
  isReviewVisibilityState,
  resolveFeedVisibilityState,
  type RegionPublicationVisibilityState,
} from "./publicationRiskLadder";
import {
  getRegionGuidelineMatrixByProfile,
  resolveGuidelineProfileForRegion,
  type RegionGuidelineMatrix,
} from "./guidelines";
import {
  getParticipationSignalReviewRuntimeRepo,
  listParticipationSignalsForDashboard,
  listParticipationSignalsForReviewRuntime,
  serializeParticipationReviewItem,
  serializeParticipationSignalForDashboard,
  syncParticipationSignalRecords,
  type RegionParticipationSignalRecord,
} from "./server/participationSignalReviewRuntime";
import {
  buildRegionSourceConnectionFeedSignals,
  buildRegionIntelligenceSourceAdapterOverrides,
  listRegionSourceConnections,
  listRegionSourceTestResults,
} from "./server/sourceConnectionRuntime";
import {
  getRegionDataRepo,
  setRegionDataRepoForTests,
  type CommunitySignalRepoListQuery,
  type RegionalActorRepoListQuery,
} from "./server/repo";
import type { RegionSourceConnection, RegionSourceTestResult } from "./sourceConnections";

export type RegionalActorRegisterQuery = RegionalActorRepoListQuery;
export type CommunitySignalQueueQuery = CommunitySignalRepoListQuery;

export type RegionDashboardGuardrails = {
  noAutoPublish: true;
  noAutoDossierCreation: true;
  noAutoAnlassraumCreation: true;
  noScrapingByDefault: true;
  noTenderMonitoring: true;
  noProcurementMonitoring: true;
  reviewRequired: true;
};

export type RegionDashboardAccessSummary = {
  actorRole: string;
  isAdmin: boolean;
  authoritySource: RegionAccessContext["authoritySource"];
  adminFallback: boolean;
  verificationStatus: RegionAccessContext["verificationStatus"];
  hintedRegionIds: string[];
  verifiedRegionIds: string[];
  scopedRegionIds: string[];
  organizationIds: string[];
  paidDashboardEntitlement: RegionAccessContext["organization"]["paidDashboardEntitlement"];
  entitlementStatus: RegionAccessContext["organization"]["entitlementStatus"];
  entitlementReason: RegionAccessContext["organization"]["entitlementReason"];
  entitlementPlanId: string | null;
  entitlementPlanLabel: string | null;
  entitlementScope: RegionAccessContext["organization"]["entitlementScope"];
  entitlementSource: RegionAccessContext["organization"]["entitlementSource"];
  entitlementLimits: RegionAccessContext["organization"]["entitlementLimits"];
  entitlementUsage: RegionAccessContext["organization"]["entitlementUsage"];
  allowedActions: RegionAllowedAction[];
  canReadRegionDashboard: boolean;
  canReviewRegionSignal: boolean;
  canCreateRegionDraft: boolean;
  canAttachSignalToDossier: boolean;
  canCreateDossierDraft: boolean;
  canCreateAnlassraumDraft: boolean;
};

export type RegionDashboardOpenReviewItem = {
  id: string;
  title: string;
  sourceClass: "feed" | "participation";
  sourceType: RegionFeedSignal["sourceType"] | RegionParticipationSignal["sourceType"];
  suggestedAction: RegionFeedSignal["suggestedAction"] | "review_public_input";
  reviewStatus: RegionSignalReviewState | RegionParticipationReviewStatus;
  visibilityState: RegionPublicationVisibilityState;
  dataOrigin: RegionFeedSignal["provenance"]["dataOrigin"];
  isFixture: boolean;
  confidence: number;
  aggregationMode: RegionParticipationAggregationMode | null;
  privacyMode: RegionParticipationPrivacyMode | null;
};

export type RegionDashboardActiveDossier = {
  id: string;
  title: string;
  sourceAnlassraumIds: string[];
  status: "reference_only";
};

export type RegionalAdminCockpitReadModel = {
  region: Region;
  accessSummary: RegionDashboardAccessSummary;
  guidelineProfile: string | null;
  guidelineMatrix: RegionGuidelineMatrix | null;
  actorCount: number;
  verifiedActorCount: number;
  officialDirectoryActorCount: number;
  signalCount: number;
  pendingSignalCount: number;
  directoryStructureBreakdown: Array<{ administrativeUnitType: string; count: number }>;
  cockpit: RegionalAdminCockpit;
  feedSignals: RegionFeedSignal[];
  participationSignals: RegionParticipationSignal[];
  participationAggregates: RegionParticipationAggregate[];
  publicClaimsSummary: {
    total: number;
    reviewPending: number;
    labels: string[];
  };
  publicQuestionsSummary: {
    total: number;
    reviewPending: number;
    labels: string[];
  };
  swipeInterestSummary: {
    totalSignals: number;
    totalCount: number;
    labels: string[];
  };
  counterpointSummary: {
    totalSignals: number;
    totalCount: number;
    labels: string[];
  };
  communitySourceHints: RegionParticipationSignal[];
  reviewItemsFromPublicInput: RegionParticipationReviewItem[];
  needsRegionReviewSignals: RegionParticipationReviewItem[];
  topicClusters: RegionTopicCluster[];
  suggestedAnlassraeume: RegionAnlassraumSuggestion[];
  suggestedDossiers: RegionDossierSuggestion[];
  intelligenceSources: RegionIntelligenceSourceAdapterContract[];
  intelligenceSourceStatus: RegionIntelligenceSourceStatusSummary;
  intelligenceWeighting: RegionIntelligenceWeightingSummary;
  intelligenceReviewSuggestions: RegionIntelligenceReviewSuggestion[];
  sourceConnections: RegionSourceConnection[];
  sourceTestResults: RegionSourceTestResult[];
  openReviewItems: RegionDashboardOpenReviewItem[];
  activeDossiers: RegionDashboardActiveDossier[];
  activeAnlassraeume: RegionalAnlassraum[];
  communitySignals: CommunitySignal[];
  actorsSummary: {
    total: number;
    verified: number;
    officialDirectory: number;
    manual: number;
    administration: number;
  };
  guardrails: RegionDashboardGuardrails;
};

const DEFAULT_DASHBOARD_GUARDRAILS: RegionDashboardGuardrails = {
  noAutoPublish: true,
  noAutoDossierCreation: true,
  noAutoAnlassraumCreation: true,
  noScrapingByDefault: true,
  noTenderMonitoring: true,
  noProcurementMonitoring: true,
  reviewRequired: true,
};

const CommunitySignalCreateSchema = z
  .object({
    regionId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    signalType: z.string().trim().min(1).optional(),
    sourceActorId: z.string().trim().min(1).nullable().optional(),
    sourceUrls: z.array(z.string().trim().url()).optional(),
    submitter: z.object({
      mode: z.string().trim().min(1).optional(),
      displayName: z.string().trim().min(1).nullable().optional(),
      contactChannel: z.string().trim().min(1).nullable().optional(),
    }),
  })
  .strict();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildActorRegisterMap(entries: RegionalActor[]): Map<string, RegionalActor> {
  return new Map(entries.map((entry) => [entry.id, clone(entry)]));
}

function normalizeLimit(value: unknown, fallback = 100) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(1, Math.min(2000, Math.floor(numeric)));
}

function buildIsoNow(): string {
  return new Date().toISOString();
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function slugify(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function matchesActorQuery(actor: RegionalActor, query: RegionalActorRegisterQuery): boolean {
  if (query.regionId?.trim() && actor.regionId !== query.regionId.trim()) return false;
  if (query.actorType && query.actorType !== "all" && actor.actorType !== query.actorType) return false;
  if (
    query.verificationStatus &&
    query.verificationStatus !== "all" &&
    actor.verificationStatus !== query.verificationStatus
  ) {
    return false;
  }
  if (query.sourceKind && query.sourceKind !== "all" && actor.sourceKind !== query.sourceKind) return false;
  return true;
}

function matchesSignalQuery(signal: CommunitySignal, query: CommunitySignalQueueQuery): boolean {
  if (query.regionId?.trim() && signal.regionId !== query.regionId.trim()) return false;
  if (query.signalType && query.signalType !== "all" && signal.signalType !== query.signalType) return false;
  if (query.reviewStatus && query.reviewStatus !== "all" && signal.reviewStatus !== query.reviewStatus) {
    return false;
  }
  return true;
}

function collectScopedRegionIds(rootRegionId: string, regions: Region[]): string[] {
  const byParent = new Map<string, Region[]>();
  for (const region of regions) {
    const parentRegionId = region.parentRegionId ?? "";
    if (!byParent.has(parentRegionId)) byParent.set(parentRegionId, []);
    byParent.get(parentRegionId)?.push(region);
  }

  const visited = new Set<string>();
  const queue = [rootRegionId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const child of byParent.get(current) ?? []) {
      queue.push(child.id);
    }
  }

  return Array.from(visited);
}

async function resolveRegionFeedSignals(params: {
  region: Region;
  scopedRegionIds: string[];
  activeAnlassraeume: RegionalAnlassraum[];
  communitySignals: CommunitySignal[];
  regionMap: Map<string, Region>;
  accessContext: RegionAccessContext;
  actors: RegionalActor[];
  sourceConnections: RegionSourceConnection[];
}): Promise<{
  feedSignals: RegionFeedSignal[];
  preparation: RegionIntelligencePreparationResult;
}> {
  const activeAnlassraumIds = params.activeAnlassraeume.map((entry) => entry.id);
  const pilotSignals = REGION_FEED_SIGNAL_FIXTURES.filter((signal) =>
    params.scopedRegionIds.includes(signal.regionId),
  ).map((signal) => clone(signal));
  const productiveSourceSignals = buildRegionSourceConnectionFeedSignals({
    connections: params.sourceConnections,
    regionNameById: new Map(
      Array.from(params.regionMap.entries()).map(([id, region]) => [id, region.name]),
    ),
  });

  const preparation = await runRegionIntelligencePreparation({
    region: params.region,
    organization: {
      primaryOrganizationId: params.accessContext.organization.primaryOrganizationId,
      organizationIds: params.accessContext.organization.organizationIds,
      actorRole: params.accessContext.actorRole,
      entitlementStatus: params.accessContext.organization.entitlementStatus,
      verificationStatus: params.accessContext.verificationStatus,
      regionalActorLabels: uniqueNonEmpty(
        params.actors
          .filter((actor) => actor.actorType === "verwaltung")
          .map((actor) => actor.name),
      ).slice(0, 8),
    },
    orientation: {
      audience:
        params.accessContext.actorRole === "admin" ? "verwaltung_organisation" : "regional_organization",
      goal: "Reviewpflichtige regionale Startlage fuer Themencluster, Dossier-Vorschlaege, Anlassraum-Vorschlaege und offene Fragen",
      focusTopics: uniqueNonEmpty([
        ...pilotSignals.flatMap((signal) => signal.detectedTopics),
        ...productiveSourceSignals.flatMap((signal) => signal.detectedTopics),
        ...params.communitySignals.flatMap((signal) => signal.title ? [signal.title] : []),
      ]).slice(0, 12),
      expectedOutputs: [
        "topic_clusters",
        "dossier_suggestions",
        "anlassraum_suggestions",
        "open_questions",
      ],
    },
    sources: [
      ...pilotSignals.map((signal) => ({
        kind: "feed_signal" as const,
        signal,
      })),
      ...productiveSourceSignals.map((signal) => ({
        kind: "feed_signal" as const,
        signal,
      })),
      ...params.communitySignals.map((signal) => ({
        kind: "community_signal" as const,
        signal,
        regionName: params.regionMap.get(signal.regionId)?.name ?? params.region.name,
        activeAnlassraumIds,
        defaultAnlassraumTitle: params.activeAnlassraeume[0]?.title ?? null,
      })),
    ],
    sourceAdapters: buildRegionIntelligenceSourceAdapterOverrides(params.sourceConnections),
  });

  return {
    feedSignals: mapRegionIntelligenceToSignals(preparation),
    preparation,
  };
}

function buildParticipationAggregates(
  regionId: string,
  signals: RegionParticipationSignal[],
): RegionParticipationAggregate[] {
  const buckets = new Map<string, RegionParticipationSignal[]>();
  for (const signal of signals) {
    const key =
      signal.sourceType === "swipe_interest"
        ? "swipe-interest"
        : signal.sourceType === "swipe_counterpoint"
          ? "swipe-counterpoint"
          : signal.sourceType === "public_claim"
            ? "public-claims"
            : signal.sourceType === "public_question"
              ? "public-questions"
              : signal.sourceType === "public_source_hint"
                ? "public-source-hints"
                : "public-contributions";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)?.push(signal);
  }

  return Array.from(buckets.entries()).map(([key, bucket]) =>
    parseRegionParticipationAggregate({
      id: `region-participation-aggregate-${regionId}-${key}`,
      regionId,
      label:
        key === "swipe-interest"
          ? "Swipe-/Interesse-Signale"
          : key === "swipe-counterpoint"
            ? "Gegenpositionen"
            : key === "public-claims"
              ? "Aussagen aus der Öffentlichkeit"
              : key === "public-questions"
                ? "Fragen aus der Öffentlichkeit"
                : key === "public-source-hints"
                  ? "Quellenhinweise aus der Community"
                  : "Öffentliche Beiträge",
      summary:
        key === "swipe-interest" || key === "swipe-counterpoint"
          ? `${bucket.length} anonymisierte Hinweise ohne Personenbezug und ohne Repräsentativitätsbehauptung.`
          : `${bucket.length} reviewpflichtige öffentliche Hinweise, ungeprüft und nicht amtlich.`,
      signalIds: uniqueNonEmpty(bucket.map((signal) => signal.id)),
      sourceTypes: bucket.map((signal) => signal.sourceType),
      totalSignals: bucket.length,
      totalCount: bucket.length,
      detectedTopics: uniqueNonEmpty(bucket.flatMap((signal) => signal.detectedTopics)),
      aggregationMode:
        bucket.every((signal) => signal.aggregationMode === "anonymized_count")
          ? "anonymized_count"
          : bucket.some((signal) => signal.aggregationMode === "aggregate_only")
            ? "aggregate_only"
            : "single_review_item",
      privacyMode:
        bucket.every((signal) => signal.privacyMode === "anonymized")
          ? "anonymized"
          : bucket.some((signal) => signal.privacyMode === "review_restricted")
            ? "review_restricted"
            : "no_personal_data",
      reviewStatus: bucket.every((signal) => signal.reviewStatus === "accepted")
        ? "accepted"
        : "needs_review",
      noPersonalProfiling: true,
      noPoliticalScoring: true,
      noRepresentativeClaim: true,
    }),
  );
}

function buildParticipationSummary(
  signals: RegionParticipationSignal[],
  sourceType: RegionParticipationSignal["sourceType"],
) {
  const filtered = signals.filter((signal) => signal.sourceType === sourceType);
  return {
    total: filtered.length,
    reviewPending: filtered.filter((signal) => signal.visibilityState === "public_unverified").length,
    labels: uniqueNonEmpty(
      filtered.flatMap((signal) => [
        signal.title,
        ...signal.detectedTopics,
      ]),
    ).slice(0, 4),
  };
}

function buildSwipeSummary(
  signals: RegionParticipationSignal[],
  sourceType: "swipe_interest" | "swipe_counterpoint",
) {
  const filtered = signals.filter((signal) => signal.sourceType === sourceType);
  return {
    totalSignals: filtered.length,
    totalCount: filtered.length,
    labels: uniqueNonEmpty(filtered.map((signal) => signal.title)).slice(0, 4),
  };
}

function buildParticipationReviewItems(
  records: RegionParticipationSignalRecord[],
): RegionParticipationReviewItem[] {
  return records
    .filter(
      (record) =>
        isReviewVisibilityState(record.visibilityState),
    )
    .map((record) => serializeParticipationReviewItem(record));
}

function buildTopicClusters(regionId: string, signals: RegionFeedSignal[]): RegionTopicCluster[] {
  const buckets = new Map<string, RegionFeedSignal[]>();
  for (const signal of signals) {
    const key = signal.clusterKey ?? slugify(signal.detectedTopics[0] ?? signal.title);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)?.push(signal);
  }

  return Array.from(buckets.entries()).map(([key, bucket]) =>
    parseRegionTopicCluster({
      id: `region-topic-cluster-${regionId}-${key}`,
      regionId,
      label: bucket[0]?.suggestedAnlassraumTitle ?? bucket[0]?.detectedTopics[0] ?? bucket[0]?.title,
      summary: `${bucket.length} reviewpflichtige Signale werden als Themencluster gebuendelt.`,
      signalIds: uniqueNonEmpty(bucket.map((signal) => signal.id)),
      sourceIds: uniqueNonEmpty(bucket.map((signal) => signal.sourceId)),
      detectedTopics: uniqueNonEmpty(bucket.flatMap((signal) => signal.detectedTopics)),
      openQuestions: uniqueNonEmpty(bucket.flatMap((signal) => signal.openQuestions ?? [])),
      suggestedAction: bucket.some((signal) => signal.suggestedAction === "create_dossier")
        ? "create_dossier"
        : bucket[0]?.suggestedAction ?? "ask_clarifying_question",
      confidence: Number(average(bucket.map((signal) => signal.confidence)).toFixed(2)),
      reviewStatus: bucket.every((signal) => signal.reviewStatus === "accepted") ? "accepted" : "needs_review",
      provenance:
        bucket.every((signal) => signal.provenance.dataOrigin === "runtime_review_queue")
          ? buildRuntimeRegionSignalProvenance()
          : bucket[0]?.provenance,
      noAutoPublish: true,
      noAutoCreateDossier: true,
      noAutoCreateAnlassraum: true,
      noTenderMonitoring: true,
      noProcurementMonitoring: true,
    }),
  );
}

function buildSuggestedDossiers(regionId: string, signals: RegionFeedSignal[]): RegionDossierSuggestion[] {
  const buckets = new Map<string, RegionFeedSignal[]>();
  for (const signal of signals.filter((entry) => entry.suggestedDossierTitle)) {
    const key = signal.suggestedDossierTitle ?? signal.title;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)?.push(signal);
  }

  return Array.from(buckets.entries()).map(([title, bucket]) =>
    parseRegionDossierSuggestion({
      id: `region-dossier-suggestion-${regionId}-${slugify(title)}`,
      regionId,
      title,
      summary: `${bucket.length} Signale sprechen fuer einen reviewpflichtigen Dossier-Entwurf. Kein automatisches Dossier.`,
      relatedSignalIds: uniqueNonEmpty(bucket.map((signal) => signal.id)),
      relatedDossiers: uniqueNonEmpty(bucket.flatMap((signal) => signal.relatedDossiers)),
      openQuestions: uniqueNonEmpty(bucket.flatMap((signal) => signal.openQuestions ?? [])),
      suggestedAction: bucket.some((signal) => signal.suggestedAction === "create_dossier")
        ? "create_dossier"
        : "attach_source_to_dossier",
      confidence: Number(average(bucket.map((signal) => signal.confidence)).toFixed(2)),
      reviewStatus: bucket.every((signal) => signal.reviewStatus === "accepted") ? "accepted" : "needs_review",
      provenance: bucket[0]?.provenance,
      noAutoPublish: true,
      noAutoCreateDossier: true,
      noAutoCreateAnlassraum: true,
      noTenderMonitoring: true,
      noProcurementMonitoring: true,
    }),
  );
}

function buildSuggestedAnlassraeume(
  regionId: string,
  signals: RegionFeedSignal[],
): RegionAnlassraumSuggestion[] {
  const buckets = new Map<string, RegionFeedSignal[]>();
  for (const signal of signals.filter((entry) => entry.suggestedAnlassraumTitle)) {
    const key = signal.suggestedAnlassraumTitle ?? signal.title;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)?.push(signal);
  }

  return Array.from(buckets.entries()).map(([title, bucket]) =>
    parseRegionAnlassraumSuggestion({
      id: `region-anlassraum-suggestion-${regionId}-${slugify(title)}`,
      regionId,
      title,
      summary: `${bucket.length} Signale koennen in einen Anlassraum-Vorschlag ueberfuehrt werden. Review bleibt Pflicht.`,
      relatedSignalIds: uniqueNonEmpty(bucket.map((signal) => signal.id)),
      relatedAnlassraumIds: uniqueNonEmpty(bucket.flatMap((signal) => signal.relatedAnlassraumIds)),
      openQuestions: uniqueNonEmpty(bucket.flatMap((signal) => signal.openQuestions ?? [])),
      suggestedAction: bucket.some((signal) => signal.suggestedAction === "create_anlassraum")
        ? "create_anlassraum"
        : "attach_to_anlassraum",
      confidence: Number(average(bucket.map((signal) => signal.confidence)).toFixed(2)),
      reviewStatus: bucket.every((signal) => signal.reviewStatus === "accepted") ? "accepted" : "needs_review",
      provenance: bucket[0]?.provenance,
      noAutoPublish: true,
      noAutoCreateDossier: true,
      noAutoCreateAnlassraum: true,
      noTenderMonitoring: true,
      noProcurementMonitoring: true,
    }),
  );
}

function buildOpenReviewItems(
  feedSignals: RegionFeedSignal[],
  participationRecords: RegionParticipationSignalRecord[],
): RegionDashboardOpenReviewItem[] {
  const feedItems = feedSignals
    .filter((signal) =>
      isReviewVisibilityState(
        resolveFeedVisibilityState({
          reviewStatus: signal.reviewStatus,
          sourceType: signal.sourceType,
        }),
      ),
    )
    .map((signal) => ({
      id: signal.id,
      title: signal.title,
      sourceClass: "feed" as const,
      sourceType: signal.sourceType,
      suggestedAction: signal.suggestedAction,
      reviewStatus: signal.reviewStatus,
      visibilityState: resolveFeedVisibilityState({
        reviewStatus: signal.reviewStatus,
        sourceType: signal.sourceType,
      }),
      dataOrigin: signal.provenance.dataOrigin,
      isFixture: signal.provenance.isFixture,
      confidence: signal.confidence,
      aggregationMode: null,
      privacyMode: null,
    }));

  const participationItems = participationRecords
    .filter((record) => isReviewVisibilityState(record.visibilityState))
    .map((record) => ({
      id: record.id,
      title: record.publicSafeTitle ?? record.title,
      sourceClass: "participation" as const,
      sourceType: record.sourceType,
      suggestedAction: "review_public_input" as const,
      reviewStatus: record.reviewStatus,
      visibilityState: record.visibilityState,
      dataOrigin:
        record.provenance.sourceKind === "fixture"
          ? ("pilot_fixture" as const)
          : ("runtime_review_queue" as const),
      isFixture: record.provenance.isFixture,
      confidence: record.confidence,
      aggregationMode: record.aggregationMode,
      privacyMode: record.privacyMode,
    }));

  return [...feedItems, ...participationItems].sort((left, right) => right.confidence - left.confidence);
}

function buildActiveDossiers(activeAnlassraeume: RegionalAnlassraum[]): RegionDashboardActiveDossier[] {
  const dossierMap = new Map<string, RegionDashboardActiveDossier>();
  for (const anlassraum of activeAnlassraeume) {
    for (const dossierId of anlassraum.links.dossierIds) {
      const existing = dossierMap.get(dossierId);
      if (existing) {
        existing.sourceAnlassraumIds = uniqueNonEmpty([...existing.sourceAnlassraumIds, anlassraum.id]);
        continue;
      }
      dossierMap.set(dossierId, {
        id: dossierId,
        title: `Referenzdossier ${dossierId}`,
        sourceAnlassraumIds: [anlassraum.id],
        status: "reference_only",
      });
    }
  }

  return Array.from(dossierMap.values());
}

function buildAccessSummary(regionId: string, context: RegionAccessContext): RegionDashboardAccessSummary {
  return {
    actorRole: context.actorRole,
    isAdmin: context.isAdmin,
    authoritySource: context.authoritySource,
    adminFallback: context.adminFallback,
    verificationStatus: context.verificationStatus,
    hintedRegionIds: context.hintedRegionIds,
    verifiedRegionIds: context.verifiedRegionIds,
    scopedRegionIds: context.scopedRegionIds,
    organizationIds: context.organization.organizationIds,
    paidDashboardEntitlement: context.organization.paidDashboardEntitlement,
    entitlementStatus: context.organization.entitlementStatus,
    entitlementReason: context.organization.entitlementReason,
    entitlementPlanId: context.organization.entitlementPlanId,
    entitlementPlanLabel: context.organization.entitlementPlanLabel,
    entitlementScope: context.organization.entitlementScope,
    entitlementSource: context.organization.entitlementSource,
    entitlementLimits: context.organization.entitlementLimits,
    entitlementUsage: context.organization.entitlementUsage,
    allowedActions: context.allowedActions,
    canReadRegionDashboard: canReadRegionDashboard(context, regionId),
    canReviewRegionSignal: canReviewRegionSignal(context, regionId),
    canCreateRegionDraft: canCreateRegionDraft(context, regionId),
    canAttachSignalToDossier: canAttachSignalToDossier(context, regionId),
    canCreateDossierDraft: canCreateDossierDraft(context, regionId),
    canCreateAnlassraumDraft: canCreateAnlassraumDraft(context, regionId),
  };
}

function buildDefaultCockpit(params: {
  region: Region;
  feedSignals: RegionFeedSignal[];
  actors: RegionalActor[];
  openReviewItems: RegionDashboardOpenReviewItem[];
  topicClusters: RegionTopicCluster[];
  suggestedDossiers: RegionDossierSuggestion[];
  intelligenceSourceStatus: RegionIntelligenceSourceStatusSummary;
  intelligenceReviewSuggestions: RegionIntelligenceReviewSuggestion[];
}): RegionalAdminCockpit {
  const fixtureCockpit = getRegionalAdminCockpitById(`admin-cockpit-${params.region.slug}`);
  const base = fixtureCockpit ?? getRegionalAdminCockpitById(`admin-cockpit-${params.region.id}`);

  return {
    id: base?.id ?? `admin-cockpit-${params.region.id}`,
    regionId: params.region.id,
    title: base?.title ?? `Verwaltungscockpit ${params.region.name}`,
    modules: {
      themenlage: {
        headline: "Themenlage",
        summary: `${params.feedSignals.length} kuratierte Signale, ${params.topicClusters.length} Themencluster und ${params.intelligenceReviewSuggestions.length} reviewpflichtige Intelligence-Vorschlaege liegen fuer ${params.region.name} vor.`,
      },
      akteurskarte: {
        headline: "Akteurskarte",
        summary: `${params.actors.length} regionale Akteure sind sichtbar, davon ${params.actors.filter((actor) => actor.actorType === "verwaltung").length} Verwaltungseintraege.`,
      },
      beteiligungsstatus: {
        headline: "Beteiligungsstatus",
        summary: `${params.openReviewItems.length} Signale oder Vorschlaege warten auf Sichtung, Review oder Zuordnung.`,
      },
      offene_fragen: {
        headline: "Offene Fragen",
        summary: `${params.suggestedDossiers.length} Dossier-Vorschlaege bleiben ohne automatische Erstellung und brauchen redaktionelle Klaerung. ${params.intelligenceSourceStatus.overallLabel}`,
      },
      teilhabegaps: {
        headline: "Teilhabegaps",
        summary: "Das Lagebild bleibt ausdruecklich ohne Scoring und markiert nur reviewpflichtige Beteiligungs- und Informationsluecken.",
      },
      naechste_rueckmeldungen: {
        headline: "Naechste Rueckmeldungen",
        summary: "Feed-Signale, Buergerhinweise und Verwaltungsnotizen werden erst nach Review weitergefuehrt.",
      },
      mandatsstatus: {
        headline: "Mandatsstatus",
        summary: "Kein Auto-Mandat und keine Auto-Freigabe: jede Weitergabe bleibt ein bewusster Freigabeschritt.",
      },
    },
    guardrails: {
      noCitizenScoring: true,
      noAssociationScoring: true,
      noAutomatedEnforcement: true,
    },
    createdAt: base?.createdAt ?? buildIsoNow(),
    updatedAt: buildIsoNow(),
  };
}

export type OperationalRegionCatalog = {
  regions: Region[];
  aliases: OperationalRegionAliases[];
  sources: {
    regionRegistry: DirectorySourceStatus;
    officialDirectory: DirectorySourceStatus;
    fixtureCount: number;
  };
};

export type OperationalRegionAliases = {
  regionId: string;
  ids: string[];
  slugs: string[];
  names: string[];
  ags: string[];
  ars: string[];
  administrativeLabels: string[];
};

type OperationalRegionSource = "registry" | "directory" | "fixture";

type OperationalRegionCandidate = {
  region: Region;
  source: OperationalRegionSource;
};

function normalizeRegionLookup(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("de-DE");
}

function normalizeRegionIdentifier(value: string | null | undefined): string | null {
  const normalized = normalizeRegionLookup(value);
  return normalized || null;
}

function stableRegionIdentityKeys(region: Region): string[] {
  return uniqueNonEmpty([
    normalizeRegionIdentifier(region.id)
      ? `id:${normalizeRegionIdentifier(region.id)}`
      : null,
    normalizeRegionIdentifier(region.officialDirectoryEntry?.ags)
      ? `ags:${normalizeRegionIdentifier(region.officialDirectoryEntry?.ags)}`
      : null,
    normalizeRegionIdentifier(region.officialDirectoryEntry?.ars)
      ? `ars:${normalizeRegionIdentifier(region.officialDirectoryEntry?.ars)}`
      : null,
  ]);
}

const operationalRegionSourceRank: Record<OperationalRegionSource, number> = {
  registry: 0,
  directory: 1,
  fixture: 2,
};

function compareOperationalCandidates(
  left: OperationalRegionCandidate,
  right: OperationalRegionCandidate,
): number {
  const sourceDifference =
    operationalRegionSourceRank[left.source] -
    operationalRegionSourceRank[right.source];
  if (sourceDifference !== 0) return sourceDifference;

  const leftValues = [
    left.region.id,
    left.region.officialDirectoryEntry?.ags,
    left.region.officialDirectoryEntry?.ars,
    left.region.slug,
  ].map(normalizeRegionLookup);
  const rightValues = [
    right.region.id,
    right.region.officialDirectoryEntry?.ags,
    right.region.officialDirectoryEntry?.ars,
    right.region.slug,
  ].map(normalizeRegionLookup);

  for (let index = 0; index < leftValues.length; index += 1) {
    const difference = leftValues[index].localeCompare(rightValues[index], "de");
    if (difference !== 0) return difference;
  }
  return 0;
}

function operationalSlugSuffix(region: Region): string {
  return slugify(
    region.officialDirectoryEntry?.ags ??
      region.officialDirectoryEntry?.ars ??
      region.id,
  );
}

function ensureUniqueOperationalSlugs(
  candidates: OperationalRegionCandidate[],
): OperationalRegionCandidate[] {
  const slugCounts = new Map<string, number>();
  for (const { region } of candidates) {
    slugCounts.set(region.slug, (slugCounts.get(region.slug) ?? 0) + 1);
  }

  const usedSlugs = new Set<string>();
  return candidates.map((candidate) => {
    const baseSlug = candidate.region.slug;
    let slug =
      usedSlugs.has(baseSlug) || (slugCounts.get(baseSlug) ?? 0) > 1
        ? `${baseSlug}-${operationalSlugSuffix(candidate.region)}`
        : baseSlug;
    let collisionIndex = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${operationalSlugSuffix(candidate.region)}-${collisionIndex}`;
      collisionIndex += 1;
    }
    usedSlugs.add(slug);
    return slug === candidate.region.slug
      ? candidate
      : {
          ...candidate,
          region: {
            ...candidate.region,
            slug,
          },
        };
  });
}

export function buildOperationalRegionCatalog(input: {
  registryRegions: readonly Region[];
  directoryRegions: readonly Region[];
  fixtureRegions: readonly Region[];
  regionRegistryStatus: DirectorySourceStatus;
  officialDirectoryStatus: DirectorySourceStatus;
}): OperationalRegionCatalog {
  const candidates: OperationalRegionCandidate[] = [
    ...input.registryRegions.map((region) => ({
      region: clone(region),
      source: "registry" as const,
    })),
    ...input.directoryRegions.map((region) => ({
      region: clone(region),
      source: "directory" as const,
    })),
    ...input.fixtureRegions.map((region) => ({
      region: clone(region),
      source: "fixture" as const,
    })),
  ];
  const parents = candidates.map((_, index) => index);

  const findRoot = (candidateIndex: number): number => {
    let root = candidateIndex;
    while (parents[root] !== root) root = parents[root];
    let current = candidateIndex;
    while (parents[current] !== current) {
      const next = parents[current];
      parents[current] = root;
      current = next;
    }
    return root;
  };
  const union = (leftIndex: number, rightIndex: number) => {
    const leftRoot = findRoot(leftIndex);
    const rightRoot = findRoot(rightIndex);
    if (leftRoot === rightRoot) return;
    const canonicalRoot = Math.min(leftRoot, rightRoot);
    parents[leftRoot] = canonicalRoot;
    parents[rightRoot] = canonicalRoot;
  };
  const identityOwners = new Map<string, number>();

  candidates.forEach((candidate, candidateIndex) => {
    stableRegionIdentityKeys(candidate.region).forEach((identity) => {
      const existingOwner = identityOwners.get(identity);
      if (existingOwner === undefined) {
        identityOwners.set(identity, candidateIndex);
      } else {
        union(existingOwner, candidateIndex);
      }
    });
  });

  const componentMembers = new Map<number, OperationalRegionCandidate[]>();
  candidates.forEach((candidate, candidateIndex) => {
    const root = findRoot(candidateIndex);
    const members = componentMembers.get(root) ?? [];
    members.push(candidate);
    componentMembers.set(root, members);
  });

  const components = Array.from(componentMembers.values())
    .map((members) => {
      const orderedMembers = [...members].sort(compareOperationalCandidates);
      return {
        representative: orderedMembers[0],
        members: orderedMembers,
      };
    })
    .sort((left, right) =>
      compareOperationalCandidates(left.representative, right.representative),
    );
  const accepted = ensureUniqueOperationalSlugs(
    components.map(({ representative }) => representative),
  );

  const sortedUniqueValues = (
    values: Array<string | null | undefined>,
  ): string[] => {
    const byNormalizedValue = new Map<string, string>();
    values.forEach((value) => {
      const raw = String(value ?? "").trim();
      const normalized = normalizeRegionLookup(raw);
      if (normalized && !byNormalizedValue.has(normalized)) {
        byNormalizedValue.set(normalized, raw);
      }
    });
    return Array.from(byNormalizedValue.values()).sort((left, right) =>
      normalizeRegionLookup(left).localeCompare(normalizeRegionLookup(right), "de"),
    );
  };

  const aliases = accepted.map((candidate, componentIndex) => {
    const members = components[componentIndex].members.map(({ region }) => region);
    return {
      regionId: candidate.region.id,
      ids: sortedUniqueValues(members.map((region) => region.id)),
      slugs: sortedUniqueValues([
        candidate.region.slug,
        ...members.map((region) => region.slug),
      ]),
      names: sortedUniqueValues(members.map((region) => region.name)),
      ags: sortedUniqueValues(
        members.map((region) => region.officialDirectoryEntry?.ags),
      ),
      ars: sortedUniqueValues(
        members.map((region) => region.officialDirectoryEntry?.ars),
      ),
      administrativeLabels: sortedUniqueValues(
        members.flatMap((region) => [
          region.officialBody?.label,
          region.officialDirectoryEntry?.administrativeSeat,
          region.officialDirectoryEntry?.rawAdministrativeUnitLabel,
        ]),
      ),
    };
  });

  return {
    regions: accepted.map(({ region }) => region),
    aliases,
    sources: {
      regionRegistry: clone(input.regionRegistryStatus),
      officialDirectory: clone(input.officialDirectoryStatus),
      fixtureCount: input.fixtureRegions.length,
    },
  };
}

let cachedOperationalRegionCatalog: OperationalRegionCatalog | null = null;

function operationalCatalogSourceSignature(input: {
  regionRegistry: DirectorySourceStatus;
  officialDirectory: DirectorySourceStatus;
}): string {
  return JSON.stringify([
    input.regionRegistry.status,
    input.regionRegistry.sourcePath,
    input.regionRegistry.recordCount,
    input.regionRegistry.errorCode,
    input.officialDirectory.status,
    input.officialDirectory.sourcePath,
    input.officialDirectory.recordCount,
    input.officialDirectory.errorCode,
  ]);
}

export function getOperationalRegionCatalog(): OperationalRegionCatalog {
  const sourceStatus = getDirectorySourceStatus();
  if (
    cachedOperationalRegionCatalog &&
    operationalCatalogSourceSignature(cachedOperationalRegionCatalog.sources) ===
      operationalCatalogSourceSignature(sourceStatus)
  ) {
    return clone(cachedOperationalRegionCatalog);
  }

  cachedOperationalRegionCatalog = buildOperationalRegionCatalog({
    registryRegions: listRegionsFromRegistry(),
    directoryRegions: buildOfficialRegionsFromDirectory(),
    fixtureRegions: listRegions(),
    regionRegistryStatus: sourceStatus.regionRegistry,
    officialDirectoryStatus: sourceStatus.officialDirectory,
  });
  return clone(cachedOperationalRegionCatalog);
}

function aliasesForCatalog(
  input: OperationalRegionCatalog | readonly Region[],
): Array<{ region: Region; aliases: OperationalRegionAliases }> {
  if ("regions" in input) {
    const regionsById = new Map(input.regions.map((region) => [region.id, region]));
    return input.aliases.flatMap((aliases) => {
      const region = regionsById.get(aliases.regionId);
      return region ? [{ region, aliases }] : [];
    });
  }
  return input.map((region) => ({
    region,
    aliases: {
      regionId: region.id,
      ids: [region.id],
      slugs: [region.slug],
      names: [region.name],
      ags: uniqueNonEmpty([region.officialDirectoryEntry?.ags]),
      ars: uniqueNonEmpty([region.officialDirectoryEntry?.ars]),
      administrativeLabels: uniqueNonEmpty([
        region.officialBody?.label,
        region.officialDirectoryEntry?.administrativeSeat,
        region.officialDirectoryEntry?.rawAdministrativeUnitLabel,
      ]),
    },
  }));
}

function uniqueRegionMatch(matches: readonly Region[]): Region | null {
  return matches.length === 1 ? clone(matches[0]) : null;
}

export function resolveOperationalRegion(
  input: OperationalRegionCatalog | readonly Region[],
  value: string,
): Region | null {
  const normalized = normalizeRegionLookup(value);
  if (!normalized) return null;
  const entries = aliasesForCatalog(input);
  const matchesAlias = (values: readonly string[]) =>
    values.some((entry) => normalizeRegionLookup(entry) === normalized);

  const byId = entries
    .filter(({ aliases }) => matchesAlias(aliases.ids))
    .map(({ region }) => region);
  if (byId.length > 0) return uniqueRegionMatch(byId);

  const bySlug = entries
    .filter(({ aliases }) => matchesAlias(aliases.slugs))
    .map(({ region }) => region);
  if (bySlug.length > 0) return uniqueRegionMatch(bySlug);

  const byAgs = entries
    .filter(({ aliases }) => matchesAlias(aliases.ags))
    .map(({ region }) => region);
  if (byAgs.length > 0) return uniqueRegionMatch(byAgs);

  const byArs = entries
    .filter(({ aliases }) => matchesAlias(aliases.ars))
    .map(({ region }) => region);
  if (byArs.length > 0) return uniqueRegionMatch(byArs);

  const byName = entries
    .filter(({ aliases }) => matchesAlias(aliases.names))
    .map(({ region }) => region);
  if (byName.length > 0) return uniqueRegionMatch(byName);

  const byAdministrativeLabel = entries
    .filter(({ aliases }) => matchesAlias(aliases.administrativeLabels))
    .map(({ region }) => region);
  if (byAdministrativeLabel.length === 1) {
    return clone(byAdministrativeLabel[0]);
  }
  if (byAdministrativeLabel.length > 1) {
    const canonicalMunicipalityMatches = byAdministrativeLabel.filter(
      (region) => Boolean(region.officialDirectoryEntry?.ags),
    );
    return uniqueRegionMatch(canonicalMunicipalityMatches);
  }

  return null;
}

export type OperationalRegionSearchResult = {
  query: string;
  totalMatches: number;
  truncated: boolean;
  results: Array<{
    region: Region;
    matchedValue: string;
    matchKind: "exact_identity" | "unique_prefix" | "text";
  }>;
};

export function searchOperationalRegions(
  catalog: OperationalRegionCatalog,
  query: string,
  requestedLimit = 40,
): OperationalRegionSearchResult {
  const normalized = normalizeRegionLookup(query);
  const limit = Math.max(0, Math.min(40, Math.floor(requestedLimit)));
  if (!normalized || limit === 0) {
    return {
      query: String(query ?? "").trim(),
      totalMatches: 0,
      truncated: false,
      results: [],
    };
  }

  const entries = aliasesForCatalog(catalog);
  const exactIdentityMatches = new Set(
    entries
      .filter(({ aliases }) =>
        [...aliases.ids, ...aliases.ags, ...aliases.ars].some(
          (value) => normalizeRegionLookup(value) === normalized,
        ),
      )
      .map(({ region }) => region.id),
  );
  const prefixCandidates = entries.filter(({ aliases }) =>
    [
      ...aliases.ids,
      ...aliases.slugs,
      ...aliases.names,
      ...aliases.ags,
      ...aliases.ars,
      ...aliases.administrativeLabels,
    ].some((value) => normalizeRegionLookup(value).startsWith(normalized)),
  );
  const uniquePrefixId =
    prefixCandidates.length === 1 ? prefixCandidates[0].region.id : null;

  const ranked = entries.flatMap(({ region, aliases }) => {
    const searchableValues = uniqueNonEmpty([
      ...aliases.ids,
      ...aliases.slugs,
      ...aliases.names,
      ...aliases.ags,
      ...aliases.ars,
      ...aliases.administrativeLabels,
    ]);
    const matchingValue = searchableValues.find((value) =>
      normalizeRegionLookup(value).includes(normalized),
    );
    if (!matchingValue) return [];
    const matchKind = exactIdentityMatches.has(region.id)
      ? ("exact_identity" as const)
      : uniquePrefixId === region.id
        ? ("unique_prefix" as const)
        : ("text" as const);
    const rank =
      matchKind === "exact_identity" ? 0 : matchKind === "unique_prefix" ? 1 : 2;
    return [{ region, matchedValue: matchingValue, matchKind, rank }];
  });

  ranked.sort((left, right) => {
    if (left.rank !== right.rank) return left.rank - right.rank;
    const nameDifference = normalizeRegionLookup(left.region.name).localeCompare(
      normalizeRegionLookup(right.region.name),
      "de",
    );
    if (nameDifference !== 0) return nameDifference;
    return normalizeRegionLookup(left.region.id).localeCompare(
      normalizeRegionLookup(right.region.id),
      "de",
    );
  });

  return {
    query: String(query ?? "").trim(),
    totalMatches: ranked.length,
    truncated: ranked.length > limit,
    results: ranked.slice(0, limit).map(({ rank: _rank, ...result }) => result),
  };
}

export async function listOperationalRegions(): Promise<Region[]> {
  return getOperationalRegionCatalog().regions;
}

export async function getOperationalRegionById(id: string): Promise<Region | null> {
  const normalized = String(id || "").trim();
  if (!normalized) return null;

  return resolveOperationalRegion(getOperationalRegionCatalog(), normalized);
}

export async function listRegionalActorRegister(query: RegionalActorRegisterQuery = {}): Promise<RegionalActor[]> {
  const repo = getRegionDataRepo();
  const officialActors = buildOfficialRegionalActorsFromDirectory();
  const manualActors = await repo.listManualActors({
    ...query,
    sourceKind: query.sourceKind === "official_directory" ? "all" : query.sourceKind,
  });

  const merged = buildActorRegisterMap(officialActors);
  for (const actor of manualActors) merged.set(actor.id, clone(actor));

  return Array.from(merged.values())
    .filter((actor) => matchesActorQuery(actor, query))
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")))
    .slice(0, normalizeLimit(query.limit));
}

export async function getRegionalActorRegisterEntry(id: string): Promise<RegionalActor | null> {
  const repo = getRegionDataRepo();
  const manual = await repo.getManualActorById(id);
  if (manual) return manual;
  return buildOfficialRegionalActorsFromDirectory().find((entry) => entry.id === id) ?? null;
}

export async function saveRegionalActorRegisterEntry(
  input: Partial<RegionalActor> & {
    id: string;
    regionId: string;
    slug: string;
    name: string;
  },
): Promise<RegionalActor> {
  const repo = getRegionDataRepo();
  const actor = parseRegionalActor({
    ...input,
    actorType: normalizeRegionalActorType(input.actorType ?? "sonstige"),
    verificationStatus: normalizeRegionalActorVerificationStatus(input.verificationStatus ?? "review_required"),
    sourceKind: input.sourceKind ?? "manual_admin",
    publicVisibility: input.publicVisibility ?? "restricted",
    address: input.address ?? null,
    officialDirectoryEntry: input.officialDirectoryEntry ?? null,
    administrativeUnitType: input.administrativeUnitType ?? null,
    description: input.description ?? null,
    tags: input.tags ?? [],
    guardrails: input.guardrails ?? {
      noAutomaticPoliticalAssignment: true,
      noAutomaticVoiceOpenGovMembership: true,
      verificationStatusRequired: true,
    },
    createdAt: input.createdAt ?? buildIsoNow(),
    updatedAt: buildIsoNow(),
  });
  await repo.upsertManualActor(actor);
  return actor;
}

export async function listRegionalCommunitySignals(query: CommunitySignalQueueQuery = {}): Promise<CommunitySignal[]> {
  const repo = getRegionDataRepo();
  const fixtureSignals = listCommunitySignals();
  const storedSignals = await repo.listSignals(query);
  const merged = new Map<string, CommunitySignal>();

  for (const signal of fixtureSignals) merged.set(signal.id, clone(signal));
  for (const signal of storedSignals) merged.set(signal.id, clone(signal));

  return Array.from(merged.values())
    .filter((signal) => matchesSignalQuery(signal, query))
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")))
    .slice(0, normalizeLimit(query.limit));
}

export async function getRegionalCommunitySignalById(id: string): Promise<CommunitySignal | null> {
  const repo = getRegionDataRepo();
  const stored = await repo.getSignalById(id);
  if (stored) return stored;
  return getCommunitySignalById(id);
}

export async function getRegionalParticipationSignalById(
  id: string,
): Promise<RegionParticipationSignal | null> {
  const regions = await listOperationalRegions();
  await syncParticipationSignalRecords(regions);
  const repo = getParticipationSignalReviewRuntimeRepo();
  const record = await repo.getParticipationSignalRecordById(id);
  if (!record) return null;
  return serializeParticipationSignalForDashboard(record);
}

export async function createRegionalCommunitySignal(
  input: z.input<typeof CommunitySignalCreateSchema>,
): Promise<CommunitySignal> {
  const repo = getRegionDataRepo();
  const parsedInput = CommunitySignalCreateSchema.parse(input);
  const signal = parseCommunitySignal({
    id: `signal-${parsedInput.regionId}-${Date.now()}`,
    regionId: parsedInput.regionId,
    title: parsedInput.title,
    summary: parsedInput.summary,
    signalType: normalizeCommunitySignalType(parsedInput.signalType),
    reviewStatus: "submitted",
    sourceActorId: parsedInput.sourceActorId ?? null,
    sourceUrls: parsedInput.sourceUrls ?? [],
    submitter: {
      mode: normalizeCommunitySignalSubmitterMode(parsedInput.submitter.mode),
      displayName: parsedInput.submitter.displayName ?? null,
      contactChannel: parsedInput.submitter.contactChannel ?? null,
    },
    guardrails: {
      moderationRequired: true,
      noAutoPublish: true,
      noAutoMandate: true,
      noAutomaticDossierCreation: true,
    },
    createdAt: buildIsoNow(),
    updatedAt: buildIsoNow(),
  });
  await repo.upsertSignal(signal);
  return signal;
}

export async function reviewRegionalCommunitySignal(params: {
  id: string;
  reviewStatus: CommunitySignalReviewStatus;
}): Promise<CommunitySignal> {
  const repo = getRegionDataRepo();
  const existing = await getRegionalCommunitySignalById(params.id);
  if (!existing) {
    throw new Error("community_signal_not_found");
  }
  const updated = parseCommunitySignal({
    ...existing,
    reviewStatus: normalizeCommunitySignalReviewStatus(params.reviewStatus),
    updatedAt: buildIsoNow(),
  });
  await repo.upsertSignal(updated);
  return updated;
}

export async function getRegionalAdminCockpitReadModel(
  regionId: string,
  input: { accessContext?: RegionAccessContext | null } = {},
): Promise<RegionalAdminCockpitReadModel> {
  const [regions, allSignals, allActors] = await Promise.all([
    listOperationalRegions(),
    listRegionalCommunitySignals({ limit: 2000 }),
    listRegionalActorRegister({ limit: 2000 }),
  ]);

  const region = (await getOperationalRegionById(regionId)) ?? regions.find((entry) => entry.slug === regionId) ?? null;
  if (!region) throw new Error("region_not_found");

  const scopedRegionIds = collectScopedRegionIds(region.id, regions);
  const scopedSet = new Set(scopedRegionIds);
  const regionMap = new Map(regions.map((entry) => [entry.id, entry]));
  const { activeSignals: participationSignals, needsRegionReviewSignals } =
    await listParticipationSignalsForDashboard({
      regions,
      regionId: region.id,
    });
  const participationReviewRecords = await listParticipationSignalsForReviewRuntime({
    regions,
    query: {
      regionId: region.id,
      reviewStatus: "all",
    },
  });
  const communitySignals = allSignals.filter((signal) => scopedSet.has(signal.regionId));
  const actors = allActors.filter((actor) => scopedSet.has(actor.regionId));
  const activeAnlassraeume = listRegionalAnlassraeume()
    .filter((anlassraum) => scopedSet.has(anlassraum.regionId))
    .map((anlassraum) => clone(anlassraum));
  const [sourceConnections, sourceTestResults] = await Promise.all([
    listRegionSourceConnections(region.id),
    listRegionSourceTestResults({ regionId: region.id, limit: 20 }),
  ]);
  const guidelineProfile = resolveGuidelineProfileForRegion({
    region,
    activeAnlassraeume,
  });
  const guidelineMatrix = getRegionGuidelineMatrixByProfile(guidelineProfile);
  const accessContext =
    input.accessContext ??
    ({
      userId: null,
      actorRole: "admin",
      isAdmin: true,
      authoritySource: "admin_fallback",
      adminFallback: true,
      verificationStatus: "admin_fallback",
      roles: ["admin"],
      hintedRegionIds: [],
      verifiedRegionIds: scopedRegionIds,
      scopedRegionIds,
      organization: {
        organizationIds: [],
        primaryOrganizationId: null,
        paidDashboardEntitlement: "admin_fallback",
        entitlementSource: "admin_fallback",
        entitlementStatus: "admin_fallback",
        entitlementReason: "admin_fallback",
        entitlementPlanId: null,
        entitlementPlanLabel: "Admin-Fallback",
        entitlementScope: null,
        entitlementLimits: null,
        entitlementUsage: null,
        requiresVerifiedMembership: true,
        dashboard: {
          allowed: true,
          reason: "admin_fallback",
          status: "admin_fallback",
          planId: null,
          planLabel: "Admin-Fallback",
          scope: null,
          source: "admin_fallback",
          limits: null,
          usage: null,
        },
        dossierDraft: {
          allowed: true,
          reason: "admin_fallback",
          status: "admin_fallback",
          planId: null,
          planLabel: "Admin-Fallback",
          scope: null,
          source: "admin_fallback",
          limits: null,
          usage: null,
        },
        anlassraumDraft: {
          allowed: true,
          reason: "admin_fallback",
          status: "admin_fallback",
          planId: null,
          planLabel: "Admin-Fallback",
          scope: null,
          source: "admin_fallback",
          limits: null,
          usage: null,
        },
      },
      allowedActions: [
        "read_region_dashboard",
        "review_region_signal",
        "create_region_draft",
        "attach_signal_to_dossier",
        "create_dossier_draft",
        "create_anlassraum_draft",
        "submit_for_review",
        "approve_publication",
        "manage_organization_members",
      ],
    } satisfies RegionAccessContext);
  const intelligence = await resolveRegionFeedSignals({
    region,
    scopedRegionIds,
    activeAnlassraeume,
    communitySignals,
    regionMap,
    accessContext,
    actors,
    sourceConnections,
  });
  const feedSignals = intelligence.feedSignals;
  const participationAggregates = buildParticipationAggregates(region.id, participationSignals);
  const reviewItemsFromPublicInput = buildParticipationReviewItems(
    participationReviewRecords.filter(
      (record) =>
        (record.regionId && scopedSet.has(record.regionId)) ||
        (record.proposedRegionId && scopedSet.has(record.proposedRegionId)) ||
        record.matchedRegionIds.some((entry) => scopedSet.has(entry)),
    ),
  );
  const topicClusters = buildTopicClusters(region.id, feedSignals);
  const suggestedDossiers = buildSuggestedDossiers(region.id, feedSignals);
  const suggestedAnlassraeume = buildSuggestedAnlassraeume(region.id, feedSignals);
  const openReviewItems = buildOpenReviewItems(feedSignals, participationReviewRecords);
  const cockpit = buildDefaultCockpit({
    region,
    feedSignals,
    actors,
    openReviewItems,
    topicClusters,
    suggestedDossiers,
    intelligenceSourceStatus: intelligence.preparation.sourceStatusSummary,
    intelligenceReviewSuggestions: intelligence.preparation.reviewSuggestions,
  });

  const structureCounts = new Map<string, number>();
  for (const actor of actors) {
    const key = actor.administrativeUnitType ?? "sonstige";
    structureCounts.set(key, (structureCounts.get(key) ?? 0) + 1);
  }

  return {
    region,
    accessSummary: buildAccessSummary(region.id, accessContext),
    guidelineProfile,
    guidelineMatrix,
    actorCount: actors.length,
    verifiedActorCount: actors.filter((actor) => actor.verificationStatus === "verified").length,
    officialDirectoryActorCount: actors.filter((actor) => actor.sourceKind === "official_directory").length,
    signalCount: feedSignals.length + participationSignals.length,
    pendingSignalCount:
      openReviewItems.length +
      intelligence.preparation.reviewSuggestions.length +
      sourceTestResults.length,
    directoryStructureBreakdown:
      actors.length > 0
        ? Array.from(structureCounts.entries())
            .map(([administrativeUnitType, count]) => ({ administrativeUnitType, count }))
            .sort((left, right) => right.count - left.count)
        : summarizeOfficialAdministrativeDirectory().slice(0, 12).map((entry) => ({
            administrativeUnitType: entry.administrativeUnitType,
            count: entry.count,
          })),
    cockpit,
    feedSignals,
    participationSignals,
    participationAggregates,
    publicClaimsSummary: buildParticipationSummary(participationSignals, "public_claim"),
    publicQuestionsSummary: buildParticipationSummary(participationSignals, "public_question"),
    swipeInterestSummary: buildSwipeSummary(participationSignals, "swipe_interest"),
    counterpointSummary: buildSwipeSummary(participationSignals, "swipe_counterpoint"),
    communitySourceHints: participationSignals.filter(
      (signal) => signal.sourceType === "public_source_hint",
    ),
    reviewItemsFromPublicInput,
    needsRegionReviewSignals,
    topicClusters,
    suggestedAnlassraeume,
    suggestedDossiers,
    intelligenceSources: intelligence.preparation.configuredSources,
    intelligenceSourceStatus: intelligence.preparation.sourceStatusSummary,
    intelligenceWeighting: intelligence.preparation.weightingSummary,
    intelligenceReviewSuggestions: intelligence.preparation.reviewSuggestions,
    sourceConnections,
    sourceTestResults,
    openReviewItems,
    activeDossiers: buildActiveDossiers(activeAnlassraeume),
    activeAnlassraeume,
    communitySignals,
    actorsSummary: {
      total: actors.length,
      verified: actors.filter((actor) => actor.verificationStatus === "verified").length,
      officialDirectory: actors.filter((actor) => actor.sourceKind === "official_directory").length,
      manual: actors.filter((actor) => actor.sourceKind === "manual_admin").length,
      administration: actors.filter((actor) => actor.actorType === "verwaltung").length,
    },
    guardrails: DEFAULT_DASHBOARD_GUARDRAILS,
  };
}

export { setRegionDataRepoForTests };
