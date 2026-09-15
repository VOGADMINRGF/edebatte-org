import { describe, expect, it } from "vitest";
import {
  evaluateQrQuestionSetQuestion,
  isQrQuestionSetPubliclyReleased,
  isQrQuestionSetReadyForActivation,
  reviewQrQuestionSetQuestion,
} from "@/features/create/qrQuestionSetGuard";

describe("QR question set public-question guard", () => {
  it("fails closed without an independent staff review", () => {
    const result = evaluateQrQuestionSetQuestion({
      question: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
    });

    expect(result.outcome).toBe("actor_extraction_review_required");
    expect(result.releaseState).toBe("review_required");
  });

  it("fails closed for legacy active sets and for every partial or unresolved guard", () => {
    const allowedGuard = evaluateQrQuestionSetQuestion({
      question: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
      actorExtraction: {
        status: "complete",
        source: "actor_graph",
        independentFromCandidateProvider: true,
        evidenceRefs: ["actor-graph:qr:1"],
      },
    });
    const pendingGuard = evaluateQrQuestionSetQuestion({
      question: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
    });

    expect(
      isQrQuestionSetPubliclyReleased({
        status: "active",
        questions: [{ id: "legacy-question" }],
      }),
    ).toBe(false);
    expect(
      isQrQuestionSetPubliclyReleased({
        status: "active",
        questions: [{ id: "guarded", questionGuard: allowedGuard }],
      }),
    ).toBe(true);
    expect(
      isQrQuestionSetPubliclyReleased({
        status: "active",
        questions: [{ id: "guarded", questionGuard: pendingGuard }],
      }),
    ).toBe(false);
    expect(
      isQrQuestionSetPubliclyReleased({
        status: "active",
        questions: [
          { id: "guarded", questionGuard: allowedGuard },
          { id: "unguarded" },
        ],
      }),
    ).toBe(false);
  });

  it("requires reviewed full guard coverage before the explicit activation transition", () => {
    expect(
      isQrQuestionSetReadyForActivation({
        status: "ready_for_activation",
        questionGuardReviewState: "reviewed",
        questions: [
          {
            id: "reviewed-without-activation-state",
            questionGuard: { releaseState: "draft_allowed" },
          },
        ],
      }),
    ).toBe(false);
    expect(
      isQrQuestionSetReadyForActivation({
        status: "ready_for_activation",
        questionGuardReviewState: "reviewed",
        activationState: "ready_for_activation",
        questions: [{ id: "unguarded" }],
      }),
    ).toBe(false);
    expect(
      isQrQuestionSetReadyForActivation({
        status: "ready_for_activation",
        questionGuardReviewState: "reviewed",
        activationState: "ready_for_activation",
        questions: [
          {
            id: "pending",
            questionGuard: { releaseState: "review_required" },
          },
        ],
      }),
    ).toBe(false);
    expect(
      isQrQuestionSetReadyForActivation({
        status: "ready_for_activation",
        questionGuardReviewState: "reviewed",
        activationState: "ready_for_activation",
        questions: [
          {
            id: "reviewed",
            questionGuard: { releaseState: "draft_allowed" },
          },
        ],
      }),
    ).toBe(true);
  });

  it("does not treat staff identity alone as independent extraction evidence", () => {
    const result = evaluateQrQuestionSetQuestion({
      question: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
      staffReviewerId: "admin-1",
    });

    expect(result.releaseState).toBe("review_required");
    expect(result.reasons).toContain("actor_extraction_not_independently_complete");
  });

  it("allows a general decision question with independently complete extraction evidence", () => {
    const result = evaluateQrQuestionSetQuestion({
      question: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
      actorContexts: [],
      actorExtraction: {
        status: "complete",
        source: "actor_graph",
        independentFromCandidateProvider: true,
        evidenceRefs: ["actor-graph-run-1"],
      },
    });

    expect(result.releaseState).toBe("draft_allowed");
  });

  it("requires an explicit auditable no-actor finding for actor-free human review", () => {
    const question = "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?";
    const previousGuard = evaluateQrQuestionSetQuestion({ question });

    expect(() =>
      reviewQrQuestionSetQuestion({
        question,
        previousGuard,
        actorContexts: [],
        evidenceRefs: ["human-review:qr:actor-free"],
      }),
    ).toThrow("public_question_guard_actor_finding_required");

    const reviewed = reviewQrQuestionSetQuestion({
      question,
      previousGuard,
      actorContexts: [],
      evidenceRefs: ["human-review:qr:actor-free"],
      noNamedActorsConfirmed: true,
    });
    expect(reviewed.releaseState).toBe("draft_allowed");
    expect(reviewed.actorExtraction.humanReviewFinding).toBe("no_named_actors");
  });

  it.each([
    ["person", "Max Mustermann", "Soll Max Mustermann die Arbeitsgruppe leiten?", "personal_targeting_blocked"],
    ["company", "Acme GmbH", "Soll Acme GmbH den Standort schließen?", "named_actor_targeting_review_required"],
    ["party", "Beispielpartei", "Soll Beispielpartei den Vorschlag zurückziehen?", "named_actor_targeting_review_required"],
  ] as const)(
    "persists %s actor context and keeps unsafe targeting gated",
    (type, name, question, outcome) => {
      const reviewed = reviewQrQuestionSetQuestion({
        question,
        previousGuard: evaluateQrQuestionSetQuestion({ question }),
        actorContexts: [
          {
            id: `actor:${type}`,
            name,
            type,
            role: "target",
            evidenceRefs: [`registry:${type}:1`],
          },
        ],
        evidenceRefs: [`human-review:${type}:1`],
      });

      expect(reviewed.outcome).toBe(outcome);
      expect(reviewed.releaseState).not.toBe("draft_allowed");
      expect(reviewed.actorContexts[0]).toMatchObject({ name, type, role: "target" });
      expect(reviewed.actorExtraction.humanReviewFinding).toBe(
        "actor_contexts_supplied",
      );
    },
  );

  it("keeps a necessary entity binding for a reviewed procedure case", () => {
    const question =
      "Soll der Acme GmbH die Genehmigung für das beantragte Wärmenetz erteilt werden?";
    const reviewed = reviewQrQuestionSetQuestion({
      question,
      previousGuard: evaluateQrQuestionSetQuestion({ question }),
      actorContexts: [
        {
          id: "company:acme",
          name: "Acme GmbH",
          type: "company",
          role: "procedure_subject",
          evidenceRefs: ["permit:acme:1"],
        },
      ],
      evidenceRefs: ["human-review:permit:acme:1"],
      procedure: {
        kind: "permit",
        entityBindingNecessary: true,
        evidenceRefs: ["permit:acme:1"],
      },
    });

    expect(reviewed.outcome).toBe("entity_specific_procedure_review_resolved");
    expect(reviewed.releaseState).toBe("draft_allowed");
    expect(reviewed.actorContexts[0].role).toBe("procedure_subject");
  });

  it.each([
    ["Stimmt es, dass die Emissionen seit 2020 gesunken sind?", "fact_or_truth_question_blocked"],
    ["Sollen wir diese Gruppe verprügeln?", "safety_blocked"],
  ])("keeps %s blocked before QR activation", (question, outcome) => {
    const result = evaluateQrQuestionSetQuestion({
      question,
    });

    expect(result.outcome).toBe(outcome);
    expect(result.releaseState).toBe("blocked");
  });
});
