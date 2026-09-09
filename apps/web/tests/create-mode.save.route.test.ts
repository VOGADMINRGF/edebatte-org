import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => {
  type AnyDoc = Record<string, any>;

  let userId: string | null = "user-1";
  const docs: AnyDoc[] = [];
  const reviewDocs: AnyDoc[] = [];

  function toKey(value: unknown) {
    if (value && typeof value === "object" && "toHexString" in (value as Record<string, unknown>)) {
      const asHex = (value as { toHexString?: () => string }).toHexString;
      if (typeof asHex === "function") return asHex.call(value);
    }
    return String(value ?? "");
  }

  function readPath(source: AnyDoc, path: string) {
    return path.split(".").reduce<unknown>((current, segment) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[segment];
    }, source);
  }

  function matchesFilter(doc: AnyDoc, filter: AnyDoc) {
    return Object.entries(filter ?? {}).every(([key, value]) => {
      if (key === "_id") return toKey(doc._id) === toKey(value);
      const currentValue = key.includes(".") ? readPath(doc, key) : doc[key];
      return String(currentValue ?? "") === String(value ?? "");
    });
  }

  return {
    setUser(next: string | null) {
      userId = next;
    },
    reset() {
      docs.length = 0;
      reviewDocs.length = 0;
      userId = "user-1";
    },
    readAll() {
      return docs.map((doc) => ({ ...doc }));
    },
    setDraftStatus(draftId: string, status: string) {
      const idx = docs.findIndex((doc) => toKey(doc._id) === draftId);
      if (idx >= 0) {
        docs[idx] = { ...docs[idx], status };
      }
    },
    readReviewAll() {
      return reviewDocs.map((doc) => ({ ...doc }));
    },
    getDraft: vi.fn(async () => null),
    getSessionUser: vi.fn(async () =>
      userId
        ? {
            _id: { toHexString: () => userId },
            roles: ["user"],
            sessionValid: true,
          }
        : null,
    ),
    getCol: vi.fn(async (name: string) => {
      throw new Error(`unexpected_collection_${name}`);
    }),
    coreCol: vi.fn(async (name: string) => {
      if (name === "drafts") {
        return {
          async insertOne(doc: AnyDoc) {
            if (docs.some((entry) => toKey(entry._id) === toKey(doc._id))) {
              const error = new Error("duplicate key");
              (error as Error & { code?: number }).code = 11000;
              throw error;
            }
            docs.push({ ...doc });
            return { acknowledged: true, insertedId: doc._id };
          },
          async findOne(filter: AnyDoc) {
            return docs.find((doc) => matchesFilter(doc, filter)) ?? null;
          },
          async updateOne(filter: AnyDoc, update: AnyDoc) {
            const idx = docs.findIndex((doc) => matchesFilter(doc, filter));
            if (idx < 0) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
            const set = update?.$set && typeof update.$set === "object" ? update.$set : {};
            docs[idx] = { ...docs[idx], ...set };
            return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
          },
        };
      }
      if (name === "landing_editorial_review_requests") {
        return {
          async countDocuments(filter: Record<string, any>) {
            return reviewDocs.filter((doc) => {
              if (filter.userId && doc.userId !== filter.userId) return false;
              if (filter.createdAt?.$gte && !(doc.createdAt >= filter.createdAt.$gte)) return false;
              return true;
            }).length;
          },
          async findOne(filter: Record<string, any>) {
            return (
              reviewDocs.find((doc) => {
                if (filter.userId && doc.userId !== filter.userId) return false;
                if (filter.normalizedText && doc.normalizedText !== filter.normalizedText) return false;
                if (filter.sourceType && doc.sourceType !== filter.sourceType) return false;
                if (filter.status?.$in && !filter.status.$in.includes(doc.status)) return false;
                if (filter.createdAt?.$gte && !(doc.createdAt >= filter.createdAt.$gte)) return false;
                return true;
              }) ?? null
            );
          },
          async insertOne(doc: AnyDoc) {
            const next = { ...doc, _id: new ObjectId() };
            reviewDocs.push(next);
            return { acknowledged: true, insertedId: next._id };
          },
          async updateOne() {
            return { acknowledged: true };
          },
          find() {
            return {
              sort() {
                return {
                  limit() {
                    return {
                      async toArray() {
                        return [];
                      },
                    };
                  },
                  async toArray() {
                    return [];
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected_core_collection_${name}`);
    }),
    resolveRequestScopeContext: vi.fn(async () => ({
      organizationId: "org-1",
      membershipStatus: "organization_verified",
      organizationRole: "communications",
      regionIds: ["kommune-nord"],
      isOperatorMode: false,
      operatorModeLabel: null,
      sourceOfTruth: "local_membership_store",
      confidence: "high",
    })),
    summarizeRequestScopeContext: vi.fn((scope) => scope),
    enforceCreateMutationSecurity: vi.fn(async () => null),
  };
});

vi.mock("@core/db/triMongo", async () => {
  const mongodb = await import("mongodb");
  return {
    ObjectId: mongodb.ObjectId,
    getCol: (...args: unknown[]) => mocks.getCol(...args),
    coreCol: (...args: unknown[]) => mocks.coreCol(...args),
  };
});

vi.mock("@/lib/server/auth/requestScope", () => ({
  resolveRequestScopeContext: (...args: unknown[]) => mocks.resolveRequestScopeContext(...args),
  summarizeRequestScopeContext: (...args: unknown[]) => mocks.summarizeRequestScopeContext(...args),
}));

vi.mock("@/lib/server/auth/sessionUser", () => ({
  getSessionUser: (...args: unknown[]) => mocks.getSessionUser(...args),
}));

vi.mock("@/features/create/createRouteSecurity", () => ({
  enforceCreateMutationSecurity: (...args: unknown[]) =>
    mocks.enforceCreateMutationSecurity(...args),
}));

vi.mock("@/server/draftStore", () => ({
  getDraft: (...args: unknown[]) => mocks.getDraft(...args),
}));

import { POST as savePOST } from "@/app/api/create/save/route";

function req(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/create/save", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "x-edebatte-create-csrf": "create-mutation-v1",
    },
    body: JSON.stringify(body),
  });
}

describe("create mode split - save route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reset();
    mocks.getDraft.mockResolvedValue(null);
  });

  it("rejects a guest before parsing the body and never emits a cookie or draft", async () => {
    mocks.setUser(null);
    const response = await savePOST(
      new NextRequest("http://localhost/api/create/save", {
        method: "POST",
        body: "{malformed-json",
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });
    expect(mocks.readAll()).toHaveLength(0);
  });

  it("accepts manual mode and persists it in the canonical drafts collection", async () => {
    const res = await savePOST(
      req({
        textPrepared: "Manual contribution content with enough characters.",
        source: "statement_new",
        createMode: "manual",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      createMode: "manual",
      timings: {
        accessMs: expect.any(Number),
        contextMs: expect.any(Number),
        saveMs: expect.any(Number),
        totalMs: expect.any(Number),
      },
      requestScope: {
        organizationId: "org-1",
        membershipStatus: "organization_verified",
        regionIds: ["kommune-nord"],
      },
    });

    const saved = mocks.readAll();
    expect(saved).toHaveLength(1);
    expect(saved[0].createMode).toBe("manual");
    expect(saved[0].userId).toBe("user-1");
    expect(saved[0].textOriginal).toBe("Manual contribution content with enough characters.");
    expect(saved[0].textPrepared).toBe("Manual contribution content with enough characters.");
  });

  it("accepts source mode and persists anlassraum context", async () => {
    const res = await savePOST(
      req({
        textPrepared: "Source based contribution with explicit context.",
        source: "contribution_new",
        createMode: "source",
        anlassraumId: "65f000000000000000000011",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      createMode: "source",
      anlassraumId: "65f000000000000000000011",
    });

    const saved = mocks.readAll();
    expect(saved).toHaveLength(1);
    expect(saved[0].anlassraumId).toBe("65f000000000000000000011");
  });

  it("persists material context and ledger analysis without losing review-first safety", async () => {
    const res = await savePOST(
      req({
        textPrepared: "Bitte prüft den beigefügten Tierwohl-Bericht und den Link zum EU-Standard.",
        source: "create_multibranch_package",
        createMode: "source",
        packageId: "package-1",
        sourceUrls: ["https://example.org/tierwohl-standard"],
        materialItems: [{ id: "mat-1", kind: "pdf_document", fileName: "tierwohl-bericht.pdf" }],
        analysis: {
          intelligentFollowup: {
            contributionPackage: {
              id: "package-1",
              kind: "multi_branch_draft",
              headline: "Mehrthemen-Beitrag",
              summary: "Du hast mehrere Themen angesprochen.",
              source: "gpt_planner",
              requiresConfirmation: true,
              createdAt: "2026-06-03T12:00:00.000Z",
              branches: [],
            },
          },
        },
      }),
    );

    expect(res.status).toBe(200);
    const saved = mocks.readAll();
    expect(saved).toHaveLength(1);
    expect(saved[0].analysis?.inputContext).toMatchObject({
      sourceUrls: ["https://example.org/tierwohl-standard"],
      materialItems: [{ id: "mat-1", kind: "pdf_document", fileName: "tierwohl-bericht.pdf" }],
    });
    expect(saved[0].analysis?.createContributionLedger?.packageId).toBe("package-1");
    expect(saved[0].analysis?.safety?.noAutoPublish).toBe(true);
    expect(saved[0].analysis?.safety?.noSilentMerge).toBe(true);
    expect(saved[0].analysis?.draftWriteRuntime?.sourceCollection).toBe("drafts");
  });

  it("accepts ai mode only as draft intent with no publish side effect", async () => {
    const res = await savePOST(
      req({
        textPrepared: "AI assisted contribution content with enough characters.",
        source: "contribution_new",
        createMode: "ai",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, createMode: "ai" });
    const saved = mocks.readAll();
    expect(saved[0].status).toBe("draft");
    expect(saved[0].publishedAt).toBeUndefined();
    expect(saved[0].approvedAt).toBeUndefined();
  });

  it("rejects invalid mode and invalid anlassraum id explicitly", async () => {
    const invalidMode = await savePOST(
      req({
        textPrepared: "Invalid mode content with enough characters.",
        createMode: "robot",
      }),
    );
    expect(invalidMode.status).toBe(400);
    await expect(invalidMode.json()).resolves.toMatchObject({ ok: false, error: "invalid_create_mode" });

    const invalidAnlassraum = await savePOST(
      req({
        textPrepared: "Invalid context id content with enough characters.",
        createMode: "source",
        anlassraumId: "bad-id",
      }),
    );
    expect(invalidAnlassraum.status).toBe(400);
    await expect(invalidAnlassraum.json()).resolves.toMatchObject({ ok: false, error: "invalid_anlassraum_id" });
  });

  it("uses the stable fallback create mode for legacy callers", async () => {
    const res = await savePOST(
      req({
        textPrepared: "Legacy caller content with enough characters.",
        source: "statement_new",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, createMode: "manual" });
    expect(mocks.readAll()[0].createMode).toBe("manual");
  });

  it("returns null requestScope when no organization context is resolved", async () => {
    mocks.resolveRequestScopeContext.mockResolvedValueOnce(null);
    mocks.summarizeRequestScopeContext.mockReturnValueOnce(null);

    const res = await savePOST(
      req({
        textPrepared: "Speichert ohne bestätigten Organisationsscope, aber weiterhin als Draft.",
        source: "contribution_new",
        createMode: "source",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, requestScope: null });
  });

  it("requires a valid session user", async () => {
    mocks.setUser(null);

    const res = await savePOST(
      req({
        textPrepared: "Ohne valide Session darf kein Draft gespeichert werden.",
        source: "contribution_new",
        createMode: "source",
      }),
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: "not_authenticated" });
  });

  it("creates a pending editorial review request without publish side effects", async () => {
    const res = await savePOST(
      req({
        textPrepared: "Bitte prüft diesen Analyse-Entwurf zur Schulwegsicherheit noch redaktionell.",
        source: "create_followup",
        createMode: "source",
        manualReviewRequested: true,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      reviewRequest: {
        sourceType: "create_analysis",
        status: "pending_review",
        noAutoPublish: true,
        noAutoGraphPromotion: true,
      },
    });

    const reviewSaved = mocks.readReviewAll();
    expect(reviewSaved).toHaveLength(1);
    expect(reviewSaved[0].status).toBe("pending_review");
    expect(reviewSaved[0].noAutoPublish).toBe(true);
    expect(reviewSaved[0].noAutoGraphPromotion).toBe(true);
    expect(reviewSaved[0].noAutoDossier).toBe(true);
    expect(reviewSaved[0].noAutoAnlassraum).toBe(true);
    expect(reviewSaved[0].noAutoVote).toBe(true);
  });

  it("deduplicates an identical retry without creating a second draft", async () => {
    const payload = {
      textPrepared: "Identischer Retry für denselben Arbeitsstand.",
      source: "create_followup",
      createMode: "source",
    };

    const first = await savePOST(req(payload));
    const firstBody = await first.json();
    const second = await savePOST(req(payload));
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.draftId).toBe(firstBody.draftId);
    expect(mocks.readAll()).toHaveLength(1);
  });

  it("deduplicates identical parallel retries into the same canonical draft", async () => {
    const payload = {
      textPrepared: "Paralleler Retry für denselben Arbeitsstand.",
      source: "create_followup",
      createMode: "source",
    };

    const [first, second] = await Promise.all([savePOST(req(payload)), savePOST(req(payload))]);
    const firstBody = await first.json();
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstBody.draftId).toBe(secondBody.draftId);
    expect(mocks.readAll()).toHaveLength(1);
  });

  it("updates the same draft id on controlled follow-up saves", async () => {
    const first = await savePOST(
      req({
        textPrepared: "Erste Fassung des Arbeitsstands.",
        source: "create_followup",
        createMode: "source",
      }),
    );
    const firstBody = await first.json();

    const second = await savePOST(
      req({
        draftId: firstBody.draftId,
        textPrepared: "Aktualisierte Fassung des Arbeitsstands.",
        textOriginal: "Aktualisierte Fassung des Arbeitsstands.",
        source: "create_followup",
        createMode: "source",
      }),
    );
    const secondBody = await second.json();

    expect(second.status).toBe(200);
    expect(secondBody.draftId).toBe(firstBody.draftId);
    const saved = mocks.readAll();
    expect(saved).toHaveLength(1);
    expect(saved[0].text).toBe("Aktualisierte Fassung des Arbeitsstands.");
    expect(saved[0].textOriginal).toBe("Aktualisierte Fassung des Arbeitsstands.");
  });

  it("preserves existing analysis context and review-first runtime flags on controlled updates", async () => {
    const first = await savePOST(
      req({
        textPrepared: "Erste Fassung mit Planner- und Quellenkontext.",
        source: "create_multibranch_package",
        createMode: "source",
        sourceUrls: ["https://example.org/quelle"],
        analysis: {
          intelligentFollowup: {
            contributionPackage: {
              id: "package-ctx",
              kind: "multi_branch_draft",
              headline: "Kontext bleibt erhalten",
              summary: "Vorhandene Analyse soll nicht verloren gehen.",
              source: "gpt_planner",
              requiresConfirmation: true,
              createdAt: "2026-06-03T12:00:00.000Z",
              branches: [],
            },
          },
        },
      }),
    );
    const firstBody = await first.json();

    const second = await savePOST(
      req({
        draftId: firstBody.draftId,
        textPrepared: "Zweite Fassung ohne erneute Analyse-Payload.",
        source: "create_multibranch_package",
        createMode: "source",
      }),
    );

    expect(second.status).toBe(200);
    const saved = mocks.readAll();
    expect(saved).toHaveLength(1);
    expect(saved[0].analysis?.intelligentFollowup?.contributionPackage?.id).toBe("package-ctx");
    expect(saved[0].analysis?.draftWriteRuntime?.noAutoPublish).toBe(true);
    expect(saved[0].analysis?.draftWriteRuntime?.noSilentMerge).toBe(true);
  });

  it("rejects controlled updates for a foreign user", async () => {
    const first = await savePOST(
      req({
        textPrepared: "Nur der Eigentümer darf diesen Draft fortschreiben.",
        source: "create_followup",
        createMode: "source",
      }),
    );
    const firstBody = await first.json();

    mocks.setUser("user-2");
    const second = await savePOST(
      req({
        draftId: firstBody.draftId,
        textPrepared: "Fremder Update-Versuch.",
        source: "create_followup",
        createMode: "source",
      }),
    );

    expect(second.status).toBe(403);
    await expect(second.json()).resolves.toMatchObject({
      ok: false,
      error: "CREATE_REQUEST_NOT_ALLOWED",
    });
    expect(mocks.readAll()).toHaveLength(1);
    expect(mocks.readAll()[0].text).toBe("Nur der Eigentümer darf diesen Draft fortschreiben.");
  });

  it("rejects invented draft ids with the same generic ownership response", async () => {
    const res = await savePOST(
      req({
        draftId: "bad-id",
        textPrepared: "Ungültige Draft-ID darf keinen Write auslösen.",
        source: "create_followup",
        createMode: "source",
      }),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: "CREATE_REQUEST_NOT_ALLOWED",
    });
    expect(mocks.readAll()).toHaveLength(0);
  });

  it("rejects a deleted canonical draft with the generic ownership response", async () => {
    const res = await savePOST(
      req({
        draftId: "65f000000000000000000099",
        textPrepared: "Ein gelöschter Draft darf keinen neuen Write auslösen.",
        source: "create_followup",
        createMode: "source",
      }),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "CREATE_REQUEST_NOT_ALLOWED",
    });
    expect(mocks.readAll()).toHaveLength(0);
  });

  it("fails closed for legacy string draft ids instead of creating a parallel write", async () => {
    mocks.getDraft.mockResolvedValueOnce({
      id: "legacy-string-id",
      kind: "contribution",
      text: "Alter Legacy-Entwurf",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
    });

    const res = await savePOST(
      req({
        draftId: "legacy-string-id",
        textPrepared: "Dieser Legacy-Entwurf muss read-only bleiben.",
        source: "create_followup",
        createMode: "source",
      }),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: "CREATE_REQUEST_NOT_ALLOWED",
    });
    expect(mocks.readAll()).toHaveLength(0);
  });

  it("rejects updates to already finalized drafts", async () => {
    const first = await savePOST(
      req({
        textPrepared: "Finalisierte Drafts dürfen nicht überschrieben werden.",
        source: "create_followup",
        createMode: "source",
      }),
    );
    const firstBody = await first.json();
    mocks.setDraftStatus(firstBody.draftId, "finalized");

    const second = await savePOST(
      req({
        draftId: firstBody.draftId,
        textPrepared: "Überschreibungsversuch auf finalized Draft.",
        source: "create_followup",
        createMode: "source",
      }),
    );

    expect(second.status).toBe(403);
    await expect(second.json()).resolves.toMatchObject({
      ok: false,
      error: "CREATE_REQUEST_NOT_ALLOWED",
    });
  });
});
