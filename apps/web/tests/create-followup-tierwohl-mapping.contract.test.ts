import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeContribution: vi.fn(),
}));

vi.mock("@features/analyze/analyzeContribution", () => ({
  analyzeContribution: (...args: unknown[]) => mocks.analyzeContribution(...args),
}));

import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";
import { buildCreateStructureBranches } from "@/features/create/intelligentFollowupContract";

const TIERWOHL_TEXT =
  "Ich bin für besseren Tierschutz und Tierhaltung und denke das ist moralisch schwierig. Das Ganze sollte Europa und weltweit einheitlich umgesetzt werden, mindestens in den Ländern, in denen wir unmittelbar importieren bzw. exportieren. Das sollte für alle gelten: Fleisch, Geflügel, Fisch. Tierhaltung Agrar, Tierwohl, ethische Frage, Stellung Bundes europaweit, Bio Label, Haltungsstufe etc.";

describe("create follow-up tierwohl mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "";
  });

  it("does not invent tierwohl structure when the provider is unavailable", async () => {
    mocks.analyzeContribution.mockRejectedValue(new Error("provider_failed"));

    const result = await buildCreateIntelligentFollowup({
      text: TIERWOHL_TEXT,
      locale: "de",
      intent: "contribute",
    });
    const branches = buildCreateStructureBranches(result, 5);
    const topicLabels = result.understanding.topics.map((topic) => topic.label);
    const branchTitles = branches.map((branch) => branch.title);
    const suggestionTitles = result.suggestions.map((suggestion) => suggestion.title);

    expect(result.meta?.planner.plannerTopic).toBe("Analyse noch nicht validiert");
    expect(result.meta?.planner.providerPlan.plannerRole).toBe("planner_only");
    expect(result.meta?.researchUsed).toBe("none");
    expect(result.meta?.deepSearchUsed).toBe(false);
    expect(result.meta?.planner.qualityStatus).toBe("failed");
    expect(result.meta?.planner.degradedReason).toBe("missing_provider_key");
    expect(result.understanding.statements).toEqual([]);
    expect(result.understanding.scopes).toEqual(["unclear"]);
    expect(topicLabels).toEqual([]);
    expect(branchTitles).toEqual([]);
    expect(result.understanding.openQuestion).toBeNull();
    expect(suggestionTitles.some((title) => /amtstr[aä]ger|wohnen|verkehr|klima/i.test(title))).toBe(false);
    expect(topicLabels.some((label) => /amtstr[aä]ger|wohnen|verkehr|klima/i.test(label))).toBe(false);
    expect(suggestionTitles).toEqual([]);
  });
});
