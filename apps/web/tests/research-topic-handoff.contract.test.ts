import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  proposals: [] as Array<Record<string, any>>,
  dossiers: [] as Array<Record<string, any>>,
  suggestions: [] as Array<Record<string, any>>,
};

vi.mock("@core/db/triMongo", () => ({
  getCol: vi.fn(async (name: string) => {
    if (name === "statement_proposals") {
      return {
        findOne: async (query: Record<string, any>) =>
          state.proposals.find((entry) => entry.researchTopicKey === query.researchTopicKey) ?? null,
        find: () => ({
          sort: () => ({
            limit: () => ({
              toArray: async () => state.proposals,
            }),
          }),
        }),
        insertOne: async (doc: Record<string, any>) => {
          const insertedId = `proposal-${state.proposals.length + 1}`;
          state.proposals.push({ ...doc, _id: insertedId });
          return { insertedId };
        },
        updateOne: async (query: Record<string, any>, update: Record<string, any>) => {
          const entry = state.proposals.find((item) => item._id === query._id);
          if (entry) Object.assign(entry, update.$set ?? {});
          return { modifiedCount: entry ? 1 : 0 };
        },
      };
    }
    throw new Error(`unexpected_collection_${name}`);
  }),
}));

vi.mock("@core/utils/hash", () => ({
  stableHash: (value: string) => `hash-${value.length}-1234567890abcdef`,
}));

vi.mock("@features/common/utils/textNormalization", () => ({
  normalizeGermanSearchText: (value: string) => value.trim().toLowerCase(),
  normalizeGermanSlug: (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "thema",
}));

vi.mock("@features/dossier/db", () => ({
  dossiersCol: vi.fn(async () => ({
    findOne: async (query: Record<string, any>) =>
      state.dossiers.find(
        (entry) =>
          entry.dossierId === query.dossierId ||
          entry.statementId === query.statementId ||
          entry.dossierId === query.$or?.[0]?.dossierId ||
          entry.statementId === query.$or?.[1]?.statementId,
      ) ?? null,
    insertOne: async (doc: Record<string, any>) => {
      state.dossiers.push(doc);
      return { insertedId: doc.dossierId };
    },
  })),
  dossierSuggestionsCol: vi.fn(async () => ({
    updateOne: async (query: Record<string, any>, update: Record<string, any>) => {
      const existing = state.suggestions.find((entry) => entry.suggestionId === query.suggestionId);
      if (existing) {
        Object.assign(existing, update.$set ?? {});
      } else {
        state.suggestions.push({ suggestionId: query.suggestionId, ...(update.$set ?? {}), ...(update.$setOnInsert ?? {}) });
      }
      return { modifiedCount: 1, upsertedCount: existing ? 0 : 1 };
    },
  })),
}));

vi.mock("@features/dossier/revisions", () => ({
  logDossierRevision: vi.fn(async () => undefined),
}));

describe("research topic handoff", () => {
  beforeEach(() => {
    state.proposals = [];
    state.dossiers = [];
    state.suggestions = [];
  });

  it("makes a research finding immediately swipe-ready and creates a review-first dossier draft", async () => {
    const { upsertResearchTopicFinding } = await import("@features/research/topicHandoff");

    const result = await upsertResearchTopicFinding({
      topicKey: "mindestlohn-niedriglohn",
      title: "Mindestlohn und Niedriglohn",
      summary: "Research finding",
      decisionQuestion: "Wie soll die Lohnuntergrenze ausgestaltet werden?",
      topic: "Arbeit und Einkommen",
      responsibility: "Bund",
      createDossierDraft: true,
      sources: [
        {
          title: "Destatis Mindestlohn",
          url: "https://www.destatis.de/DE/Themen/Arbeit/Verdienste/Mindestloehne/_inhalt.html",
          publisher: "Statistisches Bundesamt",
          type: "official",
        },
      ],
    });

    expect(result.swipeReady).toBe(true);
    expect(result.dossierDraftCreated).toBe(true);
    expect(result.aiOrchestratorReviewed).toBe(false);
    expect(result.reviewRequired).toBe(true);
    expect(state.proposals).toHaveLength(1);
    expect(state.dossiers).toHaveLength(1);
    expect(state.dossiers[0]).toMatchObject({
      status: "draft",
      dossierId: "research-draft:mindestlohn-niedriglohn",
    });
    expect(state.suggestions).toHaveLength(1);
    expect(state.suggestions[0]).toMatchObject({
      type: "source",
      status: "pending",
      dossierId: "research-draft:mindestlohn-niedriglohn",
    });
  });

  it("is idempotent for the same research topic", async () => {
    const { upsertResearchTopicFinding } = await import("@features/research/topicHandoff");
    const finding = {
      topicKey: "eeg-novelle-2027",
      title: "EEG-Novelle 2027",
      summary: "Research finding",
      decisionQuestion: "Wie soll der Ausbau gesteuert werden?",
      topic: "Energie",
      responsibility: "Bund",
      createDossierDraft: true,
      sources: [],
    };

    await upsertResearchTopicFinding(finding);
    await upsertResearchTopicFinding(finding);

    expect(state.proposals).toHaveLength(1);
    expect(state.dossiers).toHaveLength(1);
  });
});
