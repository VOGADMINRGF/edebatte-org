import { describe, expect, it } from "vitest";
import {
  activateParticipationSpaceAfterReview,
  approveParticipationSpaceActivation,
  approveParticipationSpacePublication,
  blocksParticipationSpaceAutoActivation,
  blocksParticipationSpaceAutoPublish,
  blocksUnsafePublicVisibility,
  buildParticipationSpacePublishDraft,
  canApproveParticipationSpacePublication,
  canPublishParticipationSpace,
  getParticipationSpacePublishBlockers,
  publishParticipationSpaceAfterReview,
  reviewParticipationSpaceQuestionGuard,
  type ParticipationSpacePublishRecord,
} from "@/features/create/participationSpacePublishWorkflow";
import {
  buildParticipationSpaceRuntimeDraftFromHandoff,
  type ParticipationSpaceRuntimeRecord,
} from "@/features/create/participationSpaceRuntime";
import type { PersistedCreateHandoffRecord } from "@/features/create/persistedHandoffReviewQueue";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";
import {
  holdQuestionGuardForSerializedReview,
  persistQuestionGuardReviewFailClosed,
} from "@/features/create/safety/questionGuardReviewPersistence";
import { createInMemoryParticipationSpaceRuntimeRepository } from "@/features/create/participationSpaceRuntimeServer";

function buildHandoffRecord(): PersistedCreateHandoffRecord {
  return {
    schemaVersion: "create_handoff_review_item.v1",
    id: "handoff-participation-publish-1",
    source: "create",
    sourceText:
      "Vor Schulen fehlen sichere Querungen und der Kiez braucht einen öffentlichen Beteiligungsstand.",
    plannerResult: {
      shortSummary:
        "Sichere Schulwege sollen als Beteiligungsraum mit klarer Leitfrage weitergeführt werden.",
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
      matchedAnlassraeume: ["65a111111111111111111110"],
      shouldCreateNewTopic: true,
    } as any,
    selectedAction: "prepare_participation_space",
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
    resumeHref: "/create?resume=handoff-participation-publish-1",
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
    anlassraumId: "65a111111111111111111110",
    requestScope: null,
    accessDecision: null,
    createdAt: "2026-06-30T08:00:00.000Z",
    updatedAt: "2026-06-30T08:00:00.000Z",
  };
}

function buildRuntimeRecord(
  overrides: Partial<ParticipationSpaceRuntimeRecord> = {},
): ParticipationSpaceRuntimeRecord {
  const handoff = buildHandoffRecord();
  const draft = buildParticipationSpaceRuntimeDraftFromHandoff(handoff, {
    status: "created",
    visibility: "active_internal",
    createdParticipationSpaceId: "participation-space-1",
    createdParticipationSpaceSlug: "sichere-schulwege",
    auditContext: {
      actorUserId: "admin-1",
      reason: "Review-approved creation.",
      origin: "participation_space_runtime",
      approvedAt: "2026-06-30T09:00:00.000Z",
    },
  });

  return {
    ...draft,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: handoff.sourceText,
      candidatePublicQuestion: draft.participationQuestion,
      actorContexts: [],
      actorExtraction: {
        status: "complete",
        source: "actor_graph",
        independentFromCandidateProvider: true,
        evidenceRefs: ["actor-graph-review:participation-publish-1"],
      },
    }),
    auditTrail: [
      {
        id: "runtime-created-1",
        sourceHandoffId: draft.sourceHandoffId,
        at: "2026-06-30T09:00:00.000Z",
        action: "runtime_created",
        actorUserId: "admin-1",
        note: "Runtime erstellt.",
        blockers: [],
        status: "created",
        participationSpaceId: "participation-space-1",
        participationSpaceSlug: "sichere-schulwege",
      },
    ],
    approvedForCreationAt: "2026-06-30T08:30:00.000Z",
    approvedForCreationBy: "admin-1",
    rejectedAt: null,
    rejectedBy: null,
    ...overrides,
  };
}

function buildPublishRecord(
  overrides: Partial<ParticipationSpacePublishRecord> = {},
): ParticipationSpacePublishRecord {
  const draft = buildParticipationSpacePublishDraft({
    runtimeRecord: buildRuntimeRecord(),
    createdSpace: {
      id: "participation-space-1",
      slug: "sichere-schulwege",
      status: "review_active",
      visibility: "review_only",
      publicHeadline: "Sichere Schulwege im Blick",
      publicSummary:
        "Der Beteiligungsraum bündelt Hinweise zu Querungen, Schulwegen und offenen Prüfpfaden.",
      publicFeedbackAvailable: false,
      updatedAt: "2026-06-30T09:00:00.000Z",
    },
    creationAudited: true,
    auditContext: {
      actorUserId: "admin-1",
      reason: "Audit vorhanden.",
      origin: "admin_review",
      approvedAt: "2026-06-30T09:10:00.000Z",
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

describe("participation space publish workflow", () => {
  it("carries a blocked source question into the publication blocker set", () => {
    const handoff = buildHandoffRecord();
    handoff.sourceText = "Sollen wir diese Gruppe verprügeln?";
    handoff.plannerResult.openQuestions = [
      "Welche Maßnahmen sollten Konflikte friedlich lösen?",
    ];
    const runtimeDraft = buildParticipationSpaceRuntimeDraftFromHandoff(handoff, {
      status: "created",
      visibility: "active_internal",
      createdParticipationSpaceId: "participation-space-blocked",
    });
    const runtimeRecord: ParticipationSpaceRuntimeRecord = {
      ...runtimeDraft,
      auditTrail: [],
      approvedForCreationAt: null,
      approvedForCreationBy: null,
      rejectedAt: null,
      rejectedBy: null,
    };
    const publishDraft = buildParticipationSpacePublishDraft({
      runtimeRecord,
      createdSpace: null,
      creationAudited: false,
    });

    expect(publishDraft.questionGuard.outcome).toBe("safety_blocked");
    expect(getParticipationSpacePublishBlockers(publishDraft)).toContain(
      "public_question_guard_blocked",
    );
  });

  it("blocks publication while public-question review remains unresolved", () => {
    const unresolvedQuestionGuard = buildParticipationSpaceRuntimeDraftFromHandoff(
      buildHandoffRecord(),
    ).questionGuard;
    const record = buildPublishRecord({
      questionGuard: unresolvedQuestionGuard,
      status: "approved_for_publication",
      visibility: "ready_for_publication_review",
      approvedForActivationAt: "2026-06-30T09:20:00.000Z",
      approvedForActivationBy: "admin-1",
      approvedForPublicationAt: "2026-06-30T09:40:00.000Z",
      approvedForPublicationBy: "admin-1",
    });

    expect(record.questionGuard.releaseState).toBe("review_required");
    expect(getParticipationSpacePublishBlockers(record, "publication")).toContain(
      "public_question_guard_blocked",
    );

    const published = publishParticipationSpaceAfterReview(record, {
      actorUserId: "admin-1",
      reason: "Öffentlich sichtbar machen.",
      origin: "participation_space_publish_workflow",
      approvedAt: "2026-06-30T09:50:00.000Z",
    });

    expect(published.ok).toBe(false);
    if (!published.ok) {
      expect(published.blockers).toContain("public_question_guard_blocked");
    }
  });

  it("resolves only the procedure-specific blocker through explicit human review", () => {
    const questionGuard = buildProcedureQuestionGuard();
    const record = buildPublishRecord({
      description: questionGuard.originalInput,
      participationQuestion: questionGuard.candidatePublicQuestion,
      questionGuard,
      status: "approved_for_publication",
      visibility: "ready_for_publication_review",
      approvedForActivationAt: "2026-06-30T09:05:00.000Z",
      approvedForActivationBy: "admin-before-review",
      approvedForPublicationAt: "2026-06-30T09:10:00.000Z",
      approvedForPublicationBy: "admin-before-review",
    });

    expect(record.questionGuard.outcome).toBe(
      "entity_specific_procedure_review_required",
    );

    const registryReviewed = reviewParticipationSpaceQuestionGuard(record, {
      actorExtractionSource: "entity_registry",
      evidenceRefs: ["registry:stadtwerke:1"],
    });
    expect(registryReviewed.questionGuard.outcome).toBe(
      "entity_specific_procedure_review_required",
    );
    expect(registryReviewed.questionGuard.releaseState).toBe("review_required");

    const humanReviewed = reviewParticipationSpaceQuestionGuard(record, {
      actorExtractionSource: "human_review",
      evidenceRefs: ["human-review:permit:waermenetz:1"],
      reviewedAt: "2026-06-30T09:15:00.000Z",
    });

    expect(humanReviewed.questionGuard.outcome).toBe(
      "entity_specific_procedure_review_resolved",
    );
    expect(humanReviewed.questionGuard.releaseState).toBe("draft_allowed");
    expect(humanReviewed.questionGuard.reasons).toContain(
      "procedure_specific_human_review_completed",
    );
    expect(humanReviewed.status).toBe("draft");
    expect(humanReviewed.visibility).toBe("editorial_workspace");
    expect(humanReviewed.approvedForActivationAt).toBeNull();
    expect(humanReviewed.approvedForPublicationAt).toBeNull();
    expect(humanReviewed.blockers).toEqual(
      expect.arrayContaining(["activation_not_approved", "publication_not_approved"]),
    );
  });

  it("invalidates earlier approvals and persists review audit before releasing the guard", async () => {
    const unresolvedQuestionGuard = buildParticipationSpaceRuntimeDraftFromHandoff(
      buildHandoffRecord(),
    ).questionGuard;
    const record = buildPublishRecord({
      questionGuard: unresolvedQuestionGuard,
      status: "approved_for_publication",
      visibility: "ready_for_publication_review",
      approvedForActivationAt: "2026-06-30T09:05:00.000Z",
      approvedForActivationBy: "admin-before-review",
      approvedForPublicationAt: "2026-06-30T09:10:00.000Z",
      approvedForPublicationBy: "admin-before-review",
    });

    expect(() =>
      reviewParticipationSpaceQuestionGuard(record, {
        actorExtractionSource: "material_provider" as never,
        evidenceRefs: ["self-attested:material-provider"],
      }),
    ).toThrow("public_question_guard_review_source_invalid");
    expect(() =>
      reviewParticipationSpaceQuestionGuard(record, {
        actorExtractionSource: "human_review",
        evidenceRefs: [" "],
      }),
    ).toThrow("public_question_guard_review_evidence_required");

    const reviewed = reviewParticipationSpaceQuestionGuard(record, {
      actorExtractionSource: "human_review",
      evidenceRefs: ["human-review:participation-question-guard-1"],
      noNamedActorsConfirmed: true,
      reviewedAt: "2026-06-30T09:15:00.000Z",
    });

    expect(reviewed.questionGuard.releaseState).toBe("draft_allowed");
    expect(reviewed.questionGuard.actorExtraction).toEqual({
      status: "complete",
      source: "human_review",
      independentFromCandidateProvider: true,
      evidenceRefs: ["human-review:participation-question-guard-1"],
      humanReviewFinding: "no_named_actors",
    });
    expect(reviewed.blockers).not.toContain("public_question_guard_blocked");
    expect(reviewed.status).toBe("draft");
    expect(reviewed.visibility).toBe("editorial_workspace");
    expect(reviewed.approvedForActivationAt).toBeNull();
    expect(reviewed.approvedForActivationBy).toBeNull();
    expect(reviewed.approvedForPublicationAt).toBeNull();
    expect(reviewed.approvedForPublicationBy).toBeNull();
    expect(reviewed.blockers).toContain("activation_not_approved");
    expect(reviewed.blockers).toContain("publication_not_approved");

    const activationWithoutNewApproval = activateParticipationSpaceAfterReview(
      reviewed,
      {
        actorUserId: "admin-1",
        reason: "Alte Freigabe darf nicht weitergelten.",
        origin: "participation_space_publish_workflow",
        approvedAt: "2026-06-30T09:16:00.000Z",
      },
    );
    const publicationWithoutNewApproval = publishParticipationSpaceAfterReview(
      reviewed,
      {
        actorUserId: "admin-1",
        reason: "Alte Freigabe darf nicht weitergelten.",
        origin: "participation_space_publish_workflow",
        approvedAt: "2026-06-30T09:16:00.000Z",
      },
    );
    expect(activationWithoutNewApproval.ok).toBe(false);
    expect(publicationWithoutNewApproval.ok).toBe(false);

    let persistedRecord = record;
    let persistedAudit:
      | {
          action: string;
          questionGuardActorExtractionSource: string;
          questionGuardEvidenceRefs: string[];
        }
      | null = null;
    const auditEntry = {
      action: "question_guard_reviewed",
      questionGuardActorExtractionSource: "human_review",
      questionGuardEvidenceRefs: [
        "human-review:participation-question-guard-1",
      ],
    };
    const reviewReservation = {
      ...reviewed,
      questionGuard: holdQuestionGuardForSerializedReview(record.questionGuard),
    };
    const persistRecord = async (
      nextRecord: ParticipationSpacePublishRecord,
    ) => {
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
        buildReleasedRecord: (reservation) => ({
          ...reviewed,
          version: reservation.version,
        }),
      }),
    ).rejects.toThrow("simulated_audit_persistence_failure");
    expect(persistedRecord.questionGuard.releaseState).toBe("review_required");
    expect(persistedRecord.approvedForActivationAt).toBeNull();

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
      buildReleasedRecord: (reservation) => ({
        ...reviewed,
        version: reservation.version,
      }),
    });
    expect(persistedRecord.questionGuard.releaseState).toBe("draft_allowed");
    expect(persistedAudit).toEqual(auditEntry);

    const approvedActivation = approveParticipationSpaceActivation(
      persistedRecord,
      {
      actorUserId: "admin-1",
      reason: "Aktivierung nach Guard-Review freigegeben.",
      origin: "admin_review",
      approvedAt: "2026-06-30T09:20:00.000Z",
      },
    );
    const activated = activateParticipationSpaceAfterReview(approvedActivation, {
      actorUserId: "admin-1",
      reason: "Intern aktivieren.",
      origin: "participation_space_publish_workflow",
      approvedAt: "2026-06-30T09:30:00.000Z",
    });
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;

    const approvedPublication = approveParticipationSpacePublication(
      activated.record,
      {
        actorUserId: "admin-1",
        reason: "Veröffentlichung separat freigegeben.",
        origin: "admin_review",
        approvedAt: "2026-06-30T09:40:00.000Z",
      },
    );
    const published = publishParticipationSpaceAfterReview(
      approvedPublication,
      {
        actorUserId: "admin-1",
        reason: "Explizit veröffentlichen.",
        origin: "participation_space_publish_workflow",
        approvedAt: "2026-06-30T09:50:00.000Z",
      },
    );

    expect(published.ok).toBe(true);
  });

  it("serializes guard review against stale approval, activation, publication and competing reviews", async () => {
    const review = (record: ParticipationSpacePublishRecord, evidenceRef: string) =>
      reviewParticipationSpaceQuestionGuard(record, {
        actorExtractionSource: "human_review",
        evidenceRefs: [evidenceRef],
        noNamedActorsConfirmed: true,
        reviewedAt: "2026-06-30T10:00:00.000Z",
      });

    const approvalRepo = createInMemoryParticipationSpaceRuntimeRepository();
    const approvalBase = buildPublishRecord();
    await approvalRepo.savePublishRecord(approvalBase);
    const staleApproval = approveParticipationSpaceActivation(approvalBase, {
      actorUserId: "admin-stale",
      reason: "Stale Aktivierungsfreigabe.",
      origin: "admin_review",
      approvedAt: "2026-06-30T10:01:00.000Z",
    });
    const reviewedApprovalBase = await approvalRepo.compareAndSwapPublishRecord({
      record: review(approvalBase, "human-review:approval-race"),
      expectedVersion: approvalBase.version,
    });
    await expect(
      approvalRepo.compareAndSwapPublishRecord({
        record: staleApproval,
        expectedVersion: approvalBase.version,
      }),
    ).rejects.toThrow("participation_space_publish_state_conflict");
    expect(reviewedApprovalBase.approvedForActivationAt).toBeNull();

    const activationRepo = createInMemoryParticipationSpaceRuntimeRepository();
    const activationBase = buildPublishRecord({
      status: "approved_for_activation",
      approvedForActivationAt: "2026-06-30T09:20:00.000Z",
      approvedForActivationBy: "admin-before-review",
    });
    await activationRepo.savePublishRecord(activationBase);
    const staleActivation = activateParticipationSpaceAfterReview(
      activationBase,
      {
        actorUserId: "admin-stale",
        reason: "Stale Aktivierung.",
        origin: "participation_space_publish_workflow",
        approvedAt: "2026-06-30T10:02:00.000Z",
      },
    );
    expect(staleActivation.ok).toBe(true);
    await activationRepo.compareAndSwapPublishRecord({
      record: review(activationBase, "human-review:activation-race"),
      expectedVersion: activationBase.version,
    });
    if (!staleActivation.ok) return;
    await expect(
      activationRepo.compareAndSwapPublishRecord({
        record: staleActivation.record,
        expectedVersion: activationBase.version,
      }),
    ).rejects.toThrow("participation_space_publish_state_conflict");
    expect(
      (await activationRepo.getPublishRecord(activationBase.sourceHandoffId))
        ?.status,
    ).toBe("draft");

    const publishRepo = createInMemoryParticipationSpaceRuntimeRepository();
    const publishBase = buildPublishRecord({
      status: "approved_for_publication",
      visibility: "ready_for_publication_review",
      approvedForActivationAt: "2026-06-30T09:20:00.000Z",
      approvedForActivationBy: "admin-before-review",
      approvedForPublicationAt: "2026-06-30T09:40:00.000Z",
      approvedForPublicationBy: "admin-before-review",
    });
    await publishRepo.savePublishRecord(publishBase);
    const stalePublish = publishParticipationSpaceAfterReview(publishBase, {
      actorUserId: "admin-stale",
      reason: "Stale Veröffentlichung.",
      origin: "participation_space_publish_workflow",
      approvedAt: "2026-06-30T10:03:00.000Z",
    });
    expect(stalePublish.ok).toBe(true);
    await publishRepo.compareAndSwapPublishRecord({
      record: review(publishBase, "human-review:publish-race"),
      expectedVersion: publishBase.version,
    });
    if (!stalePublish.ok) return;
    await expect(
      publishRepo.compareAndSwapPublishRecord({
        record: stalePublish.record,
        expectedVersion: publishBase.version,
      }),
    ).rejects.toThrow("participation_space_publish_state_conflict");
    expect(
      (await publishRepo.getPublishRecord(publishBase.sourceHandoffId))?.visibility,
    ).toBe("editorial_workspace");

    const competingRepo = createInMemoryParticipationSpaceRuntimeRepository();
    const competingBase = buildPublishRecord();
    await competingRepo.savePublishRecord(competingBase);
    await competingRepo.compareAndSwapPublishRecord({
      record: review(competingBase, "human-review:first"),
      expectedVersion: competingBase.version,
    });
    await expect(
      competingRepo.compareAndSwapPublishRecord({
        record: review(competingBase, "human-review:second"),
        expectedVersion: competingBase.version,
      }),
    ).rejects.toThrow("participation_space_publish_state_conflict");

    const normalRepo = createInMemoryParticipationSpaceRuntimeRepository();
    const reviewRequired = buildPublishRecord({
      questionGuard: buildParticipationSpaceRuntimeDraftFromHandoff(
        buildHandoffRecord(),
      ).questionGuard,
    });
    await normalRepo.savePublishRecord(reviewRequired);
    const currentAfterReview = await normalRepo.compareAndSwapPublishRecord({
      record: review(reviewRequired, "human-review:normal-path"),
      expectedVersion: reviewRequired.version,
    });
    const currentApproval = await normalRepo.compareAndSwapPublishRecord({
      record: approveParticipationSpaceActivation(currentAfterReview, {
        actorUserId: "admin-current",
        reason: "Neue Freigabe.",
        origin: "admin_review",
        approvedAt: "2026-06-30T10:10:00.000Z",
      }),
      expectedVersion: currentAfterReview.version,
    });
    const currentActivation = activateParticipationSpaceAfterReview(
      currentApproval,
      {
        actorUserId: "admin-current",
        reason: "Aktivieren.",
        origin: "participation_space_publish_workflow",
        approvedAt: "2026-06-30T10:11:00.000Z",
      },
    );
    expect(currentActivation.ok).toBe(true);
    if (!currentActivation.ok) return;
    const activated = await normalRepo.compareAndSwapPublishRecord({
      record: currentActivation.record,
      expectedVersion: currentApproval.version,
    });
    const publicationApproval = await normalRepo.compareAndSwapPublishRecord({
      record: approveParticipationSpacePublication(activated, {
        actorUserId: "admin-current",
        reason: "Neue Publikationsfreigabe.",
        origin: "admin_review",
        approvedAt: "2026-06-30T10:12:00.000Z",
      }),
      expectedVersion: activated.version,
    });
    const publication = publishParticipationSpaceAfterReview(
      publicationApproval,
      {
        actorUserId: "admin-current",
        reason: "Veröffentlichen.",
        origin: "participation_space_publish_workflow",
        approvedAt: "2026-06-30T10:13:00.000Z",
      },
    );
    expect(publication.ok).toBe(true);
    if (publication.ok) {
      const published = await normalRepo.compareAndSwapPublishRecord({
        record: publication.record,
        expectedVersion: publicationApproval.version,
      });
      expect(published.status).toBe("published");
      expect(published.version).toBe(5);
    }
  });

  it("keeps created participation spaces non-public until explicit publication", () => {
    const record = buildPublishRecord();

    expect(record.status).toBe("draft");
    expect(record.visibility).toBe("editorial_workspace");
    expect(record.spaceVisibility).toBe("review_only");
    expect(blocksParticipationSpaceAutoPublish(record)).toBe(false);
    expect(blocksUnsafePublicVisibility(record)).toBe(false);
    expect(getParticipationSpacePublishBlockers(record)).toContain(
      "activation_not_approved",
    );
    expect(getParticipationSpacePublishBlockers(record)).toContain(
      "publication_not_approved",
    );
  });

  it("keeps approved activation and active_internal separate from public visibility", () => {
    const approved = approveParticipationSpaceActivation(buildPublishRecord(), {
      actorUserId: "admin-1",
      reason: "Aktivierung freigegeben.",
      origin: "admin_review",
      approvedAt: "2026-06-30T09:20:00.000Z",
    });

    expect(approved.status).toBe("approved_for_activation");
    expect(approved.visibility).toBe("editorial_workspace");
    expect(approved.spaceVisibility).toBe("review_only");
    expect(approved.visibility).not.toBe("public");

    const activated = activateParticipationSpaceAfterReview(approved, {
      actorUserId: "admin-1",
      reason: "Intern aktivieren.",
      origin: "participation_space_publish_workflow",
      approvedAt: "2026-06-30T09:30:00.000Z",
    });

    expect(activated.ok).toBe(true);
    if (activated.ok) {
      expect(activated.record.status).toBe("activated");
      expect(activated.record.visibility).toBe("active_internal");
      expect(activated.record.spaceStatus).toBe("feedback_prepared");
      expect(activated.record.spaceVisibility).toBe("review_only");
      expect(activated.record.visibility).not.toBe("public");
      expect(blocksParticipationSpaceAutoActivation(activated.record)).toBe(
        false,
      );
      expect(blocksUnsafePublicVisibility(activated.record)).toBe(false);
    }
  });

  it("requires activation before publication approval and publication before public visibility", () => {
    const draft = buildPublishRecord();
    expect(canApproveParticipationSpacePublication(draft)).toBe(false);
    expect(canPublishParticipationSpace(draft)).toBe(false);
    expect(getParticipationSpacePublishBlockers(draft)).toContain(
      "publication_not_approved",
    );

    const approvedActivation = approveParticipationSpaceActivation(draft, {
      actorUserId: "admin-1",
      reason: "Aktivierung freigegeben.",
      origin: "admin_review",
      approvedAt: "2026-06-30T09:20:00.000Z",
    });
    const activated = activateParticipationSpaceAfterReview(approvedActivation, {
      actorUserId: "admin-1",
      reason: "Intern aktivieren.",
      origin: "participation_space_publish_workflow",
      approvedAt: "2026-06-30T09:30:00.000Z",
    });

    expect(activated.ok).toBe(true);
    if (!activated.ok) return;

    const approvedPublication = approveParticipationSpacePublication(
      activated.record,
      {
        actorUserId: "admin-1",
        reason: "Veröffentlichung freigegeben.",
        origin: "admin_review",
        approvedAt: "2026-06-30T09:40:00.000Z",
      },
    );

    expect(approvedPublication.status).toBe("approved_for_publication");
    expect(approvedPublication.visibility).toBe("ready_for_publication_review");
    expect(approvedPublication.visibility).not.toBe("public");
    expect(approvedPublication.spaceVisibility).toBe("review_only");
    expect(canPublishParticipationSpace(approvedPublication)).toBe(true);

    const published = publishParticipationSpaceAfterReview(approvedPublication, {
      actorUserId: "admin-1",
      reason: "Öffentlich sichtbar machen.",
      origin: "participation_space_publish_workflow",
      approvedAt: "2026-06-30T09:50:00.000Z",
    });

    expect(published.ok).toBe(true);
    if (published.ok) {
      expect(published.record.status).toBe("published");
      expect(published.record.visibility).toBe("public");
      expect(published.record.spaceVisibility).toBe("public_read_only");
      expect(blocksParticipationSpaceAutoPublish(published.record)).toBe(false);
      expect(blocksUnsafePublicVisibility(published.record)).toBe(false);
    }
  });

  it("treats creation approval as insufficient for publication approval", () => {
    const record = buildPublishRecord({
      runtimeStatus: "created",
      runtimeVisibility: "active_internal",
      status: "draft",
    });

    expect(canApproveParticipationSpacePublication(record)).toBe(false);
    expect(getParticipationSpacePublishBlockers(record)).toContain(
      "activation_not_approved",
    );
    expect(getParticipationSpacePublishBlockers(record)).toContain(
      "publication_not_approved",
    );
  });

  it("blocks publication on source, moderation, abuse and trust blockers", () => {
    const blocked = buildPublishRecord({
      sourceStatus: "source_review_pending",
      moderationPending: true,
      unresolvedAbuseSignal: true,
      unresolvedTrustQualityBlocker: true,
      status: "approved_for_publication",
      visibility: "ready_for_publication_review",
    });

    const blockers = getParticipationSpacePublishBlockers(blocked, "publication");
    expect(blockers).toContain("source_review_pending");
    expect(blockers).toContain("moderation_pending");
    expect(blockers).toContain("unresolved_abuse_signal");
    expect(blockers).toContain("unresolved_trust_quality_blocker");
    expect(canPublishParticipationSpace(blocked)).toBe(false);
  });

  it("blocks publication when public copy or moderation policy are missing", () => {
    const blocked = buildPublishRecord({
      status: "approved_for_publication",
      visibility: "ready_for_publication_review",
      publicHeadline: "",
      publicSummary: "",
      moderationPolicy: null,
    });

    const blockers = getParticipationSpacePublishBlockers(blocked, "publication");
    expect(blockers).toContain("public_copy_missing");
    expect(blockers).toContain("moderation_policy_missing");
    expect(canPublishParticipationSpace(blocked)).toBe(false);
  });

  it("keeps community, trust, dossier, anlassraum and graph context as review-only hints", () => {
    const record = buildPublishRecord();

    expect(record.guardrails.noCommunityHintsAsTruth).toBe(true);
    expect(record.guardrails.noTrustOrSourceQualityAsVerification).toBe(true);
    expect(record.guardrails.noGraphEdgeAsProof).toBe(true);
    expect(record.guardrails.noDossierContextAsProof).toBe(true);
    expect(record.guardrails.noAnlassraumContextAsProof).toBe(true);
    expect(record.guardrails.noMajorityAsTruth).toBe(true);
    expect(record.relatedDossierId).toBe("dossier-sichere-schulwege");
    expect(record.relatedAnlassraumId).toBe("65a111111111111111111110");
  });

  it("preserves no auto-activation, no auto-publish, no auto-graph and no auto-merge guardrails", () => {
    const record = buildPublishRecord();

    expect(record.guardrails.noAutoActivationFromCreation).toBe(true);
    expect(record.guardrails.noAutoPublishFromCreation).toBe(true);
    expect(record.guardrails.noAutoGraphWrite).toBe(true);
    expect(record.guardrails.noAutoMerge).toBe(true);
    expect(record.guardrails.auditContextRequired).toBe(true);
  });
});
