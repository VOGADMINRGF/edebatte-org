import { afterEach, describe, expect, it } from "vitest";

import { buildCreatePlanner } from "@/features/create/createPlanner";

const COMPLEX_INPUT =
  "Ich bin schon für die Würde des Menschen, aber stelle dessen Legitimation in Frage für all jene, die die Gesellschaft massiv und/oder wiederholt einem einzelnen irreparablen Schaden verursacht. Ich bin für eine offene Grenzpolitik, in meiner Welt gibt es diese nicht. Ich hätte eine einheitliche Energie- und Industriepolitik in Gesamt-Europa. Ich würde das Volk in seinen Regionen abstimmen lassen, insbesondere zu kleineren Fragestellungen. Ich würde das Budget anders verteilen und nicht nur pauschal, gäbe anderen Pflichten und Rechte, aber im Einklang des Grundgesetzes.";

describe("create planner complex civic input contract", () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  });

  it("does not invent a multi-cluster result when no provider is configured", async () => {
    process.env.OPENAI_API_KEY = "";

    const planner = await buildCreatePlanner({
      text: COMPLEX_INPUT,
      locale: "de",
    });

    expect(planner.plannerRole).toBe("planner_only");
    expect(planner.qualityStatus).toBe("failed");
    expect(planner.source).toBe("technical_fallback");
    expect(planner.degradedReason).toBe("missing_provider_key");
    expect(planner.plannerClusters).toEqual([]);
    expect(planner.topicCandidates).toEqual([]);
    expect(planner.graphSearchTerms).toEqual([]);
  });
});
