import { coreCol } from "@core/db/triMongo";
import {
  collectFeedRefs,
  loadFeeds,
  type FeedRef,
} from "./feedConfig";
import {
  listRegionSourceConnections,
  listRegionSourceTestResults,
} from "@features/region/server/sourceConnectionRuntime";
import type {
  RegionSourceConnection,
  RegionSourceTestResult,
} from "@features/region/sourceConnections";

export const FEED_SOURCE_AUTOMATION_MODES = [
  "manual",
  "cron_ready",
  "paused",
  "disabled",
] as const;

export const FEED_SOURCE_HEALTH_STATUSES = [
  "healthy",
  "noisy",
  "failing",
  "quiet",
  "backoff",
  "never_pulled",
  "manual_review",
  "disabled",
] as const;

export type FeedSourceAutomationMode =
  (typeof FEED_SOURCE_AUTOMATION_MODES)[number];

export type FeedSourceHealthStatus =
  (typeof FEED_SOURCE_HEALTH_STATUSES)[number];

export type FeedSourceAutomationStateDoc = {
  sourceId: string;
  organizationId: string | null;
  regionId: string | null;
  sourceType: string;
  sourceLabel: string;
  sourceHref: string | null;
  automationMode: FeedSourceAutomationMode;
  healthStatus: FeedSourceHealthStatus;
  lastPullAt: string | null;
  nextSuggestedPullAt: string | null;
  errorCount: number;
  backoffUntil: string | null;
  signalCount: number;
  reviewCandidateCount: number;
  lastError: string | null;
  lastRunStatus: "success" | "error" | "dry_run" | null;
  lastFetchedItems: number;
  lastInsertedSignals: number;
  noSignalStreak: number;
  updatedAt: string;
};

export type FeedSourceAutomationItem = {
  sourceId: string;
  organizationId: string | null;
  regionId: string | null;
  sourceType: string;
  sourceLabel: string;
  sourceHref: string | null;
  sourceKind: "feed_ref" | "source_connection" | "runtime_state";
  healthStatus: FeedSourceHealthStatus;
  healthLabel: string;
  healthHint: string;
  lastPullAt: string | null;
  nextSuggestedPullAt: string | null;
  errorCount: number;
  backoffUntil: string | null;
  signalCount: number;
  reviewCandidateCount: number;
  automationMode: FeedSourceAutomationMode;
  reviewRequired: true;
  noAutoPublish: true;
  noDeepSearchAuto: true;
  nextAction: {
    label: string;
    description: string;
    href: string;
  };
};

export type FeedSourceAutomationReadModel = {
  generatedAt: string;
  items: FeedSourceAutomationItem[];
  summary: {
    totalSources: number;
    healthySources: number;
    noisySources: number;
    failingSources: number;
    quietSources: number;
    backoffSources: number;
    reviewCandidateCount: number;
    cronReadySources: number;
    manualSources: number;
    themenradarReadySources: number;
    nextAction: {
      label: string;
      description: string;
      href: string;
    };
  };
};

export type FeedSourceAutomationRepository = {
  listStates(): Promise<FeedSourceAutomationStateDoc[]>;
  getState(sourceId: string): Promise<FeedSourceAutomationStateDoc | null>;
  upsertState(state: FeedSourceAutomationStateDoc): Promise<void>;
};

type FeedSourceAutomationEvent = {
  sourceId: string;
  organizationId?: string | null;
  regionId?: string | null;
  sourceType: string;
  sourceLabel: string;
  sourceHref?: string | null;
  automationMode: FeedSourceAutomationMode;
  runStatus: "success" | "error" | "dry_run";
  completedAt: Date;
  fetchedItems?: number;
  insertedSignals?: number;
  reviewCandidateCount?: number;
  error?: string | null;
  retryAfter?: string | null;
};

const COLLECTION = "feed_source_automation_state";
let ensured = false;
let repoSingleton: FeedSourceAutomationRepository | null = null;

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function addHours(input: Date | string, hours: number) {
  const date = input instanceof Date ? new Date(input) : new Date(input);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function isOlderThanDays(value: string | null, days: number) {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return Date.now() - date.getTime() > days * 24 * 60 * 60 * 1000;
}

function backoffMsForErrorCount(errorCount: number) {
  if (errorCount <= 1) return 15 * 60 * 1000;
  if (errorCount === 2) return 60 * 60 * 1000;
  if (errorCount === 3) return 6 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function retryAfterUntil(value: string | null | undefined, completedAt: Date) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  if (/^\d+$/.test(normalized)) {
    const seconds = Number(normalized);
    if (!Number.isFinite(seconds)) return null;
    return new Date(completedAt.getTime() + Math.max(0, seconds) * 1000).toISOString();
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime()) || date.getTime() <= completedAt.getTime()) return null;
  return date.toISOString();
}

function laterIso(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function deriveHealthStatus(input: {
  automationMode: FeedSourceAutomationMode;
  backoffUntil?: string | null;
  errorCount?: number;
  signalCount?: number;
  noSignalStreak?: number;
  lastPullAt?: string | null;
  lastRunStatus?: "success" | "error" | "dry_run" | null;
  sourceKind?: "feed_ref" | "source_connection" | "runtime_state";
}) : FeedSourceHealthStatus {
  if (input.automationMode === "disabled") return "disabled";
  if (input.backoffUntil) {
    const backoffDate = new Date(input.backoffUntil);
    if (!Number.isNaN(backoffDate.getTime()) && backoffDate.getTime() > Date.now()) {
      return "backoff";
    }
  }
  if (input.lastRunStatus === "error" || (input.errorCount ?? 0) > 0) {
    return "failing";
  }
  if (!input.lastPullAt) {
    return input.sourceKind === "source_connection" ? "manual_review" : "never_pulled";
  }
  if (isOlderThanDays(input.lastPullAt, 10)) {
    return "quiet";
  }
  if ((input.noSignalStreak ?? 0) >= 2) {
    return "noisy";
  }
  if ((input.signalCount ?? 0) === 0) {
    return input.sourceKind === "source_connection" ? "manual_review" : "quiet";
  }
  return "healthy";
}

function healthCopy(status: FeedSourceHealthStatus) {
  if (status === "healthy") {
    return {
      label: "Signale kommen an",
      hint: "Die Quelle liefert reviewfähige Hinweise und braucht aktuell keine Sonderbehandlung.",
    };
  }
  if (status === "noisy") {
    return {
      label: "Liefert zu viel Rauschen",
      hint: "Mehrere Abrufe brachten kaum neue reviewfähige Signale. Themen oder Quelle sollten enger gefiltert werden.",
    };
  }
  if (status === "failing") {
    return {
      label: "Fehlerhaft",
      hint: "Die Quelle ist erreichbar oder auswertbar problematisch und braucht menschliche Prüfung.",
    };
  }
  if (status === "backoff") {
    return {
      label: "Im Backoff",
      hint: "Nach Fehlern wartet die Quelle bewusst auf einen späteren erneuten Abruf statt ungesteuert weiterzulaufen.",
    };
  }
  if (status === "manual_review") {
    return {
      label: "Nur manuell geprüft",
      hint: "Die Quelle ist als Snapshot-/Dry-Run-Pfad geführt und nicht als automatischer Dauerabruf behauptet.",
    };
  }
  if (status === "disabled") {
    return {
      label: "Deaktiviert",
      hint: "Die Quelle ist bewusst pausiert oder abgeschaltet und liefert aktuell keine Automationssignale.",
    };
  }
  if (status === "never_pulled") {
    return {
      label: "Noch nicht abgerufen",
      hint: "Die Quelle ist konfiguriert, aber noch nicht als Lauf sichtbar bestätigt.",
    };
  }
  return {
    label: "Seit Tagen still",
    hint: "Es kamen zuletzt keine frischen Signale. Quelle oder Abrufrhythmus sollten geprüft werden.",
  };
}

function nextActionForItem(item: {
  healthStatus: FeedSourceHealthStatus;
  automationMode: FeedSourceAutomationMode;
  reviewCandidateCount: number;
  sourceKind: "feed_ref" | "source_connection" | "runtime_state";
}) {
  if (item.healthStatus === "backoff" || item.healthStatus === "failing") {
    return {
      label: "Quelle prüfen",
      description: "Fehler, Backoff oder Verbindungsprobleme brauchen eine bewusste Operator-Entscheidung.",
      href: "/admin/feeds",
    };
  }
  if (item.healthStatus === "noisy") {
    return {
      label: "Rauschen filtern",
      description: "Quelle, Themenhinweise oder Region-Scope sollten enger gefasst werden.",
      href: "/admin/feeds",
    };
  }
  if (item.reviewCandidateCount > 0) {
    return {
      label: "Themenradar öffnen",
      description: "Die Quelle hat genug Signale für einen nächsten Themenradar- oder Review-Schritt.",
      href: "/admin/themenradar?mode=autonomous",
    };
  }
  if (item.sourceKind === "source_connection" || item.automationMode === "manual") {
    return {
      label: "Snapshot erneut testen",
      description: "Die Quelle bleibt review-first und wird nur bewusst per Dry-Run oder Snapshot geprüft.",
      href: "/admin/region",
    };
  }
  return {
    label: "Nächsten Abruf einplanen",
    description: "Die Quelle ist cron-ready vorbereitet, aber ohne behaupteten Dauer-Scheduler.",
    href: "/admin/feeds",
  };
}

async function stateCol() {
  if (!ensured) {
    const col = await coreCol<FeedSourceAutomationStateDoc>(COLLECTION);
    await col.createIndex({ sourceId: 1 }, { unique: true });
    await col.createIndex({ healthStatus: 1, updatedAt: -1 });
    await col.createIndex({ regionId: 1, organizationId: 1 });
    ensured = true;
    return col;
  }
  return coreCol<FeedSourceAutomationStateDoc>(COLLECTION);
}

function createMongoFeedSourceAutomationRepo(): FeedSourceAutomationRepository {
  return {
    async listStates() {
      return (await stateCol()).find({}).toArray();
    },
    async getState(sourceId) {
      return (await stateCol()).findOne({ sourceId });
    },
    async upsertState(state) {
      await (await stateCol()).updateOne(
        { sourceId: state.sourceId },
        { $set: state },
        { upsert: true },
      );
    },
  };
}

export function createInMemoryFeedSourceAutomationRepo(seed?: {
  states?: FeedSourceAutomationStateDoc[];
}): FeedSourceAutomationRepository {
  const states = new Map<string, FeedSourceAutomationStateDoc>();
  for (const item of seed?.states ?? []) {
    states.set(item.sourceId, structuredClone(item));
  }
  return {
    async listStates() {
      return Array.from(states.values()).map((entry) => structuredClone(entry));
    },
    async getState(sourceId) {
      const item = states.get(sourceId);
      return item ? structuredClone(item) : null;
    },
    async upsertState(state) {
      states.set(state.sourceId, structuredClone(state));
    },
  };
}

export function setFeedSourceAutomationRepoForTests(
  repo: FeedSourceAutomationRepository | null,
) {
  repoSingleton = repo;
}

function getRepo() {
  if (!repoSingleton) {
    repoSingleton = createMongoFeedSourceAutomationRepo();
  }
  return repoSingleton;
}

export function buildFeedSourceAutomationId(input: {
  feedUrl: string;
  regionId?: string | null;
  organizationId?: string | null;
}) {
  const normalizedUrl = String(input.feedUrl || "").trim().toLowerCase();
  const regionId = normalizeString(input.regionId) ?? "global";
  const organizationId = normalizeString(input.organizationId) ?? "public";
  return `feed-source:${organizationId}:${regionId}:${normalizedUrl}`;
}

export async function recordFeedSourceAutomationEvent(
  input: FeedSourceAutomationEvent,
) {
  const repo = getRepo();
  const existing = await repo.getState(input.sourceId);
  const completedAt = input.completedAt.toISOString();
  const fetchedItems = Math.max(0, Math.floor(input.fetchedItems ?? 0));
  const insertedSignals = Math.max(0, Math.floor(input.insertedSignals ?? 0));
  const nextErrorCount = input.runStatus === "error" ? (existing?.errorCount ?? 0) + 1 : 0;
  const noSignalStreak =
    input.runStatus === "error"
      ? existing?.noSignalStreak ?? 0
      : insertedSignals > 0
        ? 0
        : (existing?.noSignalStreak ?? 0) + 1;
  const defaultBackoffUntil =
    input.runStatus === "error"
      ? new Date(input.completedAt.getTime() + backoffMsForErrorCount(nextErrorCount)).toISOString()
      : null;
  const providerBackoffUntil =
    input.runStatus === "error" ? retryAfterUntil(input.retryAfter, input.completedAt) : null;
  const backoffUntil = laterIso(defaultBackoffUntil, providerBackoffUntil);
  const signalCount =
    (existing?.signalCount ?? 0) + (input.runStatus === "error" ? 0 : insertedSignals);
  const reviewCandidateCount =
    (existing?.reviewCandidateCount ?? 0) +
    (input.runStatus === "error"
      ? 0
      : Math.max(0, Math.floor(input.reviewCandidateCount ?? insertedSignals)));
  const automationMode = input.automationMode;
  const healthStatus = deriveHealthStatus({
    automationMode,
    backoffUntil,
    errorCount: nextErrorCount,
    signalCount,
    noSignalStreak,
    lastPullAt: completedAt,
    lastRunStatus: input.runStatus,
    sourceKind: "feed_ref",
  });

  await repo.upsertState({
    sourceId: input.sourceId,
    organizationId: normalizeString(input.organizationId),
    regionId: normalizeString(input.regionId),
    sourceType: input.sourceType,
    sourceLabel: input.sourceLabel,
    sourceHref: normalizeString(input.sourceHref),
    automationMode,
    healthStatus,
    lastPullAt: completedAt,
    nextSuggestedPullAt:
      backoffUntil ??
      addHours(input.completedAt, automationMode === "cron_ready" ? 6 : 24),
    errorCount: nextErrorCount,
    backoffUntil,
    signalCount,
    reviewCandidateCount,
    lastError: input.runStatus === "error" ? normalizeString(input.error) : null,
    lastRunStatus: input.runStatus,
    lastFetchedItems: fetchedItems,
    lastInsertedSignals: insertedSignals,
    noSignalStreak,
    updatedAt: completedAt,
  });
}

function uniqueFeedRefs(scopes: Array<{ feedRefs: FeedRef[] }>) {
  const map = new Map<string, FeedRef>();
  for (const scope of scopes) {
    for (const ref of scope.feedRefs) {
      const sourceId = buildFeedSourceAutomationId({
        feedUrl: ref.feedUrl,
        regionId: ref.regionCode,
      });
      if (!map.has(sourceId)) {
        map.set(sourceId, ref);
      }
    }
  }
  return Array.from(map.entries()).map(([sourceId, ref]) => ({ sourceId, ref }));
}

function modeFromConnection(connection: RegionSourceConnection): FeedSourceAutomationMode {
  if (connection.status === "paused") return "paused";
  if (
    connection.status === "revoked" ||
    connection.status === "archived" ||
    connection.enabled === false
  ) {
    return "disabled";
  }
  return "manual";
}

function stateFromConnectionResult(
  connection: RegionSourceConnection,
  latestResult: RegionSourceTestResult | null,
): FeedSourceAutomationItem {
  const automationMode = modeFromConnection(connection);
  const signalCount = latestResult
    ? latestResult.reviewTaskSummary.claimCount +
      latestResult.reviewTaskSummary.topicClusterCount +
      latestResult.reviewTaskSummary.evidenceCount
    : connection.sampleItems.length;
  const reviewCandidateCount = latestResult
    ? latestResult.reviewTaskSummary.claimCount +
      latestResult.reviewTaskSummary.dossierSuggestionCount +
      latestResult.reviewTaskSummary.anlassraumSuggestionCount +
      latestResult.reviewTaskSummary.openQuestionCount
    : 0;
  const lastPullAt =
    normalizeString(connection.latestSnapshotAt) ??
    normalizeString(latestResult?.createdAt) ??
    normalizeString(connection.latestTestResult?.checkedAt) ??
    null;
  const healthStatus =
    automationMode === "disabled"
      ? "disabled"
      : connection.latestTestResult?.status === "failed"
        ? "failing"
        : deriveHealthStatus({
            automationMode,
            signalCount,
            lastPullAt,
            sourceKind: "source_connection",
          });
  const { label, hint } = healthCopy(healthStatus);
  const nextAction = nextActionForItem({
    healthStatus,
    automationMode,
    reviewCandidateCount,
    sourceKind: "source_connection",
  });
  return {
    sourceId: connection.id,
    organizationId: normalizeString(connection.organizationId),
    regionId: normalizeString(connection.regionId),
    sourceType: connection.sourceType,
    sourceLabel: connection.label,
    sourceHref: normalizeString(connection.url),
    sourceKind: "source_connection",
    healthStatus,
    healthLabel: label,
    healthHint: hint,
    lastPullAt,
    nextSuggestedPullAt:
      lastPullAt && automationMode === "manual"
        ? addHours(lastPullAt, 24 * 7)
        : null,
    errorCount: connection.latestTestResult?.status === "failed" ? 1 : 0,
    backoffUntil: null,
    signalCount,
    reviewCandidateCount,
    automationMode,
    reviewRequired: true,
    noAutoPublish: true,
    noDeepSearchAuto: true,
    nextAction,
  };
}

function stateFromFeedRef(
  sourceId: string,
  ref: FeedRef,
  state: FeedSourceAutomationStateDoc | null,
): FeedSourceAutomationItem {
  const automationMode = state?.automationMode ?? "cron_ready";
  const healthStatus = deriveHealthStatus({
    automationMode,
    backoffUntil: state?.backoffUntil,
    errorCount: state?.errorCount,
    signalCount: state?.signalCount,
    noSignalStreak: state?.noSignalStreak,
    lastPullAt: state?.lastPullAt,
    lastRunStatus: state?.lastRunStatus,
    sourceKind: "feed_ref",
  });
  const { label, hint } = healthCopy(healthStatus);
  const reviewCandidateCount = state?.reviewCandidateCount ?? 0;
  const nextAction = nextActionForItem({
    healthStatus,
    automationMode,
    reviewCandidateCount,
    sourceKind: "feed_ref",
  });

  return {
    sourceId,
    organizationId: null,
    regionId: normalizeString(ref.regionCode),
    sourceType: state?.sourceType ?? "rss_feed",
    sourceLabel:
      state?.sourceLabel ??
      new URL(ref.feedUrl).hostname.replace(/^www\./, ""),
    sourceHref: ref.feedUrl,
    sourceKind: "feed_ref",
    healthStatus,
    healthLabel: label,
    healthHint: hint,
    lastPullAt: state?.lastPullAt ?? null,
    nextSuggestedPullAt:
      state?.nextSuggestedPullAt ??
      (automationMode === "cron_ready" ? new Date().toISOString() : null),
    errorCount: state?.errorCount ?? 0,
    backoffUntil: state?.backoffUntil ?? null,
    signalCount: state?.signalCount ?? 0,
    reviewCandidateCount,
    automationMode,
    reviewRequired: true,
    noAutoPublish: true,
    noDeepSearchAuto: true,
    nextAction,
  };
}

function stateFromRuntimeState(state: FeedSourceAutomationStateDoc): FeedSourceAutomationItem {
  const healthStatus = deriveHealthStatus({
    automationMode: state.automationMode,
    backoffUntil: state.backoffUntil,
    errorCount: state.errorCount,
    signalCount: state.signalCount,
    noSignalStreak: state.noSignalStreak,
    lastPullAt: state.lastPullAt,
    lastRunStatus: state.lastRunStatus,
    sourceKind: "runtime_state",
  });
  const { label, hint } = healthCopy(healthStatus);
  const nextAction = nextActionForItem({
    healthStatus,
    automationMode: state.automationMode,
    reviewCandidateCount: state.reviewCandidateCount,
    sourceKind: "runtime_state",
  });
  return {
    sourceId: state.sourceId,
    organizationId: state.organizationId,
    regionId: state.regionId,
    sourceType: state.sourceType,
    sourceLabel: state.sourceLabel,
    sourceHref: state.sourceHref,
    sourceKind: "runtime_state",
    healthStatus,
    healthLabel: label,
    healthHint: hint,
    lastPullAt: state.lastPullAt,
    nextSuggestedPullAt: state.nextSuggestedPullAt,
    errorCount: state.errorCount,
    backoffUntil: state.backoffUntil,
    signalCount: state.signalCount,
    reviewCandidateCount: state.reviewCandidateCount,
    automationMode: state.automationMode,
    reviewRequired: true,
    noAutoPublish: true,
    noDeepSearchAuto: true,
    nextAction,
  };
}

function sortByPriority(items: FeedSourceAutomationItem[]) {
  const healthPriority: Record<FeedSourceHealthStatus, number> = {
    backoff: 0,
    failing: 1,
    noisy: 2,
    quiet: 3,
    never_pulled: 4,
    manual_review: 5,
    healthy: 6,
    disabled: 7,
  };
  return [...items].sort((left, right) => {
    const statusDiff = healthPriority[left.healthStatus] - healthPriority[right.healthStatus];
    if (statusDiff !== 0) return statusDiff;
    return (right.reviewCandidateCount + right.signalCount) - (left.reviewCandidateCount + left.signalCount);
  });
}

export async function buildFeedSourceAutomationReadModel(input?: {
  limit?: number;
}): Promise<FeedSourceAutomationReadModel> {
  const limit = Math.max(1, Math.min(20, Math.floor(input?.limit ?? 10)));
  const [states, loadedDe, loadedGlobal, connections, testResults] = await Promise.all([
    getRepo().listStates(),
    loadFeeds("de"),
    loadFeeds("global"),
    listRegionSourceConnections(),
    listRegionSourceTestResults({ limit: 200 }),
  ]);

  const stateMap = new Map(states.map((entry) => [entry.sourceId, entry]));
  const feedRefs = uniqueFeedRefs(
    [loadedDe, loadedGlobal]
      .filter((entry) => entry.config)
      .map((entry) => ({
        feedRefs: collectFeedRefs(entry.config!, { dedupeByRegion: true }).feedRefs,
      })),
  );
  const latestResultByConnection = new Map<string, RegionSourceTestResult>();
  for (const result of testResults.sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (!latestResultByConnection.has(result.connectionId)) {
      latestResultByConnection.set(result.connectionId, result);
    }
  }
  const knownSourceIds = new Set([
    ...feedRefs.map(({ sourceId }) => sourceId),
    ...connections.map((connection) => connection.id),
  ]);
  const runtimeStates = states.filter(
    (state) => state.sourceType.startsWith("open_data:") && !knownSourceIds.has(state.sourceId),
  );

  const items = sortByPriority([
    ...feedRefs.map(({ sourceId, ref }) =>
      stateFromFeedRef(sourceId, ref, stateMap.get(sourceId) ?? null),
    ),
    ...connections.map((connection) =>
      stateFromConnectionResult(
        connection,
        latestResultByConnection.get(connection.id) ?? null,
      ),
    ),
    ...runtimeStates.map(stateFromRuntimeState),
  ]).slice(0, limit);

  const summary = {
    totalSources: items.length,
    healthySources: items.filter((item) => item.healthStatus === "healthy").length,
    noisySources: items.filter((item) => item.healthStatus === "noisy").length,
    failingSources: items.filter((item) => item.healthStatus === "failing").length,
    quietSources: items.filter((item) => item.healthStatus === "quiet").length,
    backoffSources: items.filter((item) => item.healthStatus === "backoff").length,
    reviewCandidateCount: items.reduce(
      (sum, item) => sum + item.reviewCandidateCount,
      0,
    ),
    cronReadySources: items.filter((item) => item.automationMode === "cron_ready").length,
    manualSources: items.filter((item) => item.automationMode === "manual").length,
    themenradarReadySources: items.filter((item) => item.reviewCandidateCount > 0).length,
    nextAction:
      items[0]?.nextAction ?? {
        label: "Quellen prüfen",
        description: "Noch keine produktiven Quellen oder Feeds sichtbar.",
        href: "/admin/feeds",
      },
  };

  return {
    generatedAt: new Date().toISOString(),
    items,
    summary,
  };
}