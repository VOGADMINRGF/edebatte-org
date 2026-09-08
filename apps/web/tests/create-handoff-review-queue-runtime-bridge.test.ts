import { describe, expect, it, vi } from "vitest";

import {
  createHandoffDraftFromDialogOutcome,
  createHandoffDraftFromExistingTopicMatch,
} from "@/features/create/createHandoffDrafts";
import {
  createReviewQueueItemFromHandoffDraft,
  markReviewQueueItemApprovedForSetup,
} from "@/features/create/createHandoffReviewQueue";
import {
  canSubmitCreateHandoffReviewQueueItemToRuntime,
  getCreateHandoffReviewQueueRuntimeBlockers,
  mapCreateHandoffReviewQueueItemToExistingReviewQueueInput,
  submitCreateHandoffReviewQueueItemToRuntime,
} from "@/features/create/createHandoffReviewQueueRuntimeBridge";
import type { CreateIntelligentFollowupResult } from "@/features/create/intelligentFollowupContract";
import { createTopicDeduplicationReviewQueueItem } from "@/features/create/topicDeduplicationReview";
import { DIALOG_INTELLIGENCE_PREVIEW_FIXTURES } from "@/features/dialog/dialogIntelligenceFixtures";
import { EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES } from "@/features/create/existingTopicMatchesFixtures";

function buildFollowup(): CreateIntelligentFollowupResult {
  return {
    understanding: {
      summary: "Kurzfassung",
      dossierContext: "Sichere Schulwege",
      categories: [{ id: "claim", label: "Aussage", confidence: "high" }],
      topics: [{ id: "topic-1", label: "Sichere Schulwege", confidence: "high" }],
      statements: [
        {
          id: "statement-1",
          text: "Vor der Schule fehlen sichere Querungen.",
          kind: "claim",
          stance: "pro",
          confidence: "high",
        },
      ],
      scopes: ["district"],
      openQuestion: "Welche Kreuzungen sind zuerst gemeint?",
      confidence: "high",
    },
    suggestions: [
      {
        id: "dossier:auto",
        kind: "dossier",
        title: "Sichere Schulwege",
        reason: "Das Thema passt zu einem bestehenden Arbeitsstand.",
        confidence: "high",
        href: "/dossier?topic=schulwege",
        requiresConfirmation: true,
      },
    ],
    sourceText: "Vor der Schule fehlen sichere Querungen.",
    generatedAt: "2026-06-28T10:00:00.000Z",
    meta: {
      planner: {
        source: "heuristic_fallback",
        plannerSource: "heuristic_fallback",
        plannerProvider: "local_fallback",
        plannerRole: "planner_only",
        plannerTopic: "Sichere Schulwege",
        plannerCore: "Vor der Schule fehlen sichere Querungen.",
        plannerScope: ["district", "municipal"],
        plannerStance: "pro",
        plannerClusters: ["Mobilität"],
        plannerOpenQuestions: ["Welche Kreuzungen sind zuerst gemeint?"],
        shortSummary: "Kurzfassung",
        topicCandidates: ["Sichere Schulwege"],
        clusterCandidates: ["Mobilität"],
        scopeCandidates: ["district", "municipal"],
        stance: "pro",
        openQuestions: ["Welche Kreuzungen sind zuerst gemeint?"],
        graphSearchTerms: ["Schulwege"],
        materialSignals: [],
        recommendedLane: "create_fast_followup",
        providerPlan: {
          lane: "create_fast_followup",
          plannerProvider: "local_fallback",
          plannerRole: "planner_only",
          structureProvider: "mistral",
          summaryProvider: "claude",
          researchUsed: "none",
          researchProvider: null,
          deepSearchUsed: false,
          graphMatch: "after_structure",
        },
        permissions: {
          nonMutative: true,
          canPublish: false,
          canSave: false,
          canMerge: false,
          canDeepSearch: false,
        },
        plannerDegraded: false,
        degradedReason: null,
        plannerDegradedReason: null,
        qualityStatus: "specific",
        qualityIssues: [],
        providerCallAttempted: false,
        providerCallSucceeded: false,
        plannerDebug: {
          attemptedProvider: "openai",
          usedProvider: "local_fallback",
          providerAvailable: false,
          providerErrorCode: null,
          providerErrorMessage: null,
          errorMessage: null,
          rawPayloadValid: false,
          rawTextValid: false,
          normalizedPayloadValid: false,
          qualityGatePassed: false,
        },
      },
      graphMatch: {
        stage: "after_structure",
        prepared: true,
        requiresConfirmation: true,
        searchTerms: ["Schulwege"],
        matches: [],
        matchedTopics: [],
        matchedDossiers: [],
        matchedClaims: [],
        matchedAnlassraeume: [],
        matchedVotes: [],
        shouldCreateNewTopic: true,
      },
      researchUsed: "none",
      researchProvider: null,
      deepSearchUsed: false,
    },
  };
}

describe("create handoff review queue runtime bridge", () => {
  it("keeps every explicit existing-match decision in the canonical runtime draft", () => {
    const result = buildFollowup();
    const cases = [
      ["count_my_position", "Unterstützt die bestehende Position"],
      ["count_as_opposition", "Widerspricht der bestehenden Position"],
      ["add_as_nuance", "alternative oder differenzierende Position"],
      ["keep_separate", "eigenständige neue Position"],
    ] as const;

    for (const [decision, standpoint] of cases) {
      const item = createReviewQueueItemFromHandoffDraft(
        createHandoffDraftFromExistingTopicMatch(
          EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.mediumBranchMatch,
          decision === "keep_separate"
            ? "new_branch"
            : "existing_branch_connection",
          decision,
        ),
      );
      const input = mapCreateHandoffReviewQueueItemToExistingReviewQueueInput(
        item,
        { result },
      );

      expect(input.draft.existingMatchDecision).toBe(decision);
      expect(input.draft.authorStandpoint).toContain(standpoint);
      expect(input.draft.relatedMatchId).toBe(
        EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.mediumBranchMatch.id,
      );
      expect(input.draft.relatedMatchTitle).toBe(
        EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.mediumBranchMatch.title,
      );
    }
  });

  it("keeps an undecided match stance unknown", () => {
    const item = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromExistingTopicMatch(
        EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.mediumBranchMatch,
        "existing_branch_connection",
      ),
    );
    const input = mapCreateHandoffReviewQueueItemToExistingReviewQueueInput(
      item,
      { result: buildFollowup() },
    );

    expect(input.draft.existingMatchDecision).toBeNull();
    expect(input.draft.authorStandpoint).toBeNull();
    expect(input.draft.relatedMatchId).toBeNull();
    expect(input.draft.relatedMatchTitle).toBeNull();
  });

  it("maps review-first queue items onto the existing create handoff runtime input", () => {
    const result = buildFollowup();
    const dossierItem = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "dossier_candidate",
      ),
    );
    const anlassraumItem = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "anlassraum_candidate",
      ),
    );
    const participationItem = markReviewQueueItemApprovedForSetup(
      createReviewQueueItemFromHandoffDraft(
        createHandoffDraftFromDialogOutcome(
          DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
          "participation_space_candidate",
        ),
      ),
      "Review bleibt menschlich.",
    );
    const factcheckItem = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "factcheck_request",
      ),
    );
    const existingBranchItem = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "editorial_review",
      ),
    );

    const dossierInput = mapCreateHandoffReviewQueueItemToExistingReviewQueueInput(dossierItem, { result });
    const anlassraumInput = mapCreateHandoffReviewQueueItemToExistingReviewQueueInput(anlassraumItem, { result });
    const participationInput = mapCreateHandoffReviewQueueItemToExistingReviewQueueInput(participationItem, { result });
    const factcheckInput = mapCreateHandoffReviewQueueItemToExistingReviewQueueInput(factcheckItem, { result });
    const existingBranchInput = mapCreateHandoffReviewQueueItemToExistingReviewQueueInput(existingBranchItem, { result });

    expect(dossierInput.selectedAction).toBe("create_dossier");
    expect(anlassraumInput.selectedAction).toBe("prepare_anlassraum");
    expect(participationInput.selectedAction).toBe("prepare_participation_space");
    expect(factcheckInput.selectedAction).toBe("request_factcheck");
    expect(existingBranchInput.selectedAction).toBe("request_review");
    expect(dossierItem.autoCreate).toBe(false);
    expect(dossierItem.autoPublish).toBe(false);
    expect(participationItem.status).toBe("approved_for_setup");
    expect(participationInput.draft.requiresConfirmation).toBe(true);
    expect(participationInput.draft.selectedAction).toBe("prepare_participation_space");
  });

  it("reports blocked or unwired states instead of fake runtime success", async () => {
    const resultWithoutRuntime = {
      ...buildFollowup(),
      meta: undefined,
    } satisfies CreateIntelligentFollowupResult;
    const item = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "dossier_candidate",
      ),
    );

    expect(canSubmitCreateHandoffReviewQueueItemToRuntime(item, { result: resultWithoutRuntime })).toBe(false);
    expect(
      getCreateHandoffReviewQueueRuntimeBlockers(item, { result: resultWithoutRuntime }),
    ).toEqual([
      "missing_followup_planner",
      "missing_followup_graph_match",
    ]);

    const submission = await submitCreateHandoffReviewQueueItemToRuntime(item, {
      result: resultWithoutRuntime,
    });

    expect(submission).toMatchObject({
      ok: false,
      blocked: true,
      error: "blocked_unwired",
    });
  });

  it("submits through the existing persisted create handoff runtime when safe", async () => {
    const result = buildFollowup();
    const item = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "dossier_candidate",
      ),
    );
    const persist = vi.fn(async (input) => ({
      ok: true as const,
      record: {
        id: input.draft.id,
        dossierId: input.dossierId,
        anlassraumId: input.anlassraumId,
        reviewState: input.draft.reviewState,
      },
      requestScope: {
        organizationId: "org-1",
        organizationLabel: "Bezirk",
        membershipStatus: "verified",
        organizationRole: "reviewer",
        roleLabel: "Review",
        regionIds: ["berlin"],
        primaryRegionId: "berlin",
        isOperatorMode: false,
        operatorModeLabel: null,
        sourceOfTruth: "operator_verified_directory",
        confidence: "verified",
      },
    }));

    const submission = await submitCreateHandoffReviewQueueItemToRuntime(item, {
      result,
      dossierId: "dossier-1",
      persist,
    });

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedAction: "create_dossier",
        dossierId: "dossier-1",
        anlassraumId: null,
        draft: expect.objectContaining({
          id: item.sourceDraftId,
          selectedAction: "create_dossier",
          requiresConfirmation: true,
        }),
      }),
    );
    expect(submission).toMatchObject({
      ok: true,
      selectedAction: "create_dossier",
      record: expect.objectContaining({
        id: item.sourceDraftId,
        dossierId: "dossier-1",
      }),
    });
  });

  it("routes factcheck requests into the existing factcheck/source review runtime instead of the create handoff persistence path", async () => {
    const result = buildFollowup();
    const item = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "factcheck_request",
      ),
    );
    const persist = vi.fn();
    const submitFactcheck = vi.fn(async (input) => ({
      ok: true as const,
      jobId: "factcheck-job-1",
      status: "queued",
      requestScope: null,
      requestedAction: input.requestedAction,
      sourceRefCount: input.sourceRefs.length,
    }));

    const submission = await submitCreateHandoffReviewQueueItemToRuntime(item, {
      result,
      persist,
      submitFactcheck,
    });

    expect(persist).not.toHaveBeenCalled();
    expect(submitFactcheck).toHaveBeenCalledTimes(1);
    expect(submitFactcheck).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "factcheck_request",
        requestedAction: "factcheck",
        withSerp: false,
        deepSearch: false,
      }),
    );
    expect(submission).toMatchObject({
      ok: true,
      selectedAction: "request_factcheck",
      record: expect.objectContaining({
        id: "factcheck-job-1",
        intakeClassification: "factcheck_request",
        reviewState: "queued",
      }),
    });
  });

  it("maps topic deduplication review candidates onto the existing editorial review runtime without merge side effects", () => {
    const candidate = {
      id: "topic-dedup-1",
      kind: "possible_same_topic" as const,
      confidence: "high" as const,
      reviewStatus: "needs_editorial_review" as const,
      title: "Mögliche Zusammenführung prüfen: Sichere Schulwege",
      summary:
        "Ein vorhandenes Thema wirkt dem neuen Beitrag sehr ähnlich. Die Entscheidung bleibt redaktionell und erzeugt keinen automatischen Merge.",
      reason: "Ähnlicher Fokus und ähnliche Stoßrichtung.",
      topicTitle: "Sichere Schulwege",
      authorStandpoint: "Sichere Schulwege zuerst verbessern.",
      relatedMatchId: "topic-strong",
      relatedTopicId: "sichere-schulwege",
      relatedBranchId: null,
      relatedDialogOutcomeId: "dialog-1",
      supportingMatchIds: ["topic-strong"],
      supportingSignals: ["Sichere Schulwege"],
      sourceKinds: ["existing_topic_match"] as const,
      sourceReviewPending: false,
      moderationPending: false,
      communityHintUnreviewed: false,
      requiresEditorialReview: true as const,
      autoMerge: false as const,
      autoGraphMerge: false as const,
      autoPublish: false as const,
      autoCreate: false as const,
      reviewQueueMapping: {
        available: true,
        kind: "editorial_review" as const,
        note:
          "Der Kandidat wird nur als redaktioneller Prüfgegenstand vorgemerkt. Es wurde noch nichts automatisch zusammengeführt.",
      },
    };

    const queueItem = createTopicDeduplicationReviewQueueItem(candidate);
    const mapped = mapCreateHandoffReviewQueueItemToExistingReviewQueueInput(queueItem, {
      result: buildFollowup(),
    });

    expect(queueItem.kind).toBe("editorial_review");
    expect(queueItem.autoCreate).toBe(false);
    expect(queueItem.autoPublish).toBe(false);
    expect(mapped.selectedAction).toBe("request_review");
    expect(mapped.draft.selectedAction).toBe("request_review");
    expect(queueItem.summary).toContain("redaktionell");
  });
});
