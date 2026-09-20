import { describe, expect, it } from "vitest";
import { PUBLIC_PROGRAMME_QUESTION_SEEDS } from "@/features/swipes/publicProgrammeQuestionSeeds";
import {
  SWIPE_QUESTION_AGENT_GUIDANCE,
  assessSwipeQuestionDeckQuality,
  assessSwipeQuestionQuality,
  buildSwipeQuestionAgentPromptFragment,
} from "@/features/swipes/questionQualityContract";
import type { SwipeItem } from "@/features/swipes/types";

describe("swipes human question contract", () => {
  it("keeps the public demo bank concrete, neutral and semantically varied", () => {
    expect(PUBLIC_PROGRAMME_QUESTION_SEEDS).toHaveLength(100);
    expect(PUBLIC_PROGRAMME_QUESTION_SEEDS.every((item) => !/^Soll\b/i.test(item.title.trim()))).toBe(true);
    expect(
      PUBLIC_PROGRAMME_QUESTION_SEEDS.every(
        (item) => !/\b(guter weg|wäre es richtig|diesen weg mitgehen|vernünftiger weg)\b/i.test(item.title),
      ),
    ).toBe(true);

    const normalizedTitles = new Set(PUBLIC_PROGRAMME_QUESTION_SEEDS.map((item) => item.title.trim()));
    expect(normalizedTitles.size).toBeGreaterThanOrEqual(90);
    expect(assessSwipeQuestionDeckQuality(PUBLIC_PROGRAMME_QUESTION_SEEDS)).toEqual({ ready: true, issues: [] });

    const byTheme = new Map<string, SwipeItem[]>();
    for (const item of PUBLIC_PROGRAMME_QUESTION_SEEDS) {
      const themeId = item.id.replace(/-\d+$/, "");
      byTheme.set(themeId, [...(byTheme.get(themeId) ?? []), item]);
    }

    expect(byTheme.size).toBe(20);
    for (const items of byTheme.values()) {
      expect(items).toHaveLength(5);
      expect(new Set(items.map((item) => item.text)).size).toBe(5);
      expect(new Set(items.map((item) => item.tradeoff)).size).toBe(5);
    }
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
      expect(assessSwipeQuestionQuality(item)).toEqual({ ready: true, issues: [] });
    }
  });

  it("allows a concrete neutral Soll question and treats generic repetition as a deck problem", () => {
    const base = PUBLIC_PROGRAMME_QUESTION_SEEDS[0];
    const concrete = {
      ...base,
      title: "Soll Berlin zusätzliche Busspuren bis 2030 einrichten, sofern die Finanzierung beschlossen ist?",
    };

    expect(assessSwipeQuestionQuality(concrete)).toEqual({ ready: true, issues: [] });

    const repetitive = Array.from({ length: 20 }, (_, index) => ({
      ...concrete,
      id: `soll-repeat-${index}`,
      title: `Soll Berlin zusätzliche Busspuren Variante ${index} einrichten?`,
    }));
    expect(assessSwipeQuestionDeckQuality(repetitive).ready).toBe(false);
  });

  it("rejects approval-seeking wording and monotonous deck framing", () => {
    const base = PUBLIC_PROGRAMME_QUESTION_SEEDS[0];
    expect(
      assessSwipeQuestionQuality({ ...base, title: "Wäre das ein guter Weg für Deutschland?" }).issues,
    ).toContain("loaded_approval_frame");

    const repetitive = Array.from({ length: 20 }, (_, index) => ({
      ...base,
      id: `repeat-${index}`,
      title: `Wie stehst du dazu, dass Variante ${index} gilt?`,
    }));
    expect(assessSwipeQuestionDeckQuality(repetitive).ready).toBe(false);
    expect(assessSwipeQuestionDeckQuality(repetitive).issues[0]?.issue).toBe("repetitive_question_frame");
  });

  it("publishes a reusable neutral prompt fragment for swipe-producing agents", () => {
    expect(SWIPE_QUESTION_AGENT_GUIDANCE.length).toBeGreaterThanOrEqual(10);
    const prompt = buildSwipeQuestionAgentPromptFragment();
    expect(prompt).toContain("SWIPE-QUESTION-QUALITY");
    expect(prompt).toContain("alltagsnah");
    expect(prompt).toContain("bis zu fünf mögliche Folgen für Zustimmung und Ablehnung");
    expect(prompt).toContain("Erfinde keine Zahlen");
    expect(prompt).toContain("ohne eine politische Seite sprachlich zu bevorzugen");
    expect(prompt).toContain("guter Weg");
    expect(prompt).toContain("gesamten Kartenstapel");
  });
});
