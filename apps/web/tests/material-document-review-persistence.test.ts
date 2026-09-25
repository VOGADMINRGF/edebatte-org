import { beforeEach, describe, expect, it } from "vitest";
import {
  createInMemoryCreateSavedWorkstateRepo,
  listCreateSavedWorkstates,
  setCreateSavedWorkstateRepoForTests,
} from "@/features/create/createSavedWorkstateRepo";
import {
  createInMemoryMaterialDocumentReviewRepository,
  createMaterialDocumentReviewSession,
  prepareSelectedMaterialQuestions,
  setMaterialDocumentReviewRepositoryForTests,
  updateMaterialDocumentReviewSelections,
} from "@/features/material/materialDocumentReviewStore";
import type { MaterialExtractionJob } from "@/features/material/materialExtractionJobs";
import type { MaterialGraphFirstContext } from "@/features/material/materialGraphFirstContext";
import type { MaterialStructuredDraftResult } from "@/features/material/materialStructuredDrafts";
import type { PublicQuestionGeneralizationResult } from "@/features/create/safety/publicQuestionGeneralization";

const graph: MaterialGraphFirstContext = {
  matchedTopicIds: ["vereinsheim"],
  matchedDossierIds: ["dossier-1"],
  matchedRoundIds: ["round-1"],
  matchedClaimIds: [],
  openPointIds: [],
  relationCandidates: [],
  coverageSummary: "Bestehendes Wissen gefunden.",
  gapSummary: "Eine Folgefrage ist möglich.",
  recommendedAction: "continue",
  provenance: ["topics:vereinsheim"],
  noAutoMerge: true,
  noAutoGraphWrite: true,
  noAutoPublish: true,
};

const questionGeneralization: PublicQuestionGeneralizationResult = {
  originalInput: "Wie soll umgebaut werden?",
  publicQuestion: "Wie soll umgebaut werden?",
  outcome: "already_generalized",
  releaseState: "draft_allowed",
  actorContexts: [],
  findingKinds: [],
  reasons: ["general_rule_measure_or_priority_is_ballot_target"],
  explanation: "Die Frage richtet sich bereits auf eine allgemeine Entscheidung.",
  requiresHumanReview: false,
  noAutoPublish: true,
  noPositionInference: true,
  noBiasOrTrustInference: true,
};

const drafts: MaterialStructuredDraftResult = {
  provider: "mistral",
  status: "generated",
  themes: ["Vereinsheim"],
  decisionPoints: ["Umbau"],
  questions: [{ id: "q-umbau", theme: "Vereinsheim", originalInput: "Wie soll umgebaut werden?", publicQuestion: "Wie soll umgebaut werden?", text: "Wie soll umgebaut werden?", rationale: "Entscheidung nötig.", sourceAnchors: ["barrierefreier Umbau"], actorContexts: [], procedure: null, generalization: questionGeneralization, reviewState: "draft" }],
  options: [{ questionRef: "q-umbau", text: "Variante A", source: "document", needsReview: true }],
  questionGuardReviews: [questionGeneralization],
  claimsOrSourceHints: [],
  uncertainties: [],
  provenance: ["material_full_text"],
  reviewRequired: true,
  draftOnly: true,
  publicOutputAllowed: false,
  noAutoPublish: true,
  noAutoCreateRound: true,
  noAutoGraphWrite: true,
  noAutoMerge: true,
  error: null,
};

describe("material document review persistence", () => {
  beforeEach(() => {
    setMaterialDocumentReviewRepositoryForTests(createInMemoryMaterialDocumentReviewRepository());
    setCreateSavedWorkstateRepoForTests(createInMemoryCreateSavedWorkstateRepo());
  });

  it("starts with nothing selected and persists only an explicitly confirmed selection", async () => {
    const session = await createMaterialDocumentReviewSession({
      job: { id: "job-1", materialId: "material-1", materialLabel: "Vereinskonzept", organizationId: "org-1" } as MaterialExtractionJob,
      actorId: "user-1",
      graphFirst: graph,
      drafts,
    });
    expect(session?.selections[0]).toMatchObject({ selected: false, action: null });
    if (!session) throw new Error("missing_session");

    await updateMaterialDocumentReviewSelections({
      reviewId: session.id,
      selections: [{
        ...session.selections[0],
        selected: true,
        action: "continue",
        text: "Welche Umbauvariante soll der Verein weiterverfolgen?",
      }],
    });
    const prepared = await prepareSelectedMaterialQuestions({
      reviewId: session.id,
      actorId: "user-1",
      confirmed: true,
    });
    const workstates = await listCreateSavedWorkstates();

    expect(prepared.status).toBe("prepared");
    expect(prepared.preparedWorkstateIds).toHaveLength(1);
    expect(workstates).toHaveLength(1);
    expect(workstates[0]).toMatchObject({
      visibility: "organization_internal",
      type: "question_candidate",
      status: "prepared",
      title: "Welche Umbauvariante soll der Verein weiterverfolgen?",
      metadata: {
        materialReviewId: session.id,
        materialId: "material-1",
        materialReviewAction: "continue",
      },
    });
    expect(workstates[0].status).not.toBe("published");
  });

  it("refuses preparation without a selected question and explicit action", async () => {
    const session = await createMaterialDocumentReviewSession({
      job: { id: "job-2", materialId: "material-2", materialLabel: "Studie", organizationId: null } as MaterialExtractionJob,
      actorId: "user-2",
      graphFirst: graph,
      drafts,
    });
    if (!session) throw new Error("missing_session");

    await expect(prepareSelectedMaterialQuestions({ reviewId: session.id, actorId: "user-2", confirmed: true }))
      .rejects.toThrow("material_review_selection_required");
  });
});
