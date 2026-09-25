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

import {
  logDossierRevision,
  mutateDossierWithRevision,
} from "@features/dossier/revisions";

type RevisionDoc = Record<string, any>;

type HarnessState = {
  head: { dossierId: string; lastRevisionHash?: string; revisionSeq?: number; lastRevisionAt?: Date };
  revisions: RevisionDoc[];
  domainValue: string;
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
    domainValue: "before",
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
          const domainBefore = state.domainValue;
          try {
            return await callback();
          } catch (error) {
            state.head = headBefore;
            state.revisions.splice(0, state.revisions.length, ...revisionsBefore);
            state.domainValue = domainBefore;
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

function mutationRevision() {
  return {
    entityType: baseInput.entityType,
    entityId: baseInput.entityId,
    action: baseInput.action,
    diffSummary: baseInput.diffSummary,
    byRole: baseInput.byRole,
    byUserId: baseInput.byUserId,
  };
}

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

  it("rolls back the caller domain mutation when revision insertion fails", async () => {
    const { state } = buildHarness();
    state.failInsert = true;

    await expect(
      mutateDossierWithRevision({
        dossierId: baseInput.dossierId,
        mutate: async () => {
          state.domainValue = "changed";
          return { result: "changed", revision: mutationRevision() };
        },
      }),
    ).rejects.toThrow("revision insert failed");

    expect(state.domainValue).toBe("before");
    expect(state.head.lastRevisionHash).toBeUndefined();
    expect(state.revisions).toHaveLength(0);
  });

  it("hard-fails after bounded CAS exhaustion without persisting domain or revision drift", async () => {
    const { state } = buildHarness();
    state.casConflictsRemaining = 5;
    let mutationAttempts = 0;

    await expect(
      mutateDossierWithRevision({
        dossierId: baseInput.dossierId,
        mutate: async () => {
          mutationAttempts += 1;
          state.domainValue = `attempt-${mutationAttempts}`;
          return { result: state.domainValue, revision: mutationRevision() };
        },
      }),
    ).rejects.toThrow("revision head changed concurrently");

    expect(mutationAttempts).toBe(5);
    expect(state.updateCalls).toBe(5);
    expect(state.sessionsStarted).toBe(5);
    expect(state.domainValue).toBe("before");
    expect(state.revisions).toHaveLength(0);
    expect(state.head.lastRevisionHash).toBeUndefined();
  });

  it("retries a CAS loser as one atomic operation and commits domain data exactly once", async () => {
    const { state } = buildHarness();
    state.casConflictsRemaining = 1;
    let mutationAttempts = 0;

    const committed = await mutateDossierWithRevision({
      dossierId: baseInput.dossierId,
      mutate: async () => {
        mutationAttempts += 1;
        state.domainValue = "changed";
        return { result: { value: state.domainValue }, revision: mutationRevision() };
      },
    });

    expect(mutationAttempts).toBe(2);
    expect(state.sessionsStarted).toBe(2);
    expect(state.domainValue).toBe("changed");
    expect(state.revisions).toHaveLength(1);
    expect(committed.result).toEqual({ value: "changed" });
    expect(committed.revision?.revId).toBe(state.revisions[0]?.revId);
    expect(state.head.lastRevisionHash).toBe(state.revisions[0]?.hash);
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

  it("fails closed for a missing dossier instead of leaving the caller mutation or orphan revision", async () => {
    const { state } = buildHarness();
    state.missingDossier = true;

    await expect(
      mutateDossierWithRevision({
        dossierId: baseInput.dossierId,
        mutate: async () => {
          state.domainValue = "changed";
          return { result: null, revision: mutationRevision() };
        },
      }),
    ).rejects.toThrow("cannot append revision for missing dossier");

    expect(state.domainValue).toBe("before");
    expect(state.revisions).toHaveLength(0);
  });

  it("keeps all audited write paths on the single canonical transaction boundary", () => {
    const dbSource = readFileSync(path.resolve(process.cwd(), "../../features/dossier/db.ts"), "utf8");
    const claimRoute = readFileSync(
      path.resolve(process.cwd(), "src/app/api/dossiers/[dossierId]/claims/upsert/route.ts"),
      "utf8",
    );

    expect(dbSource).not.toContain("computeRevisionHash");
    expect(dbSource).not.toContain("REVISION_HASH_ALGO");
    expect(dbSource).not.toContain("DISABLE_HASH_CHAIN");
    expect(dbSource).toContain('const { mutateDossierWithRevision } = await import("./revisions")');
    expect(dbSource).toContain("return mutateDossierWithRevision({ dossierId, mutate })");
    expect(dbSource).toContain("includeResultMetadata: true, session");
    expect(dbSource).toContain("{ session },");

    expect(claimRoute).toContain('import { mutateDossierWithRevision } from "@features/dossier/revisions"');
    expect(claimRoute).toContain("const transaction = await mutateDossierWithRevision({");
    expect(claimRoute).toContain("includeResultMetadata: true, session");
    expect(claimRoute).not.toContain("await logDossierRevision(");
  });
});
