import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  dossierRevisionsCol: vi.fn(),
  dossiersCol: vi.fn(),
}));

vi.mock("@core/db/triMongo", () => ({
  getDb: (...args: unknown[]) => mocks.getDb(...args),
}));

vi.mock("@features/dossier/db", () => ({
  dossierRevisionsCol: (...args: unknown[]) => mocks.dossierRevisionsCol(...args),
  dossiersCol: (...args: unknown[]) => mocks.dossiersCol(...args),
}));

import { logDossierRevision } from "@features/dossier/revisions";

type RevisionDoc = Record<string, any>;

type HarnessState = {
  head: { dossierId: string; lastRevisionHash?: string; revisionSeq?: number; lastRevisionAt?: Date };
  revisions: RevisionDoc[];
  casConflictsRemaining: number;
  failInsert: boolean;
  missingDossier: boolean;
  sessionsStarted: number;
  updateCalls: number;
};

function buildHarness() {
  const state: HarnessState = {
    head: { dossierId: "dossier-1" },
    revisions: [],
    casConflictsRemaining: 0,
    failInsert: false,
    missingDossier: false,
    sessionsStarted: 0,
    updateCalls: 0,
  };

  const revisionsCol = {
    find: vi.fn(() => ({
      sort: () => ({
        limit: () => ({
          next: async () => state.revisions.at(-1) ?? null,
        }),
      }),
    })),
    insertOne: vi.fn(async (doc: RevisionDoc) => {
      if (state.failInsert) throw new Error("revision insert failed");
      state.revisions.push({ ...doc });
      return { acknowledged: true, insertedId: doc.revId };
    }),
  };

  const dossiersCol = {
    findOne: vi.fn(async () => {
      if (state.missingDossier) return null;
      return { ...state.head };
    }),
    updateOne: vi.fn(async (filter: Record<string, any>, update: Record<string, any>) => {
      state.updateCalls += 1;
      if (state.casConflictsRemaining > 0) {
        state.casConflictsRemaining -= 1;
        return { modifiedCount: 0 };
      }

      const expected = filter.lastRevisionHash;
      const matches =
        typeof expected === "string"
          ? state.head.lastRevisionHash === expected
          : expected?.$exists === false
            ? state.head.lastRevisionHash === undefined
            : false;
      if (!matches) return { modifiedCount: 0 };

      Object.assign(state.head, update.$set ?? {});
      state.head.revisionSeq = (state.head.revisionSeq ?? 0) + (update.$inc?.revisionSeq ?? 0);
      return { modifiedCount: 1 };
    }),
  };

  const client = {
    startSession: vi.fn(() => {
      state.sessionsStarted += 1;
      return {
        withTransaction: async (callback: () => Promise<unknown>) => {
          const headBefore = { ...state.head };
          const revisionsBefore = state.revisions.map((revision) => ({ ...revision }));
          try {
            return await callback();
          } catch (error) {
            state.head = headBefore;
            state.revisions.splice(0, state.revisions.length, ...revisionsBefore);
            throw error;
          }
        },
        endSession: vi.fn(async () => undefined),
      };
    }),
  };

  mocks.getDb.mockResolvedValue({ client });
  mocks.dossierRevisionsCol.mockResolvedValue(revisionsCol);
  mocks.dossiersCol.mockResolvedValue(dossiersCol);

  return { state, revisionsCol, dossiersCol, client };
}

const baseInput = {
  dossierId: "dossier-1",
  entityType: "claim",
  entityId: "claim-1",
  action: "update" as const,
  diffSummary: "Claim aktualisiert.",
  byRole: "editor" as const,
  byUserId: "editor-1",
};

describe("dossier revision atomic writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("atomically advances the dossier head and inserts the matching linked revision", async () => {
    const { state } = buildHarness();

    const revision = await logDossierRevision(baseInput);

    expect(state.revisions).toHaveLength(1);
    expect(revision.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(revision.hashAlgo).toBe("sha256");
    expect(state.head.lastRevisionHash).toBe(revision.hash);
    expect(state.head.revisionSeq).toBe(1);
    expect(state.revisions[0]?.hash).toBe(state.head.lastRevisionHash);
  });

  it("rolls back the head when durable revision insertion fails", async () => {
    const { state } = buildHarness();
    state.failInsert = true;

    await expect(logDossierRevision(baseInput)).rejects.toThrow("revision insert failed");

    expect(state.head.lastRevisionHash).toBeUndefined();
    expect(state.head.revisionSeq).toBeUndefined();
    expect(state.revisions).toHaveLength(0);
  });

  it("hard-fails after bounded CAS exhaustion without persisting an unchained revision", async () => {
    const { state } = buildHarness();
    state.casConflictsRemaining = 5;

    await expect(logDossierRevision(baseInput)).rejects.toThrow("revision head changed concurrently");

    expect(state.updateCalls).toBe(5);
    expect(state.sessionsStarted).toBe(5);
    expect(state.revisions).toHaveLength(0);
    expect(state.head.lastRevisionHash).toBeUndefined();
  });

  it("retries a concurrent CAS loser and persists exactly one stable operation", async () => {
    const { state } = buildHarness();
    state.casConflictsRemaining = 1;

    const revision = await logDossierRevision(baseInput);

    expect(state.sessionsStarted).toBe(2);
    expect(state.revisions).toHaveLength(1);
    expect(state.revisions[0]?.revId).toBe(revision.revId);
    expect(state.revisions[0]?.timestamp).toEqual(revision.timestamp);
    expect(state.head.lastRevisionHash).toBe(revision.hash);
  });

  it("chains successive writers instead of treating them as independent evidence history", async () => {
    const { state } = buildHarness();

    const first = await logDossierRevision(baseInput);
    const second = await logDossierRevision({
      ...baseInput,
      entityId: "claim-2",
      diffSummary: "Zweiter Claim aktualisiert.",
    });

    expect(state.revisions).toHaveLength(2);
    expect(second.prevHash).toBe(first.hash);
    expect(state.head.lastRevisionHash).toBe(second.hash);
    expect(state.head.revisionSeq).toBe(2);
  });

  it("fails closed for a missing dossier instead of creating an orphan revision", async () => {
    const { state } = buildHarness();
    state.missingDossier = true;

    await expect(logDossierRevision(baseInput)).rejects.toThrow("cannot append revision for missing dossier");

    expect(state.revisions).toHaveLength(0);
  });

  it("keeps db.ts as a delegate instead of a second hash-chain writer", () => {
    const dbSource = readFileSync(path.resolve(process.cwd(), "../../features/dossier/db.ts"), "utf8");

    expect(dbSource).not.toContain("computeRevisionHash");
    expect(dbSource).not.toContain("REVISION_HASH_ALGO");
    expect(dbSource).not.toContain("DISABLE_HASH_CHAIN");
    expect(dbSource).toContain('const { logDossierRevision } = await import("./revisions")');
    expect(dbSource).toContain("return logDossierRevision(input)");
  });
});
