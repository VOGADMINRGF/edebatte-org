import { describe, expect, it } from "vitest";

import {
  blocksFinalRuntimeCreation,
  canPrepareHandoffDraft,
  canSubmitHandoffDraftForReview,
  createHandoffDraftFromDialogOutcome,
  createHandoffDraftFromExistingTopicMatch,
  getHandoffDraftGuardrailNote,
} from "@/features/create/createHandoffDrafts";
import { canQueueHandoffDraftForReview } from "@/features/create/createHandoffReviewQueue";
import { EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES } from "@/features/create/existingTopicMatchesFixtures";
import { DIALOG_INTELLIGENCE_PREVIEW_FIXTURES } from "@/features/dialog/dialogIntelligenceFixtures";

describe("create handoff drafts contract", () => {
  it("creates dialog-based drafts with autoCreate false and autoPublish false", () => {
    const draft = createHandoffDraftFromDialogOutcome(
      DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.clarifyStandpoint,
      "dossier_candidate",
    );

    expect(draft.autoCreate).toBe(false);
    expect(draft.autoPublish).toBe(false);
    expect(draft.relatedDialogOutcomeId).toBe(
      DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.clarifyStandpoint.id,
    );
  });

  it("keeps dossier, anlassraum and participation space drafts review-first", () => {
    const dossierDraft = createHandoffDraftFromDialogOutcome(
      DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
      "dossier_candidate",
    );
    const anlassraumDraft = createHandoffDraftFromDialogOutcome(
      DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
      "anlassraum_candidate",
    );
    const participationDraft = createHandoffDraftFromDialogOutcome(
      DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
      "participation_space_candidate",
    );

    expect(dossierDraft.requiresEditorialReview).toBe(true);
    expect(anlassraumDraft.requiresEditorialReview).toBe(true);
    expect(participationDraft.requiresEditorialReview).toBe(true);
  });

  it("marks factcheck requests with requiresFactcheck true", () => {
    const draft = createHandoffDraftFromDialogOutcome(
      DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
      "factcheck_request",
    );

    expect(draft.requiresFactcheck).toBe(true);
    expect(draft.summary).toContain("Anfrage");
  });

  it("keeps opinion counting as non-representative capture intent", () => {
    const draft = createHandoffDraftFromExistingTopicMatch(
      EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.opinionClusterMatch,
      "opinion_count",
    );

    expect(draft.summary).toContain("keine repräsentative Statistik");
    expect(draft.requiresEditorialReview).toBe(false);
  });

  it("preserves the citizen's explicit relation to an existing position", () => {
    const match = EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.mediumBranchMatch;
    const cases = [
      ["count_my_position", "Unterstützt die bestehende Position"],
      ["count_as_opposition", "Widerspricht der bestehenden Position"],
      ["add_as_nuance", "alternative oder differenzierende Position"],
      ["keep_separate", "eigenständige neue Position"],
    ] as const;

    for (const [decision, expectedStandpoint] of cases) {
      const draft = createHandoffDraftFromExistingTopicMatch(
        match,
        decision === "keep_separate" ? "new_branch" : "existing_branch_connection",
        decision,
      );
      expect(draft.existingMatchDecision).toBe(decision);
      expect(draft.authorStandpoint).toContain(expectedStandpoint);
      expect(draft.autoCreate).toBe(false);
      expect(draft.autoPublish).toBe(false);
    }
  });

  it("keeps existing branch connections free of merge side effects", () => {
    const draft = createHandoffDraftFromExistingTopicMatch(
      EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.mediumBranchMatch,
      "existing_branch_connection",
    );

    expect(draft.summary).toContain("Merge");
    expect(getHandoffDraftGuardrailNote(draft)).toContain("Zusammenführung");
  });

  it("blocks final runtime creation for every draft", () => {
    const drafts = [
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.clarifyStandpoint,
        "opinion_count",
      ),
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.clarifyStandpoint,
        "new_branch",
      ),
      createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "editorial_review",
      ),
      createHandoffDraftFromExistingTopicMatch(
        EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.sourceQuestionMatch,
        "factcheck_request",
      ),
    ];

    expect(drafts.every((draft) => blocksFinalRuntimeCreation(draft))).toBe(true);
    expect(drafts.every((draft) => canQueueHandoffDraftForReview(draft))).toBe(
      true,
    );
  });

  it("does not prepare rejected or blocked sources", () => {
    const rejectedDialogDraft = createHandoffDraftFromDialogOutcome(
      {
        ...DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.clarifyStandpoint,
        resultStatus: "rejected",
      },
      "dossier_candidate",
    );
    const blockedDialogDraft = createHandoffDraftFromDialogOutcome(
      DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.countOnlyOpinion,
      "anlassraum_candidate",
    );
    const rejectedMatchDraft = createHandoffDraftFromExistingTopicMatch(
      {
        ...EXISTING_TOPIC_MATCH_PREVIEW_FIXTURES.mediumBranchMatch,
        status: "rejected",
      },
      "existing_branch_connection",
    );

    expect(canPrepareHandoffDraft(rejectedDialogDraft)).toBe(false);
    expect(canPrepareHandoffDraft(blockedDialogDraft)).toBe(false);
    expect(canPrepareHandoffDraft(rejectedMatchDraft)).toBe(false);
  });

  it("keeps review submission and local queueing separate", () => {
    const draft = {
      ...createHandoffDraftFromDialogOutcome(
        DIALOG_INTELLIGENCE_PREVIEW_FIXTURES.reviewReadySourceBlocked,
        "dossier_candidate",
      ),
      status: "prepared" as const,
    };
    const submittedDraft = {
      ...draft,
      status: "submitted_for_review" as const,
    };

    expect(canSubmitHandoffDraftForReview(draft)).toBe(true);
    expect(canQueueHandoffDraftForReview(draft)).toBe(true);
    expect(canSubmitHandoffDraftForReview(submittedDraft)).toBe(false);
    expect(canQueueHandoffDraftForReview(submittedDraft)).toBe(true);
  });
});
