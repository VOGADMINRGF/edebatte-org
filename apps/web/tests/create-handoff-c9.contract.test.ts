import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  drafts: [] as any[],
}));

vi.mock("@core/db/triMongo", () => {
  class ObjectId {
    value: string;
    constructor(value: string) {
      this.value = value;
    }
    static isValid(value: string) {
      return /^[a-f0-9]{24}$/i.test(String(value));
    }
    toHexString() {
      return this.value;
    }
    toString() {
      return this.value;
    }
  }
  const matchesText = (doc: any, filter: any) => {
    if (filter.userId && doc.userId !== filter.userId) return false;
    if (filter.status && doc.status !== filter.status) return false;
    if (filter._id && String(doc._id) !== String(filter._id)) return false;
    if (Array.isArray(filter.$or)) {
      return filter.$or.some((candidate: any) =>
        Object.entries(candidate).every(([key, value]) => doc[key] === value),
      );
    }
    return true;
  };
  return {
    ObjectId,
    shouldUseInMemoryMongoFallback: () => true,
    coreCol: async (name: string) => {
      if (name !== "drafts") throw new Error(`unexpected_collection:${name}`);
      return {
        findOne: async (filter: any) => state.drafts.find((doc) => matchesText(doc, filter)) ?? null,
        find: (filter: any) => ({
          sort: () => ({
            limit: (limit: number) => ({
              toArray: async () => state.drafts.filter((doc) => matchesText(doc, filter)).slice(0, limit),
            }),
          }),
        }),
      };
    },
  };
});

vi.mock("@/server/serverDrafts", () => ({
  CANONICAL_SERVER_DRAFTS_COLLECTION: "drafts",
}));

vi.mock("@features/anlassraum/db", () => ({
  anlassraumCol: async () => ({ findOne: async () => null }),
}));

vi.mock("@features/dossier/server/studioPersistence", () => ({
  getDossierStudioWorkspaceRepo: () => ({
    getDossierStudioWorkspace: async () => null,
  }),
}));

import { resolveCanonicalCreateHandoffDraftBinding } from "@/server/createHandoffDraftBinding";
import {
  createInMemoryPersistedCreateHandoffRepo,
  persistCreateHandoffForReview,
  setPersistedCreateHandoffRepoForTests,
} from "@/features/create/persistedHandoffReviewQueue";

const draftId = "65f000000000000000000901";
const text = "Die Kommune braucht einen belastbaren Plan für sichere Schulwege.";

function canonicalDraft(input: { userId?: string; id?: string; status?: string; text?: string } = {}) {
  const sourceText = input.text ?? text;
  return {
    _id: { toHexString: () => input.id ?? draftId, toString: () => input.id ?? draftId },
    userId: input.userId ?? "user-1",
    text: sourceText,
    textOriginal: sourceText,
    textPrepared: sourceText,
    locale: "de",
    status: input.status ?? "draft",
    createdAt: new Date("2026-09-19T08:00:00.000Z"),
    updatedAt: new Date("2026-09-19T09:00:00.000Z"),
    analysis: {
      draftWriteRuntime: { payloadHash: "payload-hash-1" },
      intelligentFollowup: {
        sourceText,
        understanding: { topics: [], statements: [], priorities: [], clusters: [], openQuestion: null },
        meta: {
          planner: { shortSummary: "Schulwege", plannerTopic: "Schulwege", plannerScope: ["municipal"] },
          graphMatch: { matches: [], matchedDossiers: [], matchedAnlassraeume: [] },
        },
      },
      createSourceEvidence: {
        items: {
          one: {
            verificationStatus: "not_checked",
            analysisReference: {
              sourceArtifactId: "create-source-1",
              contentHash: "a".repeat(64),
              canonicalRef: "https://example.invalid/sensitive-not-persisted-here",
            },
          },
        },
      },
    },
  };
}

function handoffDraft(id = "handoff-server-id") {
  return {
    id,
    source: "create" as const,
    sourceText: text,
    plannerResult: { shortSummary: "Schulwege" } as any,
    graphMatches: { matches: [], matchedDossiers: [], matchedAnlassraeume: [] } as any,
    selectedAction: "request_review" as const,
    claims: [],
    arguments: [],
    openQuestions: [],
    sourceGrounding: [],
    topicSeed: {
      topicKey: "schulwege",
      topicLabel: "Schulwege",
      jurisdiction: "kommune" as const,
      themenradarSourceType: "create_intake" as const,
    },
    resumeHref: "/create?resume=create_handoff&handoffId=handoff-server-id",
    reviewState: "manual_review_required" as const,
    visibilityState: "internal_review" as const,
    requiresConfirmation: true as const,
    createdAt: "2026-09-19T08:00:00.000Z",
  };
}

describe("C9 canonical handoff binding", () => {
  beforeEach(() => {
    state.drafts = [canonicalDraft()];
    setPersistedCreateHandoffRepoForTests(createInMemoryPersistedCreateHandoffRepo());
  });

  it("binds an explicit actor-owned canonical draft and minimizes C8 evidence", async () => {
    const result = await resolveCanonicalCreateHandoffDraftBinding({
      userId: "user-1",
      requestedDraftId: draftId,
      sourceText: text,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.binding).toMatchObject({
      draftId,
      userId: "user-1",
      payloadHash: "payload-hash-1",
    });
    expect(result.binding.sourceEvidenceRefs).toEqual([
      {
        sourceArtifactId: "create-source-1",
        contentHash: "a".repeat(64),
        verificationStatus: "not_checked",
      },
    ]);
    expect(JSON.stringify(result.binding.sourceEvidenceRefs)).not.toContain("example.invalid");
  });

  it("fails closed for foreign, finalized, mismatched and ambiguous drafts", async () => {
    await expect(resolveCanonicalCreateHandoffDraftBinding({
      userId: "user-2",
      requestedDraftId: draftId,
      sourceText: text,
    })).resolves.toMatchObject({ ok: false, error: "draft_not_found" });

    state.drafts = [canonicalDraft({ status: "finalized" })];
    await expect(resolveCanonicalCreateHandoffDraftBinding({
      userId: "user-1",
      requestedDraftId: draftId,
      sourceText: text,
    })).resolves.toMatchObject({ ok: false, error: "draft_not_open" });

    state.drafts = [canonicalDraft()];
    await expect(resolveCanonicalCreateHandoffDraftBinding({
      userId: "user-1",
      requestedDraftId: draftId,
      sourceText: "manipulierter Text",
    })).resolves.toMatchObject({ ok: false, error: "draft_text_mismatch" });

    state.drafts = [
      canonicalDraft({ id: "65f000000000000000000901" }),
      canonicalDraft({ id: "65f000000000000000000902" }),
    ];
    await expect(resolveCanonicalCreateHandoffDraftBinding({
      userId: "user-1",
      sourceText: text,
    })).resolves.toMatchObject({ ok: false, error: "draft_binding_ambiguous" });
  });

  it("persists canonical binding once and rejects identity reuse", async () => {
    const first = await persistCreateHandoffForReview({
      draft: handoffDraft(),
      createdByUserId: "user-1",
      canonicalDraftId: draftId,
      canonicalDraftBindingHash: "binding-1",
      canonicalDraftPayloadHash: "payload-hash-1",
      canonicalSourceEvidenceRefs: [{
        sourceArtifactId: "create-source-1",
        contentHash: "a".repeat(64),
        verificationStatus: "not_checked",
      }],
      questionGuardBindings: [],
      intakeClassification: "claim" as any,
    });
    expect(first).toMatchObject({
      canonicalDraftId: draftId,
      reviewRequired: true,
      noAutoPublish: true,
      noPublicOfficial: true,
      noAutoFinalization: true,
    });

    const replay = await persistCreateHandoffForReview({
      draft: handoffDraft(),
      createdByUserId: "user-1",
      canonicalDraftId: draftId,
      canonicalDraftBindingHash: "binding-1",
      canonicalDraftPayloadHash: "payload-hash-1",
      intakeClassification: "claim" as any,
    });
    expect(replay.id).toBe(first.id);
    expect(replay.createdAt).toBe(first.createdAt);

    await expect(persistCreateHandoffForReview({
      draft: handoffDraft(),
      createdByUserId: "user-2",
      canonicalDraftId: draftId,
      intakeClassification: "claim" as any,
    })).rejects.toThrow("create_handoff_identity_conflict");

    await expect(persistCreateHandoffForReview({
      draft: handoffDraft(),
      createdByUserId: "user-1",
      canonicalDraftId: "65f000000000000000000999",
      intakeClassification: "claim" as any,
    })).rejects.toThrow("create_handoff_identity_conflict");
  });
});
