import { describe, expect, it } from "vitest";
import { PUBLIC_PROGRAMME_QUESTION_SEEDS } from "@/features/swipes/publicProgrammeQuestionSeeds";

describe("swipes human question contract", () => {
  it("keeps the public demo bank concrete instead of repeating Soll-templates", () => {
    expect(PUBLIC_PROGRAMME_QUESTION_SEEDS).toHaveLength(100);
    expect(PUBLIC_PROGRAMME_QUESTION_SEEDS.every((item) => !/^Soll\b/i.test(item.title.trim()))).toBe(true);

    const normalizedTitles = new Set(PUBLIC_PROGRAMME_QUESTION_SEEDS.map((item) => item.title.trim()));
    expect(normalizedTitles.size).toBeGreaterThanOrEqual(90);
  });

  it("provides human context, a tradeoff and five different consequences per direction", () => {
    for (const item of PUBLIC_PROGRAMME_QUESTION_SEEDS) {
      expect(item.humanContext?.trim().length).toBeGreaterThan(20);
      expect(item.tradeoff?.trim().length).toBeGreaterThan(20);
      expect(item.decisionConsequences?.agree).toHaveLength(5);
      expect(item.decisionConsequences?.disagree).toHaveLength(5);

      const agreeTitles = item.decisionConsequences?.agree.map((entry) => entry.title) ?? [];
      const disagreeTitles = item.decisionConsequences?.disagree.map((entry) => entry.title) ?? [];
      expect(agreeTitles).not.toEqual(disagreeTitles);
      expect(new Set(agreeTitles).size).toBe(5);
      expect(new Set(disagreeTitles).size).toBe(5);
    }
  });
});
