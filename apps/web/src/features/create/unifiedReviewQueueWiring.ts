import {
  buildCanonicalSourcePack,
  getCanonicalSourcePackOverallEvidenceState,
  type BuildCanonicalSourcePackInput,
  type CanonicalSourcePack,
  type CanonicalSourcePackEvidenceState,
} from "@/features/create/canonicalSourcePackContract";
import {
  buildCanonicalLanguageBridgeRecord,
  type CanonicalLanguageBridgeRecord,
  type CanonicalTrustState,
} from "@/features/create/languageBridgeTrustFormatContract";
import {
  buildCrossLingualTopicClaimClusteringSuggestion,
  type CrossLingualTopicClaimClusteringSuggestion,
} from "@/features/create/crossLingualTopicClaimClusteringContract";
import {
  buildDossierSocialOutputDraft,
  type DossierSocialOutputDraft,
  type DossierSocialOutputDraftKind,
} from "@/features/create/dossierSocialOutputDraftContract";
import {
  buildDossierWorkspaceReviewSurface,
  type DossierWorkspaceReviewSurface,
} from "@/features/create/dossierWorkspaceReviewSurfaceContract";
import {
  buildMultilingualEvidenceTrustRecord,
  type MultilingualEvidenceTrustRecord,
} from "@/features/create/multilingualEvidenceTrustContract";
import {
  buildMultilingualStatementThreadEntry,
  type MultilingualStatementThreadEntry,
} from "@/features/create/multilingualStatementThreadContract";
import {
  buildParticipationHandoffCandidate,
  type ParticipationHandoffCandidate,
} from "@/features/create/participationHandoffContract";
import {
  createReviewQueueItemFromHandoffDraft,
} from "@/features/create/createHandoffReviewQueue";
import {
  buildUnifiedReviewQueueItemFromCreateHandoff,
  buildUnifiedReviewQueueItemFromParticipationCandidate,
  buildUnifiedReviewQueueItemFromSocialOutputDraft,
  buildUnifiedReviewQueueItemFromVoxyVideoBriefing,
  type V3UnifiedReviewQueueItem,
} from "@/features/create/unifiedReviewQueueContract";
import type { PersistedCreateHandoffRecord } from "@/features/create/createHandoffPersistenceContract";
import {
  buildPersistedCreateHandoffSuggestedTitle,
  buildPersistedCreateHandoffSummary,
} from "@/features/create/createHandoffPersistenceContract";
import type { DossierStudioWorkspace } from "@features/dossier/server/studioPersistence";
import type { SocialDistributionPost } from "@features/outputEngine/socialDistributionRuntime";
import type {
  CreateHandoffDraft,
  CreateHandoffDraftStatus,
  CreateHandoffDraftTarget,
} from "@/features/create/createHandoffDrafts";
import {
  buildVoxyPublishDraft,
  buildVoxyReviewState,
  buildVoxyScriptSegments,
  buildVoxyVideoBriefing,
  resolveVoxyRenderJob,
  type VoxyPublishDraft,
  type VoxyRenderJob,
  type VoxyReviewState,
  type VoxyScriptSegment,
  type VoxyVideoBriefing,
} from "@/features/voxyVideo";

export type V3ReviewQueueWiringContext = {
  primaryUnifiedItem: V3UnifiedReviewQueueItem | null;
  unifiedItems: V3UnifiedReviewQueueItem[];
  sourcePack: CanonicalSourcePack | null;
  languageBridge: CanonicalLanguageBridgeRecord | null;
  multilingualThread: MultilingualStatementThreadEntry | null;
  multilingualEvidence: MultilingualEvidenceTrustRecord | null;
  participationCandidates: ParticipationHandoffCandidate[];
  crossLingualSuggestions: CrossLingualTopicClaimClusteringSuggestion[];
  socialOutputDrafts: DossierSocialOutputDraft[];
  dossierWorkspaceSurface: DossierWorkspaceReviewSurface | null;
  voxyBriefing: VoxyVideoBriefing | null;
  voxyScriptSegments: VoxyScriptSegment[];
  voxyReviewState: VoxyReviewState | null;
  voxyRenderJob: VoxyRenderJob | null;
  voxyPublishDraft: VoxyPublishDraft | null;
};

type BuildCrossLingualSuggestionsInput = {
  entry: MultilingualStatementThreadEntry | null;
  sourceRefPrefix: string;
};

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function uniqueByKey<T>(items: readonly T[], keyFor: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyFor(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function isLikelyUrl(value: string | null | undefined): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  try {
    new URL(raw);
    return true;
  } catch {
    return false;
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function mapSelectedActionToDraftTarget(
  record: PersistedCreateHandoffRecord,
): CreateHandoffDraftTarget {
  if (
    record.selectedAction === "create_dossier" ||
    record.selectedAction === "append_to_dossier"
  ) {
    return "dossier_candidate";
  }
  if (record.selectedAction === "prepare_anlassraum") {
    return "anlassraum_candidate";
  }
  if (
    record.selectedAction === "prepare_participation_space" ||
    record.selectedAction === "prepare_vote"
  ) {
    return "participation_space_candidate";
  }
  if (record.selectedAction === "request_factcheck") {
    return "factcheck_request";
  }
  return "editorial_review";
}

function mapReviewStateToDraftStatus(
  reviewState: PersistedCreateHandoffRecord["reviewState"],
): CreateHandoffDraftStatus {
  if (reviewState === "clarification_required") return "needs_clarification";
  if (reviewState === "ready_for_confirmation") return "prepared";
  if (reviewState === "factcheck_candidate") return "prepared";
  if (reviewState === "graph_review_required") return "prepared";
  if (reviewState === "manual_review_required") return "prepared";
  return "draft";
}

function buildCreateHandoffDraftFromPersistedRecord(
  record: PersistedCreateHandoffRecord,
): CreateHandoffDraft {
  const target = mapSelectedActionToDraftTarget(record);

  return {
    id: record.id,
    source: "create_followup",
    target,
    status: mapReviewStateToDraftStatus(record.reviewState),
    title: `${buildPersistedCreateHandoffSuggestedTitle(record, target === "anlassraum_candidate" ? "anlassraum" : target === "participation_space_candidate" ? "participation_space" : "dossier")}`,
    summary: buildPersistedCreateHandoffSummary(record),
    authorStandpoint: record.authorStandpoint ?? null,
    existingMatchDecision: record.existingMatchDecision ?? null,
    topicTitle: record.topicSeed.topicLabel,
    relatedMatchId: null,
    relatedDialogOutcomeId: null,
    selectedPerspectiveIds: [],
    selectedBranchIds: [],
    selectedArgumentIds: record.arguments.map((argument) => argument.id),
    authorProvidedSources: record.sourceGrounding
      .map((entry) => entry.detail ?? entry.label)
      .filter((value) => isLikelyUrl(value)),
    authorProvidedExamples: [],
    openQuestions: record.openQuestions.map((question) => question.question),
    requiresEditorialReview:
      target === "dossier_candidate" ||
      target === "anlassraum_candidate" ||
      target === "participation_space_candidate" ||
      target === "editorial_review",
    requiresFactcheck: target === "factcheck_request",
    autoCreate: false,
    autoPublish: false,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapEvidenceStateToTrustState(
  evidenceState: CanonicalSourcePackEvidenceState,
): CanonicalTrustState {
  if (evidenceState === "supported") return "supported";
  if (evidenceState === "partial") return "partially_supported";
  if (evidenceState === "contested") return "contested";
  if (evidenceState === "context_missing") return "context_missing";
  if (evidenceState === "outdated") return "outdated";
  return "source_needed";
}

function buildCanonicalSourcePackFromCreateHandoffRecord(
  record: PersistedCreateHandoffRecord,
): CanonicalSourcePack {
  const sources: Array<
    NonNullable<BuildCanonicalSourcePackInput["sources"]>[number]
  > = [];
  const openGaps: string[] = [];

  for (const entry of record.sourceGrounding) {
    if (entry.status === "link_reference") {
      const url = isLikelyUrl(entry.detail)
        ? entry.detail ?? null
        : isLikelyUrl(entry.label)
          ? entry.label
          : null;
      sources.push({
        sourceId: entry.id,
        title: entry.label,
        url,
        sourceLocale: "de",
        sourceType: "user_supplied",
        reliabilityHint: "secondary",
        originalSnippet: url ? null : normalizeOptionalText(entry.detail) ?? entry.label,
        translationStatus: "not_needed",
        evidenceState: "partial",
        reviewState: "review_required",
      });
      continue;
    }
    if (entry.status === "source_excerpt") {
      sources.push({
        sourceId: entry.id,
        title: entry.label,
        sourceLocale: "de",
        sourceType: "user_supplied",
        reliabilityHint: "unknown",
        originalSnippet: normalizeOptionalText(entry.detail) ?? entry.label,
        translationStatus: "not_needed",
        evidenceState: "partial",
        reviewState: "review_required",
      });
      continue;
    }
    openGaps.push("source_needed");
  }

  if (record.openQuestions.some((question) => question.requiredBeforePublish)) {
    openGaps.push("context_missing");
  }

  return buildCanonicalSourcePack({
    sourcePackId: `create-handoff-source-pack:${record.id}`,
    sources,
    openGaps,
  });
}

function buildCanonicalSourcePackFromWorkspace(
  workspace: DossierStudioWorkspace,
): CanonicalSourcePack {
  const traces = workspace.masterPostDraft?.sourceState.traces ?? [];
  const notes = workspace.masterPostDraft?.sourceState.notes ?? [];
  const sourceStatus = workspace.masterPostDraft?.sourceState.status ?? "missing";

  return buildCanonicalSourcePack({
    sourcePackId: `workspace-source-pack:${workspace.id}`,
    sources: traces.map((trace) => ({
      sourceId: trace.sourceId,
      title: trace.title,
      url: trace.url,
      sourceLocale: "de",
      sourceType: "official",
      reliabilityHint: sourceStatus === "sufficient" ? "primary" : "unknown",
      originalSnippet: trace.note ?? null,
      translationStatus: "not_needed",
      evidenceState: sourceStatus === "sufficient" ? "supported" : "source_needed",
      reviewState: "review_required",
    })),
    openGaps: sourceStatus === "missing" ? ["source_needed", ...notes] : notes,
  });
}

function buildCanonicalSourcePackFromSocialPost(
  post: SocialDistributionPost,
): CanonicalSourcePack {
  return buildCanonicalSourcePack({
    sourcePackId: `social-post-source-pack:${post.id}`,
    sources: post.assets
      .filter((asset) => Boolean(asset.href) || Boolean(asset.text))
      .map((asset) => ({
        sourceId: asset.id,
        title: asset.label,
        url: asset.href ?? null,
        sourceLocale: "de",
        sourceType: "user_supplied",
        reliabilityHint: asset.sealGranted ? "official" : "secondary",
        originalSnippet: asset.text ?? null,
        translationStatus: "not_needed",
        evidenceState:
          post.sourceState === "approved_context" ? "supported" : "partial",
        reviewState: "review_required",
      })),
    openGaps: post.sourceState === "internal_only" ? ["context_missing"] : [],
  });
}

function buildLanguageBridgeFromCreateHandoffRecord(
  record: PersistedCreateHandoffRecord,
  sourcePack: CanonicalSourcePack,
): CanonicalLanguageBridgeRecord {
  const trustState = mapEvidenceStateToTrustState(
    getCanonicalSourcePackOverallEvidenceState(sourcePack),
  );

  return buildCanonicalLanguageBridgeRecord({
    sourceLanguage: "de",
    contentLanguage: "de",
    uiLocale: "de",
    originalText: record.sourceText,
    summaryText: record.plannerResult.shortSummary ?? null,
    voxyClassificationText: unique(record.plannerResult.topicCandidates ?? []).join(" · "),
    trustState,
    openQuestions: record.openQuestions.map((question) => question.question),
    uncertaintyNotes: sourcePack.openGaps,
  });
}

function buildLanguageBridgeFromWorkspace(
  workspace: DossierStudioWorkspace,
  sourcePack: CanonicalSourcePack,
): CanonicalLanguageBridgeRecord {
  const trustState = mapEvidenceStateToTrustState(
    getCanonicalSourcePackOverallEvidenceState(sourcePack),
  );
  const originalText =
    workspace.masterPostDraft?.body ??
    workspace.reviewNotes ??
    workspace.audienceNotes ??
    workspace.title;

  return buildCanonicalLanguageBridgeRecord({
    sourceLanguage: "de",
    contentLanguage: "de",
    uiLocale: "de",
    originalText,
    summaryText:
      workspace.masterPostDraft?.overallPicture ??
      workspace.reviewNotes ??
      workspace.audienceNotes ??
      null,
    voxyClassificationText:
      workspace.masterPostDraft?.topic ?? workspace.title,
    trustState,
    openQuestions: workspace.masterPostDraft?.openQuestions ?? [],
    uncertaintyNotes: sourcePack.openGaps,
  });
}

function buildParticipationCandidatesFromCreateHandoffRecord(
  record: PersistedCreateHandoffRecord,
): ParticipationHandoffCandidate[] {
  const prompt =
    record.openQuestions[0]?.question ??
    record.plannerResult.openQuestions?.[0] ??
    record.sourceText;
  const options = unique(record.claims.map((claim) => claim.text)).slice(0, 4);

  if (record.selectedAction === "prepare_vote") {
    return [
      buildParticipationHandoffCandidate({
        id: `${record.id}:poll`,
        recommendation: "poll",
        title: `${record.topicSeed.topicLabel} · Poll`,
        prompt,
        options,
      }),
    ];
  }

  if (record.selectedAction === "prepare_participation_space") {
    return [
      buildParticipationHandoffCandidate({
        id: `${record.id}:participation-space`,
        recommendation: "comment_thread",
        title: `${record.topicSeed.topicLabel} · Beteiligungsraum`,
        prompt,
      }),
    ];
  }

  if (record.selectedAction === "prepare_anlassraum") {
    return [
      buildParticipationHandoffCandidate({
        id: `${record.id}:mitmachraum`,
        recommendation: "mitmachraum",
        title: `${record.topicSeed.topicLabel} · Mitmachraum`,
        prompt,
      }),
    ];
  }

  if (record.openQuestions.length > 0) {
    return [
      buildParticipationHandoffCandidate({
        id: `${record.id}:live-question`,
        recommendation: "live_question",
        title: `${record.topicSeed.topicLabel} · Live-Frage`,
        prompt,
      }),
    ];
  }

  return [
    buildParticipationHandoffCandidate({
      id: `${record.id}:statement`,
      recommendation: "statement_review",
      title: `${record.topicSeed.topicLabel} · Statement`,
      prompt,
    }),
  ];
}

function mapWorkspaceStatusToPreparationStatus(
  workspace: DossierStudioWorkspace,
): "draft" | "review_ready" | "publish_ready" | "archived" {
  if (workspace.status === "archived") return "archived";
  if (workspace.officialApproval) return "publish_ready";
  if (workspace.status === "needs_review" || workspace.status === "locked") {
    return "review_ready";
  }
  return "draft";
}

function buildDossierSocialOutputDraftsFromWorkspace(
  workspace: DossierStudioWorkspace,
  sourcePack: CanonicalSourcePack | null,
  trustState: CanonicalTrustState | null,
): DossierSocialOutputDraft[] {
  const drafts: DossierSocialOutputDraft[] = [];
  const preparationStatus = mapWorkspaceStatusToPreparationStatus(workspace);
  const selectedChannels = new Set(workspace.distributionDraft?.selectedChannels ?? []);

  if (workspace.masterPostDraft || selectedChannels.has("website_update")) {
    drafts.push(
      buildDossierSocialOutputDraft({
        draftId: `${workspace.id}:website`,
        dossierId: workspace.dossierId,
        kind: "website_update_draft",
        title: `${workspace.title} · Website-Update`,
        summary:
          workspace.masterPostDraft?.overallPicture ??
          "Reviewpflichtiges Website-Update aus dem Dossier-Workspace.",
        sourcePack,
        trustState,
        preparationStatus,
      }),
    );
  }

  if (selectedChannels.has("newsletter_draft")) {
    drafts.push(
      buildDossierSocialOutputDraft({
        draftId: `${workspace.id}:newsletter`,
        dossierId: workspace.dossierId,
        kind: "newsletter_draft",
        title: `${workspace.title} · Newsletter`,
        summary:
          workspace.masterPostDraft?.body ??
          "Newsletter-Entwurf bleibt reviewpflichtig.",
        sourcePack,
        trustState,
        preparationStatus,
      }),
    );
  }

  if (selectedChannels.has("linkedin_draft")) {
    drafts.push(
      buildDossierSocialOutputDraft({
        draftId: `${workspace.id}:linkedin`,
        dossierId: workspace.dossierId,
        kind: "linkedin_draft",
        title: `${workspace.title} · LinkedIn`,
        summary:
          workspace.masterPostDraft?.hook ??
          "Kurzpost bleibt reviewpflichtig und unveröffentlicht.",
        sourcePack,
        trustState,
        preparationStatus,
      }),
    );
  }

  if (selectedChannels.has("press_note")) {
    drafts.push(
      buildDossierSocialOutputDraft({
        draftId: `${workspace.id}:press`,
        dossierId: workspace.dossierId,
        kind: "press_note_draft",
        title: `${workspace.title} · Pressenotiz`,
        summary:
          workspace.masterPostDraft?.sourceSituation ??
          "Pressenotiz bleibt reviewpflichtig.",
        sourcePack,
        trustState,
        preparationStatus,
      }),
    );
  }

  if (workspace.carouselDraft || selectedChannels.has("instagram_asset")) {
    drafts.push(
      buildDossierSocialOutputDraft({
        draftId: `${workspace.id}:carousel`,
        dossierId: workspace.dossierId,
        kind: "carousel_draft",
        title: `${workspace.title} · Carousel`,
        summary:
          workspace.carouselDraft?.slides[0]?.body ??
          "Carousel-Draft bleibt reviewpflichtig.",
        sourcePack,
        trustState,
        preparationStatus,
      }),
    );
  }

  if (workspace.masterPostDraft) {
    drafts.push(
      buildDossierSocialOutputDraft({
        draftId: `${workspace.id}:short-video`,
        dossierId: workspace.dossierId,
        kind: "short_video_script_draft",
        title: `${workspace.title} · Kurzvideo-Skript`,
        summary:
          workspace.masterPostDraft.participationQuestion ||
          workspace.masterPostDraft.body,
        sourcePack,
        trustState,
        preparationStatus,
      }),
    );
  }

  return uniqueByKey(drafts, (draft) => draft.kind);
}

function mapSocialPostStatusToPreparationStatus(
  status: SocialDistributionPost["status"],
): "review_ready" | "publish_ready" | "archived" | "failed" {
  if (status === "archived") return "archived";
  if (status === "blocked" || status === "error") return "failed";
  if (
    status === "approved" ||
    status === "queued" ||
    status === "scheduled_ready" ||
    status === "exported" ||
    status === "copied"
  ) {
    return "publish_ready";
  }
  return "review_ready";
}

function kindFromChannel(
  channel: string,
): DossierSocialOutputDraftKind | null {
  if (channel === "website_update") return "website_update_draft";
  if (channel === "newsletter_draft") return "newsletter_draft";
  if (channel === "linkedin_draft") return "linkedin_draft";
  if (channel === "press_note") return "press_note_draft";
  if (channel === "instagram_asset") return "carousel_draft";
  return null;
}

function buildDossierSocialOutputDraftsFromSocialPost(
  post: SocialDistributionPost,
  sourcePack: CanonicalSourcePack | null,
  trustState: CanonicalTrustState | null,
): DossierSocialOutputDraft[] {
  const kinds = unique(
    post.channels
      .map((channel) => kindFromChannel(channel))
      .filter((kind): kind is DossierSocialOutputDraftKind => Boolean(kind)),
  ) as DossierSocialOutputDraftKind[];

  return kinds.map((kind) =>
    buildDossierSocialOutputDraft({
      draftId: `${post.id}:${kind}`,
      dossierId: post.dossierId ?? post.sourceContextId,
      kind,
      title: `${post.title} · ${kind.replace(/_/g, " ")}`,
      summary: post.sourceSummary,
      sourcePack,
      trustState,
      preparationStatus: mapSocialPostStatusToPreparationStatus(post.status),
    }),
  );
}

export function buildCrossLingualSuggestionsForReview(
  input: BuildCrossLingualSuggestionsInput,
): CrossLingualTopicClaimClusteringSuggestion[] {
  if (!input.entry) return [];
  const originalLanguage = input.entry.bridge.original.language;
  const readingLanguage = input.entry.readingLocale;
  const hasTranslation =
    input.entry.bridge.translation.text !== null &&
    input.entry.bridge.translation.language !== originalLanguage;
  if (!hasTranslation && readingLanguage === originalLanguage) {
    return [];
  }

  return [
    buildCrossLingualTopicClaimClusteringSuggestion({
      suggestionId: `${input.sourceRefPrefix}:cross-lingual`,
      leftRef: `${input.sourceRefPrefix}:original:${originalLanguage}`,
      rightRef: `${input.sourceRefPrefix}:reading:${readingLanguage}`,
      relationship: hasTranslation
        ? "possible_translation_match"
        : "possible_context_overlap",
      explanation:
        "Sprachabweichung erzeugt nur einen review-first Hinweis und keine automatische Zusammenführung.",
    }),
  ];
}

function buildEmptyV3Context(): V3ReviewQueueWiringContext {
  return {
    primaryUnifiedItem: null,
    unifiedItems: [],
    sourcePack: null,
    languageBridge: null,
    multilingualThread: null,
    multilingualEvidence: null,
    participationCandidates: [],
    crossLingualSuggestions: [],
    socialOutputDrafts: [],
    dossierWorkspaceSurface: null,
    voxyBriefing: null,
    voxyScriptSegments: [],
    voxyReviewState: null,
    voxyRenderJob: null,
    voxyPublishDraft: null,
  };
}

export function buildPersistedCreateHandoffV3ReviewContext(
  record: PersistedCreateHandoffRecord,
): V3ReviewQueueWiringContext {
  const sourcePack = buildCanonicalSourcePackFromCreateHandoffRecord(record);
  const languageBridge = buildLanguageBridgeFromCreateHandoffRecord(
    record,
    sourcePack,
  );
  const multilingualThread = buildMultilingualStatementThreadEntry({
    entryId: `create-handoff-thread:${record.id}`,
    kind: "statement",
    sourceLanguage: languageBridge.original.language,
    contentLanguage: languageBridge.summary.language,
    uiLocale: "de",
    originalText: languageBridge.original.text,
    summaryText: languageBridge.summary.text,
    readingLocale: languageBridge.translation.language,
  });
  const multilingualEvidence = buildMultilingualEvidenceTrustRecord({
    sourcePack,
    userLocale: "de",
    readingLocale: multilingualThread.readingLocale,
  });
  const crossLingualSuggestions = buildCrossLingualSuggestionsForReview({
    entry: multilingualThread,
    sourceRefPrefix: `create-handoff:${record.id}`,
  });
  const queueItem = createReviewQueueItemFromHandoffDraft(
    buildCreateHandoffDraftFromPersistedRecord(record),
  );
  const primaryUnifiedItem = buildUnifiedReviewQueueItemFromCreateHandoff(
    queueItem,
    {
      sourcePack,
      languageBridge,
      blockers: sourcePack.openGaps,
    },
  );
  const participationCandidates = buildParticipationCandidatesFromCreateHandoffRecord(
    record,
  );
  const participationUnifiedItems = participationCandidates.map((candidate) =>
    buildUnifiedReviewQueueItemFromParticipationCandidate(candidate),
  );

  return {
    primaryUnifiedItem,
    unifiedItems: [primaryUnifiedItem, ...participationUnifiedItems],
    sourcePack,
    languageBridge,
    multilingualThread,
    multilingualEvidence,
    participationCandidates,
    crossLingualSuggestions,
    socialOutputDrafts: [],
    dossierWorkspaceSurface: null,
    voxyBriefing: null,
    voxyScriptSegments: [],
    voxyReviewState: null,
    voxyRenderJob: null,
    voxyPublishDraft: null,
  };
}

export function buildDossierWorkspaceV3ReviewContext(params: {
  workspace: DossierStudioWorkspace;
  sourceRecord?: PersistedCreateHandoffRecord | null;
}): V3ReviewQueueWiringContext {
  const sourceContext = params.sourceRecord
    ? buildPersistedCreateHandoffV3ReviewContext(params.sourceRecord)
    : buildEmptyV3Context();
  const sourcePack =
    sourceContext.sourcePack ??
    buildCanonicalSourcePackFromWorkspace(params.workspace);
  const languageBridge =
    sourceContext.languageBridge ??
    buildLanguageBridgeFromWorkspace(params.workspace, sourcePack);
  const multilingualThread =
    sourceContext.multilingualThread ??
    buildMultilingualStatementThreadEntry({
      entryId: `workspace-thread:${params.workspace.id}`,
      kind: "statement",
      sourceLanguage: languageBridge.original.language,
      contentLanguage: languageBridge.summary.language,
      uiLocale: "de",
      originalText: languageBridge.original.text,
      summaryText: languageBridge.summary.text,
      readingLocale: languageBridge.translation.language,
    });
  const multilingualEvidence =
    sourceContext.multilingualEvidence ??
    buildMultilingualEvidenceTrustRecord({
      sourcePack,
      userLocale: "de",
      readingLocale: multilingualThread.readingLocale,
    });
  const crossLingualSuggestions = [
    ...sourceContext.crossLingualSuggestions,
    ...buildCrossLingualSuggestionsForReview({
      entry: multilingualThread,
      sourceRefPrefix: `workspace:${params.workspace.id}`,
    }),
  ];
  const socialOutputDrafts = buildDossierSocialOutputDraftsFromWorkspace(
    params.workspace,
    sourcePack,
    multilingualEvidence.overallTrustStatus,
  );
  const socialUnifiedItems = socialOutputDrafts.map((draft) =>
    buildUnifiedReviewQueueItemFromSocialOutputDraft(draft),
  );
  const voxyBriefing = buildVoxyVideoBriefing({
    briefingId: `workspace-voxy:${params.workspace.id}`,
    sourceContextKind: "dossier",
    sourceContextId: params.workspace.dossierId,
    title: `${params.workspace.title} · Voxy-Briefing`,
    summary:
      params.workspace.reviewNotes ??
      params.workspace.audienceNotes ??
      languageBridge.summary.text ??
      params.workspace.title,
    languageBridge,
    sourcePack,
    trustState: multilingualEvidence.overallTrustStatus,
  });
  const voxyScriptSegments = buildVoxyScriptSegments({
    briefingId: voxyBriefing.briefingId,
    segments: [
      { kind: "intro", text: voxyBriefing.summary },
      {
        kind: "context",
        text:
          params.workspace.masterPostDraft?.overallPicture ??
          params.workspace.audienceNotes ??
          params.workspace.title,
      },
      {
        kind: "open_question",
        text:
          params.workspace.masterPostDraft?.openQuestions[0] ??
          params.sourceRecord?.openQuestions[0]?.question ??
          "Welche Punkte müssen vor einer Veröffentlichung noch geprüft werden?",
      },
      {
        kind: "call_to_action",
        text: "Review abschließen, bevor Rendern oder Veröffentlichen vorbereitet wird.",
      },
    ],
  });
  const voxyReviewState = buildVoxyReviewState({
    publishApproved: Boolean(params.workspace.officialApproval),
    publishRuntimeReady: false,
  });
  const voxyRenderJob = resolveVoxyRenderJob({
    briefingId: voxyBriefing.briefingId,
    approvalGranted: false,
    providerConfigured: false,
    secretAvailable: false,
    runtimeAvailable: false,
  });
  const voxyPublishDraft = buildVoxyPublishDraft({
    briefingId: voxyBriefing.briefingId,
    publishApproved: Boolean(params.workspace.officialApproval),
    runtimeReady: false,
    targetHints: socialOutputDrafts.map((draft) => draft.kind),
  });
  const voxyUnifiedItem = buildUnifiedReviewQueueItemFromVoxyVideoBriefing(
    voxyBriefing,
  );
  const participationCandidates = sourceContext.participationCandidates;
  const unifiedItems = uniqueByKey([
    ...sourceContext.unifiedItems,
    ...socialUnifiedItems,
    voxyUnifiedItem,
  ], (item) => item.id);
  const dossierWorkspaceSurface = buildDossierWorkspaceReviewSurface({
    dossierId: params.workspace.dossierId,
    title: params.workspace.title,
    state:
      params.workspace.status === "needs_review" || params.workspace.status === "locked"
        ? "review"
        : params.workspace.officialApproval
          ? "publish_ready"
          : params.workspace.status === "archived"
            ? "archived"
            : "draft",
    claims:
      params.sourceRecord?.claims.map((claim) => claim.text) ??
      [],
    counterPositions:
      params.sourceRecord?.arguments
        .filter((argument) => argument.stance === "contra" || argument.stance === "mixed")
        .map((argument) => argument.text) ?? [],
    openQuestions: unique([
      ...(params.sourceRecord?.openQuestions.map((question) => question.question) ?? []),
      ...(params.workspace.masterPostDraft?.openQuestions ?? []),
    ]),
    formatRecommendations: participationCandidates.map(
      (candidate) => candidate.sourceRecommendation,
    ),
    participationCandidates: participationCandidates.map(
      (candidate) => candidate.title,
    ),
    socialOutputDrafts: socialOutputDrafts.map((draft) => draft.kind),
    voxyBriefingCandidates: [voxyBriefing.title],
    sourcePack,
    trustState: multilingualEvidence.overallTrustStatus,
    reviewQueueItems: unifiedItems,
  });

  return {
    primaryUnifiedItem: sourceContext.primaryUnifiedItem,
    unifiedItems,
    sourcePack,
    languageBridge,
    multilingualThread,
    multilingualEvidence,
    participationCandidates,
    crossLingualSuggestions,
    socialOutputDrafts,
    dossierWorkspaceSurface,
    voxyBriefing,
    voxyScriptSegments,
    voxyReviewState,
    voxyRenderJob,
    voxyPublishDraft,
  };
}

export function buildSocialDistributionPostV3ReviewContext(
  post: SocialDistributionPost,
): V3ReviewQueueWiringContext {
  const sourcePack = buildCanonicalSourcePackFromSocialPost(post);
  const trustState = mapEvidenceStateToTrustState(
    getCanonicalSourcePackOverallEvidenceState(sourcePack),
  );
  const socialOutputDrafts = buildDossierSocialOutputDraftsFromSocialPost(
    post,
    sourcePack,
    trustState,
  );
  const unifiedItems = socialOutputDrafts.map((draft) =>
    buildUnifiedReviewQueueItemFromSocialOutputDraft(draft),
  );

  return {
    primaryUnifiedItem: unifiedItems[0] ?? null,
    unifiedItems,
    sourcePack,
    languageBridge: null,
    multilingualThread: null,
    multilingualEvidence: buildMultilingualEvidenceTrustRecord({
      sourcePack,
      userLocale: "de",
      readingLocale: "de",
    }),
    participationCandidates: [],
    crossLingualSuggestions: [],
    socialOutputDrafts,
    dossierWorkspaceSurface: null,
    voxyBriefing: null,
    voxyScriptSegments: [],
    voxyReviewState: null,
    voxyRenderJob: null,
    voxyPublishDraft: null,
  };
}
