import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeContribution: vi.fn(),
}));

vi.mock("@features/analyze/analyzeContribution", () => ({
  analyzeContribution: (...args: unknown[]) => mocks.analyzeContribution(...args),
}));

import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";

describe("create graph match after planner contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "";
    mocks.analyzeContribution.mockRejectedValue(new Error("provider_failed"));
  });

  it("defers graph matching until the user confirms the first structure", async () => {
    const result = await buildCreateIntelligentFollowup({
      text:
        "Ich bin für besseren Tierschutz und Tierhaltung. Das sollte Europa und weltweit einheitlich umgesetzt werden, mindestens in den Ländern, aus denen wir importieren oder in die wir exportieren. Es geht um Tierwohl, Agrar, Bio-Label und Haltungsstufen.",
      locale: "de",
      intent: "contribute",
    });

    expect(result.meta?.graphMatch.stage).toBe("after_structure");
    expect(result.meta?.graphMatch.prepared).toBe(false);
    expect(result.meta?.graphMatch.requiresConfirmation).toBe(true);
    expect(result.meta?.graphMatch.searchTerms).toEqual([]);
    expect(result.meta?.graphMatch.matches).toEqual([]);
    expect(result.meta?.graphMatch.matchedTopics).toEqual([]);
    expect(result.meta?.graphMatch.matchedDossiers).toEqual([]);
    expect(result.meta?.graphMatch.matchedClaims).toEqual([]);
    expect(result.meta?.graphMatch.matchedAnlassraeume).toEqual([]);
    expect(result.meta?.graphMatch.matchedVotes).toEqual([]);
    expect(result.meta?.graphMatch.shouldCreateNewTopic).toBe(false);
    expect(result.meta?.deepSearchUsed).toBe(false);
  });

  it("blocks graph match preparation when the planner stays generic", async () => {
    const result = await buildCreateIntelligentFollowup({
      text: "Ich habe da ein öffentliches Thema, über das man einmal sprechen sollte.",
      locale: "de",
      intent: "contribute",
    });

    expect(result.meta?.planner.qualityStatus).not.toBe("specific");
    expect(result.meta?.graphMatch.prepared).toBe(false);
    expect(result.meta?.graphMatch.searchTerms).toEqual([]);
    expect(result.meta?.graphMatch.matches).toEqual([]);
  });
});
