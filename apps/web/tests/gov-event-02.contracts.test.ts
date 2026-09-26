import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import type { GovernanceActor } from "@features/trust/types";

const memory = vi.hoisted(() => {
  type AnyDoc = Record<string, any>;

  let idSeq = 0;
  const collections = new Map<string, InMemoryCollection>();

  function toKey(value: unknown) {
    if (value && typeof value === "object" && "toHexString" in (value as Record<string, unknown>)) {
      const asHex = (value as { toHexString?: () => string }).toHexString;
      if (typeof asHex === "function") return asHex.call(value);
    }
    return value;
  }

  function deepGet(obj: AnyDoc, path: string) {
    const parts = path.split(".");
    let cursor: any = obj;
    for (const part of parts) {
      if (cursor == null) return undefined;
      cursor = cursor[part];
    }
    return cursor;
  }

  function deepSet(obj: AnyDoc, path: string, value: unknown) {
    const parts = path.split(".");
    let cursor: AnyDoc = obj;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (!cursor[key] || typeof cursor[key] !== "object") {
        cursor[key] = {};
      }
      cursor = cursor[key] as AnyDoc;
    }
    cursor[parts[parts.length - 1]] = value;
  }

  function matchesFilter(doc: AnyDoc, filter: AnyDoc) {
    if (!filter || Object.keys(filter).length === 0) return true;

    if (Array.isArray(filter.$or)) {
      const orOk = filter.$or.some((entry: AnyDoc) => matchesFilter(doc, entry));
      if (!orOk) return false;
    }

    for (const [key, condition] of Object.entries(filter)) {
      if (key === "$or") continue;
      const actual = deepGet(doc, key);

      if (condition && typeof condition === "object" && !Array.isArray(condition)) {
        const c = condition as AnyDoc;
        if ("$in" in c) {
          const values = Array.isArray(c.$in) ? c.$in : [];
          const actualKey = toKey(actual);
          const has = values.some((value) => toKey(value) === actualKey);
          if (!has) return false;
          continue;
        }
        if ("$exists" in c) {
          const shouldExist = Boolean(c.$exists);
          const exists = actual !== undefined;
          if (exists !== shouldExist) return false;
          continue;
        }
      }

      if (toKey(actual) !== toKey(condition)) return false;
    }

    return true;
  }

  function applyUpdate(target: AnyDoc, update: AnyDoc, isInsert: boolean) {
    if (update.$set && typeof update.$set === "object") {
      for (const [key, value] of Object.entries(update.$set)) {
        deepSet(target, key, value);
      }
    }

    if (isInsert && update.$setOnInsert && typeof update.$setOnInsert === "object") {
      for (const [key, value] of Object.entries(update.$setOnInsert)) {
        deepSet(target, key, value);
      }
    }

    if (update.$inc && typeof update.$inc === "object") {
      for (const [key, value] of Object.entries(update.$inc)) {
        const current = Number(deepGet(target, key) ?? 0);
        deepSet(target, key, current + Number(value));
      }
    }
  }

  class InMemoryCursor {
    private readonly docs: AnyDoc[];

    constructor(docs: AnyDoc[]) {
      this.docs = [...docs];
    }

    sort(spec: Record<string, 1 | -1>) {
      const entries = Object.entries(spec);
      this.docs.sort((a, b) => {
        for (const [field, dir] of entries) {
          const av = deepGet(a, field);
          const bv = deepGet(b, field);
          const aCmp = toKey(av) as any;
          const bCmp = toKey(bv) as any;
          if (aCmp === bCmp) continue;
          if (aCmp == null && bCmp != null) return 1;
          if (aCmp != null && bCmp == null) return -1;
          if (aCmp < bCmp) return dir === 1 ? -1 : 1;
          if (aCmp > bCmp) return dir === 1 ? 1 : -1;
        }
        return 0;
      });
      return this;
    }

    limit(n: number) {
      const safe = Math.max(0, Math.floor(Number(n) || 0));
      this.docs.splice(safe);
      return this;
    }

    async toArray() {
      return [...this.docs];
    }

    async next() {
      return this.docs[0] ?? null;
    }
  }

  class InMemoryCollection {
    docs: AnyDoc[] = [];

    async createIndex() {
      return "ok";
    }

    seed(rows: AnyDoc[]) {
      this.docs = rows.map((item) => ({ ...item }));
    }

    all() {
      return this.docs.map((item) => ({ ...item }));
    }

    find(filter: AnyDoc = {}) {
      return new InMemoryCursor(this.docs.filter((doc) => matchesFilter(doc, filter)));
    }

    async findOne(filter: AnyDoc = {}) {
      const hit = this.docs.find((doc) => matchesFilter(doc, filter));
      return hit ? { ...hit } : null;
    }

    async updateOne(filter: AnyDoc, update: AnyDoc, options: AnyDoc = {}) {
      const idx = this.docs.findIndex((doc) => matchesFilter(doc, filter));
      if (idx >= 0) {
        const target = this.docs[idx];
        applyUpdate(target, update, false);
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
      }

      if (!options.upsert) {
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      }

      const inserted: AnyDoc = { _id: `mem_${++idSeq}` };
      for (const [key, value] of Object.entries(filter ?? {})) {
        if (key.startsWith("$")) continue;
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const v = value as AnyDoc;
          if ("$in" in v || "$exists" in v) continue;
        }
        deepSet(inserted, key, value);
      }
      applyUpdate(inserted, update, true);
      this.docs.push(inserted);

      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 1,
        upsertedId: inserted._id,
      };
    }

    async findOneAndUpdate(filter: AnyDoc, update: AnyDoc, options: AnyDoc = {}) {
      const idx = this.docs.findIndex((doc) => matchesFilter(doc, filter));
      const before = idx >= 0 ? { ...this.docs[idx] } : null;

      if (idx >= 0) {
        applyUpdate(this.docs[idx], update, false);
      } else if (options.upsert) {
        const inserted: AnyDoc = { _id: `mem_${++idSeq}` };
        for (const [key, value] of Object.entries(filter ?? {})) {
          if (key.startsWith("$")) continue;
          deepSet(inserted, key, value);
        }
        applyUpdate(inserted, update, true);
        this.docs.push(inserted);
      }

      const after = this.docs.find((doc) => matchesFilter(doc, filter)) ?? null;
      const out = options.returnDocument === "after" ? after : before;
      return { value: out ? { ...out } : null };
    }

    async updateMany(filter: AnyDoc, update: AnyDoc) {
      let modifiedCount = 0;
      for (const doc of this.docs) {
        if (!matchesFilter(doc, filter)) continue;
        applyUpdate(doc, update, false);
        modifiedCount += 1;
      }
      return { acknowledged: true, modifiedCount };
    }

    async countDocuments(filter: AnyDoc = {}) {
      return this.docs.filter((doc) => matchesFilter(doc, filter)).length;
    }
  }

  function getCollection(name: string) {
    const key = String(name || "");
    const existing = collections.get(key);
    if (existing) return existing;
    const created = new InMemoryCollection();
    collections.set(key, created);
    return created;
  }

  return {
    reset() {
      collections.clear();
      idSeq = 0;
    },
    seed(name: string, rows: AnyDoc[]) {
      getCollection(name).seed(rows);
    },
    read(name: string) {
      return getCollection(name).all();
    },
    getCollection,
  };
});

const revisions = vi.hoisted(() => ({
  mutate: vi.fn(),
  session: { id: "protocol-upsert-test-session" },
}));

vi.mock("@core/db/triMongo", async () => {
  const mongodb = await import("mongodb");
  return {
    ObjectId: mongodb.ObjectId,
    coreCol: async (name: string) => memory.getCollection(name),
    default: {
      ObjectId: mongodb.ObjectId,
      coreCol: async (name: string) => memory.getCollection(name),
    },
  };
});

vi.mock("@features/dossier/revisions", () => ({
  mutateDossierWithRevision: (...args: unknown[]) => revisions.mutate(...args),
}));

import {
  applyDossierUpsertContractAuthorized,
  createProtocolDossierUpsertContract,
  getDossierUpsertContractAuthorized,
} from "@features/dossier/protocolUpsert";
import {
  createProtocolRoundSeedContract,
  getRoundSeedContractAuthorized,
  handoffRoundSeedContractAuthorized,
} from "@features/topicRound/seedContract";

const reviewerActor: GovernanceActor = {
  userId: "reviewer-1",
  role: "reviewer",
  isAdmin: false,
  scopedOwnerIds: ["owner-1"],
  scopedEntityIds: ["owner-1"],
  personTrust: "verified",
};

const communityActor: GovernanceActor = {
  userId: "community-1",
  role: "community",
  isAdmin: false,
  scopedOwnerIds: [],
  scopedEntityIds: [],
  personTrust: "registered",
};

const adminActor: GovernanceActor = {
  userId: "admin-1",
  role: "admin",
  isAdmin: true,
  scopedOwnerIds: ["owner-1"],
  scopedEntityIds: ["owner-1"],
  personTrust: "institutional",
};

function seedRoom(roomId: ObjectId, overrides: Record<string, unknown> = {}) {
  memory.seed("anlassraum", [
    {
      _id: roomId,
      roomType: "public",
      ownerType: "platform",
      ownerId: "owner-1",
      stewardUserId: "reviewer-1",
      originType: "manual",
      ...overrides,
    },
  ]);
}

describe("GOV-EVENT-02 contracts hardening", () => {
  beforeEach(() => {
    memory.reset();
    revisions.mutate.mockReset();
    revisions.mutate.mockImplementation(async (input: any) => {
      const mutation = await input.mutate(revisions.session as any);
      return { result: mutation.result, revision: mutation.revision };
    });
  });

  it("Scenario A: protocol contract apply is additive, stateful, auditable", async () => {
    const roomId = new ObjectId();
    const dossierId = new ObjectId();

    seedRoom(roomId);
    memory.seed("dossiers", [
      {
        _id: dossierId,
        dossierId: "dossier-100",
        statementId: "stmt-100",
        title: "Protected Title",
        status: "draft",
      },
    ]);

    const protocolEntryId = new ObjectId();
    const created = await createProtocolDossierUpsertContract({
      protocolEntryId,
      qrSetCode: "QR-A",
      anlassraumId: roomId,
      dossierId,
      summary: "Kurzes Protokoll-Update",
      openQuestions: ["Wie wird finanziert?"],
      decisions: ["Variante A priorisieren"],
      nextSteps: ["Verwaltungstermin planen"],
      tags: ["event", "follow-up"],
      createdBy: "moderator-1",
    });

    expect(created.status).toBe("pending_review");
    expect(revisions.mutate).toHaveBeenCalled();

    const applied = await applyDossierUpsertContractAuthorized({
      contractId: created.contractId,
      actor: reviewerActor,
      actionNote: "Reviewed and applied",
    });

    expect(applied.contract.status).toBe("applied");
    expect(applied.contract.appliedBy).toBe(reviewerActor.userId);
    expect(applied.applyResult.status).toBe("applied");
    expect(applied.contract.auditTrail.at(-1)?.action).toBe("applied");

    const suggestions = memory.read("dossier_suggestions");
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    expect(suggestions.every((item) => item.status === "accepted")).toBe(true);

    const openQuestions = memory.read("open_questions");
    expect(openQuestions.length).toBe(1);
    expect(openQuestions[0].status).toBe("in_review");

    const dossier = memory.read("dossiers")[0];
    expect(dossier.title).toBe("Protected Title");
    expect(dossier.status).toBe("draft");
  });

  it("Scenario B: apply fails safely when target dossier is missing", async () => {
    const roomId = new ObjectId();
    seedRoom(roomId);

    const created = await createProtocolDossierUpsertContract({
      protocolEntryId: new ObjectId(),
      qrSetCode: "QR-B",
      anlassraumId: roomId,
      summary: "Ohne Dossier-Link",
      openQuestions: ["Wer prueft?"],
      createdBy: "moderator-1",
    });

    await expect(
      applyDossierUpsertContractAuthorized({
        contractId: created.contractId,
        actor: adminActor,
      }),
    ).rejects.toThrow("contract_missing_target_dossier");

    const detail = await getDossierUpsertContractAuthorized(adminActor, created.contractId);
    expect(detail.status).toBe("pending_review");
    expect(detail.linkStatus).toBe("pending_dossier_link");
    expect(memory.read("dossiers")).toHaveLength(0);
  });

  it("Scenario C: round handoff creates non-public review draft only", async () => {
    const roomId = new ObjectId();
    const dossierId = new ObjectId();

    seedRoom(roomId);
    memory.seed("dossiers", [
      {
        _id: dossierId,
        dossierId: "dossier-200",
        statementId: "stmt-200",
      },
    ]);

    const created = await createProtocolRoundSeedContract({
      protocolEntryId: new ObjectId(),
      qrSetCode: "QR-C",
      anlassraumId: roomId,
      dossierId,
      summary: "Runden-Vorbereitung",
      openQuestions: ["Welche Optionen sind realistisch?"],
      decisions: ["Option A", "Option B"],
      nextSteps: ["Optionen verifizieren"],
      tags: ["round", "event"],
      createdBy: "moderator-1",
    });

    const handoff = await handoffRoundSeedContractAuthorized({
      contractId: created.contractId,
      actor: reviewerActor,
      actionNote: "Ready for manual review",
    });

    expect(handoff.contract.status).toBe("draft_created");
    expect(handoff.roundDraft.status).toBe("draft");
    expect(handoff.roundDraft.visibility).toBe("internal");
    expect(handoff.roundDraft.publishState).toBe("manual_review_required");

    const detail = await getRoundSeedContractAuthorized(adminActor, created.contractId);
    expect(detail.roundDraftId).toBe(handoff.roundDraft.roundDraftId);
    expect(detail.lastAction).toBe("handoff");
  });

  it("Scenario D: community actors are forbidden for apply/handoff", async () => {
    const roomId = new ObjectId();
    const dossierId = new ObjectId();
    seedRoom(roomId);
    memory.seed("dossiers", [
      {
        _id: dossierId,
        dossierId: "dossier-300",
        statementId: "stmt-300",
      },
    ]);

    const upsert = await createProtocolDossierUpsertContract({
      protocolEntryId: new ObjectId(),
      qrSetCode: "QR-D1",
      anlassraumId: roomId,
      dossierId,
      summary: "Community darf nicht anwenden",
      createdBy: "moderator-1",
    });

    const round = await createProtocolRoundSeedContract({
      protocolEntryId: new ObjectId(),
      qrSetCode: "QR-D2",
      anlassraumId: roomId,
      dossierId,
      summary: "Community darf nicht handoffen",
      decisions: ["A", "B"],
      createdBy: "moderator-1",
    });

    await expect(
      applyDossierUpsertContractAuthorized({
        contractId: upsert.contractId,
        actor: communityActor,
      }),
    ).rejects.toThrow("actor_scope_forbidden");

    await expect(
      handoffRoundSeedContractAuthorized({
        contractId: round.contractId,
        actor: communityActor,
      }),
    ).rejects.toThrow("actor_scope_forbidden");
  });

  it("Legacy hardening: missing anlassraum is admin-only and explicit for non-admin", async () => {
    const upsert = await createProtocolDossierUpsertContract({
      protocolEntryId: new ObjectId(),
      qrSetCode: "QR-L1",
      summary: "Altvertrag ohne Anlassraum",
      createdBy: "legacy-import",
    });

    const round = await createProtocolRoundSeedContract({
      protocolEntryId: new ObjectId(),
      qrSetCode: "QR-L2",
      summary: "Altvertrag ohne Anlassraum",
      decisions: ["A", "B"],
      createdBy: "legacy-import",
    });

    await expect(
      getDossierUpsertContractAuthorized(reviewerActor, upsert.contractId),
    ).rejects.toThrow("actor_scope_requires_anlassraum");

    await expect(
      handoffRoundSeedContractAuthorized({
        contractId: round.contractId,
        actor: reviewerActor,
      }),
    ).rejects.toThrow("actor_scope_requires_anlassraum");

    const adminReadable = await getDossierUpsertContractAuthorized(adminActor, upsert.contractId);
    expect(adminReadable.contractId).toBe(upsert.contractId);
  });
});
