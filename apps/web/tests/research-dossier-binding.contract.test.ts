import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  coreCol: vi.fn(),
  dossiersCol: vi.fn(),
}));

vi.mock("@core/db/triMongo", async () => {
  const mongodb = await import("mongodb");
  return {
    ObjectId: mongodb.ObjectId,
    coreCol: (...args: unknown[]) => mocks.coreCol(...args),
  };
});

vi.mock("@features/dossier/db", () => ({
  dossiersCol: (...args: unknown[]) => mocks.dossiersCol(...args),
}));

import {
  bindResearchTaskToDossier,
  getTaskById,
  saveTask,
} from "@core/research/store";
import type { ResearchTaskDossierBinding } from "@core/research/types";
import {
  bindResearchTaskToCurrentDossier,
  isResearchTaskDossierBindingStale,
} from "@features/dossier/researchTaskBinding";

const TASK_ID = "507f1f77bcf86cd799439011";
const MISSING_TASK_ID = "507f1f77bcf86cd799439012";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

const BINDING_A: ResearchTaskDossierBinding = {
  dossierId: "dossier-a",
  dossierRevisionSeq: 3,
  dossierRevisionHash: HASH_A,
};

const BINDING_B: ResearchTaskDossierBinding = {
  dossierId: "dossier-b",
  dossierRevisionSeq: 1,
  dossierRevisionHash: HASH_B,
};

type StoredTask = Record<string, unknown> & { _id: ObjectId; title: string };
type StoredDossier = Record<string, unknown> & { dossierId: string };

const taskDocs = new Map<string, StoredTask>();
const dossierDocs = new Map<string, StoredDossier>();

const researchTasksCollection = {
  findOne: vi.fn(async (filter: Record<string, any>) => {
    const id = filter._id?.toHexString?.();
    return id ? taskDocs.get(id) ?? null : null;
  }),
  updateOne: vi.fn(
    async (
      filter: Record<string, any>,
      update: { $set?: Record<string, unknown> },
      options?: { upsert?: boolean },
    ) => {
      const id = filter._id?.toHexString?.();
      const doc = id ? taskDocs.get(id) : undefined;
      if (!doc) return { matchedCount: 0, modifiedCount: 0 };
      if (
        filter.dossierBinding?.$exists === false &&
        Object.prototype.hasOwnProperty.call(doc, "dossierBinding")
      ) {
        return { matchedCount: 0, modifiedCount: 0 };
      }
      Object.assign(doc, update.$set ?? {});
      return { matchedCount: 1, modifiedCount: 1, upsertedCount: options?.upsert ? 1 : 0 };
    },
  ),
  findOneAndUpdate: vi.fn(
    async (
      filter: Record<string, any>,
      update: { $set?: Record<string, unknown>; $setOnInsert?: Record<string, unknown> },
      options?: { upsert?: boolean },
    ) => {
      const id = filter._id?.toHexString?.();
      if (!id) return { value: null };
      let doc = taskDocs.get(id);
      if (!doc && options?.upsert) {
        doc = {
          _id: filter._id,
          title: "",
          ...(update.$setOnInsert ?? {}),
        } as StoredTask;
        taskDocs.set(id, doc);
      }
      if (!doc) return { value: null };
      Object.assign(doc, update.$set ?? {});
      return { value: { ...doc } };
    },
  ),
  insertOne: vi.fn(async (doc: StoredTask) => {
    taskDocs.set(doc._id.toHexString(), doc);
    return { insertedId: doc._id };
  }),
};

const dossiersCollection = {
  findOne: vi.fn(async (filter: Record<string, any>) => {
    return dossierDocs.get(String(filter.dossierId)) ?? null;
  }),
};

function seedTask(overrides: Record<string, unknown> = {}) {
  taskDocs.set(TASK_ID, {
    _id: new ObjectId(TASK_ID),
    title: "Research task",
    status: "open",
    ...overrides,
  });
}

function seedDossier(overrides: Record<string, unknown> = {}) {
  dossierDocs.set("dossier-a", {
    dossierId: "dossier-a",
    revisionSeq: 3,
    lastRevisionHash: HASH_A,
    ...overrides,
  });
}

describe("T2A ResearchTask ↔ Dossier owner binding", () => {
  beforeEach(() => {
    taskDocs.clear();
    dossierDocs.clear();
    vi.clearAllMocks();
    mocks.coreCol.mockImplementation(async (name: string) => {
      if (name === "researchTasks") return researchTasksCollection;
      throw new Error(`unexpected collection: ${name}`);
    });
    mocks.dossiersCol.mockResolvedValue(dossiersCollection);
  });

  it("keeps legacy unbound ResearchTasks readable without migration", async () => {
    seedTask();
    const task = await getTaskById(TASK_ID);
    expect(task?.id).toBe(TASK_ID);
    expect(task?.title).toBe("Research task");
    expect(task?.dossierBinding).toBeUndefined();
  });

  it("fails closed for invalid task IDs, invalid bindings, and missing tasks without upsert", async () => {
    await expect(bindResearchTaskToDossier("not-an-object-id", BINDING_A)).resolves.toEqual({
      ok: false,
      reason: "invalid_task_id",
    });
    await expect(
      bindResearchTaskToDossier(TASK_ID, {
        ...BINDING_A,
        dossierRevisionHash: "not-a-hash",
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid_binding" });

    await expect(bindResearchTaskToDossier(MISSING_TASK_ID, BINDING_A)).resolves.toEqual({
      ok: false,
      reason: "task_not_found",
    });
    expect(researchTasksCollection.updateOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ _id: expect.any(ObjectId), dossierBinding: { $exists: false } }),
      expect.any(Object),
      { upsert: false },
    );
    expect(taskDocs.has(MISSING_TASK_ID)).toBe(false);
  });

  it("rejects unknown or unversioned canonical Dossiers before any ResearchTask write", async () => {
    seedTask({ status: "completed", source: { statementId: "statement-1" }, modelConfidence: 1 });

    await expect(bindResearchTaskToCurrentDossier(TASK_ID, "dossier-a")).resolves.toEqual({
      ok: false,
      reason: "dossier_not_found",
    });
    expect(researchTasksCollection.updateOne).not.toHaveBeenCalled();

    seedDossier({ revisionSeq: undefined });
    await expect(bindResearchTaskToCurrentDossier(TASK_ID, "dossier-a")).resolves.toEqual({
      ok: false,
      reason: "invalid_dossier_head",
    });
    expect(researchTasksCollection.updateOne).not.toHaveBeenCalled();

    seedDossier({ revisionSeq: 3, lastRevisionHash: undefined });
    await expect(bindResearchTaskToCurrentDossier(TASK_ID, "dossier-a")).resolves.toEqual({
      ok: false,
      reason: "invalid_dossier_head",
    });

    seedDossier({ lastRevisionHash: "short" });
    await expect(bindResearchTaskToCurrentDossier(TASK_ID, "dossier-a")).resolves.toEqual({
      ok: false,
      reason: "invalid_dossier_head",
    });

    expect(taskDocs.get(TASK_ID)?.dossierBinding).toBeUndefined();
  });

  it("binds only the current canonical head and treats exact replay as idempotent", async () => {
    seedTask();
    seedDossier();

    await expect(bindResearchTaskToCurrentDossier(TASK_ID, "dossier-a")).resolves.toEqual({
      ok: true,
      status: "bound",
    });
    expect(taskDocs.get(TASK_ID)?.dossierBinding).toEqual(BINDING_A);

    await expect(bindResearchTaskToCurrentDossier(TASK_ID, "dossier-a")).resolves.toEqual({
      ok: true,
      status: "already_bound",
    });
  });

  it("rejects different-Dossier and changed-revision rebinds plus malformed pre-existing state", async () => {
    seedTask({ dossierBinding: BINDING_A });

    await expect(bindResearchTaskToDossier(TASK_ID, BINDING_B)).resolves.toEqual({
      ok: false,
      reason: "binding_conflict",
    });
    await expect(
      bindResearchTaskToDossier(TASK_ID, {
        ...BINDING_A,
        dossierRevisionSeq: 4,
      }),
    ).resolves.toEqual({ ok: false, reason: "binding_conflict" });
    await expect(
      bindResearchTaskToDossier(TASK_ID, {
        ...BINDING_A,
        dossierRevisionHash: HASH_B,
      }),
    ).resolves.toEqual({ ok: false, reason: "binding_conflict" });

    seedTask({ dossierBinding: { dossierId: "dossier-a", dossierRevisionSeq: 0 } });
    await expect(bindResearchTaskToDossier(TASK_ID, BINDING_A)).resolves.toEqual({
      ok: false,
      reason: "malformed_existing_binding",
    });
  });

  it("keeps generic saveTask outside dossierBinding authority", async () => {
    seedTask();
    await saveTask({
      id: TASK_ID,
      title: "Attempted generic bind",
      dossierBinding: BINDING_A,
    } as any);
    expect(taskDocs.get(TASK_ID)?.dossierBinding).toBeUndefined();

    taskDocs.get(TASK_ID)!.dossierBinding = BINDING_A;
    await saveTask({
      id: TASK_ID,
      title: "Attempted generic rebind",
      dossierBinding: BINDING_B,
    } as any);
    expect(taskDocs.get(TASK_ID)?.dossierBinding).toEqual(BINDING_A);

    await saveTask({ id: TASK_ID, title: "Attempted generic clear", dossierBinding: undefined } as any);
    expect(taskDocs.get(TASK_ID)?.dossierBinding).toEqual(BINDING_A);
  });

  it("allows exactly one winner for conflicting concurrent first binds", async () => {
    seedTask();

    const [first, second] = await Promise.all([
      bindResearchTaskToDossier(TASK_ID, BINDING_A),
      bindResearchTaskToDossier(TASK_ID, BINDING_B),
    ]);

    const successes = [first, second].filter((result) => result.ok);
    const conflicts = [first, second].filter(
      (result) => !result.ok && result.reason === "binding_conflict",
    );
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
    expect([BINDING_A, BINDING_B]).toContainEqual(taskDocs.get(TASK_ID)?.dossierBinding);
  });

  it("marks ID, sequence, hash drift and malformed state stale without mutation", () => {
    const currentHead = {
      dossierId: "dossier-a",
      revisionSeq: 3,
      lastRevisionHash: HASH_A,
    };

    expect(isResearchTaskDossierBindingStale(BINDING_A, currentHead)).toBe(false);
    expect(
      isResearchTaskDossierBindingStale({ ...BINDING_A, dossierId: "dossier-b" }, currentHead),
    ).toBe(true);
    expect(
      isResearchTaskDossierBindingStale({ ...BINDING_A, dossierRevisionSeq: 2 }, currentHead),
    ).toBe(true);
    expect(
      isResearchTaskDossierBindingStale({ ...BINDING_A, dossierRevisionHash: HASH_B }, currentHead),
    ).toBe(true);
    expect(isResearchTaskDossierBindingStale(BINDING_A, { ...currentHead, revisionSeq: 0 })).toBe(
      true,
    );
    expect(isResearchTaskDossierBindingStale({ dossierId: "dossier-a" }, currentHead)).toBe(true);
  });

  it("uses only canonical dossiers reads and existing researchTasks writes", async () => {
    seedTask();
    seedDossier();

    await bindResearchTaskToCurrentDossier(TASK_ID, "dossier-a");

    expect(mocks.dossiersCol).toHaveBeenCalledTimes(1);
    expect(dossiersCollection.findOne).toHaveBeenCalledWith(
      { dossierId: "dossier-a" },
      { projection: { dossierId: 1, revisionSeq: 1, lastRevisionHash: 1 } },
    );
    expect(mocks.coreCol).toHaveBeenCalledWith("researchTasks");
    expect(researchTasksCollection.updateOne).toHaveBeenCalledTimes(1);
  });
});
