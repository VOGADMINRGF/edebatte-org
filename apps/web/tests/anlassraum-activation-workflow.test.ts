import { describe, expect, it } from "vitest";
import {
  activateAnlassraumAfterReview,
  approveAnlassraumActivation,
  approveAnlassraumPublication,
  blocksAnlassraumAutoActivation,
  blocksAnlassraumAutoPublish,
  blocksUnsafeAnlassraumPublicVisibility,
  buildAnlassraumActivationDraft,
  canApproveAnlassraumPublication,
  canPublishAnlassraum,
  getAnlassraumActivationBlockers,
  isAnlassraumPubliclyReleased,
  publishAnlassraumAfterReview,
  reviewAnlassraumQuestionGuard,
  type AnlassraumActivationRecord,
} from "@/features/create/anlassraumActivationWorkflow";
import {
  buildAnlassraumRuntimeDraftFromHandoff,
  type AnlassraumRuntimeRecord,
} from "@/features/create/anlassraumRuntime";
import type { PersistedCreateHandoffRecord } from "@/features/create/persistedHandoffReviewQueue";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";
import {
  holdQuestionGuardForSerializedReview,
  persistQuestionGuardReviewFailClosed,
} from "@/features/create/safety/questionGuardReviewPersistence";
import {
  createInMemoryAnlassraumActivationWorkflowRepository,
  isAnlassraumPublicInputAllowed,
  setAnlassraumActivationWorkflowRepositoryForTests,
} from "@/features/create/anlassraumActivationWorkflowServer";

function buildHandoffRecord(): PersistedCreateHandoffRecord {
  return {
    schemaVersion: "create_handoff_review_item.v1",
    id: "handoff-anlassraum-activation-1",
    source: "create",
    sourceText:
      "Vor Schulen fehlen sichere Querungen und der Kiez braucht einen sichtbaren Themenraum.",
    plannerResult: {
      shortSummary:
        "Sichere Schulwege sollen als Anlassraum weitergeführt werden.",
      openQuestion: "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
      openQuestions: [
        "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
      ],
      topicCandidates: ["Sichere Schulwege"],
    } as any,
    graphMatches: {
      matches: [{ kind: "topic", label: "Sichere Schulwege" }],
      matchedTopics: ["Sichere Schulwege"],
      matchedDossiers: ["dossier-sichere-schulwege"],
      matchedAnlassraeume: [],
      shouldCreateNewTopic: true,
    } as any,
    selectedAction: "prepare_anlassraum",
    claims: [],
    arguments: [
      {
        id: "argument-1",
        text: "Kinder brauchen sichere Wege zum Unterricht.",
        stance: "pro",
        supportsClaimIds: [],
      },
    ],
    openQuestions: [
      {
        id: "question-1",
        question: "Welche Schulen sind besonders betroffen?",
        requiredBeforePublish: true,
      },
    ],
    sourceGrounding: [],
    topicSeed: {
      topicKey: "sichere-schulwege",
      topicLabel: "Sichere Schulwege",
      jurisdiction: "kommune",
      themenradarSourceType: "create_intake",
    },
    resumeHref: "/create?resume=handoff-anlassraum-activation-1",
    reviewState: "manual_review_required",
    visibilityState: "internal_review",
    requiresConfirmation: true,
    reviewRequired: true,
    noAutoPublish: true,
    noPublicOfficial: true,
    noAutomaticOfficialResponse: true,
    noAutoFinalization: true,
    intakeClassification: "public_policy",
    createdByUserId: "admin-1",
    regionId: "berlin-reinickendorf",
    organizationId: "org-1",
    dossierId: "dossier-sichere-schulwege",
    anlassraumId: null,
    requestScope: null,
    accessDecision: null,
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z",
  };
}

function buildRuntimeRecord(
  overrides: Partial<AnlassraumRuntimeRecord> = {},
): AnlassraumRuntimeRecord {
  const handoff = buildHandoffRecord();
  const draft = buildAnlassraumRuntimeDraftFromHandoff(handoff, {
    status: "created",
    visibility: "ready_for_activation_review",
    createdAnlassraumId: "65a111111111111111111110",
    auditContext: {
      actorUserId: "admin-1",
      reason: "Review-approved creation.",
      origin: "anlassraum_runtime",
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
  });

  return {
    ...draft,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: handoff.sourceText,
      candidatePublicQuestion: draft.trigger,
      actorContexts: [],
      actorExtraction: {
        status: "complete",
        source: "actor_graph",
        independentFromCandidateProvider: true,
        evidenceRefs: ["actor-graph-review:anlassraum-activation-1"],
      },
    }),
    auditTrail: [
      {
        id: "runtime-created-1",
        sourceHandoffId: draft.sourceHandoffId,
        at: "2026-07-01T09:00:00.000Z",
        action: "runtime_created",
        actorUserId: "admin-1",
        note: "Runtime erstellt.",
        blockers: [],
        status: "created",
        anlassraumId: "65a111111111111111111110",
        entityId: "65a111111111111111111120",
      },
    ],
    approvedForCreationAt: "2026-07-01T08:30:00.000Z",
    approvedForCreationBy: "admin-1",
    rejectedAt: null,
    rejectedBy: null,
    ...overrides,
  };
}

function buildActivationRecord(
  overrides: Partial<AnlassraumActivationRecord> = {},
): AnlassraumActivationRecord {
  const draft = buildAnlassraumActivationDraft({
    runtimeRecord: buildRuntimeRecord(),
    createdRoom: {
      id: "65a111111111111111111110",
      slug: "sichere-schulwege",
      status: "approved",
      isPublic: false,
      updatedAt: "2026-07-01T09:00:00.000Z",
    },
    creationAudited: true,
    auditContext: {
      actorUserId: "admin-1",
      reason: "Audit vorhanden.",
      origin: "admin_review",
      approvedAt: "2026-07-01T09:10:00.000Z",
    },
  });

  return {
    ...draft,
    auditTrail: [],
    approvedForActivationAt: null,
    approvedForActivationBy: null,
    approvedForPublicationAt: null,
    approvedForPublicationBy: null,
    rejectedAt: null,
    rejectedBy: null,
    ...overrides,
  };
}

function buildProcedureQuestionGuard() {
  return evaluatePublicQuestionGeneralization({
    originalInput: "Die Stadtwerke GmbH beantragt ein formales Genehmigungsverfahren.",
    candidatePublicQuestion:
      "Soll der Stadtwerke GmbH die Genehmigung für das beantragte Wärmenetz erteilt werden?",
    actorContexts: [
      {
        id: "stadtwerke-1",
        name: "Stadtwerke GmbH",
        type: "company",
        role: "procedure_subject",
        evidenceRefs: ["permit:waermenetz:1"],
      },
    ],
    procedure: {
      kind: "permit",
      entityBindingNecessary: true,
      evidenceRefs: ["permit:waermenetz:1"],
    },
    actorExtraction: {
      status: "complete",
      source: "actor_graph",
      independentFromCandidateProvider: true,
      evidenceRefs: ["actor-graph:stadtwerke:1"],
    },
  });
}

describe("anlassraum activation workflow", () => {
  it("carries a blocked source question into the activation blocker set", () => {
    const handoff = buildHandoffRecord();
    handoff.sourceText = "Sollen wir diese Gruppe verprügeln?";
    handoff.plannerResult.openQuestions = [
      "Welche Maßnahmen sollten Konflikte friedlich lösen?",
    ];
    const runtimeDraft = buildAnlassraumRuntimeDraftFromHandoff(handoff, {
      status: "created",
      visibility: "ready_for_activation_review",
      createdAnlassraumId: "65a111111111111111111119",
    });
    const runtimeRecord: AnlassraumRuntimeRecord = {
      ...runtimeDraft,
      auditTrail: [],
      approvedForCreationAt: null,
      approvedForCreationBy: null,
      rejectedAt: null,
      rejectedBy: null,
    };
    const activationDraft = buildAnlassraumActivationDraft({
      runtimeRecord,
      createdRoom: null,
      creationAudited: false,
    });

    expect(activationDraft.questionGuard.outcome).toBe("safety_blocked");
    expect(activationDraft.blockers).toContain("public_question_guard_blocked");
  });

  it("blocks activation while public-question review remains unresolved", () => {
    const unresolvedQuestionGuard = buildAnlassraumRuntimeDraftFromHandoff(
      buildHandoffRecord(),
    ).questionGuard;
    const record = buildActivationRecord({
      questionGuard: unresolvedQuestionGuard,
      status: "approved_for_activation",
      approvedForActivationAt: "2026-07-01T09:20:00.000Z",
      approvedForActivationBy: "admin-1",
    });

    expect(record.questionGuard.releaseState).toBe("review_required");
    expect(getAnlassraumActivationBlockers(record)).toContain(
      "public_question_guard_blocked",
    );

    const activated = activateAnlassraumAfterReview(record, {
      actorUserId: "admin-1",
      reason: "Intern aktivieren.",
      origin: "anlassraum_activation_workflow",
      approvedAt: "2026-07-01T09:30:00.000Z",
    });

    expect(activated.ok).toBe(false);
    if (!activated.ok) {
      expect(activated.blockers).toContain("public_question_guard_blocked");
    }
  });

  it("resolves only the procedure-specific blocker through explicit human review", () => {
    const questionGuard = buildProcedureQuestionGuard();
    const record = buildActivationRecord({
      description: questionGuard.originalInput,
      trigger: questionGuard.candidatePublicQuestion,
      questionGuard,
      status: "approved_for_publication",
      visibility: "ready_for_publication_review",
      publicAccessMode: "internal_only",
      roomStatus: "active",
      roomIsPublic: true,
      approvedForActivationAt: "2026-07-01T09:05:00.000Z",
      approvedForActivationBy: "admin-before-review",
      approvedForPublicationAt: "2026-07-01T09:10:00.000Z",
      approvedForPublicationBy: "admin-before-review",
    });

    const actorGraphReviewed = reviewAnlassraumQuestionGuard(record, {
      actorExtractionSource: "actor_graph",
      evidenceRefs: ["actor-graph:stadtwerke:2"],
    });
    expect(actorGraphReviewed.questionGuard.outcome).toBe(
      "entity_specific_procedure_review_required",
    );
    expect(actorGraphReviewed.questionGuard.releaseState).toBe("review_required");

    const humanReviewed = reviewAnlassraumQuestionGuard(record, {
      actorExtractionSource: "human_review",
      evidenceRefs: ["human-review:permit:waermenetz:1"],
      reviewedAt: "2026-07-01T09:15:00.000Z",
    });

    expect(humanReviewed.questionGuard.outcome).toBe(
      "entity_specific_procedure_review_resolved",
    );
    expect(humanReviewed.questionGuard.releaseState).toBe("draft_allowed");
    expect(humanReviewed.status).toBe("draft");
    expect(humanReviewed.visibility).toBe("editorial_workspace");
    expect(humanReviewed.publicAccessMode).toBe("none");
    expect(humanReviewed.roomIsPublic).toBe(false);
    expect(humanReviewed.approvedForActivationAt).toBeNull();
    expect(humanReviewed.approvedForPublicationAt).toBeNull();
  });

  it("invalidates earlier approvals and persists review audit before releasing the guard", async () => {
    const unresolvedQuestionGuard = buildAnlassraumRuntimeDraftFromHandoff(
      buildHandoffRecord(),
    ).questionGuard;
    const record = buildActivationRecord({
      questionGuard: unresolvedQuestionGuard,
      status: "approved_for_publication",
      visibility: "ready_for_publication_review",
      publicAccessMode: "internal_only",
      roomStatus: "active",
      roomIsPublic: true,
      approvedForActivationAt: "2026-07-01T09:05:00.000Z",
      approvedForActivationBy: "admin-before-review",
      approvedForPublicationAt: "2026-07-01T09:10:00.000Z",
      approvedForPublicationBy: "admin-before-review",
    });

    expect(() =>
      reviewAnlassraumQuestionGuard(record, {
        actorExtractionSource: "material_provider" as never,
        evidenceRefs: ["self-attested:material-provider"],
      }),
    ).toThrow("public_question_guard_review_source_invalid");
    expect(() =>
      reviewAnlassraumQuestionGuard(record, {
        actorExtractionSource: "actor_graph",
        evidenceRefs: [" "],
      }),
    ).toThrow("public_question_guard_review_evidence_required");

    const reviewed = reviewAnlassraumQuestionGuard(record, {
      actorExtractionSource: "actor_graph",
      evidenceRefs: ["actor-graph:anlassraum-question-guard-1"],
      reviewedAt: "2026-07-01T09:15:00.000Z",
    });

    expect(reviewed.questionGuard.releaseState).toBe("draft_allowed");
    expect(reviewed.questionGuard.actorExtraction).toEqual({
      status: "complete",
      source: "actor_graph",
      independentFromCandidateProvider: true,
      evidenceRefs: ["actor-graph:anlassraum-question-guard-1"],
    });
    expect(reviewed.blockers).not.toContain("public_question_guard_blocked");
    expect(reviewed.status).toBe("draft");
    expect(reviewed.visibility).toBe("editorial_workspace");
    expect(reviewed.publicAccessMode).toBe("none");
    expect(reviewed.roomIsPublic).toBe(false);
    expect(reviewed.approvedForActivationAt).toBeNull();
    expect(reviewed.approvedForActivationBy).toBeNull();
    expect(reviewed.approvedForPublicationAt).toBeNull();
    expect(reviewed.approvedForPublicationBy).toBeNull();
    expect(reviewed.blockers).toContain("activation_not_approved");
    expect(reviewed.blockers).toContain("publication_not_approved");

    const activationWithoutNewApproval = activateAnlassraumAfterReview(
      reviewed,
      {
        actorUserId: "admin-1",
        reason: "Alte Freigabe darf nicht weitergelten.",
        origin: "anlassraum_activation_workflow",
        approvedAt: "2026-07-01T09:16:00.000Z",
      },
    );
    const publicationWithoutNewApproval = publishAnlassraumAfterReview(
      reviewed,
      {
        actorUserId: "admin-1",
        reason: "Alte Freigabe darf nicht weitergelten.",
        origin: "anlassraum_activation_workflow",
        approvedAt: "2026-07-01T09:16:00.000Z",
      },
    );
    expect(activationWithoutNewApproval.ok).toBe(false);
    expect(publicationWithoutNewApproval.ok).toBe(false);

    let persistedRecord = record;
    let underlyingRoomIsPublic = true;
    let persistedAudit:
      | {
          action: string;
          questionGuardActorExtractionSource: string;
          questionGuardEvidenceRefs: string[];
        }
      | null = null;
    const auditEntry = {
      action: "question_guard_reviewed",
      questionGuardActorExtractionSource: "actor_graph",
      questionGuardEvidenceRefs: [
        "actor-graph:anlassraum-question-guard-1",
      ],
    };
    const reviewReservation = {
      ...reviewed,
      questionGuard: holdQuestionGuardForSerializedReview(record.questionGuard),
    };
    const persistRecord = async (nextRecord: AnlassraumActivationRecord) => {
      persistedRecord = {
        ...nextRecord,
        version: persistedRecord.version + 1,
      };
      return persistedRecord;
    };

    await expect(
      persistQuestionGuardReviewFailClosed({
        reviewReservation,
        auditEntry,
        persistAudit: async () => {
          throw new Error("simulated_audit_persistence_failure");
        },
        persistRecord,
        afterReservation: async (reservation) => {
          expect(reservation.questionGuard.releaseState).toBe("review_required");
          underlyingRoomIsPublic = false;
        },
        buildReleasedRecord: (reservation) => ({
          ...reviewed,
          version: reservation.version,
        }),
      }),
    ).rejects.toThrow("simulated_audit_persistence_failure");
    expect(persistedRecord.questionGuard.releaseState).toBe("review_required");
    expect(persistedRecord.approvedForActivationAt).toBeNull();
    expect(persistedRecord.roomIsPublic).toBe(false);
    expect(underlyingRoomIsPublic).toBe(false);

    await persistQuestionGuardReviewFailClosed({
      reviewReservation: {
        ...reviewReservation,
        version: persistedRecord.version,
      },
      auditEntry,
      persistAudit: async (entry) => {
        persistedAudit = entry;
      },
      persistRecord,
      afterReservation: async () => {
        underlyingRoomIsPublic = false;
      },
      buildReleasedRecord: (reservation) => ({
        ...reviewed,
        version: reservation.version,
      }),
    });
    expect(persistedRecord.questionGuard.releaseState).toBe("draft_allowed");
    expect(persistedRecord.roomIsPublic).toBe(false);
    expect(underlyingRoomIsPublic).toBe(false);
    expect(persistedAudit).toEqual(auditEntry);

    const approved = approveAnlassraumActivation(persistedRecord, {
      actorUserId: "admin-1",
      reason: "Aktivierung nach Guard-Review freigegeben.",
      origin: "admin_review",
      approvedAt: "2026-07-01T09:20:00.000Z",
    });
    const activated = activateAnlassraumAfterReview(approved, {
      actorUserId: "admin-1",
      reason: "Intern aktivieren.",
      origin: "anlassraum_activation_workflow",
      approvedAt: "2026-07-01T09:30:00.000Z",
    });

    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    expect(activated.record.status).toBe("activated");
    expect(activated.record.visibility).toBe("active_internal");
    expect(activated.record.roomIsPublic).toBe(false);

    const approvedPublication = approveAnlassraumPublication(
      activated.record,
      {
        actorUserId: "admin-1",
        reason: "Veröffentlichung nach Guard-Review separat freigegeben.",
        origin: "admin_review",
        approvedAt: "2026-07-01T09:40:00.000Z",
      },
    );
    const published = publishAnlassraumAfterReview(approvedPublication, {
      actorUserId: "admin-1",
      reason: "Explizit veröffentlichen.",
      origin: "anlassraum_activation_workflow",
      approvedAt: "2026-07-01T09:50:00.000Z",
    });
    expect(published.ok).toBe(true);
    if (published.ok) {
      underlyingRoomIsPublic = published.record.roomIsPublic;
    }
    expect(underlyingRoomIsPublic).toBe(true);
  });

  it("serializes guard review against stale approval, activation, publication and competing reviews", async () => {
    const review = (record: AnlassraumActivationRecord, evidenceRef: string) =>
      reviewAnlassraumQuestionGuard(record, {
        actorExtractionSource: "actor_graph",
        evidenceRefs: [evidenceRef],
        reviewedAt: "2026-07-01T10:00:00.000Z",
      });

    const approvalRepo = createInMemoryAnlassraumActivationWorkflowRepository();
    const approvalBase = buildActivationRecord();
    await approvalRepo.save(approvalBase);
    const staleApproval = approveAnlassraumActivation(approvalBase, {
      actorUserId: "admin-stale",
      reason: "Stale Aktivierungsfreigabe.",
      origin: "admin_review",
      approvedAt: "2026-07-01T10:01:00.000Z",
    });
    const reviewedApprovalBase = await approvalRepo.compareAndSwap({
      record: review(approvalBase, "actor-graph:approval-race"),
      expectedVersion: approvalBase.version,
    });
    await expect(
      approvalRepo.compareAndSwap({
        record: staleApproval,
        expectedVersion: approvalBase.version,
      }),
    ).rejects.toThrow("anlassraum_activation_state_conflict");
    expect(reviewedApprovalBase.approvedForActivationAt).toBeNull();

    const activationRepo = createInMemoryAnlassraumActivationWorkflowRepository();
    const activationBase = buildActivationRecord({
      status: "approved_for_activation",
      approvedForActivationAt: "2026-07-01T09:20:00.000Z",
      approvedForActivationBy: "admin-before-review",
    });
    await activationRepo.save(activationBase);
    const staleActivation = activateAnlassraumAfterReview(activationBase, {
      actorUserId: "admin-stale",
      reason: "Stale Aktivierung.",
      origin: "anlassraum_activation_workflow",
      approvedAt: "2026-07-01T10:02:00.000Z",
    });
    expect(staleActivation.ok).toBe(true);
    await activationRepo.compareAndSwap({
      record: review(activationBase, "actor-graph:activation-race"),
      expectedVersion: activationBase.version,
    });
    await expect(
      activationRepo.compareAndSwap({
        record: staleActivation.record,
        expectedVersion: activationBase.version,
      }),
    ).rejects.toThrow("anlassraum_activation_state_conflict");
    expect((await activationRepo.get(activationBase.sourceHandoffId))?.status).toBe(
      "draft",
    );

    const publishRepo = createInMemoryAnlassraumActivationWorkflowRepository();
    const publishBase = buildActivationRecord({
      status: "approved_for_publication",
      visibility: "ready_for_publication_review",
      publicAccessMode: "internal_only",
      roomStatus: "active",
      roomIsPublic: true,
      approvedForActivationAt: "2026-07-01T09:20:00.000Z",
      approvedForActivationBy: "admin-before-review",
      approvedForPublicationAt: "2026-07-01T09:40:00.000Z",
      approvedForPublicationBy: "admin-before-review",
    });
    await publishRepo.save(publishBase);
    const stalePublish = publishAnlassraumAfterReview(publishBase, {
      actorUserId: "admin-stale",
      reason: "Stale Veröffentlichung.",
      origin: "anlassraum_activation_workflow",
      approvedAt: "2026-07-01T10:03:00.000Z",
    });
    expect(stalePublish.ok).toBe(true);
    await publishRepo.compareAndSwap({
      record: review(publishBase, "actor-graph:publish-race"),
      expectedVersion: publishBase.version,
    });
    await expect(
      publishRepo.compareAndSwap({
        record: stalePublish.record,
        expectedVersion: publishBase.version,
      }),
    ).rejects.toThrow("anlassraum_activation_state_conflict");
    expect((await publishRepo.get(publishBase.sourceHandoffId))?.roomIsPublic).toBe(
      false,
    );

    const competingRepo = createInMemoryAnlassraumActivationWorkflowRepository();
    const competingBase = buildActivationRecord();
    await competingRepo.save(competingBase);
    await competingRepo.compareAndSwap({
      record: review(competingBase, "actor-graph:first"),
      expectedVersion: competingBase.version,
    });
    await expect(
      competingRepo.compareAndSwap({
        record: review(competingBase, "actor-graph:second"),
        expectedVersion: competingBase.version,
      }),
    ).rejects.toThrow("anlassraum_activation_state_conflict");

    const normalRepo = createInMemoryAnlassraumActivationWorkflowRepository();
    const reviewRequired = buildActivationRecord({
      questionGuard: buildAnlassraumRuntimeDraftFromHandoff(buildHandoffRecord())
        .questionGuard,
    });
    await normalRepo.save(reviewRequired);
    const currentAfterReview = await normalRepo.compareAndSwap({
      record: review(reviewRequired, "actor-graph:normal-path"),
      expectedVersion: reviewRequired.version,
    });
    const currentApproval = await normalRepo.compareAndSwap({
      record: approveAnlassraumActivation(currentAfterReview, {
        actorUserId: "admin-current",
        reason: "Neue Freigabe.",
        origin: "admin_review",
        approvedAt: "2026-07-01T10:10:00.000Z",
      }),
      expectedVersion: currentAfterReview.version,
    });
    const currentActivation = activateAnlassraumAfterReview(currentApproval, {
      actorUserId: "admin-current",
      reason: "Aktivieren.",
      origin: "anlassraum_activation_workflow",
      approvedAt: "2026-07-01T10:11:00.000Z",
    });
    expect(currentActivation.ok).toBe(true);
    const activated = await normalRepo.compareAndSwap({
      record: currentActivation.record,
      expectedVersion: currentApproval.version,
    });
    const publicationApproval = await normalRepo.compareAndSwap({
      record: approveAnlassraumPublication(activated, {
        actorUserId: "admin-current",
        reason: "Neue Publikationsfreigabe.",
        origin: "admin_review",
        approvedAt: "2026-07-01T10:12:00.000Z",
      }),
      expectedVersion: activated.version,
    });
    const publication = publishAnlassraumAfterReview(publicationApproval, {
      actorUserId: "admin-current",
      reason: "Veröffentlichen.",
      origin: "anlassraum_activation_workflow",
      approvedAt: "2026-07-01T10:13:00.000Z",
    });
    expect(publication.ok).toBe(true);
    const published = await normalRepo.compareAndSwap({
      record: publication.record,
      expectedVersion: publicationApproval.version,
    });
    expect(published.status).toBe("published");
    expect(published.version).toBe(5);
  });

  it("uses the CAS-backed workflow as the public-input boundary and supports legacy version zero", async () => {
    const repo = createInMemoryAnlassraumActivationWorkflowRepository();
    setAnlassraumActivationWorkflowRepositoryForTests(repo);
    try {
      const publicRecord = buildActivationRecord({
        status: "published",
        visibility: "public",
        publicAccessMode: "public_read_only",
        roomStatus: "active",
        roomIsPublic: true,
        blockers: [],
        approvedForActivationAt: "2026-07-01T09:20:00.000Z",
        approvedForActivationBy: "admin-1",
        approvedForPublicationAt: "2026-07-01T09:40:00.000Z",
        approvedForPublicationBy: "admin-1",
      });
      expect(isAnlassraumPubliclyReleased(publicRecord)).toBe(true);
      await repo.save(publicRecord);
      await expect(
        isAnlassraumPublicInputAllowed({
          anlassraumId: publicRecord.anlassraumId!,
          roomIsPublic: true,
        }),
      ).resolves.toBe(true);

      const reviewReservation = reviewAnlassraumQuestionGuard(publicRecord, {
        actorExtractionSource: "human_review",
        evidenceRefs: ["human-review:legacy-public-room"],
        noNamedActorsConfirmed: true,
        reviewedAt: "2026-07-01T10:20:00.000Z",
      });
      const reserved = await repo.compareAndSwap({
        record: {
          ...reviewReservation,
          questionGuard: holdQuestionGuardForSerializedReview(
            publicRecord.questionGuard,
          ),
        },
        expectedVersion: publicRecord.version,
      });
      expect(reserved.version).toBe(1);
      expect(reserved.roomStatus).toBe("review_required");
      expect(reserved.roomIsPublic).toBe(false);
      await expect(
        isAnlassraumPublicInputAllowed({
          anlassraumId: publicRecord.anlassraumId!,
          roomIsPublic: true,
        }),
      ).resolves.toBe(false);

      const legacyRepo = createInMemoryAnlassraumActivationWorkflowRepository();
      const { version: _legacyVersion, ...legacyRecord } = publicRecord;
      await legacyRepo.save(legacyRecord as AnlassraumActivationRecord);
      const legacyReviewed = reviewAnlassraumQuestionGuard(
        legacyRecord as AnlassraumActivationRecord,
        {
          actorExtractionSource: "entity_registry",
          evidenceRefs: ["entity-registry:legacy-public-room"],
          reviewedAt: "2026-07-01T10:21:00.000Z",
        },
      );
      const legacyReserved = await legacyRepo.compareAndSwap({
        record: {
          ...legacyReviewed,
          questionGuard: holdQuestionGuardForSerializedReview(
            legacyRecord.questionGuard,
          ),
        },
        expectedVersion: 0,
      });
      expect(legacyReserved.version).toBe(1);
      expect(legacyReserved.roomIsPublic).toBe(false);

      setAnlassraumActivationWorkflowRepositoryForTests(
        createInMemoryAnlassraumActivationWorkflowRepository(),
      );
      await expect(
        isAnlassraumPublicInputAllowed({
          anlassraumId: publicRecord.anlassraumId!,
          roomIsPublic: true,
        }),
      ).resolves.toBe(false);
      await expect(
        isAnlassraumPublicInputAllowed({
          anlassraumId: publicRecord.anlassraumId!,
          roomIsPublic: true,
          roomStatus: "active",
          roomPublishedAt: "2026-07-01T09:40:00.000Z",
          roomReviewedBy: "reviewer-legacy",
          roomApprovedBy: "approver-legacy",
          activationWorkflowSourceHandoffId: null,
        }),
      ).resolves.toBe(true);
      await expect(
        isAnlassraumPublicInputAllowed({
          anlassraumId: publicRecord.anlassraumId!,
          roomIsPublic: true,
          roomStatus: "review_required",
          roomPublishedAt: "2026-07-01T09:40:00.000Z",
          roomReviewedBy: "reviewer-legacy",
          roomApprovedBy: "approver-legacy",
          activationWorkflowSourceHandoffId: "handoff-owned-by-new-guard",
        }),
      ).resolves.toBe(false);

      expect(
        isAnlassraumPubliclyReleased({
          ...publicRecord,
          moderationPending: true,
        }),
      ).toBe(false);
      expect(
        isAnlassraumPubliclyReleased({
          ...publicRecord,
          questionGuard: undefined as never,
        }),
      ).toBe(false);
    } finally {
      setAnlassraumActivationWorkflowRepositoryForTests(null);
    }
  });

  it("keeps created anlassraeume non-public until explicit publication", () => {
    const record = buildActivationRecord();

    expect(record.status).toBe("draft");
    expect(record.visibility).toBe("editorial_workspace");
    expect(record.roomIsPublic).toBe(false);
    expect(blocksAnlassraumAutoPublish(record)).toBe(true);
    expect(blocksUnsafeAnlassraumPublicVisibility(record)).toBe(false);
    expect(record.blockers).toContain("activation_not_approved");
    expect(record.blockers).toContain("publication_not_approved");
  });

  it("keeps approved activation and active_internal separate from public visibility", () => {
    const approved = approveAnlassraumActivation(buildActivationRecord(), {
      actorUserId: "admin-1",
      reason: "Aktivierung freigegeben.",
      origin: "admin_review",
      approvedAt: "2026-07-01T09:20:00.000Z",
    });

    expect(approved.status).toBe("approved_for_activation");
    expect(approved.visibility).toBe("editorial_workspace");
    expect(approved.roomIsPublic).toBe(false);

    const activated = activateAnlassraumAfterReview(approved, {
      actorUserId: "admin-1",
      reason: "Intern aktivieren.",
      origin: "anlassraum_activation_workflow",
      approvedAt: "2026-07-01T09:30:00.000Z",
    });

    expect(activated.ok).toBe(true);
    if (activated.ok) {
      expect(activated.record.status).toBe("activated");
      expect(activated.record.visibility).toBe("active_internal");
      expect(activated.record.roomStatus).toBe("active");
      expect(activated.record.roomIsPublic).toBe(false);
      expect(blocksAnlassraumAutoActivation(activated.record)).toBe(false);
      expect(blocksUnsafeAnlassraumPublicVisibility(activated.record)).toBe(
        false,
      );
    }
  });

  it("requires activation before publication approval and publication before public visibility", () => {
    const draft = buildActivationRecord();
    expect(canApproveAnlassraumPublication(draft)).toBe(false);
    expect(canPublishAnlassraum(draft)).toBe(false);

    const approvedActivation = approveAnlassraumActivation(draft, {
      actorUserId: "admin-1",
      reason: "Aktivierung freigegeben.",
      origin: "admin_review",
      approvedAt: "2026-07-01T09:20:00.000Z",
    });
    const activated = activateAnlassraumAfterReview(approvedActivation, {
      actorUserId: "admin-1",
      reason: "Intern aktivieren.",
      origin: "anlassraum_activation_workflow",
      approvedAt: "2026-07-01T09:30:00.000Z",
    });

    expect(activated.ok).toBe(true);
    if (!activated.ok) return;

    const approvedPublication = approveAnlassraumPublication(
      activated.record,
      {
        actorUserId: "admin-1",
        reason: "Veröffentlichung freigegeben.",
        origin: "admin_review",
        approvedAt: "2026-07-01T09:40:00.000Z",
      },
    );

    expect(approvedPublication.status).toBe("approved_for_publication");
    expect(approvedPublication.visibility).toBe(
      "ready_for_publication_review",
    );
    expect(approvedPublication.roomIsPublic).toBe(false);
    expect(canPublishAnlassraum(approvedPublication)).toBe(true);

    const published = publishAnlassraumAfterReview(approvedPublication, {
      actorUserId: "admin-1",
      reason: "Öffentlich sichtbar machen.",
      origin: "anlassraum_activation_workflow",
      approvedAt: "2026-07-01T09:50:00.000Z",
    });

    expect(published.ok).toBe(true);
    if (published.ok) {
      expect(published.record.status).toBe("published");
      expect(published.record.visibility).toBe("public");
      expect(published.record.publicAccessMode).toBe("public_read_only");
      expect(published.record.roomStatus).toBe("active");
      expect(published.record.roomIsPublic).toBe(true);
    }
  });

  it("blocks publication while review signals are unresolved and keeps guardrails explicit", () => {
    const blocked = buildActivationRecord({
      moderationPending: true,
      unresolvedTrustQualityBlocker: true,
    });

    const approvedActivation = approveAnlassraumActivation(blocked, {
      actorUserId: "admin-1",
      reason: "Trotzdem prüfen.",
      origin: "admin_review",
      approvedAt: "2026-07-01T09:20:00.000Z",
    });

    expect(approvedActivation.status).toBe("blocked");
    expect(approvedActivation.blockers).toContain("moderation_pending");
    expect(approvedActivation.blockers).toContain(
      "unresolved_trust_quality_blocker",
    );
    expect(approvedActivation.guardrails.noAutoGraphWrite).toBe(true);
    expect(approvedActivation.guardrails.noAutoMerge).toBe(true);
    expect(approvedActivation.guardrails.noAutoFactcheck).toBe(true);
    expect(approvedActivation.guardrails.noDeepSearch).toBe(true);
  });
});
