import { beforeEach, describe, expect, it } from "vitest";
import {
  createInMemoryCreateSavedWorkstateRepo,
  listCreateSavedWorkstates,
  setCreateSavedWorkstateRepoForTests,
} from "@/features/create/createSavedWorkstateRepo";
import {
  createInMemoryMaterialDocumentReviewRepository,
  createMaterialDocumentReviewSession,
  getMaterialDocumentReviewSession,
  prepareSelectedMaterialQuestions,
  setMaterialDocumentReviewRepositoryForTests,
  updateMaterialDocumentReviewSelections,
} from "@/features/material/materialDocumentReviewStore";
import type { MaterialExtractionJob } from "@/features/material/materialExtractionJobs";
import type { MaterialGraphFirstContext } from "@/features/material/materialGraphFirstContext";
import type { MaterialStructuredDraftResult } from "@/features/material/materialStructuredDrafts";
import type { PublicQuestionGeneralizationResult } from "@/features/create/safety/publicQuestionGeneralization";
import { projectCreateSavedWorkstateForPublic } from "@/features/create/createSavedWorkstateContract";

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
  originalInput: "Interne Originalformulierung aus dem Dokument.",
  candidatePublicQuestion: "Wie soll umgebaut werden?",
  publicQuestion: "Wie soll umgebaut werden?",
  outcome: "already_generalized",
  releaseState: "draft_allowed",
  actorContexts: [],
  actorExtraction: {
    status: "complete",
    source: "actor_graph",
    independentFromCandidateProvider: true,
    evidenceRefs: ["actor-graph-run-1"],
  },
  procedure: null,
  originalSafetyDecision: "allow",
  candidateSafetyDecision: "allow",
  findingKinds: [],
  evidenceRefs: ["actor-graph-run-1"],
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
  questions: [{ id: "q-umbau", theme: "Vereinsheim", originalInput: "Interne Originalformulierung aus dem Dokument.", publicQuestion: "Wie soll umgebaut werden?", text: "Wie soll umgebaut werden?", rationale: "Entscheidung nötig.", sourceAnchors: ["barrierefreier Umbau"], actorContexts: [], procedure: null, generalization: questionGeneralization, reviewState: "draft" }],
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

async function currentSession(id: string) {
  const session = await createMaterialDocumentReviewSession({
    job: {
      id: `job-${id}`,
      materialId: `material-${id}`,
      materialLabel: `Material ${id}`,
      organizationId: null,
    } as MaterialExtractionJob,
    actorId: `user-${id}`,
    graphFirst: graph,
    drafts,
  });
  if (!session) throw new Error("missing_session");
  return session;
}

function withoutQuestionGuard<T extends { selections: Array<Record<string, unknown>> }>(
  session: T,
) {
  const legacy = structuredClone(session);
  for (const selection of legacy.selections) delete selection.questionGuard;
  return legacy;
}

function installDocumentRepo(initial: Record<string, any>) {
  let document = structuredClone(initial);
  const repo = {
    async save(session: any) {
      document = structuredClone(session);
    },
    async get(id: string) {
      return id === document.id ? structuredClone(document) : null;
    },
  };
  setMaterialDocumentReviewRepositoryForTests(repo);
  return {
    read: () => structuredClone(document),
  };
}

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
    expect(session?.selections[0].questionGuard).toEqual(questionGeneralization);
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
      status: "needs_review",
      title: "Welche Umbauvariante soll der Verein weiterverfolgen?",
      metadata: {
        materialReviewId: session.id,
        materialId: "material-1",
        materialReviewAction: "continue",
      },
    });
    expect(workstates[0].status).not.toBe("published");
    expect(workstates[0].privateReviewEvidence?.publicQuestionGuard).toEqual(
      expect.objectContaining({
        originalInput: questionGeneralization.originalInput,
        candidatePublicQuestion: "Welche Umbauvariante soll der Verein weiterverfolgen?",
        outcome: "actor_extraction_review_required",
        releaseState: "review_required",
        requiresHumanReview: true,
      }),
    );
    expect(
      JSON.stringify(projectCreateSavedWorkstateForPublic(workstates[0])),
    ).not.toContain(questionGeneralization.originalInput);
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

  it("re-runs the guard after a human edit and never prepares a blocked replacement", async () => {
    const session = await createMaterialDocumentReviewSession({
      job: {
        id: "job-blocked-edit",
        materialId: "material-blocked-edit",
        materialLabel: "Workshopnotiz",
        organizationId: null,
      } as MaterialExtractionJob,
      actorId: "user-blocked-edit",
      graphFirst: graph,
      drafts,
    });
    if (!session) throw new Error("missing_session");

    const updated = await updateMaterialDocumentReviewSelections({
      reviewId: session.id,
      selections: [
        {
          ...session.selections[0],
          selected: true,
          action: "continue",
          text: "Sollen wir diese Gruppe verprügeln?",
        },
      ],
    });

    expect(updated.selections[0].questionGuard).toMatchObject({
      outcome: "safety_blocked",
      releaseState: "blocked",
      publicQuestion: null,
    });
    expect(updated.selections[0].options).toEqual([]);
    await expect(
      prepareSelectedMaterialQuestions({
        reviewId: session.id,
        actorId: "user-blocked-edit",
        confirmed: true,
      }),
    ).rejects.toThrow("material_review_question_blocked");
    expect(await listCreateSavedWorkstates()).toHaveLength(0);
  });

  it("retains procedure, actor, reasons, and evidence as private review evidence", async () => {
    const procedureGuard: PublicQuestionGeneralizationResult = {
      ...questionGeneralization,
      originalInput: "Die Stadtwerke GmbH beantragt das Wärmenetz.",
      candidatePublicQuestion:
        "Soll der Stadtwerke GmbH die Genehmigung für das Wärmenetz erteilt werden?",
      publicQuestion:
        "Soll der Stadtwerke GmbH die Genehmigung für das Wärmenetz erteilt werden?",
      outcome: "entity_specific_procedure_review_required",
      releaseState: "review_required",
      actorContexts: [
        {
          id: "actor-stadtwerke",
          name: "Stadtwerke GmbH",
          type: "company",
          role: "procedure_subject",
          evidenceRefs: ["antrag-2026-09"],
        },
      ],
      procedure: {
        kind: "permit",
        entityBindingNecessary: true,
        evidenceRefs: ["antrag-2026-09"],
      },
      evidenceRefs: ["actor-graph-run-1", "antrag-2026-09"],
      reasons: [
        "entity_binding_is_procedure_specific",
        "human_review_before_public_release",
      ],
      requiresHumanReview: true,
    };
    const procedureDrafts: MaterialStructuredDraftResult = {
      ...drafts,
      questions: [
        {
          ...drafts.questions[0],
          originalInput: procedureGuard.originalInput,
          publicQuestion: procedureGuard.publicQuestion!,
          text: procedureGuard.publicQuestion!,
          actorContexts: procedureGuard.actorContexts,
          procedure: procedureGuard.procedure,
          generalization: procedureGuard,
          reviewState: "review_required",
        },
      ],
      questionGuardReviews: [procedureGuard],
    };
    const session = await createMaterialDocumentReviewSession({
      job: {
        id: "job-procedure",
        materialId: "material-procedure",
        materialLabel: "Genehmigungsantrag",
        organizationId: null,
      } as MaterialExtractionJob,
      actorId: "user-procedure",
      graphFirst: graph,
      drafts: procedureDrafts,
    });
    if (!session) throw new Error("missing_session");

    await updateMaterialDocumentReviewSelections({
      reviewId: session.id,
      selections: [
        {
          ...session.selections[0],
          selected: true,
          action: "continue",
        },
      ],
    });
    await prepareSelectedMaterialQuestions({
      reviewId: session.id,
      actorId: "user-procedure",
      confirmed: true,
    });
    const [workstate] = await listCreateSavedWorkstates();

    expect(workstate.status).toBe("needs_review");
    expect(workstate.privateReviewEvidence?.publicQuestionGuard).toMatchObject({
      originalInput: procedureGuard.originalInput,
      outcome: "entity_specific_procedure_review_required",
      actorContexts: procedureGuard.actorContexts,
      procedure: procedureGuard.procedure,
      reasons: procedureGuard.reasons,
      requiresHumanReview: true,
      evidenceRefs: expect.arrayContaining(["antrag-2026-09"]),
    });
    expect(JSON.stringify(projectCreateSavedWorkstateForPublic(workstate))).not.toContain(
      procedureGuard.originalInput,
    );
  });

  it("normalizes a persisted legacy review on load without inventing clearance", async () => {
    const session = await currentSession("legacy-load");
    const legacy = withoutQuestionGuard(session as any);
    installDocumentRepo(legacy);

    const loaded = await getMaterialDocumentReviewSession(session.id);

    expect(loaded?.selections[0].questionGuard).toMatchObject({
      originalInput: session.selections[0].text,
      candidatePublicQuestion: session.selections[0].text,
      outcome: "actor_extraction_review_required",
      releaseState: "review_required",
      requiresHumanReview: true,
      actorExtraction: {
        status: "unverified",
        source: "material_provider",
        independentFromCandidateProvider: false,
      },
      noAutoPublish: true,
    });
  });

  it("preserves actually persisted actor, procedure, original, and evidence data in a legacy guard", async () => {
    const session = await currentSession("legacy-procedure");
    const legacy = withoutQuestionGuard(session as any);
    Object.assign(legacy.selections[0], {
      originalInput: "Die Stadtwerke GmbH beantragt das Wärmenetz.",
      text: "Soll der Stadtwerke GmbH die Genehmigung erteilt werden?",
      actorContexts: [
        {
          id: "company:stadtwerke",
          name: "Stadtwerke GmbH",
          type: "company",
          role: "procedure_subject",
          evidenceRefs: ["antrag:stadtwerke:1"],
        },
      ],
      procedure: {
        kind: "permit",
        entityBindingNecessary: true,
        evidenceRefs: ["antrag:stadtwerke:1"],
      },
      evidenceRefs: ["material:seite:4"],
    });
    installDocumentRepo(legacy);

    const guard = (await getMaterialDocumentReviewSession(session.id))?.selections[0]
      .questionGuard;

    expect(guard).toMatchObject({
      originalInput: "Die Stadtwerke GmbH beantragt das Wärmenetz.",
      releaseState: "review_required",
      actorContexts: [
        {
          name: "Stadtwerke GmbH",
          type: "company",
          role: "procedure_subject",
          evidenceRefs: ["antrag:stadtwerke:1"],
        },
      ],
      procedure: {
        kind: "permit",
        entityBindingNecessary: true,
        evidenceRefs: ["antrag:stadtwerke:1"],
      },
      evidenceRefs: expect.arrayContaining([
        "material:seite:4",
        "antrag:stadtwerke:1",
      ]),
    });
  });

  it("saves a loaded legacy review with the normalized guard", async () => {
    const session = await currentSession("legacy-save");
    const repoState = installDocumentRepo(withoutQuestionGuard(session as any));
    const loaded = await getMaterialDocumentReviewSession(session.id);
    if (!loaded) throw new Error("missing_legacy_session");

    const updated = await updateMaterialDocumentReviewSelections({
      reviewId: session.id,
      selections: [
        {
          ...loaded.selections[0],
          selected: true,
          action: "continue",
        },
      ],
    });

    expect(updated.selections[0].questionGuard.releaseState).toBe(
      "review_required",
    );
    expect(repoState.read().selections[0].questionGuard).toEqual(
      updated.selections[0].questionGuard,
    );
  });

  it("prepares a safe legacy candidate only as a private needs-review workstate", async () => {
    const session = await currentSession("legacy-prepare");
    const legacy = withoutQuestionGuard(session as any);
    legacy.selections[0].selected = true;
    legacy.selections[0].action = "continue";
    installDocumentRepo(legacy);

    const prepared = await prepareSelectedMaterialQuestions({
      reviewId: session.id,
      actorId: session.actorId,
      confirmed: true,
    });
    const [workstate] = await listCreateSavedWorkstates();

    expect(prepared.status).toBe("prepared");
    expect(workstate).toMatchObject({
      visibility: "private",
      status: "needs_review",
    });
    expect(workstate.status).not.toBe("published");
    expect(workstate.privateReviewEvidence?.publicQuestionGuard).toMatchObject({
      releaseState: "review_required",
      noAutoPublish: true,
    });
  });

  it("keeps a blocked legacy candidate blocked without deleting its stored options", async () => {
    const session = await currentSession("legacy-blocked");
    const legacy = withoutQuestionGuard(session as any);
    legacy.selections[0].text = "Sollen wir diese Gruppe verprügeln?";
    legacy.selections[0].selected = true;
    legacy.selections[0].action = "continue";
    legacy.selections[0].options = [
      { text: "Persistierte Altoption", source: "document" },
    ];
    installDocumentRepo(legacy);

    const loaded = await getMaterialDocumentReviewSession(session.id);
    expect(loaded?.selections[0].questionGuard).toMatchObject({
      outcome: "safety_blocked",
      releaseState: "blocked",
    });
    expect(loaded?.selections[0].options).toEqual(legacy.selections[0].options);
    await expect(
      prepareSelectedMaterialQuestions({
        reviewId: session.id,
        actorId: session.actorId,
        confirmed: true,
      }),
    ).rejects.toThrow("material_review_question_blocked");
    expect(await listCreateSavedWorkstates()).toHaveLength(0);
  });

  it("leaves an existing persisted question guard unchanged", async () => {
    const session = await currentSession("current-guard");
    installDocumentRepo(session as any);

    const loaded = await getMaterialDocumentReviewSession(session.id);

    expect(loaded?.selections[0].questionGuard).toEqual(
      session.selections[0].questionGuard,
    );
  });

  it("applies identical load normalization after in-memory and Mongo-shaped reads", async () => {
    const session = await currentSession("repository-parity");
    const legacy = withoutQuestionGuard(session as any);
    const inMemoryRepo = createInMemoryMaterialDocumentReviewRepository();
    setMaterialDocumentReviewRepositoryForTests(inMemoryRepo);
    await inMemoryRepo.save(legacy as any);
    const fromMemory = await getMaterialDocumentReviewSession(session.id);

    installDocumentRepo({ ...legacy, _id: legacy.id });
    const fromMongoShapedRead = await getMaterialDocumentReviewSession(session.id);

    expect(fromMemory?.selections[0].questionGuard).toEqual(
      fromMongoShapedRead?.selections[0].questionGuard,
    );
    expect(fromMemory?.selections[0].questionGuard.releaseState).toBe(
      "review_required",
    );
  });
});
