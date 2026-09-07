import { describe, expect, it } from "vitest";

import { createHandoffDraftFromDialogOutcome, createHandoffDraftFromExistingTopicMatch } from "@/features/create/createHandoffDrafts";
import {
  blocksReviewQueueAutoRuntimeSideEffects,
  canQueueHandoffDraftForReview,
  createReviewQueueItemFromHandoffDraft,
  getReviewQueueItemGuardrailNote,
  markReviewQueueItemApprovedForSetup,
  markReviewQueueItemNeedsClarification,
  markReviewQueueItemQueued,
  markReviewQueueItemRejected,
} from "@/features/create/createHandoffReviewQueue";
import { EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES } from "@/features/create/existingTopicMatchesFixtures";
import { DIALOG_INTELLIGENCE_PREVIEW_FIXTURES } from "@/features/dialog/dialogIntelligenceFixtures";

describe("create handoff review queue contract", () => {
  it("creates a review queue item from a handoff draft with local-only guardrails", () => {
    const draft = createHandoffDraftFromDialogOutcome(
      DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
      "dossier_candidate",
    );

    const item = createReviewQueueItemFromHandoffDraft(draft);

    expect(item.sourceDraftId).toBe(draft.id);
    expect(item.kind).toBe("dossier_candidate_review");
    expect(item.autoCreate).toBe(false);
    expect(item.autoPublish).toBe(false);
    expect(item.requiresEditorialReview).toBe(true);
    expect(item.auditTrail).toHaveLength(1);
  });

  it("keeps dossier, anlassraum and participation space candidates as review items only", () => {
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
    const participationItem = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "participation_space_candidate",
      ),
    );

    expect(dossierItem.requiresEditorialReview).toBe(true);
    expect(anlassraumItem.requiresEditorialReview).toBe(true);
    expect(participationItem.requiresEditorialReview).toBe(true);
    expect(blocksReviewQueueAutoRuntimeSideEffects(dossierItem)).toBe(true);
    expect(blocksReviewQueueAutoRuntimeSideEffects(anlassraumItem)).toBe(true);
    expect(blocksReviewQueueAutoRuntimeSideEffects(participationItem)).toBe(true);
  });

  it("keeps factcheck and existing branch review items non-final", () => {
    const factcheckItem = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "factcheck_request",
      ),
    );
    const existingBranchItem = createReviewQueueItemFromHandoffDraft(
      createHandoffDraftFromExistingTopicMatch(
        EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.mediumBranchMatch,
        "existing_branch_connection",
      ),
    );

    expect(factcheckItem.requiresFactcheck).toBe(true);
    expect(getReviewQueueItemGuardrailNote(factcheckItem)).toContain(
      "keine automatische Veröffentlichung, Erstellung oder Zusammenführung",
    );
    expect(existingBranchItem.kind).toBe("existing_branch_connection_review");
    expect(existingBranchItem.summary).toContain("Merge");
    expect(blocksReviewQueueAutoRuntimeSideEffects(existingBranchItem)).toBe(true);
  });

  it("carries an explicit counterposition decision into the review queue", () => {
    const draft = createHandoffDraftFromExistingTopicMatch(
      EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.mediumBranchMatch,
      "opinion_count",
      "count_as_opposition",
    );
    const item = createReviewQueueItemFromHandoffDraft(draft);

    expect(item.existingMatchDecision).toBe("count_as_opposition");
    expect(item.authorStandpoint).toContain("Widerspricht der bestehenden Position");
    expect(item.autoCreate).toBe(false);
    expect(item.autoPublish).toBe(false);
  });

  it("queues eligible drafts and rejects unsafe ones", () => {
    const queueableDraft = createHandoffDraftFromDialogOutcome(
      DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.clarifyStandpoint,
      "new_branch",
    );
    const rejectedDraft = createHandoffDraftFromDialogOutcome(
      {
        ...DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.clarifyStandpoint,
        resultStatus: "rejected",
      },
      "new_branch",
    );
    const unsafeDraft = {
      ...queueableDraft,
      autoCreate: true,
    } as typeof queueableDraft;

    expect(canQueueHandoffDraftForReview(queueableDraft)).toBe(true);
    expect(canQueueHandoffDraftForReview(rejectedDraft)).toBe(false);
    expect(canQueueHandoffDraftForReview(unsafeDraft)).toBe(false);
  });

  it("appends audit trail entries for review status transitions without creating runtime entities", () => {
    const draft = createHandoffDraftFromDialogOutcome(
      DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
      "anlassraum_candidate",
    );

    const queued = markReviewQueueItemQueued(
      createReviewQueueItemFromHandoffDraft(draft),
    );
    const needsClarification = markReviewQueueItemNeedsClarification(
      queued,
      "Bitte Zuständigkeit und Einstieg klären.",
    );
    const approved = markReviewQueueItemApprovedForSetup(
      needsClarification,
      "Manuell für den nächsten Setup-Schritt freigegeben.",
    );
    const rejected = markReviewQueueItemRejected(
      approved,
      "Kein automatischer Raum-Start ohne bewusste Folgeentscheidung.",
    );

    expect(queued.status).toBe("queued_for_review");
    expect(needsClarification.status).toBe("needs_clarification");
    expect(approved.status).toBe("approved_for_setup");
    expect(rejected.status).toBe("rejected");
    expect(rejected.auditTrail).toHaveLength(5);
    expect(rejected.reviewerNotes).toContain(
      "Bitte Zuständigkeit und Einstieg klären.",
    );
    expect(rejected.reviewerNotes).toContain(
      "Manuell für den nächsten Setup-Schritt freigegeben.",
    );
    expect(blocksReviewQueueAutoRuntimeSideEffects(approved)).toBe(true);
    expect(approved.autoCreate).toBe(false);
    expect(approved.autoPublish).toBe(false);
  });
});
