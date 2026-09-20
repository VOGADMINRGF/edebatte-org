import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  set: null as Record<string, any> | null,
  collections: [] as string[],
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
      return doc[key] === value;
    });
  }

  return {
    ObjectId,
    coreCol: async (name: string) => {
      state.collections.push(name);
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
            $push?: Record<string, any>;
            $inc?: Record<string, number>;
          },
        ) => {
          if (!matches(state.set, filter)) return { matchedCount: 0, modifiedCount: 0 };
          const next = {
            ...state.set,
            ...(update.$set ? structuredClone(update.$set) : {}),
          } as Record<string, any>;
          for (const [key, spec] of Object.entries(update.$push ?? {})) {
            const current = Array.isArray(next[key]) ? [...next[key]] : [];
            if (spec && typeof spec === "object" && "$each" in spec) {
              current.push(...structuredClone((spec as any).$each));
              const slice = Number((spec as any).$slice ?? 0);
              next[key] = slice < 0 ? current.slice(slice) : current;
            } else {
              current.push(structuredClone(spec));
              next[key] = current;
            }
          }
          for (const [key, value] of Object.entries(update.$inc ?? {})) {
            next[key] = Number(next[key] ?? 0) + value;
          }
          state.set = next;
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
      : { _id: { toHexString: () => "admin-reviewer-1" } },
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

async function createAndReview() {
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
  const created = await createResponse.json();
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
  return { created, createResponse, reviewResponse };
}

describe("QR question set embedded-audit review flow", () => {
  beforeEach(() => {
    state.set = null;
    state.collections = [];
    state.denyAdmin = false;
  });

  it("moves 0 -> 1 -> 2 with review and activation evidence in the canonical set only", async () => {
    const { created, createResponse, reviewResponse } = await createAndReview();

    expect(createResponse.status).toBe(202);
    expect(reviewResponse.status).toBe(200);
    expect(state.set).toMatchObject({
      status: "ready_for_activation",
      questionGuardReviewState: "reviewed",
      activationState: "ready_for_activation",
      version: 1,
      noAutoApproval: true,
      noAutoPublish: true,
    });
    expect(state.set?.lastQuestionGuardReviewAudit).toMatchObject({
      action: "question_guard_reviewed",
      actorUserId: "admin-reviewer-1",
      fromVersion: 0,
      toVersion: 1,
      explicitHumanAction: true,
      noAutoApproval: true,
      noAutoPublish: true,
    });
    expect(state.set?.questionGuardAuditTrail).toHaveLength(1);
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
    expect(state.set).toMatchObject({
      status: "active",
      activationState: "active",
      activatedBy: "admin-reviewer-1",
      version: 2,
      noAutoApproval: true,
      noAutoPublish: true,
    });
    expect(state.set?.lastActivationAudit).toMatchObject({
      action: "qr_question_set_activation_approved",
      actorUserId: "admin-reviewer-1",
      fromVersion: 1,
      toVersion: 2,
      reviewAuditId: state.set?.lastQuestionGuardReviewAudit.id,
      explicitHumanAction: true,
      noAutoApproval: true,
      noAutoPublish: true,
    });
    expect(state.set?.questionGuardAuditTrail).toHaveLength(2);
    expect(isQrQuestionSetPubliclyReleased(state.set)).toBe(true);
    expect(new Set(state.collections)).toEqual(new Set(["qr_question_sets"]));
  });

  it("requires admin authentication and explicit activation confirmation", async () => {
    const { created } = await createAndReview();
    const before = structuredClone(state.set);

    state.denyAdmin = true;
    const denied = await activateQrSet(
      request(
        `http://localhost/api/admin/qr/sets/${created.code}/activate`,
        "PATCH",
        { confirmActivation: true },
      ),
      { params: Promise.resolve({ code: created.code }) },
    );
    expect(denied.status).toBe(403);
    expect(state.set).toEqual(before);

    state.denyAdmin = false;
    const unconfirmed = await activateQrSet(
      request(`http://localhost/api/admin/qr/sets/${created.code}/activate`, "PATCH", {}),
      { params: Promise.resolve({ code: created.code }) },
    );
    expect(unconfirmed.status).toBe(400);
    expect(state.set).toEqual(before);
  });

  it("fails closed when the reviewed audit binding is stale", async () => {
    const { created } = await createAndReview();
    state.set!.lastQuestionGuardReviewAudit = {
      ...state.set!.lastQuestionGuardReviewAudit,
      toVersion: 0,
    };

    const response = await activateQrSet(
      request(
        `http://localhost/api/admin/qr/sets/${created.code}/activate`,
        "PATCH",
        { confirmActivation: true },
      ),
      { params: Promise.resolve({ code: created.code }) },
    );

    expect(response.status).toBe(409);
    expect(state.set?.status).toBe("ready_for_activation");
    expect(isQrQuestionSetPubliclyReleased(state.set)).toBe(false);
  });

  it("allows only one concurrent activation CAS", async () => {
    const { created } = await createAndReview();
    const [first, second] = await Promise.all([
      activateQrSet(
        request(
          `http://localhost/api/admin/qr/sets/${created.code}/activate`,
          "PATCH",
          { confirmActivation: true },
        ),
        { params: Promise.resolve({ code: created.code }) },
      ),
      activateQrSet(
        request(
          `http://localhost/api/admin/qr/sets/${created.code}/activate`,
          "PATCH",
          { confirmActivation: true },
        ),
        { params: Promise.resolve({ code: created.code }) },
      ),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect(state.set?.version).toBe(2);
    expect(state.set?.questionGuardAuditTrail).toHaveLength(2);
    expect(isQrQuestionSetPubliclyReleased(state.set)).toBe(true);
  });
});
