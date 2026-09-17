import { describe, expect, it } from "vitest";
import {
  bindQuestionGuardToCurrentContract,
  holdQuestionGuardForSerializedReview,
  isCurrentPublicQuestionGuardContractVersion,
  isQuestionGuardBoundToCurrentContract,
  normalizeWorkflowRecordVersion,
  persistQuestionGuardReviewFailClosed,
  PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_REF,
  PUBLIC_QUESTION_GUARD_CONTRACT_VERSION,
} from "@/features/create/safety/questionGuardReviewPersistence";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";

function allowedGuard() {
  return evaluatePublicQuestionGeneralization({
    originalInput: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
    actorContexts: [],
    actorExtraction: {
      status: "complete",
      source: "actor_graph",
      independentFromCandidateProvider: true,
      evidenceRefs: ["actor-graph:1"],
    },
  });
}

describe("question guard review persistence contract", () => {
  it("binds persisted guard evidence to one canonical G1 policy version", () => {
    expect(PUBLIC_QUESTION_GUARD_CONTRACT_VERSION).toBe(
      "public_question_guard.v1",
    );
    expect(PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_REF).toBe(
      "question-guard-contract:public_question_guard.v1",
    );
    expect(
      isCurrentPublicQuestionGuardContractVersion(
        PUBLIC_QUESTION_GUARD_CONTRACT_VERSION,
      ),
    ).toBe(true);
    expect(
      isCurrentPublicQuestionGuardContractVersion("public_question_guard.v0"),
    ).toBe(false);

    const unbound = allowedGuard();
    expect(isQuestionGuardBoundToCurrentContract(unbound)).toBe(false);
    expect(isQuestionGuardBoundToCurrentContract(undefined)).toBe(false);

    const bound = bindQuestionGuardToCurrentContract(unbound);
    expect(isQuestionGuardBoundToCurrentContract(bound)).toBe(true);
    expect(bound.evidenceRefs).toContain("actor-graph:1");
    expect(bound.evidenceRefs).toContain(
      PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_REF,
    );

    const rebound = bindQuestionGuardToCurrentContract({
      ...bound,
      evidenceRefs: [
        ...bound.evidenceRefs,
        "question-guard-contract:public_question_guard.v0",
      ],
    });
    expect(rebound.evidenceRefs).toContain(
      PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_REF,
    );
    expect(rebound.evidenceRefs).not.toContain(
      "question-guard-contract:public_question_guard.v0",
    );
  });

  it("normalizes workflow versions conservatively", () => {
    expect(normalizeWorkflowRecordVersion(3)).toBe(3);
    expect(normalizeWorkflowRecordVersion("4")).toBe(4);
    expect(normalizeWorkflowRecordVersion(-1)).toBe(0);
    expect(normalizeWorkflowRecordVersion(1.5)).toBe(0);
    expect(normalizeWorkflowRecordVersion("invalid")).toBe(0);
    expect(normalizeWorkflowRecordVersion(null)).toBe(0);
  });

  it("holds an otherwise allowed guard in serialized review", () => {
    const held = holdQuestionGuardForSerializedReview(allowedGuard());

    expect(held.releaseState).toBe("review_required");
    expect(held.requiresHumanReview).toBe(true);
    expect(held.noAutoPublish).toBe(true);
    expect(held.reasons).toContain(
      "Die Question-Guard-Reevaluation ist reserviert und noch nicht auditgestützt freigegeben.",
    );
  });

  it("persists reservation, side effect and audit before release", async () => {
    type Record = { id: string; releaseState: "review_required" | "draft_allowed" };
    type Audit = { id: string };

    const events: string[] = [];
    const reviewReservation: Record = { id: "record-1", releaseState: "review_required" };
    const auditEntry: Audit = { id: "audit-1" };

    const released = await persistQuestionGuardReviewFailClosed<Record, Audit>({
      reviewReservation,
      auditEntry,
      persistRecord: async (record) => {
        events.push(`persist:${record.releaseState}`);
        return record;
      },
      afterReservation: async () => {
        events.push("side-effect");
      },
      persistAudit: async () => {
        events.push("audit");
      },
      buildReleasedRecord: (reservation) => {
        events.push("build-release");
        return { ...reservation, releaseState: "draft_allowed" };
      },
    });

    expect(events).toEqual([
      "persist:review_required",
      "side-effect",
      "audit",
      "build-release",
      "persist:draft_allowed",
    ]);
    expect(released.releaseState).toBe("draft_allowed");
  });

  it("never reaches audit or release when reservation persistence fails", async () => {
    const events: string[] = [];

    await expect(
      persistQuestionGuardReviewFailClosed({
        reviewReservation: { releaseState: "review_required" as const },
        auditEntry: { id: "audit-1" },
        persistRecord: async () => {
          events.push("reservation-failed");
          throw new Error("reservation_failed");
        },
        afterReservation: async () => events.push("side-effect"),
        persistAudit: async () => events.push("audit"),
        buildReleasedRecord: () => {
          events.push("build-release");
          return { releaseState: "draft_allowed" as const };
        },
      }),
    ).rejects.toThrow("reservation_failed");

    expect(events).toEqual(["reservation-failed"]);
  });

  it("never reaches audit or release when a post-reservation side effect fails", async () => {
    const events: string[] = [];

    await expect(
      persistQuestionGuardReviewFailClosed({
        reviewReservation: { releaseState: "review_required" as const },
        auditEntry: { id: "audit-1" },
        persistRecord: async (record) => {
          events.push(`persist:${record.releaseState}`);
          return record;
        },
        afterReservation: async () => {
          events.push("side-effect-failed");
          throw new Error("side_effect_failed");
        },
        persistAudit: async () => events.push("audit"),
        buildReleasedRecord: () => {
          events.push("build-release");
          return { releaseState: "draft_allowed" as const };
        },
      }),
    ).rejects.toThrow("side_effect_failed");

    expect(events).toEqual(["persist:review_required", "side-effect-failed"]);
  });

  it("keeps the persisted reservation blocked when audit persistence fails", async () => {
    const persistedStates: string[] = [];

    await expect(
      persistQuestionGuardReviewFailClosed({
        reviewReservation: { releaseState: "review_required" as const },
        auditEntry: { id: "audit-1" },
        persistRecord: async (record) => {
          persistedStates.push(record.releaseState);
          return record;
        },
        persistAudit: async () => {
          throw new Error("audit_failed");
        },
        buildReleasedRecord: (reservation) => ({
          ...reservation,
          releaseState: "draft_allowed" as const,
        }),
      }),
    ).rejects.toThrow("audit_failed");

    expect(persistedStates).toEqual(["review_required"]);
  });

  it("does not report success when the final release write fails", async () => {
    const persistedStates: string[] = [];

    await expect(
      persistQuestionGuardReviewFailClosed({
        reviewReservation: { releaseState: "review_required" as const },
        auditEntry: { id: "audit-1" },
        persistRecord: async (record) => {
          persistedStates.push(record.releaseState);
          if (record.releaseState === "draft_allowed") {
            throw new Error("release_failed");
          }
          return record;
        },
        persistAudit: async () => undefined,
        buildReleasedRecord: (reservation) => ({
          ...reservation,
          releaseState: "draft_allowed" as const,
        }),
      }),
    ).rejects.toThrow("release_failed");

    expect(persistedStates).toEqual(["review_required", "draft_allowed"]);
  });
});
