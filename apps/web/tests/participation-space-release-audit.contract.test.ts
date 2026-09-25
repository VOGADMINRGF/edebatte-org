import { describe, expect, it } from "vitest";
import {
  canActivateParticipationSpace,
  getParticipationSpacePublishBlockers,
  type ParticipationSpacePublishAuditEntry,
  type ParticipationSpacePublishRecord,
} from "@/features/create/participationSpacePublishWorkflow";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";
import { bindQuestionGuardToCurrentContract } from "@/features/create/safety/questionGuardReviewPersistence";
import {
  isParticipationQuestionGuardCurrent,
  isPublicParticipationSpace,
} from "@/features/participation/publicParticipationSpaceRuntime";

function audit(
  action: ParticipationSpacePublishAuditEntry["action"],
  status: ParticipationSpacePublishRecord["status"],
  at: string,
  actorUserId = "admin-1",
): ParticipationSpacePublishAuditEntry {
  return {
    id: `audit:${action}:${at}`,
    sourceHandoffId: "handoff-g2-audit",
    participationSpaceId: "participation-space-g2-audit",
    at,
    action,
    actorUserId,
    note: "G2 release evidence",
    blockers: [],
    status,
  };
}

function buildRecord(
  overrides: Partial<ParticipationSpacePublishRecord> = {},
): ParticipationSpacePublishRecord {
  const activationApprovedAt = "2026-09-17T10:00:00.000Z";
  const activatedAt = "2026-09-17T10:05:00.000Z";
  const publicationApprovedAt = "2026-09-17T10:10:00.000Z";
  const publishedAt = "2026-09-17T10:15:00.000Z";

  return {
    version: 4,
    id: "participation-space-publish:handoff-g2-audit",
    sourceHandoffId: "handoff-g2-audit",
    sourceReviewItemId: "create_handoff:persisted:handoff-g2-audit",
    statementId: "create-handoff:handoff-g2-audit",
    participationSpaceId: "participation-space-g2-audit",
    participationSpaceSlug: "g2-release-audit",
    runtimeStatus: "created",
    runtimeVisibility: "public",
    spaceStatus: "feedback_prepared",
    spaceVisibility: "public_read_only",
    title: "G2 Release Audit",
    workingTitle: "G2 Release Audit",
    description: "Geprüfter Beteiligungsraum für den G2 Release-Audit-Contract.",
    participationQuestion: "Welche Maßnahme soll zuerst umgesetzt werden?",
    questionGuard: bindQuestionGuardToCurrentContract(
      evaluatePublicQuestionGeneralization({
        originalInput: "Welche Maßnahme soll zuerst umgesetzt werden?",
        actorContexts: [],
        actorExtraction: {
          status: "complete",
          source: "human_review",
          independentFromCandidateProvider: true,
          evidenceRefs: ["human-review:g2-release-audit"],
          humanReviewFinding: "no_named_actors",
        },
      }),
    ),
    publicHeadline: "Geprüfte Beteiligungsfrage",
    publicSummary: "Öffentliche Fassung nach separater Freigabe.",
    moderationPolicy: "Review-first mit expliziter Freigabe und Audit.",
    publicFeedbackAvailable: false,
    relatedAnlassraumId: null,
    relatedDossierId: null,
    recognizedStandpoints: [],
    argumentLines: [],
    openQuestions: [],
    sourceStatus: "source_reviewed",
    communitySignals: [],
    graphReferences: [],
    topicReferences: [],
    moderationPending: false,
    unresolvedAbuseSignal: false,
    unresolvedTrustQualityBlocker: false,
    graphContextPending: false,
    dossierContextPending: false,
    anlassraumContextPending: false,
    creationAudited: true,
    status: "published",
    visibility: "public",
    blockers: [],
    auditContext: {
      actorUserId: "admin-1",
      reason: "Explizit veröffentlicht.",
      origin: "participation_space_publish_workflow",
      approvedAt: publishedAt,
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
    createdAt: "2026-09-17T09:00:00.000Z",
    updatedAt: publishedAt,
    auditTrail: [
      audit(
        "activation_approved",
        "approved_for_activation",
        activationApprovedAt,
      ),
      audit("activated_internal", "activated", activatedAt),
      audit(
        "publication_approved",
        "approved_for_publication",
        publicationApprovedAt,
      ),
      audit("published_public", "published", publishedAt),
    ],
    approvedForActivationAt: activationApprovedAt,
    approvedForActivationBy: "admin-1",
    approvedForPublicationAt: publicationApprovedAt,
    approvedForPublicationBy: "admin-1",
    rejectedAt: null,
    rejectedBy: null,
    ...overrides,
  };
}

describe("G2 participation release audit contract", () => {
  it("blocks an approved activation until matching durable approval audit exists", () => {
    const record = buildRecord({
      status: "approved_for_activation",
      visibility: "editorial_workspace",
      spaceStatus: "review_active",
      spaceVisibility: "review_only",
      approvedForPublicationAt: null,
      approvedForPublicationBy: null,
      updatedAt: "2026-09-17T10:00:00.000Z",
      auditTrail: [],
    });

    expect(canActivateParticipationSpace(record)).toBe(false);
    expect(getParticipationSpacePublishBlockers(record, "activation")).toContain(
      "release_audit_missing",
    );

    const withAudit = {
      ...record,
      auditTrail: [
        audit(
          "activation_approved",
          "approved_for_activation",
          record.approvedForActivationAt!,
        ),
      ],
    };

    expect(canActivateParticipationSpace(withAudit)).toBe(true);
    expect(
      getParticipationSpacePublishBlockers(withAudit, "activation"),
    ).not.toContain("release_audit_missing");
  });

  it("fails public read closed when any release audit evidence is missing", () => {
    const fullyAudited = buildRecord();
    expect(isPublicParticipationSpace(fullyAudited)).toBe(true);

    for (const action of [
      "activation_approved",
      "activated_internal",
      "publication_approved",
      "published_public",
    ] as const) {
      const missingOne = buildRecord({
        auditTrail: fullyAudited.auditTrail.filter(
          (entry) => entry.action !== action,
        ),
      });
      expect(
        getParticipationSpacePublishBlockers(missingOne, "publication"),
      ).toContain("release_audit_missing");
      expect(isPublicParticipationSpace(missingOne)).toBe(false);
    }
  });

  it("rejects stale or mismatched approval audit evidence", () => {
    const record = buildRecord({
      status: "approved_for_activation",
      visibility: "editorial_workspace",
      spaceStatus: "review_active",
      spaceVisibility: "review_only",
      approvedForPublicationAt: null,
      approvedForPublicationBy: null,
      updatedAt: "2026-09-17T10:00:00.000Z",
      auditTrail: [
        audit(
          "activation_approved",
          "approved_for_activation",
          "2026-09-17T09:59:59.000Z",
          "admin-other",
        ),
      ],
    });

    expect(canActivateParticipationSpace(record)).toBe(false);
    expect(getParticipationSpacePublishBlockers(record, "activation")).toContain(
      "release_audit_missing",
    );
  });

  it("rejects the same question when G1 contract evidence is missing", () => {
    const unboundGuard = evaluatePublicQuestionGeneralization({
      originalInput: "Welche Maßnahme soll zuerst umgesetzt werden?",
      candidatePublicQuestion: "Welche Maßnahme soll zuerst umgesetzt werden?",
      actorContexts: [],
      actorExtraction: {
        status: "complete",
        source: "human_review",
        independentFromCandidateProvider: true,
        evidenceRefs: ["human-review:g2-release-audit"],
        humanReviewFinding: "no_named_actors",
      },
    });
    const staleContract = buildRecord({ questionGuard: unboundGuard });

    expect(staleContract.questionGuard.candidatePublicQuestion).toBe(
      staleContract.participationQuestion,
    );
    expect(isParticipationQuestionGuardCurrent(staleContract)).toBe(false);
    expect(
      getParticipationSpacePublishBlockers(staleContract, "publication"),
    ).toContain("public_question_guard_blocked");
    expect(isPublicParticipationSpace(staleContract)).toBe(false);
  });

  it("rejects a published record when the guarded candidate no longer matches the participation question", () => {
    const current = buildRecord();
    expect(isParticipationQuestionGuardCurrent(current)).toBe(true);
    expect(isPublicParticipationSpace(current)).toBe(true);

    const staleGuard = buildRecord({
      participationQuestion:
        "Welche vollständig andere Maßnahme soll stattdessen umgesetzt werden?",
    });

    expect(staleGuard.questionGuard.releaseState).toBe("draft_allowed");
    expect(isParticipationQuestionGuardCurrent(staleGuard)).toBe(false);
    expect(isPublicParticipationSpace(staleGuard)).toBe(false);
  });
});
