import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callOpenAIJson: vi.fn(),
}));

vi.mock("@features/ai", () => ({
  callOpenAIJson: (...args: unknown[]) => mocks.callOpenAIJson(...args),
}));

import { buildCreatePlanner } from "@/features/create/createPlanner";

function plannerPayload(topics: string[], scope: "municipal" | "district" = "municipal") {
  return {
    text: JSON.stringify({
      plannerTopic: "Kommunale Gesamtplanung",
      plannerCore:
        "Der Beitrag benennt mehrere eigenständige kommunale Handlungsfelder und möchte sie getrennt priorisieren.",
      plannerScope: [scope],
      plannerStance: "open",
      plannerClusters: topics,
      plannerOpenQuestions: ["Welches Thema soll zuerst vertieft werden?"],
      shortSummary: "Mehrere kommunale Themen sollen getrennt strukturiert werden.",
      topicCandidates: topics,
      clusterCandidates: topics,
      scopeCandidates: [scope],
      openQuestions: ["Welches Thema soll zuerst vertieft werden?"],
      graphSearchTerms: topics,
      materialSignals: [],
      recommendedLane: "create_fast_followup",
    }),
  };
}

describe("create planner debug diagnostics contract", () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalOpenAiModel = process.env.OPENAI_MODEL;
  const originalOpenAiPlannerModel = process.env.OPENAI_PLANNER_MODEL;
  const originalPlannerTimeout = process.env.CREATE_PLANNER_TIMEOUT_MS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "gpt-5";
    process.env.CREATE_PLANNER_TIMEOUT_MS = "10000";
    delete process.env.OPENAI_PLANNER_MODEL;
  });

  afterEach(() => {
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
    if (originalOpenAiModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalOpenAiModel;
    if (originalOpenAiPlannerModel === undefined) delete process.env.OPENAI_PLANNER_MODEL;
    else process.env.OPENAI_PLANNER_MODEL = originalOpenAiPlannerModel;
    if (originalPlannerTimeout === undefined) delete process.env.CREATE_PLANNER_TIMEOUT_MS;
    else process.env.CREATE_PLANNER_TIMEOUT_MS = originalPlannerTimeout;
  });

  it("falls back to OPENAI_MODEL when OPENAI_PLANNER_MODEL returns MODEL_NOT_FOUND", async () => {
    process.env.OPENAI_PLANNER_MODEL = "gpt-4.1-mini";
    process.env.OPENAI_MODEL = "gpt-5";
    mocks.callOpenAIJson
      .mockRejectedValueOnce(new Error("404 model not found"))
      .mockResolvedValueOnce({
        text: JSON.stringify({
          plannerTopic: "ÖPNV und Mobilität",
          plannerCore:
            "Der Beitrag verbindet Bus-Takt, Anschlussmobilität, Straßenraum, Parkraum und Radwege.",
          plannerScope: ["district"],
          plannerStance: "open",
          plannerClusters: [
            "ÖPNV und Mobilität",
            "Straßenraum und Radverkehr",
            "Parkraum und kommunale Planung",
            "Pendler- und Anschlussmobilität",
          ],
          plannerOpenQuestions: ["Welcher Themenstrang soll zuerst vertieft werden?"],
          shortSummary:
            "Der Beitrag verknüpft Bus-Takt, Anschlussmobilität, Straßenumbau, Parkraum und Radwege.",
          topicCandidates: [
            "ÖPNV und Mobilität",
            "Straßenraum und Radverkehr",
            "Parkraum und kommunale Planung",
            "Pendler- und Anschlussmobilität",
          ],
          clusterCandidates: [
            "ÖPNV und Mobilität",
            "Straßenraum und Radverkehr",
            "Parkraum und kommunale Planung",
            "Pendler- und Anschlussmobilität",
          ],
          scopeCandidates: ["district"],
          openQuestions: ["Welcher Themenstrang soll zuerst vertieft werden?"],
          graphSearchTerms: ["Bus-Takt", "Anschlussmobilität", "Straßenraum", "Parkraum"],
          materialSignals: [],
          recommendedLane: "create_fast_followup",
        }),
      });

    const planner = await buildCreatePlanner({
      text: Array.from(
        { length: 10 },
        () =>
          "Bei uns im Bezirk fährt der Bus abends nur noch alle 30 Minuten. Dadurch verpassen viele Beschäftigte den Anschluss an die S-Bahn. Gleichzeitig soll die Hauptstraße umgebaut werden, aber niemand weiß, ob dabei Parkplätze wegfallen oder neue Radwege entstehen.",
      ).join(" "),
      locale: "de",
    });

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(2);
    expect(mocks.callOpenAIJson.mock.calls[0]?.[0]).toMatchObject({ model: "gpt-4.1-mini" });
    expect(mocks.callOpenAIJson.mock.calls[1]?.[0]).toMatchObject({ model: "gpt-5" });
    expect(planner.source).toBe("openai");
    expect(planner.plannerDegraded).toBe(false);
    expect(planner.degradedReason).toBeNull();
    expect(planner.plannerDebug.usedModel).toBe("gpt-5");
  });

  it("stops after the first successful candidate without running a duplicate provider call", async () => {
    process.env.OPENAI_PLANNER_MODEL = "gpt-4.1-mini";
    process.env.OPENAI_MODEL = "gpt-5";
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify({
        plannerTopic: "ÖPNV und Mobilität",
        plannerCore: "Der Beitrag beschreibt einen konkreten Konflikt zwischen Bus-Takt und Anschlussmobilität.",
        plannerScope: ["district"],
        plannerStance: "open",
        plannerClusters: [
          "ÖPNV und Mobilität",
          "Pendler- und Anschlussmobilität",
          "Straßenraum und Radverkehr",
        ],
        plannerOpenQuestions: ["Welcher Themenstrang soll zuerst vertieft werden?"],
        shortSummary: "Der Beitrag verbindet Bus-Takt, Anschlussmobilität und Straßenraum.",
        topicCandidates: [
          "ÖPNV und Mobilität",
          "Pendler- und Anschlussmobilität",
          "Straßenraum und Radverkehr",
        ],
        clusterCandidates: [
          "ÖPNV und Mobilität",
          "Pendler- und Anschlussmobilität",
          "Straßenraum und Radverkehr",
        ],
        scopeCandidates: ["district"],
        openQuestions: ["Welcher Themenstrang soll zuerst vertieft werden?"],
        graphSearchTerms: ["Bus-Takt", "Anschlussmobilität", "Straßenraum"],
        materialSignals: [],
        recommendedLane: "create_fast_followup",
      }),
    });

    const planner = await buildCreatePlanner({
      text:
        "Bei uns im Bezirk fährt der Bus abends nur noch alle 30 Minuten. Dadurch verpassen viele Beschäftigte den Anschluss an die S-Bahn.",
      locale: "de",
    });

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callOpenAIJson.mock.calls[0]?.[0]).toMatchObject({ model: "gpt-4.1-mini" });
    expect(planner.source).toBe("openai");
    expect(planner.plannerDebug.usedModel).toBe("gpt-4.1-mini");
  });

  it("classifies reachable-model aborts as timeout and does not fall through to the next candidate", async () => {
    process.env.OPENAI_PLANNER_MODEL = "gpt-4.1-mini";
    process.env.OPENAI_MODEL = "gpt-5";
    mocks.callOpenAIJson.mockRejectedValue(
      Object.assign(new Error("The operation was aborted."), {
        name: "AbortError",
        meta: { code: "TIMEOUT" },
      }),
    );

    const planner = await buildCreatePlanner({
      text: Array.from(
        { length: 20 },
        () => "Ein längerer politischer Beitrag mit mehreren eigenständigen Themen und ausführlichem Kontext.",
      ).join(" "),
      locale: "de",
    });

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callOpenAIJson.mock.calls[0]?.[0]).toMatchObject({
      model: "gpt-4.1-mini",
      timeoutMs: 10_000,
    });
    expect(planner.degradedReason).toBe("timeout");
    expect(planner.plannerDebug.providerErrorCode).toBe("TIMEOUT");
  });

  it("surfaces provider_error when the OpenAI call throws", async () => {
    mocks.callOpenAIJson.mockRejectedValue(new Error("upstream exploded"));

    const planner = await buildCreatePlanner({
      text: "Ein längerer politischer Beitrag mit mehreren Themen.",
      locale: "de",
    });

    expect(planner.source).toBe("technical_fallback");
    expect(planner.plannerSource).toBe("technical_fallback");
    expect(planner.plannerDegraded).toBe(true);
    expect(planner.degradedReason).toBe("provider_error");
    expect(planner.plannerDegradedReason).toBe("provider_error");
    expect(planner.plannerDebug.providerErrorCode).toBe("provider_error");
    expect(planner.plannerDebug).not.toHaveProperty("errorMessage");
    expect(planner.plannerDebug).not.toHaveProperty("providerErrorMessage");
    expect(JSON.stringify(planner)).not.toContain("upstream exploded");
    expect(planner.plannerDebug.providerAvailable).toBe(true);
    expect(planner.plannerDebug.qualityGatePassed).toBe(false);
  });

  it("surfaces missing_provider_key when no OpenAI key is configured", async () => {
    delete process.env.OPENAI_API_KEY;

    const planner = await buildCreatePlanner({
      text: "Ein längerer politischer Beitrag mit mehreren Themen.",
      locale: "de",
    });

    expect(planner.degradedReason).toBe("missing_provider_key");
    expect(planner.plannerDebug.providerAvailable).toBe(false);
    expect(planner.plannerDebug.usedProvider).toBe("local_fallback");
  });

  it("surfaces invalid_json when the provider returns non-json text", async () => {
    mocks.callOpenAIJson.mockResolvedValue({
      text: "kein json",
    });

    const planner = await buildCreatePlanner({
      text: "Ein längerer politischer Beitrag mit mehreren Themen.",
      locale: "de",
    });

    expect(planner.degradedReason).toBe("invalid_json");
    expect(planner.plannerDebug.rawPayloadValid).toBe(false);
    expect(planner.plannerDebug.rawTextValid).toBe(false);
    expect(planner.plannerDebug).not.toHaveProperty("rawText");
    expect(planner.plannerDebug.responseLength).toBe("kein json".length);
    expect(planner.plannerDebug.responseHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(planner)).not.toContain("kein json");
    expect(planner.plannerDebug.attemptedModel).toBe("gpt-5");
  });

  it("does not misclassify unauthorized provider errors as MODEL_NOT_FOUND", async () => {
    const unauthorized = Object.assign(new Error("OpenAI error 401: unauthorized"), {
      status: 401,
      meta: { code: "UNAUTHORIZED" },
    });
    mocks.callOpenAIJson.mockRejectedValue(unauthorized);

    const planner = await buildCreatePlanner({
      text: "Ein längerer politischer Beitrag mit mehreren Themen.",
      locale: "de",
    });

    expect(planner.degradedReason).toBe("provider_error");
    expect(planner.plannerDebug.providerErrorCode).toBe("UNAUTHORIZED");
  });

  it("surfaces invalid_provider_payload when plannerCore is missing", async () => {
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify({
        plannerTopic: "Grundrechte",
        plannerScope: ["federal"],
      }),
    });

    const planner = await buildCreatePlanner({
      text: "Ein längerer politischer Beitrag mit mehreren Themen.",
      locale: "de",
    });

    expect(planner.degradedReason).toBe("invalid_provider_payload");
    expect(planner.plannerDebug.normalizedPayloadValid).toBe(false);
    expect(planner.plannerDebug.providerErrorCode).toBe("contract_violation_plannerCore");
    expect(planner.plannerDebug).not.toHaveProperty("errorMessage");
    expect(planner.plannerDebug).not.toHaveProperty("providerErrorMessage");
  });

  it("surfaces quality_gate_failed for generic provider labels", async () => {
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify({
        plannerTopic: "Öffentliches Anliegen mit Klärungsbedarf",
        plannerCore: "Aussage",
        plannerScope: ["unclear"],
        plannerStance: "open",
        plannerClusters: [],
        plannerOpenQuestions: ["Was genau soll geklärt werden?"],
        shortSummary: "Kurzfassung",
        topicCandidates: ["Öffentliches Anliegen mit Klärungsbedarf"],
        clusterCandidates: [],
        scopeCandidates: ["unclear"],
        openQuestions: ["Was genau soll geklärt werden?"],
        graphSearchTerms: ["Öffentliches Anliegen"],
        materialSignals: [],
        recommendedLane: "standard",
      }),
    });

    const planner = await buildCreatePlanner({
      text:
        "Ich bin schon für die Würde des Menschen, aber stelle dessen Legitimation in Frage. Ich bin für offene Grenzen und regionale Abstimmungen.",
      locale: "de",
    });

    expect(planner.degradedReason).toBe("quality_gate_failed");
    expect(planner.plannerDebug.normalizedPayloadValid).toBe(true);
    expect(planner.plannerDebug.providerErrorCode).toBe("quality_gate_failed");
    expect(planner.plannerDebug).not.toHaveProperty("errorMessage");
    expect(planner.plannerDebug.qualityGatePassed).toBe(false);
  });

  it("keeps plannerDegraded false for valid planner json", async () => {
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify({
        plannerTopic: "Gleichberechtigung, Frauenquote und Minderheitenförderung",
        plannerCore:
          "Gemischte Position: Kritik an einer reinen Frauenquote, aber Unterstützung für breitere Gleichberechtigung und faire Regeln für verschiedene Minderheiten.",
        plannerScope: ["federal"],
        plannerStance: "mixed",
        plannerClusters: [
          "Frauenquote und Gleichberechtigung",
          "Minderheitenförderung und Repräsentation",
          "Quotenregelungen in Unternehmen",
          "wirtschaftliche Auswirkungen",
        ],
        plannerOpenQuestions: [
          "Soll zuerst über Gleichberechtigung, Quotenmodelle oder Unternehmensfolgen gesprochen werden?",
        ],
        shortSummary:
          "Der Beitrag trennt Gleichberechtigung von der konkreten Frauenquote und verbindet das mit Minderheitenförderung und Unternehmensfolgen.",
        topicCandidates: [
          "Gleichberechtigung, Frauenquote und Minderheitenförderung",
          "Gleichberechtigung",
          "Frauenquote",
          "Minderheitenförderung",
        ],
        clusterCandidates: [
          "Frauenquote und Gleichberechtigung",
          "Minderheitenförderung und Repräsentation",
          "Quotenregelungen in Unternehmen",
          "wirtschaftliche Auswirkungen",
        ],
        scopeCandidates: ["federal"],
        openQuestions: [
          "Soll zuerst über Gleichberechtigung, Quotenmodelle oder Unternehmensfolgen gesprochen werden?",
        ],
        graphSearchTerms: [
          "Gleichberechtigung",
          "Frauenquote",
          "Minderheitenförderung",
          "Quoten Unternehmen",
          "wirtschaftliche Auswirkungen Quoten",
        ],
        materialSignals: [],
        recommendedLane: "create_fast_followup",
      }),
    });

    const planner = await buildCreatePlanner({
      text:
        "ich bin gegen frauenquote aber für mehr gleichberechtigung. gibt es eine frauenquote müsste es auch quoten von anderen minderheiten geben, das kann nicht richtig und wirtschaftlich für ein unternehmen sein.",
      locale: "de",
    });

    expect(planner.source).toBe("openai");
    expect(planner.plannerSource).toBe("openai");
    expect(planner.plannerDegraded).toBe(false);
    expect(planner.degradedReason).toBeNull();
    expect(planner.plannerDegradedReason).toBeNull();
    expect(planner.plannerDebug.usedProvider).toBe("openai");
    expect(planner.plannerDebug.rawPayloadValid).toBe(true);
    expect(planner.plannerDebug.rawTextValid).toBe(true);
    expect(planner.plannerDebug.normalizedPayloadValid).toBe(true);
    expect(planner.plannerDebug.qualityGatePassed).toBe(true);
  });

  it("preserves exactly seven concrete topics and adds a mandatory municipal location question", async () => {
    const topics = [
      "Verkehr",
      "Schulwegsicherheit",
      "Wohnen",
      "Grünflächen",
      "Jugendtreff",
      "Digitale Bürgerservices",
      "Kommunale Finanzen",
    ];
    mocks.callOpenAIJson.mockResolvedValue(plannerPayload(topics));

    const result = await buildCreatePlanner({
      text:
        "In unserer Kommune sollen Verkehr, Schulwegsicherheit, Wohnen, Grünflächen, Jugendtreff, digitale Bürgerservices und kommunale Finanzen getrennt beraten werden.",
      locale: "de",
    });

    expect(result.source).toBe("openai");
    expect(result.topicCandidates).toEqual(topics);
    expect(result.topicCandidates).toHaveLength(7);
    expect(result.topicCandidates).not.toContain("Kommunale Gesamtplanung");
    expect(result.openQuestions).toContain(
      "Auf welche Stadt, Gemeinde oder welchen Ortsteil bezieht sich dein Anliegen?",
    );
    expect(mocks.callOpenAIJson.mock.calls[0]?.[0]?.user).toContain(
      "niemals auf drei Themen begrenzen",
    );
  });

  it("keeps an explicitly named main topic even when it is also the planner topic", async () => {
    const topics = ["Verkehr", "Wohnen", "Grünflächen"];
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify({
        plannerTopic: "Verkehr",
        plannerCore: "Der Beitrag nennt Verkehr, Wohnen und Grünflächen als eigenständige Themen.",
        plannerScope: ["municipal"],
        plannerStance: "open",
        plannerClusters: topics,
        plannerOpenQuestions: [],
        shortSummary: "Drei konkrete Themen werden getrennt betrachtet.",
        topicCandidates: topics,
        clusterCandidates: topics,
        scopeCandidates: ["municipal"],
        openQuestions: [],
        graphSearchTerms: topics,
        materialSignals: [],
        recommendedLane: "create_fast_followup",
      }),
    });

    const result = await buildCreatePlanner({
      text: "In Rahnsdorf sollen Verkehr, Wohnen und Grünflächen getrennt beraten werden.",
      locale: "de",
    });

    expect(result.topicCandidates).toEqual(topics);
    expect(result.topicCandidates).toContain("Verkehr");
  });

  it("preserves exactly fourteen topics without asking for a location already named in the text", async () => {
    const topics = [
      "Verkehr",
      "Schulwegsicherheit",
      "ÖPNV",
      "Radwege",
      "Wohnen",
      "Grünflächen",
      "Jugendtreff",
      "Digitale Bürgerservices",
      "Kommunale Finanzen",
      "Bauplanung",
      "Klimaanpassung",
      "Pflege",
      "Bildung",
      "Bürgerbeteiligung",
    ];
    mocks.callOpenAIJson.mockResolvedValue(plannerPayload(topics));

    const result = await buildCreatePlanner({
      text:
        "In Rahnsdorf sollen Verkehr, Schulwegsicherheit, ÖPNV, Radwege, Wohnen, Grünflächen, Jugendtreff, digitale Bürgerservices, kommunale Finanzen, Bauplanung, Klimaanpassung, Pflege, Bildung und Bürgerbeteiligung getrennt betrachtet werden.",
      locale: "de",
    });

    expect(result.source).toBe("openai");
    expect(result.topicCandidates).toEqual(topics);
    expect(result.topicCandidates).toHaveLength(14);
    expect(result.topicCandidates).not.toContain("Kommunale Gesamtplanung");
    expect(result.openQuestions).not.toContain(
      "Auf welche Stadt, Gemeinde oder welchen Ortsteil bezieht sich dein Anliegen?",
    );
  });
});
