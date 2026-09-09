import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callOpenAIJson: vi.fn(),
  callAnthropic: vi.fn(),
  callMistral: vi.fn(),
  logAiUsage: vi.fn(),
}));

vi.mock("@features/ai", () => ({
  callOpenAIJson: (...args: unknown[]) => mocks.callOpenAIJson(...args),
}));
vi.mock("@features/ai/providers/anthropic", () => ({
  callAnthropic: (...args: unknown[]) => mocks.callAnthropic(...args),
}));
vi.mock("@features/ai/providers/mistral", () => ({
  callMistral: (...args: unknown[]) => mocks.callMistral(...args),
}));
vi.mock("@core/telemetry/aiUsage", () => ({
  logAiUsage: (...args: unknown[]) => mocks.logAiUsage(...args),
}));

import { buildCreatePlanner } from "@/features/create/createPlanner";
import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";
import { buildCreateStructureBranches } from "@/features/create/intelligentFollowupContract";
import { deriveCreateDebattenstandModel } from "@/features/create/createDebattenstandSelector";

const REGRESSION_TEXT =
  "ich bin für mindestlohn bei behindertenwerkstätten, für mehr integration innerhalb der wirtschaft aber auch für stärkere kontrollen der vorstände der jeweiligen akteure";

const EXPECTED_ASPECTS = [
  "Faire Entlohnung / Mindestlohn",
  "Integration in den allgemeinen Arbeitsmarkt",
  "Kontrolle / Governance der Träger bzw. Vorstände",
];

function validRegressionPayload() {
  return {
    plannerTopic: "Arbeitsbedingungen und Teilhabe in Behindertenwerkstätten",
    plannerCore:
      "Mindestlohn, Integration in den allgemeinen Arbeitsmarkt und stärkere Kontrolle der verantwortlichen Träger und Vorstände sollen gemeinsam verbessert werden.",
    plannerScope: ["federal"],
    plannerStance: "open",
    plannerClusters: EXPECTED_ASPECTS,
    plannerOpenQuestions: [],
    shortSummary:
      "Der Beitrag verbindet faire Entlohnung, wirtschaftliche Teilhabe und verantwortliche Governance in Behindertenwerkstätten.",
    topicCandidates: [
      "Arbeitsbedingungen und Teilhabe in Behindertenwerkstätten",
    ],
    clusterCandidates: EXPECTED_ASPECTS,
    scopeCandidates: ["federal"],
    stance: "open",
    openQuestions: [],
    graphSearchTerms: [
      "Behindertenwerkstätten Mindestlohn",
      "allgemeiner Arbeitsmarkt Integration",
      "Werkstattträger Governance Vorstände",
    ],
    materialSignals: [],
    recommendedLane: "create_fast_followup",
  };
}

describe("create planner contract regression", () => {
  const originalEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_PLANNER_MODEL: process.env.OPENAI_PLANNER_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_PLANNER_MODEL = "gpt-4.1-mini";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.MISTRAL_API_KEY = "test-mistral-key";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("keeps one main concern, three aspects and an explicit supportive stance", async () => {
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify(validRegressionPayload()),
      model: "gpt-4.1-mini",
      formatUsed: "json_schema",
      didFallback: false,
    });

    const result = await buildCreateIntelligentFollowup({
      text: REGRESSION_TEXT,
      locale: "de",
    });
    const planner = result.meta?.planner;
    const branches = buildCreateStructureBranches(result, 5);
    const debattenstand = deriveCreateDebattenstandModel({
      hasStarted: true,
      isStarting: false,
      understandingConfirmed: false,
      workspaceActionMode: "default",
      analysisState: "result_ready",
      sourceKind: "text",
      hasSourceMaterial: false,
      requestedSourceReview: false,
      allTopicLabels: branches.map((branch) => branch.title),
      visibleTopicLabels: branches.map((branch) => branch.title),
    });

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callAnthropic).not.toHaveBeenCalled();
    expect(mocks.callMistral).not.toHaveBeenCalled();
    expect(mocks.callOpenAIJson).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1-mini",
        max_tokens: 400,
        timeoutMs: 6_500,
        allowJsonFormatFallback: false,
        response_format: expect.objectContaining({
          name: "create_planner_result",
          strict: true,
          schema: expect.objectContaining({
            properties: expect.objectContaining({
              plannerClusters: {
                type: "array",
                items: { type: "string" },
              },
            }),
          }),
        }),
      }),
    );
    const responseFormat = mocks.callOpenAIJson.mock.calls[0]?.[0]?.response_format;
    expect(new Set(responseFormat.schema.required)).toEqual(
      new Set(Object.keys(responseFormat.schema.properties)),
    );
    for (const property of Object.values(responseFormat.schema.properties) as Array<{
      type?: string;
      items?: { type?: string };
    }>) {
      if (property.type === "array") {
        expect(property.items?.type).toBe("string");
      }
    }
    expect(planner?.plannerTopic).toBe(
      "Arbeitsbedingungen und Teilhabe in Behindertenwerkstätten",
    );
    expect(planner?.plannerClusters).toEqual(EXPECTED_ASPECTS);
    expect(planner?.plannerStance).toBe("pro");
    expect(planner?.providerAttemptCount).toBe(1);
    expect(result.understanding.topics.map((topic) => topic.label)).toEqual([
      "Arbeitsbedingungen und Teilhabe in Behindertenwerkstätten",
    ]);
    expect(result.understanding.aspects).toEqual(EXPECTED_ASPECTS);
    expect(result.understanding.statements[0]?.stance).toBe("pro");
    expect(branches).toHaveLength(1);
    expect(branches[0]?.title).toBe(
      "Arbeitsbedingungen und Teilhabe in Behindertenwerkstätten",
    );
    expect(branches[0]?.topicTags).toEqual(
      expect.arrayContaining(EXPECTED_ASPECTS),
    );
    expect(debattenstand.totalTopicCount).toBe(1);
    expect(debattenstand.topicSummaryLabel).toBe("1 Thema erkannt");
    expect(result.meta?.graphMatch).toMatchObject({
      prepared: false,
      requiresConfirmation: true,
      searchTerms: [],
      matches: [],
    });
    expect(JSON.stringify(result)).not.toMatch(
      /\[object Object\]|\"undefined\"|\"null\"/,
    );
  });

  it("canonicalizes provider wording when the three points share the workshop-participation core", async () => {
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify({
        ...validRegressionPayload(),
        plannerTopic: "Mindestlohn und Integration für Menschen mit Behinderungen",
        plannerClusters: [
          "Mindestlohn in Behindertenwerkstätten",
          "Integration von Menschen mit Behinderungen in die Wirtschaft",
          "Stärkere Kontrollen der Vorstände der jeweiligen Akteure",
        ],
        topicCandidates: [
          "Mindestlohn",
          "Integration",
          "Kontrollen der Vorstände",
        ],
      }),
      model: "gpt-4.1-mini",
      formatUsed: "json_schema",
      didFallback: false,
    });

    const result = await buildCreateIntelligentFollowup({
      text: REGRESSION_TEXT,
      locale: "de",
    });

    expect(result.understanding.topics.map((topic) => topic.label)).toEqual([
      "Arbeitsbedingungen und Teilhabe in Behindertenwerkstätten",
    ]);
    expect(result.understanding.aspects).toEqual(EXPECTED_ASPECTS);
    expect(result.understanding.statements[0]?.stance).toBe("pro");
    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["object in string array", { plannerClusters: [{ label: "Mindestlohn" }] }],
    ["null in string array", { topicCandidates: [null] }],
    ["technical sentinel", { graphSearchTerms: ["[object Object]"] }],
    ["undefined sentinel", { plannerOpenQuestions: ["undefined"] }],
    ["null sentinel scalar", { plannerCore: "null" }],
    ["object in scalar", { plannerTopic: { label: "Werkstätten" } }],
  ])("fails closed for %s", async (_label, invalidFields) => {
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify({
        ...validRegressionPayload(),
        ...invalidFields,
      }),
      model: "gpt-4.1-mini",
      formatUsed: "json_schema",
      didFallback: false,
    });

    const planner = await buildCreatePlanner({
      text: REGRESSION_TEXT,
      locale: "de",
    });

    expect(planner).toMatchObject({
      source: "technical_fallback",
      plannerDegraded: true,
      degradedReason: "invalid_provider_payload",
      providerAttemptCount: 1,
      providerCallSucceeded: false,
      qualityStatus: "failed",
    });
    expect(planner.providerAttempts[0]).toMatchObject({
      status: "failed",
      resultCode: "invalid_provider_payload",
    });
    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callAnthropic).not.toHaveBeenCalled();
    expect(mocks.callMistral).not.toHaveBeenCalled();
    expect(JSON.stringify(planner)).not.toContain("[object Object]");
  });

  it("fails closed when strict json_schema was not enforced", async () => {
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify(validRegressionPayload()),
      model: "gpt-4.1-mini",
      formatUsed: "json_object",
      didFallback: true,
    });

    const planner = await buildCreatePlanner({
      text: REGRESSION_TEXT,
      locale: "de",
    });

    expect(planner.degradedReason).toBe("invalid_provider_payload");
    expect(planner.plannerDebug.providerErrorCode).toBe(
      "strict_schema_not_enforced",
    );
    expect(planner.providerAttemptCount).toBe(1);
  });
});
