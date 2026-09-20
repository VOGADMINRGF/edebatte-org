import { describe, expect, it } from "vitest";
import {
  buildQrQuestionGuardAuditEntry,
  evaluateQrQuestionSetQuestion,
  isQrQuestionSetPubliclyReleased,
  isQrQuestionSetReadyForActivation,
  reviewQrQuestionSetQuestion,
} from "@/features/create/qrQuestionSetGuard";

describe("QR question set public release guard", () => {
  const question = "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?";

  function allowedGuard() {
    return evaluateQrQuestionSetQuestion({
      question,
      actorExtraction: {
        status: "complete",
        source: "actor_graph",
        independentFromCandidateProvider: true,
        evidenceRefs: ["actor-graph:qr:1"],
      },
    });
  }

  it("fails closed until a current reviewed guard and revision-bound review audit exist", () => {
    const guard = allowedGuard();
    expect(guard.releaseState).toBe("draft_allowed");

    const questions = [{ id: "q-1", questionGuard: guard }];
    const reviewAudit = buildQrQuestionGuardAuditEntry({
      id: "review:v1",
      action: "question_guard_reviewed",
      actorUserId: "admin-1",
      at: new Date("2026-09-20T00:00:00.000Z"),
      fromVersion: 0,
      toVersion: 1,
      questions,
    });

    expect(
      isQrQuestionSetReadyForActivation({
        status: "ready_for_activation",
        activationState: "ready_for_activation",
        questionGuardReviewState: "reviewed",
        version: 1,
        questions,
      }),
    ).toBe(false);

    expect(
      isQrQuestionSetReadyForActivation({
        status: "ready_for_activation",
        activationState: "ready_for_activation",
        questionGuardReviewState: "reviewed",
        version: 1,
        questions,
        lastQuestionGuardReviewAudit: reviewAudit,
      }),
    ).toBe(true);
  });

  it("requires an activation audit linked to the reviewed revision before public release", () => {
    const guard = allowedGuard();
    const questions = [{ id: "q-1", questionGuard: guard }];
    const reviewAudit = buildQrQuestionGuardAuditEntry({
      id: "review:v1",
      action: "question_guard_reviewed",
      actorUserId: "admin-1",
      at: new Date("2026-09-20T00:00:00.000Z"),
      fromVersion: 0,
      toVersion: 1,
      questions,
    });
    const activationAudit = buildQrQuestionGuardAuditEntry({
      id: "activate:v2",
      action: "qr_question_set_activation_approved",
      actorUserId: "admin-1",
      at: new Date("2026-09-20T00:01:00.000Z"),
      fromVersion: 1,
      toVersion: 2,
      questions,
      reviewAuditId: reviewAudit.id,
      evidenceRefs: [reviewAudit.id],
    });

    const active = {
      status: "active",
      activationState: "active",
      questionGuardReviewState: "reviewed",
      version: 2,
      questions,
      lastQuestionGuardReviewAudit: reviewAudit,
      lastActivationAudit: activationAudit,
    };

    expect(isQrQuestionSetPubliclyReleased(active)).toBe(true);
    expect(isQrQuestionSetPubliclyReleased({ ...active, lastActivationAudit: null })).toBe(false);
    expect(
      isQrQuestionSetPubliclyReleased({
        ...active,
        lastActivationAudit: { ...activationAudit, toVersion: 3 },
      }),
    ).toBe(false);
    expect(
      isQrQuestionSetPubliclyReleased({
        ...active,
        lastActivationAudit: { ...activationAudit, reviewAuditId: "other-review" },
      }),
    ).toBe(false);
  });

  it("keeps unresolved, stale and actor-targeting questions fail closed", () => {
    const pending = evaluateQrQuestionSetQuestion({ question });
    expect(pending.releaseState).toBe("review_required");

    const reviewed = reviewQrQuestionSetQuestion({
      question,
      previousGuard: pending,
      actorContexts: [],
      evidenceRefs: ["human-review:qr:actor-free"],
      noNamedActorsConfirmed: true,
    });
    expect(reviewed.releaseState).toBe("draft_allowed");

    const targetedQuestion = "Soll Acme GmbH den Standort schließen?";
    const targeted = reviewQrQuestionSetQuestion({
      question: targetedQuestion,
      previousGuard: evaluateQrQuestionSetQuestion({ question: targetedQuestion }),
      actorContexts: [
        {
          id: "company:acme",
          name: "Acme GmbH",
          type: "company",
          role: "target",
          evidenceRefs: ["registry:company:acme"],
        },
      ],
      evidenceRefs: ["human-review:company:acme"],
    });
    expect(targeted.releaseState).not.toBe("draft_allowed");
  });

  it("blocks fact/truth and unsafe questions before QR release", () => {
    expect(
      evaluateQrQuestionSetQuestion({
        question: "Stimmt es, dass die Emissionen seit 2020 gesunken sind?",
      }).releaseState,
    ).toBe("blocked");
    expect(
      evaluateQrQuestionSetQuestion({ question: "Sollen wir diese Gruppe verprügeln?" })
        .releaseState,
    ).toBe("blocked");
  });
});
