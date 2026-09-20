import { getCol, ObjectId } from "@core/db/triMongo";
import { normalizeGermanSearchText, normalizeGermanSlug } from "@features/common/utils/textNormalization";
import { anlassraumCol } from "@features/anlassraum/db";
import { dossierSuggestionsCol } from "@features/dossier/db";
import type { DossierSuggestionDoc, SuggestionType } from "@features/dossier/schemas";
import { getDossierStudioWorkspaceRepo } from "@features/dossier/server/studioPersistence";
import {
  feedAnlassraumClusterCandidatesCol,
  voteDraftsCol,
} from "@features/feeds/db";
import type {
  FeedAnlassraumClusterCandidateDoc,
  VoteDraftDoc,
} from "@features/feeds/types";
import {
  buildPersistedCreateHandoffSummary,
  listPersistedCreateHandoffRecords,
  type PersistedCreateHandoffRecord,
} from "@/features/create/persistedHandoffReviewQueue";
import { listMaterialExtractionThemenradarSeeds } from "@/features/material/materialExtractionJobs";
import { resolveAiFlowIntegration } from "@/features/ai/v2OrchestrationPolicy";
import { buildPublicTopicSupplyReadModel } from "@/features/swipes/publicTopicSupply";
import type { SwipeItem } from "@/features/swipes/types";

type StatementProposalDoc = {
  _id?: ObjectId | string | null;
  title?: string | null;
  text?: string | null;
  topic?: string | null;
  responsibility?: string | null;
  status?: string | null;
  createdAt?: Date | null;
  draftId?: ObjectId | string | null;
  dossierId?: string | null;
  anlassraumId?: string | null;
};

type AnlassraumSupplyDoc = {
  _id?: ObjectId | string | null;
  title?: string | null;
  summary?: string | null;
  sourceMode?: string | null;
  status?: string | null;
  isPublic?: boolean | null;
  regionKey?: string | null;
  dossierId?: ObjectId | string | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
};

type WorkspaceMeta = {
  regionId: string | null;
  organizationId: string | null;
};

type AutonomousSeedSource =
  | "proposal"
  | "feed"
  | "dossier"
  | "anlassraum"
  | "create"
  | "cluster"
  | "material";

type AutonomousSeed = {
  sourceId: string;
  sourceType: AutonomousSeedSource;
  title: string;
  topicLabel: string;
  clusterTopicKey: string;
  regionId: string | null;
  organizationId: string | null;
  claims: string[];
  questions: string[];
  options: string[];
  evidenceHints: string[];
  reviewRequired: boolean;
  weakEvidence: boolean;
  createdAt: string | null;
  sourceHref: string | null;
  swipesHref: string | null;
  dossierHref: string | null;
  anlassraumHref: string | null;
  priorityBoost: number;
};

export type AutonomousTopicReviewState =
  | "needs_review"
  | "review_candidate"
  | "weak_evidence"
  | "stale_signal";

export type AutonomousTopicNextActionKey =
  | "review_cluster"
  | "compare_duplicates"
  | "gather_evidence"
  | "attach_swipes"
  | "attach_dossier"
  | "prepare_anlassraum"
  | "reactivate_topic"
  | "monitor";

export type AutonomousTopicCluster = {
  id: string;
  sourceId: string;
  sourceIds: string[];
  sourceTypes: AutonomousSeedSource[];
  title: string;
  topicLabel: string;
  topicClusterId: string;
  regionId: string | null;
  organizationId: string | null;
  claims: string[];
  questions: string[];
  options: string[];
  evidenceHints: string[];
  urgencyScore: number;
  relevanceScore: number;
  regionalityScore: number;
  participationPotential: number;
  reviewState: AutonomousTopicReviewState;
  reviewStateLabel: string;
  reviewHint: string;
  nextSuggestedAction: {
    key: AutonomousTopicNextActionKey;
    label: string;
    description: string;
    href: string;
  };
  duplicateSuggestionCount: number;
  strongSignal: boolean;
  weakEvidence: boolean;
  reactivated: boolean;
  stale: boolean;
  visibleInSwipes: boolean;
  dossierContext: boolean;
  anlassraumContext: boolean;
  aiOrchestration: {
    lane: string;
    laneLabel: string;
    outputLabel: string;
    reviewRequired: true;
    draftOnly: true;
    publicOutputAllowed: false;
  };
  autoPublishAllowed: false;
  reviewRequired: true;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AutonomousThemenradarSummary = {
  totalClusters: number;
  strongSignals: number;
  duplicates: number;
  reviewRequired: number;
  weakEvidence: number;
  regionalHotspots: number;
  reactivated: number;
  stale: number;
  nextAction: {
    label: string;
    description: string;
    href: string;
  };
};

export type AutonomousThemenradarReadModel = {
  generatedAt: string;
  items: AutonomousTopicCluster[];
  summary: AutonomousThemenradarSummary;
};

export type AutonomousThemenradarScope = {
  viewerRegionIds?: string[];
  organizationIds?: string[];
  adminContext?: boolean;
};

function normalizeString(value: unknown): string | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const region = value as {
      countryCode?: unknown;
      subRegionCode?: unknown;
      municipalityCode?: unknown;
    };
    const countryCode = String(region.countryCode ?? "").trim().toUpperCase();
    if (countryCode) {
      const subRegionCode = String(region.subRegionCode ?? "").trim();
      const municipalityCode = String(region.municipalityCode ?? "").trim();
      return [countryCode, subRegionCode, municipalityCode].filter(Boolean).join(":");
    }
  }
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function toHex(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof ObjectId) return value.toHexString();
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return ObjectId.isValid(normalized) ? new ObjectId(normalized).toHexString() : normalized;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeString(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function dedupeTexts(values: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const value of values) {
    const normalized = normalizeString(value);
    if (!normalized) continue;
    const key = normalizeGermanSearchText(normalized);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, normalized);
  }
  return Array.from(byKey.values());
}

function topicKeyFromLabel(topicLabel: string, title: string): string {
  const base = normalizeString(topicLabel) ?? normalizeString(title) ?? "allgemein";
  return normalizeGermanSlug(base, { maxLength: 48, fallback: "allgemein" });
}

function readScopeIds(scope?: AutonomousThemenradarScope) {
  return {
    viewerRegionIds: uniqueStrings(scope?.viewerRegionIds ?? []),
    organizationIds: uniqueStrings(scope?.organizationIds ?? []),
    adminContext: scope?.adminContext === true,
  };
}

function matchesScope(input: {
  regionId?: string | null;
  organizationId?: string | null;
  scope?: AutonomousThemenradarScope;
}): boolean {
  const scope = readScopeIds(input.scope);
  const organizationId = normalizeString(input.organizationId);
  if (organizationId) {
    if (scope.organizationIds.length === 0) return scope.adminContext;
    return scope.organizationIds.includes(organizationId);
  }
  const regionId = normalizeString(input.regionId);
  if (regionId) {
    if (scope.viewerRegionIds.length === 0) return true;
    return scope.viewerRegionIds.includes(regionId);
  }
  return true;
}

function extractQuestionTextsFromCreate(record: PersistedCreateHandoffRecord): string[] {
  return dedupeTexts(
    record.openQuestions.flatMap((question) => [
      normalizeString((question as { question?: string | null }).question),
      normalizeString((question as { text?: string | null }).text),
      normalizeString((question as { title?: string | null }).title),
    ]),
  );
}

function extractClaimTextsFromCreate(record: PersistedCreateHandoffRecord): string[] {
  return dedupeTexts(
    record.claims.flatMap((claim) => [
      normalizeString((claim as { title?: string | null }).title),
      normalizeString((claim as { text?: string | null }).text),
    ]),
  );
}

function extractEvidenceHintsFromCreate(record: PersistedCreateHandoffRecord): string[] {
  return dedupeTexts(
    record.sourceGrounding.flatMap((entry) => [
      normalizeString(entry.label),
      entry.status === "link_reference" ? normalizeString(entry.detail ?? null) : null,
    ]),
  );
}

function feedClaimTexts(draft: VoteDraftDoc): string[] {
  return dedupeTexts(
    draft.claims.flatMap((claim) => [
      normalizeString((claim as { title?: string | null }).title),
      normalizeString((claim as { text?: string | null }).text),
    ]),
  );
}

function feedQuestionTexts(draft: VoteDraftDoc): string[] {
  const values = draft.summary?.includes("?") ? [draft.summary] : [];
  return dedupeTexts(values);
}

function feedOptionTexts(draft: VoteDraftDoc): string[] {
  return dedupeTexts(
    draft.claims.flatMap((claim) =>
      Array.isArray((claim as { options?: unknown[] }).options)
        ? ((claim as { options?: unknown[] }).options ?? []).map((option) => normalizeString(option))
        : [],
    ),
  );
}

function suggestionSectionToQuestion(type: SuggestionType, payload: DossierSuggestionDoc["payload"]): string[] {
  if (type === "question") {
    return dedupeTexts([normalizeString(payload.title), normalizeString(payload.summary)]);
  }
  return [];
}

function suggestionSectionToClaim(type: SuggestionType, payload: DossierSuggestionDoc["payload"]): string[] {
  if (type === "claim" || type === "update" || type === "perspective" || type === "counter") {
    return dedupeTexts([normalizeString(payload.title), normalizeString(payload.summary)]);
  }
  return [];
}

function suggestionSectionToOption(type: SuggestionType, payload: DossierSuggestionDoc["payload"]): string[] {
  if (type === "perspective" || type === "counter") {
    return dedupeTexts([normalizeString(payload.title)]);
  }
  return [];
}

function supplyItemVisibleSet(items: SwipeItem[]): Set<string> {
  return new Set(
    items.flatMap((item) =>
      uniqueStrings([
        item.id,
        item.sourceDraftId,
        item.anlassraumId,
      ]),
    ),
  );
}

function scoreFromRecency(value: string | null): number {
  if (!value) return 20;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 20;
  const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 3) return 100;
  if (ageDays <= 7) return 85;
  if (ageDays <= 14) return 70;
  if (ageDays <= 30) return 45;
  if (ageDays <= 60) return 25;
  return 10;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function reviewStateLabel(state: AutonomousTopicReviewState): string {
  if (state === "review_candidate") return "Review-Kandidat";
  if (state === "weak_evidence") return "Schwache Quellenlage";
  if (state === "stale_signal") return "Thema klingt ab";
  return "Review nötig";
}

function reviewStateHint(state: AutonomousTopicReviewState): string {
  if (state === "review_candidate") {
    return "Mehrere Signale sind gebündelt und als nächster Review-Schritt lesbar.";
  }
  if (state === "weak_evidence") {
    return "Das Thema ist erkennbar, braucht aber vor einem stärkeren Anschluss zusätzliche Quellen oder Gegenprüfung.";
  }
  if (state === "stale_signal") {
    return "Ohne neue Aktivität sinkt die Sichtbarkeit. Das Thema bleibt nur als Erinnerung oder Reaktivierungskandidat.";
  }
  return "Aus den Signalen entsteht nur ein Vorschlag. Freigabe, Dossier- oder Swipe-Anschluss bleiben bewusste Review-Schritte.";
}

function nextActionFromCluster(cluster: {
  duplicateSuggestionCount: number;
  weakEvidence: boolean;
  reactivated: boolean;
  stale: boolean;
  visibleInSwipes: boolean;
  dossierContext: boolean;
  anlassraumContext: boolean;
  participationPotential: number;
  topicLabel: string;
}): AutonomousTopicCluster["nextSuggestedAction"] {
  const topicParam = encodeURIComponent(cluster.topicLabel);
  if (cluster.duplicateSuggestionCount > 0) {
    return {
      key: "compare_duplicates",
      label: "Dublettenvorschlag prüfen",
      description: "Ähnliche Signale bleiben getrennt, bis ein Mensch die Zusammenführung bewusst bestätigt.",
      href: `/admin/themenradar?mode=autonomous&topic=${topicParam}`,
    };
  }
  if (cluster.weakEvidence) {
    return {
      key: "gather_evidence",
      label: "Quellenlage ergänzen",
      description: "Vor Swipes oder Dossier-Anschluss sollte mindestens eine belastbare Quelle oder Gegenperspektive ergänzt werden.",
      href: "/admin/feeds",
    };
  }
  if (cluster.reactivated) {
    return {
      key: "reactivate_topic",
      label: "Thema reaktivieren",
      description: "Zu einem älteren Thema sind neue Signale eingegangen. Der Cluster sollte erneut in Review oder Anlassraum geprüft werden.",
      href: "/admin/review",
    };
  }
  if (!cluster.anlassraumContext && cluster.participationPotential >= 60) {
    return {
      key: "prepare_anlassraum",
      label: "Anlassraum vorbereiten",
      description: "Die Signalmenge spricht für einen Beteiligungsraum statt nur für ein isoliertes Statement.",
      href: "/admin/feeds/anlassraum",
    };
  }
  if (!cluster.dossierContext) {
    return {
      key: "attach_dossier",
      label: "Dossier-Kontext prüfen",
      description: "Quellen, offene Fragen und Perspektiven sollten vor größerer Sichtbarkeit an einen Dossier-Kontext gehängt werden.",
      href: "/admin/review",
    };
  }
  if (!cluster.visibleInSwipes) {
    return {
      key: "attach_swipes",
      label: "Für Swipes vorbereiten",
      description: "Die Cluster-Lage reicht für einen Swipe-Vorschlag, bleibt aber review-first und ohne Auto-Publish.",
      href: `/swipes?topic=${topicParam}`,
    };
  }
  if (cluster.stale) {
    return {
      key: "monitor",
      label: "Nur beobachten",
      description: "Ohne frische Signale sinkt der Prioritätswert. Das Thema bleibt beobachtbar, aber nicht aktiv eskaliert.",
      href: "/admin/themenradar?mode=autonomous",
    };
  }
  return {
    key: "review_cluster",
    label: "Review bündeln",
    description: "Der Cluster ist stark genug für einen bewussten Review-Schritt Richtung Swipes, Dossier oder Anlassraum.",
    href: "/admin/review",
  };
}

async function loadWorkspaceMeta(dossierIds: string[]): Promise<Map<string, WorkspaceMeta>> {
  const repo = getDossierStudioWorkspaceRepo();
  const entries = await Promise.all(
    dossierIds.map(async (dossierId) => {
      const workspace = await repo.getDossierStudioWorkspace(dossierId).catch(() => null);
      return [
        dossierId,
        {
          regionId: normalizeString(workspace?.regionId),
          organizationId: normalizeString(workspace?.organizationId),
        },
      ] as const;
    }),
  );
  return new Map(entries);
}

function buildClusterId(seed: AutonomousSeed): string {
  const scopeKey = seed.organizationId
    ? `org:${seed.organizationId}`
    : seed.regionId
      ? `region:${seed.regionId}`
      : "public";
  return `${scopeKey}:${seed.clusterTopicKey}`;
}

async function loadProposalSeeds(scope?: AutonomousThemenradarScope): Promise<AutonomousSeed[]> {
  const proposals = (await getCol<StatementProposalDoc>("statement_proposals"))
    .find({})
    .sort({ createdAt: -1 })
    .limit(80);
  const docs = await proposals.toArray();
  return docs
    .map((doc) => {
      const topicLabel = normalizeString(doc.topic) ?? normalizeString(doc.title) ?? normalizeString(doc.text) ?? "Allgemeines Thema";
      return {
        sourceId: toHex(doc._id) ?? `proposal:${topicKeyFromLabel(topicLabel, topicLabel)}`,
        sourceType: "proposal" as const,
        title: normalizeString(doc.title) ?? normalizeString(doc.text) ?? topicLabel,
        topicLabel,
        clusterTopicKey: topicKeyFromLabel(topicLabel, normalizeString(doc.title) ?? topicLabel),
        regionId: null,
        organizationId: null,
        claims: dedupeTexts([normalizeString(doc.text), normalizeString(doc.title)]),
        questions: [],
        options: [],
        evidenceHints: dedupeTexts([normalizeString(doc.responsibility)]),
        reviewRequired: true,
        weakEvidence: true,
        createdAt: toIso(doc.createdAt),
        sourceHref: null,
        swipesHref: `/swipes?topic=${encodeURIComponent(topicLabel)}`,
        dossierHref: normalizeString(doc.dossierId) ? `/dossier/${encodeURIComponent(String(doc.dossierId))}` : null,
        anlassraumHref: normalizeString(doc.anlassraumId) ? `/runden?anlassraumId=${encodeURIComponent(String(doc.anlassraumId))}` : null,
        priorityBoost: 5,
      };
    })
    .filter((seed) => matchesScope({ regionId: seed.regionId, organizationId: seed.organizationId, scope }));
}

async function loadFeedSeeds(scope?: AutonomousThemenradarScope): Promise<AutonomousSeed[]> {
  const drafts = await voteDraftsCol();
  const docs = (await drafts
    .find({
      status: { $in: ["draft", "review", "published"] },
      feedReviewState: { $ne: "ignored" },
    })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(80)
    .toArray()) as VoteDraftDoc[];

  return docs
    .map((draft) => {
      const topicLabel =
        normalizeString(draft.claims?.[0]?.topic) ??
        normalizeString(draft.title) ??
        "Feed-Thema";
      const regionId = normalizeString(draft.regionCode);
      const sourceId = toHex(draft._id) ?? topicKeyFromLabel(topicLabel, draft.title);
      const weakSignal = draft.feedReviewState === "weak_signal" || draft.weakSignal?.flagged === true;
      const anlassraumId = toHex(draft.anlassraumId);
      return {
        sourceId,
        sourceType: "feed" as const,
        title: normalizeString(draft.title) ?? topicLabel,
        topicLabel,
        clusterTopicKey: topicKeyFromLabel(topicLabel, draft.title),
        regionId,
        organizationId: null,
        claims: feedClaimTexts(draft),
        questions: feedQuestionTexts(draft),
        options: feedOptionTexts(draft),
        evidenceHints: dedupeTexts([normalizeString(draft.sourceUrl), normalizeString(draft.reviewNote)]),
        reviewRequired: true,
        weakEvidence: weakSignal || feedClaimTexts(draft).length === 0,
        createdAt: toIso(draft.publishedAt ?? draft.createdAt),
        sourceHref: normalizeString(draft.sourceUrl),
        swipesHref: `/swipes?topic=${encodeURIComponent(topicLabel)}`,
        dossierHref: null,
        anlassraumHref: anlassraumId ? `/runden?anlassraumId=${encodeURIComponent(anlassraumId)}` : null,
        priorityBoost: draft.status === "published" ? 18 : draft.status === "review" ? 14 : 9,
      };
    })
    .filter((seed) => matchesScope({ regionId: seed.regionId, organizationId: seed.organizationId, scope }));
}

async function loadDossierSeeds(scope?: AutonomousThemenradarScope): Promise<AutonomousSeed[]> {
  const docs = (await (await dossierSuggestionsCol())
    .find({})
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(80)
    .toArray()) as DossierSuggestionDoc[];

  const workspaceMeta = await loadWorkspaceMeta(uniqueStrings(docs.map((doc) => doc.dossierId)));

  return docs
    .map((doc) => {
      const payload = doc.payload ?? {};
      const workspace = workspaceMeta.get(doc.dossierId) ?? { regionId: null, organizationId: null };
      const topicLabel =
        normalizeString(payload.title) ??
        normalizeString(payload.summary) ??
        normalizeString(doc.dossierId) ??
        "Dossier-Thema";
      return {
        sourceId: normalizeString(doc.suggestionId) ?? `${doc.dossierId}:${doc.type}`,
        sourceType: "dossier" as const,
        title: normalizeString(payload.title) ?? topicLabel,
        topicLabel,
        clusterTopicKey: topicKeyFromLabel(topicLabel, topicLabel),
        regionId: workspace.regionId,
        organizationId: workspace.organizationId,
        claims: suggestionSectionToClaim(doc.type, payload),
        questions: suggestionSectionToQuestion(doc.type, payload),
        options: suggestionSectionToOption(doc.type, payload),
        evidenceHints: dedupeTexts([normalizeString(payload.sourceHref)]),
        reviewRequired: true,
        weakEvidence: !normalizeString(payload.sourceHref),
        createdAt: toIso(doc.updatedAt ?? doc.createdAt),
        sourceHref: normalizeString(payload.sourceHref),
        swipesHref: normalizeString(payload.swipesHref),
        dossierHref: `/dossier/${encodeURIComponent(doc.dossierId)}`,
        anlassraumHref: normalizeString(payload.anlassraumHref),
        priorityBoost: doc.status === "accepted" ? 15 : 10,
      };
    })
    .filter((seed) => matchesScope({ regionId: seed.regionId, organizationId: seed.organizationId, scope }));
}

async function loadAnlassraumSeeds(scope?: AutonomousThemenradarScope): Promise<AutonomousSeed[]> {
  const docs = (await (await anlassraumCol())
    .find({})
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(80)
    .toArray()) as AnlassraumSupplyDoc[];

  return docs
    .map((doc) => {
      const title = normalizeString(doc.title) ?? "Anlassraum";
      const sourceMode = normalizeString(doc.sourceMode);
      return {
        sourceId: toHex(doc._id) ?? topicKeyFromLabel(title, title),
        sourceType: "anlassraum" as const,
        title,
        topicLabel: title,
        clusterTopicKey: topicKeyFromLabel(sourceMode ?? title, title),
        regionId: normalizeString(doc.regionKey),
        organizationId: null,
        claims: dedupeTexts([normalizeString(doc.summary)]),
        questions: doc.isPublic ? [] : dedupeTexts([normalizeString(doc.summary)]),
        options: [],
        evidenceHints: dedupeTexts([sourceMode]),
        reviewRequired: true,
        weakEvidence: !doc.isPublic && !sourceMode,
        createdAt: toIso(doc.updatedAt ?? doc.createdAt),
        sourceHref: null,
        swipesHref: `/swipes?topic=${encodeURIComponent(title)}`,
        dossierHref: toHex(doc.dossierId) ? `/dossier/${encodeURIComponent(String(toHex(doc.dossierId))!)}` : null,
        anlassraumHref: `/runden?anlassraumId=${encodeURIComponent(String(toHex(doc._id) ?? ""))}`,
        priorityBoost: doc.isPublic ? 12 : 8,
      };
    })
    .filter((seed) => matchesScope({ regionId: seed.regionId, organizationId: seed.organizationId, scope }));
}

async function loadCreateSeeds(scope?: AutonomousThemenradarScope): Promise<AutonomousSeed[]> {
  const records = await listPersistedCreateHandoffRecords();
  return records
    .map((record) => {
      const topicLabel =
        normalizeString(record.topicSeed.topicLabel) ??
        normalizeString(record.selectedAction) ??
        "Neues Anliegen";
      return {
        sourceId: record.id,
        sourceType: "create" as const,
        title: buildPersistedCreateHandoffSummary(record),
        topicLabel,
        clusterTopicKey: topicKeyFromLabel(topicLabel, record.sourceText),
        regionId: normalizeString(record.regionId),
        organizationId: normalizeString(record.organizationId),
        claims: extractClaimTextsFromCreate(record),
        questions: extractQuestionTextsFromCreate(record),
        options: dedupeTexts(record.arguments.map((entry) => normalizeString(entry.text))),
        evidenceHints: extractEvidenceHintsFromCreate(record),
        reviewRequired: true,
        weakEvidence: extractEvidenceHintsFromCreate(record).length === 0,
        createdAt: normalizeString(record.updatedAt ?? record.createdAt),
        sourceHref: record.resumeHref,
        swipesHref: `/swipes?topic=${encodeURIComponent(topicLabel)}`,
        dossierHref: normalizeString(record.dossierId) ? `/dossier/${encodeURIComponent(String(record.dossierId))}` : null,
        anlassraumHref: normalizeString(record.anlassraumId)
          ? `/runden?anlassraumId=${encodeURIComponent(String(record.anlassraumId))}`
          : null,
        priorityBoost: 12,
      };
    })
    .filter((seed) => matchesScope({ regionId: seed.regionId, organizationId: seed.organizationId, scope }));
}

async function loadClusterSeeds(scope?: AutonomousThemenradarScope): Promise<AutonomousSeed[]> {
  const docs = (await (await feedAnlassraumClusterCandidatesCol())
    .find({})
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(80)
    .toArray()) as FeedAnlassraumClusterCandidateDoc[];

  return docs
    .map((doc) => {
      const title = normalizeString(doc.sampleTitles?.[0]) ?? normalizeString(doc.topicKey) ?? "Cluster";
      const regionId = normalizeString(doc.regionCode);
      return {
        sourceId: toHex(doc._id) ?? `${doc.clusterKey}:${doc.topicKey}`,
        sourceType: "cluster" as const,
        title,
        topicLabel: normalizeString(doc.topicKey) ?? title,
        clusterTopicKey: normalizeString(doc.topicKey) ?? topicKeyFromLabel(title, title),
        regionId,
        organizationId: null,
        claims: dedupeTexts(doc.sampleTitles ?? []),
        questions: [],
        options: [],
        evidenceHints: dedupeTexts([normalizeString(doc.clusterKey), `Drafts: ${doc.draftCount}`]),
        reviewRequired: true,
        weakEvidence: doc.draftCount < 2,
        createdAt: toIso(doc.updatedAt ?? doc.createdAt),
        sourceHref: null,
        swipesHref: `/swipes?topic=${encodeURIComponent(normalizeString(doc.topicKey) ?? title)}`,
        dossierHref: null,
        anlassraumHref: doc.anlassraumIds?.[0] ? `/runden?anlassraumId=${encodeURIComponent(String(toHex(doc.anlassraumIds[0]) ?? ""))}` : null,
        priorityBoost: doc.draftCount >= 3 ? 18 : 10,
      };
    })
    .filter((seed) => matchesScope({ regionId: seed.regionId, organizationId: seed.organizationId, scope }));
}

async function loadMaterialSeeds(scope?: AutonomousThemenradarScope): Promise<AutonomousSeed[]> {
  const jobs = await listMaterialExtractionThemenradarSeeds(scope).catch(() => []);
  return jobs.map((job) => ({
    sourceId: job.sourceId,
    sourceType: "material" as const,
    title: job.title,
    topicLabel: job.topicLabel,
    clusterTopicKey: job.clusterTopicKey,
    regionId: job.regionId,
    organizationId: job.organizationId,
    claims: job.claims,
    questions: job.questions,
    options: job.options,
    evidenceHints: job.evidenceHints,
    reviewRequired: true,
    weakEvidence: job.weakEvidence,
    createdAt: job.createdAt,
    sourceHref: job.sourceHref,
    swipesHref: job.swipesHref,
    dossierHref: job.dossierHref,
    anlassraumHref: job.anlassraumHref,
    priorityBoost: job.priorityBoost,
  }));
}

export async function buildAutonomousThemenradarReadModel(input?: {
  scope?: AutonomousThemenradarScope;
  limit?: number;
}): Promise<AutonomousThemenradarReadModel> {
  const aiIntegration = resolveAiFlowIntegration("themenradar");
  const scope = input?.scope;
  const limit = Math.max(1, Math.min(40, Math.floor(input?.limit ?? 16)));
  const [supplyModel, proposalSeeds, feedSeeds, dossierSeeds, anlassraumSeeds, createSeeds, clusterSeeds, materialSeeds] =
    await Promise.all([
      buildPublicTopicSupplyReadModel({
        filter: {
          viewerRegionIds: scope?.viewerRegionIds ?? [],
          organizationIds: scope?.organizationIds ?? [],
          adminContext: scope?.adminContext === true,
        },
        limit: 80,
      }).catch(() => ({ items: [], summary: null as never })),
      loadProposalSeeds(scope),
      loadFeedSeeds(scope),
      loadDossierSeeds(scope),
      loadAnlassraumSeeds(scope),
      loadCreateSeeds(scope),
      loadClusterSeeds(scope),
      loadMaterialSeeds(scope),
    ]);

  const visibleSupplySourceIds = supplyItemVisibleSet(supplyModel.items ?? []);
  const grouped = new Map<string, AutonomousSeed[]>();
  const allSeeds = [
    ...proposalSeeds,
    ...feedSeeds,
    ...dossierSeeds,
    ...anlassraumSeeds,
    ...createSeeds,
    ...clusterSeeds,
    ...materialSeeds,
  ];

  for (const seed of allSeeds) {
    const clusterId = buildClusterId(seed);
    const existing = grouped.get(clusterId) ?? [];
    existing.push(seed);
    grouped.set(clusterId, existing);
  }

  const items = Array.from(grouped.entries())
    .map(([clusterId, seeds]): AutonomousTopicCluster => {
      const primary = [...seeds].sort((left, right) => {
        const scoreDiff = right.priorityBoost - left.priorityBoost;
        if (scoreDiff !== 0) return scoreDiff;
        return scoreFromRecency(right.createdAt) - scoreFromRecency(left.createdAt);
      })[0];
      const claims = dedupeTexts(seeds.flatMap((seed) => seed.claims));
      const questions = dedupeTexts(seeds.flatMap((seed) => seed.questions));
      const options = dedupeTexts(seeds.flatMap((seed) => seed.options));
      const evidenceHints = dedupeTexts(seeds.flatMap((seed) => seed.evidenceHints));
      const sourceIds = uniqueStrings(seeds.map((seed) => seed.sourceId));
      const sourceTypes = Array.from(new Set(seeds.map((seed) => seed.sourceType)));
      const createdAt = [...seeds]
        .map((seed) => seed.createdAt)
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? null;
      const updatedAt = [...seeds]
        .map((seed) => seed.createdAt)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;
      const recencyScore = scoreFromRecency(updatedAt);
      const oldRecencyScore = scoreFromRecency(createdAt);
      const sourceDiversity = sourceTypes.length * 8;
      const urgencyScore = clampScore(
        recencyScore * 0.45 +
          claims.length * 9 +
          questions.length * 6 +
          seeds.length * 7 +
          primary.priorityBoost,
      );
      const relevanceScore = clampScore(
        sourceDiversity + claims.length * 10 + options.length * 6 + evidenceHints.length * 5 + seeds.length * 8,
      );
      const regionalityScore = clampScore(
        primary.organizationId ? 100 : primary.regionId ? 82 : 35,
      );
      const participationPotential = clampScore(
        questions.length * 12 +
          options.length * 10 +
          (seeds.some((seed) => seed.sourceType === "anlassraum") ? 18 : 0) +
          (seeds.some((seed) => seed.sourceType === "create") ? 14 : 0) +
          Math.min(claims.length, 4) * 6,
      );
      const weakEvidence =
        seeds.some((seed) => seed.weakEvidence) &&
        evidenceHints.length < 2 &&
        sourceIds.length < 3;
      const stale = recencyScore <= 25;
      const reactivated = oldRecencyScore <= 25 && recencyScore >= 70 && sourceIds.length >= 2;
      const visibleInSwipes =
        seeds.some((seed) => visibleSupplySourceIds.has(seed.sourceId)) ||
        seeds.some((seed) => seed.swipesHref && visibleSupplySourceIds.has(normalizeString(seed.title) ?? ""));
      const dossierContext = seeds.some((seed) => Boolean(seed.dossierHref));
      const anlassraumContext = seeds.some((seed) => Boolean(seed.anlassraumHref));
      const duplicateSuggestionCount = Math.max(0, sourceIds.length - 1);
      const strongSignal = urgencyScore >= 60 || relevanceScore >= 60 || participationPotential >= 60;
      const reviewState: AutonomousTopicReviewState = weakEvidence
        ? "weak_evidence"
        : stale
          ? "stale_signal"
          : strongSignal || sourceIds.length >= 2
            ? "review_candidate"
            : "needs_review";
      const nextSuggestedAction = nextActionFromCluster({
        duplicateSuggestionCount,
        weakEvidence,
        reactivated,
        stale,
        visibleInSwipes,
        dossierContext,
        anlassraumContext,
        participationPotential,
        topicLabel: primary.topicLabel,
      });

      return {
        id: clusterId,
        sourceId: primary.sourceId,
        sourceIds,
        sourceTypes,
        title: primary.title,
        topicLabel: primary.topicLabel,
        topicClusterId: clusterId,
        regionId: primary.regionId,
        organizationId: primary.organizationId,
        claims,
        questions,
        options,
        evidenceHints,
        urgencyScore,
        relevanceScore,
        regionalityScore,
        participationPotential,
        reviewState,
        reviewStateLabel: reviewStateLabel(reviewState),
        reviewHint: reviewStateHint(reviewState),
        nextSuggestedAction,
        duplicateSuggestionCount,
        strongSignal,
        weakEvidence,
        reactivated,
        stale,
        visibleInSwipes,
        dossierContext,
        anlassraumContext,
        aiOrchestration: {
          lane: aiIntegration.lane,
          laneLabel: aiIntegration.laneLabel,
          outputLabel: aiIntegration.outputLabel,
          reviewRequired: true,
          draftOnly: true,
          publicOutputAllowed: false,
        },
        autoPublishAllowed: false,
        reviewRequired: true,
        createdAt,
        updatedAt,
      };
    })
    .sort((left, right) => {
      const leftScore = left.urgencyScore + left.relevanceScore + left.participationPotential;
      const rightScore = right.urgencyScore + right.relevanceScore + right.participationPotential;
      return rightScore - leftScore;
    })
    .slice(0, limit);

  const summary: AutonomousThemenradarSummary = {
    totalClusters: items.length,
    strongSignals: items.filter((item) => item.strongSignal).length,
    duplicates: items.filter((item) => item.duplicateSuggestionCount > 0).length,
    reviewRequired: items.filter((item) => item.reviewRequired).length,
    weakEvidence: items.filter((item) => item.weakEvidence).length,
    regionalHotspots: items.filter((item) => item.regionId || item.organizationId).length,
    reactivated: items.filter((item) => item.reactivated).length,
    stale: items.filter((item) => item.stale).length,
    nextAction:
      items[0]?.nextSuggestedAction ?? {
        label: "Themenradar beobachten",
        description: "Aktuell liegen keine stärkeren Cluster vor. Das ist ein ehrlicher Leerzustand ohne Seed-Ersatz.",
        href: "/admin/themenradar",
      },
  };

  return {
    generatedAt: new Date().toISOString(),
    items,
    summary,
  };
}
