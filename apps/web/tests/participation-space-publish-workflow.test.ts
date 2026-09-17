import { describe, expect, it } from "vitest";
import {
  activateParticipationSpaceAfterReview,
  approveParticipationSpaceActivation,
  approveParticipationSpacePublication,
  blocksParticipationSpaceAutoActivation,
  blocksParticipationSpaceAutoPublish,
  blocksUnsafePublicVisibility,
  canApproveParticipationSpacePublication,
  canPublishParticipationSpace,
  getParticipationSpacePublishBlockers,
  publishParticipationSpaceAfterReview,
  reviewParticipationSpaceQuestionGuard,
  type ParticipationSpacePublishAuditEntry,
  type ParticipationSpacePublishRecord,
} from "@/features/create/participationSpacePublishWorkflow";
import {
  holdQuestionGuardForSerializedReview,
  persistQuestionGuardReviewFailClosed,
} from "@/features/create/safety/questionGuardReviewPersistence";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";
import { createInMemoryParticipationSpaceRuntimeRepository } from "@/features/create/participationSpaceRuntimeServer";

const ADMIN = "admin-1";
const ACTIVATION_APPROVED_AT = "2026-06-30T09:20:00.000Z";
const ACTIVATED_AT = "2026-06-30T09:30:00.000Z";
const PUBLICATION_APPROVED_AT = "2026-06-30T09:40:00.000Z";
const PUBLISHED_AT = "2026-06-30T09:50:00.000Z";

function safeQuestionGuard() {
  return evaluatePublicQuestionGeneralization({
    originalInput: "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
    candidatePublicQuestion:
      "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
    actorContexts: [],
    actorExtraction: {
      status: "complete",
      source: "human_review",
      independentFromCandidateProvider: true,
      evidenceRefs: ["human-review:sichere-schulwege:1"],
      humanReviewFinding: "no_named_actors",
    },
  });
}

function buildRecord(
  overrides: Partial<ParticipationSpacePublishRecord> = {},
): ParticipationSpacePublishRecord {
  return {
    version: 0,
    id: "participation-space-publish:handoff-1",
    sourceHandoffId: "handoff-1",
    sourceReviewItemId: "create_handoff:persisted:handoff-1",
    statementId: "create-handoff:handoff-1",
    participationSpaceId: "participation-space-1",
    participationSpaceSlug: "sichere-schulwege",
    runtimeStatus: "created",
    runtimeVisibility: "active_internal",
    spaceStatus: "review_active",
    spaceVisibility: "review_only",
    title: "Beteiligungsraum Sichere Schulwege",
    workingTitle: "Beteiligungsraum Sichere Schulwege",
    description:
      "Sichere Schulwege sollen als Beteiligungsraum mit klarer Leitfrage weitergeführt werden.",
    participationQuestion:
      "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
    questionGuard: safeQuestionGuard(),
    publicHeadline: "Sichere Schulwege im Blick",
    publicSummary:
      "Der Beteiligungsraum bündelt Hinweise zu Querungen und offenen Prüfpfaden.",
    moderationPolicy:
      "Review-first Veröffentlichung mit expliziter Freigabe, Audit und manueller Moderation.",
    publicFeedbackAvailable: false,
    relatedAnlassraumId: "65a111111111111111111110",
    relatedDossierId: "dossier-sichere-schulwege",
    recognizedStandpoints: ["Kinder brauchen sichere Wege."],
    argumentLines: ["Querungen priorisieren."],
    openQuestions: ["Welche Schulen sind besonders betroffen?"],
    sourceStatus: "source_reviewed",
    communitySignals: [],
    graphReferences: ["topic-graph-1"],
    topicReferences: ["Sichere Schulwege"],
    moderationPending: false,
    unresolvedAbuseSignal: false,
    unresolvedTrustQualityBlocker: false,
    graphContextPending: false,
    dossierContextPending: false,
    anlassraumContextPending: false,
    creationAudited: true,
    status: "draft",
    visibility: "editorial_workspace",
    blockers: ["activation_not_approved", "publication_not_approved"],
    auditContext: {
      actorUserId: ADMIN,
      reason: "Audit vorhanden.",
      origin: "admin_review",
      approvedAt: "2026-06-30T09:10:00.000Z",
    },
    guardrails: {
      createdNotPublic: true,
      approvedForCreationNotPublic: true,
      activeInternalNotPublic: true,
      readyForPublicationReviewNotPublic: true,
      approvedForActivationNotPublic: true,
      approvedForPublicationNotPublicUntilPublish: true,
      noAutoPublishFromCreation: true,
      noAutoActivationFromCreation: true,
      noPublicVisibilitySideEffect: true,
      noVerifiedFactsByDefault: true,
      noVerifiedSourcesByDefault: true,
      noCommunityHintsAsTruth: true,
      noTrustOrSourceQualityAsVerification: true,
      noGraphEdgeAsProof: true,
      noDossierContextAsProof: true,
      noAnlassraumContextAsProof: true,
      noMajorityAsTruth: true,
      noAutoGraphWrite: true,
      noAutoMerge: true,
      auditContextRequired: true,
    },
    createdAt: "2026-06-30T09:00:00.000Z",
    updatedAt: "2026-06-30T09:10:00.000Z",
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

function addAudit(
  record: ParticipationSpacePublishRecord,
  input: {
    action: ParticipationSpacePublishAuditEntry["action"];
    status: ParticipationSpacePublishRecord["status"];
    at: string;
    actorUserId?: string;
  },
): ParticipationSpacePublishRecord {
  const actorUserId = input.actorUserId ?? ADMIN;
  return {
    ...record,
    auditTrail: [
      ...record.auditTrail,
      {
        id: `audit:${input.action}:${input.at}:${actorUserId}`,
        sourceHandoffId: record.sourceHandoffId,
        participationSpaceId: record.participationSpaceId,
        at: input.at,
        action: input.action,
        actorUserId,
        note: "Durable G2 test evidence.",
        blockers: [],
        status: input.status,
      },
    ],
  };
}

function approveActivationWithAudit(
  record: ParticipationSpacePublishRecord,
  at = ACTIVATION_APPROVED_AT,
  actorUserId = ADMIN,
) {
  const approved = approveParticipationSpaceActivation(record, {
    actorUserId,
    reason: "Aktivierung explizit freigegeben.",
    origin: "admin_review",
    approvedAt: at,
  });
  expect(approved.status).toBe("approved_for_activation");
  return addAudit(approved, {
    action: "activation_approved",
    status: "approved_for_activation",
    at,
    actorUserId,
  });
}

function activateWithAudit(
  record: ParticipationSpacePublishRecord,
  at = ACTIVATED_AT,
  actorUserId = ADMIN,
) {
  const result = activateParticipationSpaceAfterReview(record, {
    actorUserId,
    reason: "Interne Aktivierung nach durablem Approval-Audit.",
    origin: "participation_space_publish_workflow",
    approvedAt: at,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("test_activation_failed");
  return addAudit(result.record, {
    action: "activated_internal",
    status: "activated",
    at,
    actorUserId,
  });
}

function approvePublicationWithAudit(
  record: ParticipationSpacePublishRecord,
  at = PUBLICATION_APPROVED_AT,
  actorUserId = ADMIN,
) {
  const approved = approveParticipationSpacePublication(record, {
    actorUserId,
    reason: "Veröffentlichung explizit freigegeben.",
    origin: "admin_review",
    approvedAt: at,
  });
  expect(approved.status).toBe("approved_for_publication");
  return addAudit(approved, {
    action: "publication_approved",
    status: "approved_for_publication",
    at,
    actorUserId,
  });
}

function publishWithAudit(
  record: ParticipationSpacePublishRecord,
  at = PUBLISHED_AT,
  actorUserId = ADMIN,
) {
  const result = publishParticipationSpaceAfterReview(record, {
    actorUserId,
    reason: "Explizite öffentliche Freigabe.",
    origin: "participation_space_publish_workflow",
    approvedAt: at,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("test_publication_failed");
  return addAudit(result.record, {
    action: "published_public",
    status: "published",
    at,
    actorUserId,
  });
}

function buildProcedureQuestionGuard() {
  return evaluatePublicQuestionGeneralization({
    originalInput:
      "Die Stadtwerke GmbH beantragt ein formales Genehmigungsverfahren.",
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
  it("carries unsafe original input into the publication blocker set", () => {
    const questionGuard = evaluatePublicQuestionGeneralization({
      originalInput: "Sollen wir diese Gruppe verprügeln?",
      candidatePublicQuestion: "Welche Maßnahmen sollten Konflikte friedlich lösen?",
      actorContexts: [],
      actorExtraction: {
        status: "complete",
        source: "human_review",
        independentFromCandidateProvider: true,
        evidenceRefs: ["human-review:safety:1"],
        humanReviewFinding: "no_named_actors",
      },
    });
    const record = buildRecord({ questionGuard });

    expect(questionGuard.releaseState).toBe("blocked");
    expect(getParticipationSpacePublishBlockers(record)).toContain(
      "public_question_guard_blocked",
    );
  });

  it("blocks activation and publication while question review remains unresolved", () => {
    const questionGuard = evaluatePublicQuestionGeneralization({
      originalInput: "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "create_analysis",
        independentFromCandidateProvider: false,
        evidenceRefs: [],
      },
    });
    const record = buildRecord({ questionGuard });

    expect(questionGuard.releaseState).toBe("review_required");
    expect(getParticipationSpacePublishBlockers(record)).toContain(
      "public_question_guard_blocked",
    );
    expect(
      approveParticipationSpaceActivation(record, {
        actorUserId: ADMIN,
        reason: "Darf nicht freigeben.",
        origin: "admin_review",
        approvedAt: ACTIVATION_APPROVED_AT,
      }).status,
    ).toBe("blocked");
  });

  it("resolves procedure-specific review only through explicit human evidence", () => {
    const questionGuard = buildProcedureQuestionGuard();
    const record = buildRecord({
      description: questionGuard.originalInput,
      participationQuestion: questionGuard.candidatePublicQuestion,
      questionGuard,
      approvedForActivationAt: "2026-06-30T09:05:00.000Z",
      approvedForActivationBy: "admin-before-review",
      approvedForPublicationAt: "2026-06-30T09:10:00.000Z",
      approvedForPublicationBy: "admin-before-review",
    });

    const registryReviewed = reviewParticipationSpaceQuestionGuard(record, {
      actorExtractionSource: "entity_registry",
      evidenceRefs: ["registry:stadtwerke:1"],
    });
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
    expect(humanReviewed.approvedForActivationAt).toBeNull();
    expect(humanReviewed.approvedForPublicationAt).toBeNull();
    expect(humanReviewed.status).toBe("draft");
  });

  it("invalidates old approvals and keeps review fail-closed until durable audit", async () => {
    const unresolved = evaluatePublicQuestionGeneralization({
      originalInput: "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
      actorContexts: [],
    });
    const record = buildRecord({
      questionGuard: unresolved,
      status: "approved_for_publication",
      visibility: "ready_for_publication_review",
      approvedForActivationAt: "2026-06-30T09:05:00.000Z",
      approvedForActivationBy: "admin-before-review",
      approvedForPublicationAt: "2026-06-30T09:10:00.000Z",
      approvedForPublicationBy: "admin-before-review",
    });
    const reviewed = reviewParticipationSpaceQuestionGuard(record, {
      actorExtractionSource: "human_review",
      evidenceRefs: ["human-review:question-guard-1"],
      noNamedActorsConfirmed: true,
      reviewedAt: "2026-06-30T09:15:00.000Z",
    });

    expect(reviewed.questionGuard.releaseState).toBe("draft_allowed");
    expect(reviewed.approvedForActivationAt).toBeNull();
    expect(reviewed.approvedForPublicationAt).toBeNull();
    expect(
      activateParticipationSpaceAfterReview(reviewed, {
        actorUserId: ADMIN,
        approvedAt: "2026-06-30T09:16:00.000Z",
      }).ok,
    ).toBe(false);

    let persistedRecord = record;
    let auditPersisted = false;
    const reviewReservation = {
      ...reviewed,
      questionGuard: holdQuestionGuardForSerializedReview(record.questionGuard),
    };
    const persistRecord = async (next: ParticipationSpacePublishRecord) => {
      persistedRecord = { ...next, version: persistedRecord.version + 1 };
      return persistedRecord;
    };

    await expect(
      persistQuestionGuardReviewFailClosed({
        reviewReservation,
        auditEntry: { action: "question_guard_reviewed" },
        persistRecord,
        persistAudit: async () => {
          throw new Error("simulated_audit_failure");
        },
        buildReleasedRecord: (reservation) => ({
          ...reviewed,
          version: reservation.version,
        }),
      }),
    ).rejects.toThrow("simulated_audit_failure");
    expect(persistedRecord.questionGuard.releaseState).toBe("review_required");

    await persistQuestionGuardReviewFailClosed({
      reviewReservation: { ...reviewReservation, version: persistedRecord.version },
      auditEntry: { action: "question_guard_reviewed" },
      persistRecord,
      persistAudit: async () => {
        auditPersisted = true;
      },
      buildReleasedRecord: (reservation) => ({
        ...reviewed,
        version: reservation.version,
      }),
    });
    expect(auditPersisted).toBe(true);
    expect(persistedRecord.questionGuard.releaseState).toBe("draft_allowed");
  });

  it("executes the normal release chain only with durable evidence at every step", () => {
    const approvedActivation = approveActivationWithAudit(buildRecord());
    expect(
      getParticipationSpacePublishBlockers(approvedActivation, "activation"),
    ).not.toContain("release_audit_missing");

    const activated = activateWithAudit(approvedActivation);
    expect(activated.status).toBe("activated");
    expect(activated.visibility).toBe("active_internal");
    expect(activated.spaceVisibility).toBe("review_only");

    const approvedPublication = approvePublicationWithAudit(activated);
    expect(canPublishParticipationSpace(approvedPublication)).toBe(true);

    const published = publishWithAudit(approvedPublication);
    expect(published.status).toBe("published");
    expect(published.visibility).toBe("public");
    expect(published.spaceVisibility).toBe("public_read_only");
    expect(getParticipationSpacePublishBlockers(published, "publication")).toEqual(
      [],
    );
  });

  it("serializes review against stale approval, activation and publication writes", async () => {
    const approvalRepo = createInMemoryParticipationSpaceRuntimeRepository();
    const approvalBase = buildRecord();
    await approvalRepo.savePublishRecord(approvalBase);
    const staleApproval = approveParticipationSpaceActivation(approvalBase, {
      actorUserId: "admin-stale",
      reason: "Stale approval.",
      origin: "admin_review",
      approvedAt: "2026-06-30T10:01:00.000Z",
    });
    const reviewedApproval = await approvalRepo.compareAndSwapPublishRecord({
      record: reviewParticipationSpaceQuestionGuard(approvalBase, {
        actorExtractionSource: "human_review",
        evidenceRefs: ["human-review:approval-race"],
        noNamedActorsConfirmed: true,
      }),
      expectedVersion: approvalBase.version,
    });
    await expect(
      approvalRepo.compareAndSwapPublishRecord({
        record: staleApproval,
        expectedVersion: approvalBase.version,
      }),
    ).rejects.toThrow("participation_space_publish_state_conflict");
    expect(reviewedApproval.approvedForActivationAt).toBeNull();

    const activationRepo = createInMemoryParticipationSpaceRuntimeRepository();
    const activationBase = approveActivationWithAudit(buildRecord());
    await activationRepo.savePublishRecord(activationBase);
    const staleActivation = activateParticipationSpaceAfterReview(activationBase, {
      actorUserId: "admin-stale",
      approvedAt: "2026-06-30T10:02:00.000Z",
    });
    expect(staleActivation.ok).toBe(true);
    await activationRepo.compareAndSwapPublishRecord({
      record: reviewParticipationSpaceQuestionGuard(activationBase, {
        actorExtractionSource: "human_review",
        evidenceRefs: ["human-review:activation-race"],
        noNamedActorsConfirmed: true,
      }),
      expectedVersion: activationBase.version,
    });
    if (!staleActivation.ok) throw new Error("test_stale_activation_failed");
    await expect(
      activationRepo.compareAndSwapPublishRecord({
        record: staleActivation.record,
        expectedVersion: activationBase.version,
      }),
    ).rejects.toThrow("participation_space_publish_state_conflict");

    const publishRepo = createInMemoryParticipationSpaceRuntimeRepository();
    const publishBase = approvePublicationWithAudit(
      activateWithAudit(approveActivationWithAudit(buildRecord())),
    );
    await publishRepo.savePublishRecord(publishBase);
    const stalePublish = publishParticipationSpaceAfterReview(publishBase, {
      actorUserId: "admin-stale",
      approvedAt: "2026-06-30T10:03:00.000Z",
    });
    expect(stalePublish.ok).toBe(true);
    await publishRepo.compareAndSwapPublishRecord({
      record: reviewParticipationSpaceQuestionGuard(publishBase, {
        actorExtractionSource: "human_review",
        evidenceRefs: ["human-review:publish-race"],
        noNamedActorsConfirmed: true,
      }),
      expectedVersion: publishBase.version,
    });
    if (!stalePublish.ok) throw new Error("test_stale_publish_failed");
    await expect(
      publishRepo.compareAndSwapPublishRecord({
        record: stalePublish.record,
        expectedVersion: publishBase.version,
      }),
    ).rejects.toThrow("participation_space_publish_state_conflict");
  });

  it("preserves the CAS version chain on an audited normal path", async () => {
    const repo = createInMemoryParticipationSpaceRuntimeRepository();
    const base = buildRecord();
    await repo.savePublishRecord(base);

    const reviewed = await repo.compareAndSwapPublishRecord({
      record: reviewParticipationSpaceQuestionGuard(base, {
        actorExtractionSource: "human_review",
        evidenceRefs: ["human-review:normal-path"],
        noNamedActorsConfirmed: true,
      }),
      expectedVersion: base.version,
    });

    let approved = approveActivationWithAudit(
      reviewed,
      "2026-06-30T10:10:00.000Z",
      "admin-current",
    );
    approved = await repo.compareAndSwapPublishRecord({
      record: approved,
      expectedVersion: reviewed.version,
    });

    let activated = activateWithAudit(
      approved,
      "2026-06-30T10:11:00.000Z",
      "admin-current",
    );
    activated = await repo.compareAndSwapPublishRecord({
      record: activated,
      expectedVersion: approved.version,
    });

    let publicationApproval = approvePublicationWithAudit(
      activated,
      "2026-06-30T10:12:00.000Z",
      "admin-current",
    );
    publicationApproval = await repo.compareAndSwapPublishRecord({
      record: publicationApproval,
      expectedVersion: activated.version,
    });

    let published = publishWithAudit(
      publicationApproval,
      "2026-06-30T10:13:00.000Z",
      "admin-current",
    );
    published = await repo.compareAndSwapPublishRecord({
      record: published,
      expectedVersion: publicationApproval.version,
    });

    expect(published.status).toBe("published");
    expect(published.version).toBe(5);
  });

  it("keeps created and internally activated spaces non-public", () => {
    const draft = buildRecord();
    expect(draft.status).toBe("draft");
    expect(draft.visibility).toBe("editorial_workspace");
    expect(blocksParticipationSpaceAutoPublish(draft)).toBe(false);
    expect(blocksUnsafePublicVisibility(draft)).toBe(false);

    const activated = activateWithAudit(approveActivationWithAudit(draft));
    expect(activated.status).toBe("activated");
    expect(activated.visibility).toBe("active_internal");
    expect(activated.visibility).not.toBe("public");
    expect(blocksParticipationSpaceAutoActivation(activated)).toBe(false);
    expect(blocksUnsafePublicVisibility(activated)).toBe(false);
  });

  it("requires activation before publication approval and separate publication", () => {
    const draft = buildRecord();
    expect(canApproveParticipationSpacePublication(draft)).toBe(false);
    expect(canPublishParticipationSpace(draft)).toBe(false);

    const activated = activateWithAudit(approveActivationWithAudit(draft));
    const publicationApproval = approvePublicationWithAudit(activated);
    expect(publicationApproval.visibility).toBe("ready_for_publication_review");
    expect(publicationApproval.visibility).not.toBe("public");
    expect(canPublishParticipationSpace(publicationApproval)).toBe(true);

    const published = publishWithAudit(publicationApproval);
    expect(published.visibility).toBe("public");
  });

  it("blocks publication on source, moderation, abuse and trust blockers", () => {
    const blocked = buildRecord({
      sourceStatus: "source_review_pending",
      moderationPending: true,
      unresolvedAbuseSignal: true,
      unresolvedTrustQualityBlocker: true,
    });
    const blockers = getParticipationSpacePublishBlockers(
      blocked,
      "publication_approval",
    );
    expect(blockers).toEqual(
      expect.arrayContaining([
        "source_review_pending",
        "moderation_pending",
        "unresolved_abuse_signal",
        "unresolved_trust_quality_blocker",
      ]),
    );
  });

  it("blocks publication when public copy or moderation policy are missing", () => {
    const activated = activateWithAudit(approveActivationWithAudit(buildRecord()));
    const blocked = {
      ...activated,
      publicHeadline: "",
      publicSummary: "",
      moderationPolicy: null,
    };
    const blockers = getParticipationSpacePublishBlockers(
      blocked,
      "publication_approval",
    );
    expect(blockers).toContain("public_copy_missing");
    expect(blockers).toContain("moderation_policy_missing");
    expect(canApproveParticipationSpacePublication(blocked)).toBe(false);
  });

  it("keeps context as review hints and preserves all no-auto guardrails", () => {
    const record = buildRecord();
    expect(record.guardrails.noCommunityHintsAsTruth).toBe(true);
    expect(record.guardrails.noTrustOrSourceQualityAsVerification).toBe(true);
    expect(record.guardrails.noGraphEdgeAsProof).toBe(true);
    expect(record.guardrails.noDossierContextAsProof).toBe(true);
    expect(record.guardrails.noAnlassraumContextAsProof).toBe(true);
    expect(record.guardrails.noMajorityAsTruth).toBe(true);
    expect(record.guardrails.noAutoActivationFromCreation).toBe(true);
    expect(record.guardrails.noAutoPublishFromCreation).toBe(true);
    expect(record.guardrails.noAutoGraphWrite).toBe(true);
    expect(record.guardrails.noAutoMerge).toBe(true);
    expect(record.guardrails.auditContextRequired).toBe(true);
  });
});
