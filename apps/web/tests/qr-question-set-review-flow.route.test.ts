import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  set: null as Record<string, any> | null,
  audits: [] as Record<string, any>[],
  failAudit: false,
  failActiveRelease: false,
  denyAdmin: false,
}));

vi.mock("@core/db/triMongo", () => {
  class ObjectId {
    private readonly value: string;
    constructor(value = "65f000000000000000000499") {
      this.value = value;
    }
    static isValid(value: string) {
      return /^[a-f0-9]{24}$/i.test(value);
    }
    toHexString() {
      return this.value;
    }
    toString() {
      return this.value;
    }
  }

  function matches(doc: Record<string, any> | null, filter: Record<string, any>) {
    if (!doc) return false;
    return Object.entries(filter).every(([key, value]) => {
      if (key === "_id") return String(doc._id) === String(value);
      if (value && typeof value === "object" && "$exists" in value) {
        return (key in doc) === Boolean(value.$exists);
      }
      return doc[key] === value;
    });
  }

  return {
    ObjectId,
    coreCol: async (name: string) => {
      if (name === "qr_question_set_guard_audits") {
        return {
          insertOne: async (doc: Record<string, any>) => {
            if (state.failAudit) throw new Error("audit_unavailable");
            state.audits.push(structuredClone(doc));
            return { insertedId: doc.id };
          },
          updateOne: async (
            filter: Record<string, any>,
            update: { $setOnInsert?: Record<string, any> },
            options?: { upsert?: boolean },
          ) => {
            if (state.failAudit) throw new Error("audit_unavailable");
            const existing = state.audits.find((audit) => matches(audit, filter));
            if (existing) return { matchedCount: 1, modifiedCount: 0 };
            if (options?.upsert && update.$setOnInsert) {
              state.audits.push(structuredClone(update.$setOnInsert));
              return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
            }
            return { matchedCount: 0, modifiedCount: 0 };
          },
        };
      }
      if (name !== "qr_question_sets") throw new Error(`unexpected_collection:${name}`);
      return {
        findOne: async (filter: Record<string, any>) =>
          matches(state.set, filter) ? structuredClone(state.set) : null,
        insertOne: async (doc: Record<string, any>) => {
          state.set = {
            ...structuredClone(doc),
            _id: "65f000000000000000000499",
          };
          return { insertedId: "65f000000000000000000499" };
        },
        updateOne: async (
          filter: Record<string, any>,
          update: {
            $set?: Record<string, any>;
            $unset?: Record<string, unknown>;
            $inc?: Record<string, number>;
          },
        ) => {
          if (!matches(state.set, filter)) return { matchedCount: 0, modifiedCount: 0 };
          if (state.failActiveRelease && update.$set?.status === "active") {
            return { matchedCount: 0, modifiedCount: 0 };
          }
          state.set = {
            ...state.set,
            ...(update.$set ? structuredClone(update.$set) : {}),
          };
          for (const [key, value] of Object.entries(update.$inc ?? {})) {
            state.set[key] = Number(state.set[key] ?? 0) + value;
          }
          for (const key of Object.keys(update.$unset ?? {})) {
            delete state.set[key];
          }
          return { matchedCount: 1, modifiedCount: 1 };
        },
      };
    },
  };
});

vi.mock("@features/anlassraum/db", () => ({
  anlassraumCol: async () => ({ findOne: vi.fn() }),
}));

vi.mock("@/app/api/streams/utils", () => ({
  requireCreatorContext: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/server/auth/admin", () => ({
  requireAdminOrResponse: vi.fn().mockImplementation(async () =>
    state.denyAdmin
      ? new Response(JSON.stringify({ ok: false, error: "forbidden" }), { status: 403 })
      : {
          _id: { toHexString: () => "admin-reviewer-1" },
        },
  ),
}));

import { POST as createQrSet } from "@/app/api/qr/sets/route";
import { PATCH as reviewQrSet } from "@/app/api/admin/qr/sets/[code]/question-guard-review/route";
import { PATCH as activateQrSet } from "@/app/api/admin/qr/sets/[code]/activate/route";
import { isQrQuestionSetPubliclyReleased } from "@/features/create/qrQuestionSetGuard";

function request(url: string, method: "POST" | "PATCH", body: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("QR question set review flow", () => {
  beforeEach(() => {
    state.set = null;
    state.audits = [];
    state.failAudit = false;
    state.failActiveRelease = false;
    state.denyAdmin = false;
  });

  it("persists review-required creation, then audits explicit activation before public release", async () => {
    const createResponse = await createQrSet(
      request("http://localhost/api/qr/sets", "POST", {
        title: "Hitzeschutz",
        questions: [
          {
            title: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
            options: ["Mehr Bäume", "Mehr Trinkbrunnen"],
          },
        ],
      }),
    );

    expect(createResponse.status).toBe(202);
    const created = await createResponse.json();
    expect(created).toMatchObject({
      ok: true,
      status: "review_required",
      questionGuardReviewState: "review_required",
      noAutoApproval: true,
      noAutoPublish: true,
    });
    expect(state.set).toMatchObject({
      status: "review_required",
      version: 0,
      noAutoApproval: true,
      noAutoPublish: true,
    });

    const questionId = state.set?.questions[0].id as string;
    const reviewResponse = await reviewQrSet(
      request(
        `http://localhost/api/admin/qr/sets/${created.code}/question-guard-review`,
        "PATCH",
        {
          questions: [
            {
              questionId,
              actorContexts: [],
              evidenceRefs: ["human-review:qr-set:1"],
              noNamedActorsConfirmed: true,
            },
          ],
        },
      ),
      { params: Promise.resolve({ code: created.code }) },
    );

    expect(reviewResponse.status).toBe(200);
    await expect(reviewResponse.json()).resolves.toMatchObject({
      ok: true,
      status: "ready_for_activation",
      questionGuardReviewState: "reviewed",
      activationState: "ready_for_activation",
      noAutoApproval: true,
      noAutoPublish: true,
    });
    expect(state.set).toMatchObject({
      status: "ready_for_activation",
      questionGuardReviewState: "reviewed",
      activationState: "ready_for_activation",
      version: 2,
      noAutoApproval: true,
      noAutoPublish: true,
    });
    expect(state.set?.status).not.toBe("active");
    expect(state.set?.questions[0].questionGuard).toMatchObject({
      releaseState: "draft_allowed",
      actorExtraction: {
        status: "complete",
        source: "human_review",
        humanReviewFinding: "no_named_actors",
      },
    });
    expect(state.audits).toHaveLength(1);
    expect(state.audits[0]).toMatchObject({
      action: "question_guard_reviewed",
      actorUserId: "admin-reviewer-1",
      readyForActivation: true,
      noAutoApproval: true,
      noAutoPublish: true,
    });
    expect(isQrQuestionSetPubliclyReleased(state.set)).toBe(false);

    const activationResponse = await activateQrSet(
      request(
        `http://localhost/api/admin/qr/sets/${created.code}/activate`,
        "PATCH",
        { confirmActivation: true },
      ),
      { params: Promise.resolve({ code: created.code }) },
    );

    expect(activationResponse.status).toBe(200);
    await expect(activationResponse.json()).resolves.toMatchObject({
      ok: true,
      status: "active",
      activationState: "active",
      noAutoApproval: true,
      noAutoPublish: true,
    });
    expect(state.set).toMatchObject({
      status: "active",
      activationState: "active",
      activatedBy: "admin-reviewer-1",
      version: 4,
      noAutoApproval: true,
      noAutoPublish: true,
    });
    expect(isQrQuestionSetPubliclyReleased(state.set)).toBe(true);
    expect(state.audits).toHaveLength(2);
    expect(state.audits[1]).toMatchObject({
      action: "qr_question_set_activation_approved",
      actorUserId: "admin-reviewer-1",
      previousStatus: "ready_for_activation",
      requestedStatus: "active",
      explicitAdminAction: true,
      noAutoApproval: true,
      noAutoPublish: true,
    });
  });

  it("requires authenticated admin access and explicit activation confirmation", async () => {
    state.set = {
      _id: "65f000000000000000000499",
      code: "READY123",
      status: "ready_for_activation",
      questionGuardReviewState: "reviewed",
      activationState: "ready_for_activation",
      version: 2,
      questions: [
        {
          id: "question-1",
          questionGuard: { releaseState: "draft_allowed" },
        },
      ],
    };

    state.denyAdmin = true;
    const denied = await activateQrSet(
      request("http://localhost/api/admin/qr/sets/READY123/activate", "PATCH", {
        confirmActivation: true,
      }),
      { params: Promise.resolve({ code: "READY123" }) },
    );
    expect(denied.status).toBe(403);
    expect(state.set.status).toBe("ready_for_activation");

    state.denyAdmin = false;
    const unconfirmed = await activateQrSet(
      request("http://localhost/api/admin/qr/sets/READY123/activate", "PATCH", {}),
      { params: Promise.resolve({ code: "READY123" }) },
    );
    expect(unconfirmed.status).toBe(400);
    await expect(unconfirmed.json()).resolves.toMatchObject({
      ok: false,
      error: "qr_question_set_activation_confirmation_required",
    });
    expect(state.set.status).toBe("ready_for_activation");
    expect(state.audits).toHaveLength(0);
  });

  it("keeps the set private and resumes safely when activation audit or final CAS fails", async () => {
    state.set = {
      _id: "65f000000000000000000499",
      code: "READY123",
      status: "ready_for_activation",
      questionGuardReviewState: "reviewed",
      activationState: "ready_for_activation",
      version: 2,
      questions: [
        {
          id: "question-1",
          questionGuard: { releaseState: "draft_allowed", outcome: "generalized" },
        },
      ],
    };
    state.failAudit = true;

    const auditFailure = await activateQrSet(
      request("http://localhost/api/admin/qr/sets/READY123/activate", "PATCH", {
        confirmActivation: true,
      }),
      { params: Promise.resolve({ code: "READY123" }) },
    );
    expect(auditFailure.status).toBe(500);
    await expect(auditFailure.json()).resolves.toMatchObject({
      ok: false,
      error: "qr_question_set_activation_failed",
    });
    expect(state.set).toMatchObject({
      status: "ready_for_activation",
      activationState: "activation_in_progress",
      version: 3,
    });
    expect(isQrQuestionSetPubliclyReleased(state.set)).toBe(false);

    state.failAudit = false;
    const auditRetry = await activateQrSet(
      request("http://localhost/api/admin/qr/sets/READY123/activate", "PATCH", {
        confirmActivation: true,
      }),
      { params: Promise.resolve({ code: "READY123" }) },
    );
    expect(auditRetry.status).toBe(200);
    expect(state.set).toMatchObject({
      status: "active",
      activationState: "active",
      version: 4,
    });
    expect(state.audits).toHaveLength(1);

    state.set = {
      _id: "65f000000000000000000499",
      code: "READY123",
      status: "ready_for_activation",
      questionGuardReviewState: "reviewed",
      activationState: "ready_for_activation",
      version: 10,
      questions: [
        {
          id: "question-1",
          questionGuard: { releaseState: "draft_allowed", outcome: "generalized" },
        },
      ],
    };
    state.audits = [];
    state.failActiveRelease = true;
    const casFailure = await activateQrSet(
      request("http://localhost/api/admin/qr/sets/READY123/activate", "PATCH", {
        confirmActivation: true,
      }),
      { params: Promise.resolve({ code: "READY123" }) },
    );
    expect(casFailure.status).toBe(409);
    expect(state.set).toMatchObject({
      status: "ready_for_activation",
      activationState: "activation_in_progress",
      version: 11,
    });
    expect(isQrQuestionSetPubliclyReleased(state.set)).toBe(false);
    expect(state.audits).toHaveLength(1);

    state.failActiveRelease = false;
    const casRetry = await activateQrSet(
      request("http://localhost/api/admin/qr/sets/READY123/activate", "PATCH", {
        confirmActivation: true,
      }),
      { params: Promise.resolve({ code: "READY123" }) },
    );
    expect(casRetry.status).toBe(200);
    expect(state.set).toMatchObject({
      status: "active",
      activationState: "active",
      version: 12,
    });
    expect(state.audits).toHaveLength(1);
  });

  it("normalizes and activates a fully reviewed legacy set without activationState", async () => {
    state.set = {
      _id: "65f000000000000000000499",
      code: "LEGACY123",
      status: "ready_for_activation",
      questionGuardReviewState: "reviewed",
      version: 2,
      questions: [
        {
          id: "question-1",
          questionGuard: { releaseState: "draft_allowed", outcome: "generalized" },
        },
      ],
    };

    const response = await activateQrSet(
      request("http://localhost/api/admin/qr/sets/LEGACY123/activate", "PATCH", {
        confirmActivation: true,
      }),
      { params: Promise.resolve({ code: "LEGACY123" }) },
    );

    expect(response.status).toBe(200);
    expect(state.set).toMatchObject({
      status: "active",
      activationState: "active",
      version: 5,
    });
    expect(state.audits).toHaveLength(1);
  });

  it("allows only one concurrent activation reservation and one approval audit", async () => {
    state.set = {
      _id: "65f000000000000000000499",
      code: "READY123",
      status: "ready_for_activation",
      questionGuardReviewState: "reviewed",
      activationState: "ready_for_activation",
      version: 2,
      questions: [
        {
          id: "question-1",
          questionGuard: { releaseState: "draft_allowed", outcome: "generalized" },
        },
      ],
    };

    const [first, second] = await Promise.all([
      activateQrSet(
        request("http://localhost/api/admin/qr/sets/READY123/activate", "PATCH", {
          confirmActivation: true,
        }),
        { params: Promise.resolve({ code: "READY123" }) },
      ),
      activateQrSet(
        request("http://localhost/api/admin/qr/sets/READY123/activate", "PATCH", {
          confirmActivation: true,
        }),
        { params: Promise.resolve({ code: "READY123" }) },
      ),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect(state.set).toMatchObject({
      status: "active",
      activationState: "active",
      version: 4,
    });
    expect(state.audits).toHaveLength(1);
    expect(state.audits[0]).toMatchObject({
      action: "qr_question_set_activation_approved",
    });
  });

  it("cannot complete an actor-free human review from evidenceRef alone", async () => {
    const createResponse = await createQrSet(
      request("http://localhost/api/qr/sets", "POST", {
        questions: [
          {
            title: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
            options: ["Mehr Bäume", "Mehr Trinkbrunnen"],
          },
        ],
      }),
    );
    const created = await createResponse.json();
    const questionId = state.set?.questions[0].id as string;

    const response = await reviewQrSet(
      request(
        `http://localhost/api/admin/qr/sets/${created.code}/question-guard-review`,
        "PATCH",
        {
          questions: [
            {
              questionId,
              actorContexts: [],
              evidenceRefs: ["human-review:qr-set:evidence-only"],
            },
          ],
        },
      ),
      { params: Promise.resolve({ code: created.code }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "public_question_guard_actor_finding_required",
    });
    expect(state.set?.status).toBe("review_required");
    expect(state.audits).toHaveLength(0);
  });

  it("leaves the persisted guard blocked when durable audit insertion fails", async () => {
    const createResponse = await createQrSet(
      request("http://localhost/api/qr/sets", "POST", {
        questions: [
          {
            title: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
            options: ["Mehr Bäume", "Mehr Trinkbrunnen"],
          },
        ],
      }),
    );
    const created = await createResponse.json();
    const questionId = state.set?.questions[0].id as string;
    state.failAudit = true;

    const response = await reviewQrSet(
      request(
        `http://localhost/api/admin/qr/sets/${created.code}/question-guard-review`,
        "PATCH",
        {
          questions: [
            {
              questionId,
              actorContexts: [],
              evidenceRefs: ["human-review:qr-set:audit-failure"],
              noNamedActorsConfirmed: true,
            },
          ],
        },
      ),
      { params: Promise.resolve({ code: created.code }) },
    );

    expect(response.status).toBe(400);
    expect(state.set).toMatchObject({
      status: "review_required",
      questionGuardReviewState: "review_in_progress",
      version: 1,
    });
    expect(state.set?.questions[0].questionGuard.releaseState).toBe(
      "review_required",
    );
    expect(state.audits).toHaveLength(0);
  });
});
