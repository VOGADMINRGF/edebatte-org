import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildCreatePlanner: vi.fn(),
}));

vi.mock("@/features/create/createPlanner", () => ({
  buildCreatePlanner: (...args: unknown[]) => mocks.buildCreatePlanner(...args),
  isCreatePlannerProviderSource: (source: string) =>
    source === "openai" || source === "anthropic" || source === "mistral",
}));

import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";

function openAiProviderIdentity() {
  return {
    providerCallAttempted: true,
    providerCallSucceeded: true,
    providerAttemptCount: 1,
    providerAttempts: [
      {
        attempt: 1,
        provider: "openai",
        model: "gpt-4.1-mini",
        status: "succeeded",
        resultCode: "succeeded",
        responseLength: 512,
        responseHash: "d".repeat(64),
      },
    ],
    plannerDebug: {
      attemptedProvider: "openai",
      usedProvider: "openai",
      attemptedModel: "gpt-4.1-mini",
      usedModel: "gpt-4.1-mini",
      attemptNumber: 1,
      providerAvailable: true,
      providerErrorCode: null,
      rawPayloadValid: true,
      rawTextValid: true,
      normalizedPayloadValid: true,
      qualityGatePassed: true,
      responseLength: 512,
      responseHash: "d".repeat(64),
    },
  };
}

describe("create planner routing contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses planner_only metadata for validated normal free text without mutative actions", async () => {
    mocks.buildCreatePlanner.mockResolvedValue({
      source: "openai",
      plannerSource: "openai",
      plannerProvider: "openai",
      plannerRole: "planner_only",
      plannerTopic: "Tierschutz, Tierhaltung und Agrarstandards",
      plannerCore: "Forderung nach besseren Tierschutz- und Tierhaltungsstandards",
      plannerScope: ["eu", "federal", "international"],
      plannerStance: "pro",
      plannerClusters: [
        "Tierwohl und Haltungsstandards",
        "Import- und Exportregeln",
        "EU-/internationale Mindeststandards",
      ],
      plannerOpenQuestions: ["Welche Produkte, Länder, Standards und Kontrollmechanismen sind gemeint?"],
      shortSummary: "Der Beitrag fordert strengere Tierwohlstandards.",
      topicCandidates: ["Tierschutz, Tierhaltung und Agrarstandards", "Tierwohl"],
      clusterCandidates: [
        "Tierwohl und Haltungsstandards",
        "Import- und Exportregeln",
        "EU-/internationale Mindeststandards",
      ],
      scopeCandidates: ["eu", "federal", "international"],
      stance: "pro",
      openQuestions: [
        "Welche Produkte, Länder, Standards und Kontrollmechanismen sind gemeint?",
        "Sollten importierte und exportierte Tierprodukte nur zugelassen werden, wenn vergleichbare Tierwohlstandards eingehalten werden?",
      ],
      graphSearchTerms: ["Tierwohl", "Import Export Tierprodukte", "EU Mindeststandards", "Agrarstandards"],
      materialSignals: [],
      recommendedLane: "create_fast_followup",
      providerPlan: {
        lane: "create_fast_followup",
        plannerProvider: "openai",
        plannerRole: "planner_only",
        structureProvider: "mistral",
        summaryProvider: "claude",
        researchUsed: "none",
        researchProvider: null,
        deepSearchUsed: false,
        graphMatch: "after_structure",
      },
      permissions: {
        nonMutative: true,
        canPublish: false,
        canSave: false,
        canMerge: false,
        canDeepSearch: false,
      },
      plannerDegraded: false,
      degradedReason: null,
      plannerDegradedReason: null,
      qualityStatus: "specific",
      qualityIssues: [],
      ...openAiProviderIdentity(),
    });

    const result = await buildCreateIntelligentFollowup({
      text: "Ich bin für bessere Tierwohlstandards.",
      locale: "de",
      intent: "contribute",
    });

    expect(result.meta?.planner.source).toBe("openai");
    expect(result.meta?.planner.providerPlan.plannerRole).toBe("planner_only");
    expect(result.meta?.planner.permissions.nonMutative).toBe(true);
    expect(result.meta?.planner.permissions.canPublish).toBe(false);
    expect(result.meta?.planner.permissions.canSave).toBe(false);
    expect(result.meta?.planner.permissions.canMerge).toBe(false);
    expect(result.meta?.planner.permissions.canDeepSearch).toBe(false);
    expect(result.meta?.researchUsed).toBe("none");
    expect(result.meta?.researchProvider).toBeNull();
    expect(result.meta?.deepSearchUsed).toBe(false);
    expect(result.meta?.analysis?.state).toBe("result_ready");
    expect(result.meta?.analysis?.validationStatus).toBe("validated");
    expect(result.meta?.graphMatch.stage).toBe("after_structure");
    expect(result.meta?.graphMatch.requiresConfirmation).toBe(true);
    expect(result.meta?.graphMatch.prepared).toBe(false);
    expect(result.meta?.graphMatch.searchTerms).toEqual([]);
    expect(result.meta?.planner.graphSearchTerms).toEqual(expect.arrayContaining(["Tierwohl"]));
    expect(result.degraded).toBe(false);
    expect(result.understanding.topics[0]?.label).toBe("Tierschutz, Tierhaltung und Agrarstandards");
    expect(result.understanding.statements[0]?.text).toBe("Forderung nach besseren Tierschutz- und Tierhaltungsstandards");
    expect(mocks.buildCreatePlanner).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: null,
        operationId: null,
        dossierId: null,
        userId: null,
      }),
    );
  });

  it("forwards existing dossier and user context into the real planner surface", async () => {
    mocks.buildCreatePlanner.mockResolvedValue({
      source: "openai",
      plannerSource: "openai",
      plannerProvider: "openai",
      plannerRole: "planner_only",
      plannerTopic: "Sichere Schulwege",
      plannerCore: "Mehr sichere Schulwege im Quartier.",
      plannerScope: ["district"],
      plannerStance: "pro",
      plannerClusters: ["Mobilität", "Verkehrssicherheit", "Schulumfeld"],
      plannerOpenQuestions: ["Welche Kreuzungen zuerst?"],
      shortSummary: "Kurzfassung",
      topicCandidates: ["Sichere Schulwege"],
      clusterCandidates: ["Mobilität", "Verkehrssicherheit", "Schulumfeld"],
      scopeCandidates: ["district"],
      stance: "pro",
      openQuestions: ["Welche Kreuzungen zuerst?"],
      graphSearchTerms: ["Schulwege", "Kreuzungen", "Verkehrssicherheit", "Tempo 30"],
      materialSignals: [],
      recommendedLane: "create_fast_followup",
      providerPlan: {
        lane: "create_fast_followup",
        plannerProvider: "openai",
        plannerRole: "planner_only",
        structureProvider: "mistral",
        summaryProvider: "claude",
        researchUsed: "none",
        researchProvider: null,
        deepSearchUsed: false,
        graphMatch: "after_structure",
      },
      permissions: {
        nonMutative: true,
        canPublish: false,
        canSave: false,
        canMerge: false,
        canDeepSearch: false,
      },
      plannerDegraded: false,
      degradedReason: null,
      plannerDegradedReason: null,
      qualityStatus: "specific",
      qualityIssues: [],
      ...openAiProviderIdentity(),
    });

    await buildCreateIntelligentFollowup({
      text: "Mehr sichere Schulwege im Quartier.",
      locale: "de",
      dossierId: "dossier-ctx",
      userId: "user-ctx",
      requestId: "request-ctx",
      operationId: "operation-ctx",
      operationType: "create_intelligent_followup_planner",
    });

    expect(mocks.buildCreatePlanner).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dossierId: "dossier-ctx",
        userId: "user-ctx",
        requestId: "request-ctx",
        operationId: "operation-ctx",
        operationType: "create_intelligent_followup_planner",
      }),
    );
  });

  it("keeps provider contract failures on a technical fallback path", async () => {
    mocks.buildCreatePlanner.mockResolvedValue({
      source: "technical_fallback",
      plannerSource: "technical_fallback",
      plannerProvider: "local_fallback",
      plannerRole: "planner_only",
      plannerTopic: "Analyse noch nicht validiert",
      plannerCore: "Es liegt noch kein validierter KI-Run vor.",
      plannerScope: ["unclear"],
      plannerStance: "unclear",
      plannerClusters: [],
      plannerOpenQuestions: [],
      shortSummary: "Es liegt noch kein validierter KI-Run vor.",
      topicCandidates: [],
      clusterCandidates: [],
      scopeCandidates: ["unclear"],
      stance: "unclear",
      openQuestions: [],
      graphSearchTerms: [],
      materialSignals: [],
      recommendedLane: "standard",
      providerPlan: {
        lane: "standard",
        plannerProvider: "local_fallback",
        plannerRole: "planner_only",
        structureProvider: "mistral",
        summaryProvider: "claude",
        researchUsed: "none",
        researchProvider: null,
        deepSearchUsed: false,
        graphMatch: "after_structure",
      },
      permissions: {
        nonMutative: true,
        canPublish: false,
        canSave: false,
        canMerge: false,
        canDeepSearch: false,
      },
      plannerDegraded: true,
      degradedReason: "quality_gate_failed",
      plannerDegradedReason: "quality_gate_failed",
      qualityStatus: "failed",
      qualityIssues: ["technical_fallback_only"],
      providerCallAttempted: true,
      providerCallSucceeded: false,
      providerAttemptCount: 1,
      providerAttempts: [
        {
          attempt: 1,
          provider: "openai",
          model: "gpt-4.1-mini",
          status: "quality_failed",
          resultCode: "quality_gate_failed",
          responseLength: 256,
          responseHash: "e".repeat(64),
        },
      ],
      plannerDebug: {
        attemptedProvider: "openai",
        usedProvider: "local_fallback",
        attemptedModel: "gpt-4.1-mini",
        usedModel: null,
        attemptNumber: 1,
        providerAvailable: true,
        providerErrorCode: "quality_gate_failed",
        rawPayloadValid: true,
        rawTextValid: true,
        normalizedPayloadValid: true,
        qualityGatePassed: false,
      },
    });

    const result = await buildCreateIntelligentFollowup({
      text: "Ein längerer Mehrthemenbeitrag ohne brauchbaren Planner-Vertrag.",
      locale: "de",
      intent: "contribute",
    });

    expect(result.meta?.planner.plannerDegraded).toBe(true);
    expect(result.meta?.planner.degradedReason).toBe("quality_gate_failed");
    expect(result.meta?.planner.qualityStatus).toBe("failed");
    expect(result.meta?.analysis?.state).toBe("ai_failed");
    expect(result.meta?.graphMatch.prepared).toBe(false);
    expect(result.meta?.graphMatch.searchTerms).toEqual([]);
    expect(result.meta?.planner.plannerDebug.attemptedProvider).toBe("openai");
    expect(result.meta?.planner.plannerDebug.usedProvider).toBe("local_fallback");
    expect(result.degraded).toBe(true);
    expect(result.understanding.topics).toEqual([]);
    expect(result.understanding.statements).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it("keeps timed-out planner runs on the same technical fallback path", async () => {
    mocks.buildCreatePlanner.mockResolvedValue({
      source: "technical_fallback",
      plannerSource: "technical_fallback",
      plannerProvider: "local_fallback",
      plannerRole: "planner_only",
      plannerTopic: "Analyse noch nicht validiert",
      plannerCore: "Es liegt noch kein validierter KI-Run vor.",
      plannerScope: ["unclear"],
      plannerStance: "unclear",
      plannerClusters: [],
      plannerOpenQuestions: [],
      shortSummary: "Es liegt noch kein validierter KI-Run vor.",
      topicCandidates: [],
      clusterCandidates: [],
      scopeCandidates: ["unclear"],
      stance: "unclear",
      openQuestions: [],
      graphSearchTerms: [],
      materialSignals: [],
      recommendedLane: "standard",
      providerPlan: {
        lane: "standard",
        plannerProvider: "local_fallback",
        plannerRole: "planner_only",
        structureProvider: "mistral",
        summaryProvider: "claude",
        researchUsed: "none",
        researchProvider: null,
        deepSearchUsed: false,
        graphMatch: "after_structure",
      },
      permissions: {
        nonMutative: true,
        canPublish: false,
        canSave: false,
        canMerge: false,
        canDeepSearch: false,
      },
      plannerDegraded: true,
      degradedReason: "timeout",
      plannerDegradedReason: "timeout",
      qualityStatus: "failed",
      qualityIssues: ["technical_fallback_only"],
      providerCallAttempted: true,
      providerCallSucceeded: false,
      providerAttemptCount: 1,
      providerAttempts: [
        {
          attempt: 1,
          provider: "openai",
          model: "gpt-4.1-mini",
          status: "failed",
          resultCode: "timeout",
          responseLength: null,
          responseHash: null,
        },
      ],
      plannerDebug: {
        attemptedProvider: "openai",
        usedProvider: "local_fallback",
        attemptedModel: "gpt-4.1-mini",
        usedModel: null,
        attemptNumber: 1,
        providerAvailable: true,
        providerErrorCode: "TIMEOUT",
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      },
    });

    const result = await buildCreateIntelligentFollowup({
      text: "Ein längerer Mehrthemenbeitrag zu Grundrechten, Migration, Energiepolitik, Abstimmungen und Budget.",
      locale: "de",
      intent: "contribute",
    });

    expect(result.degraded).toBe(true);
    expect(result.meta?.planner.degradedReason).toBe("timeout");
    expect(result.meta?.analysis?.state).toBe("ai_failed");
    expect(result.understanding.summary).toContain("Die KI-Analyse konnte noch nicht");
    expect(result.understanding.topics).toEqual([]);
    expect(result.understanding.statements).toEqual([]);
    expect(result.meta?.graphMatch.prepared).toBe(false);
  });

  it("builds a technical fallback planner when AI is unavailable", async () => {
    const originalOpenAiKey = process.env.OPENAI_API_KEY;
    const originalOpenAiModel = process.env.OPENAI_MODEL;
    delete process.env.OPENAI_API_KEY;
    process.env.OPENAI_MODEL = "gpt-5";

    try {
      const { buildCreatePlanner } = await vi.importActual<typeof import("@/features/create/createPlanner")>(
        "@/features/create/createPlanner",
      );
      const planner = await buildCreatePlanner({
        text: "ich bin gegen frauenquote aber für mehr gleichberechtigung, gibt es eine frauenquote müsste es auch quoten von anderen minderheiten geben, das kann nicht richtig und wirtschaftlich für ein unternehmen sein.",
        locale: "de",
      });

      expect(planner.source).toBe("technical_fallback");
      expect(planner.plannerProvider).toBe("local_fallback");
      expect(planner.plannerRole).toBe("planner_only");
      expect(planner.plannerTopic).toBe("Analyse noch nicht validiert");
      expect(planner.plannerCore).toBe("Es liegt noch kein validierter KI-Run vor.");
      expect(planner.plannerClusters).toEqual([]);
      expect(planner.plannerOpenQuestions).toEqual([]);
      expect(planner.qualityStatus).toBe("failed");
      expect(planner.plannerDegraded).toBe(true);
      expect(planner.degradedReason).toBe("missing_provider_key");
      expect(planner.qualityIssues).toContain("technical_fallback_only");
      expect(planner.permissions.canSave).toBe(false);
      expect(planner.permissions.canPublish).toBe(false);
      expect(planner.permissions.canMerge).toBe(false);
      expect(planner.permissions.canDeepSearch).toBe(false);
      expect(planner.providerPlan.deepSearchUsed).toBe(false);
      expect(planner.providerPlan.researchUsed).toBe("none");
      expect(planner.providerPlan.plannerProvider).toBe("local_fallback");
      expect(planner.providerPlan.graphMatch).toBe("after_structure");
    } finally {
      if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = originalOpenAiKey;
      if (originalOpenAiModel === undefined) delete process.env.OPENAI_MODEL;
      else process.env.OPENAI_MODEL = originalOpenAiModel;
    }
  });

  it("preserves up to 14 validated planner topics in the followup readmodel", async () => {
    mocks.buildCreatePlanner.mockResolvedValue({
      source: "openai",
      plannerSource: "openai",
      plannerProvider: "openai",
      plannerRole: "planner_only",
      plannerTopic: "Kommunale Mehrthemenlage",
      plannerCore: "Der Beitrag bündelt viele kommunale Teilthemen in einem Paket.",
      plannerScope: ["municipal"],
      plannerStance: "open",
      plannerClusters: Array.from({ length: 14 }, (_, index) => `Thema ${index + 1}`),
      plannerOpenQuestions: ["Welche Leitfrage soll zuerst bearbeitet werden?"],
      shortSummary: "Vierzehn kommunale Themen wurden getrennt erkannt.",
      topicCandidates: Array.from({ length: 14 }, (_, index) => `Thema ${index + 1}`),
      clusterCandidates: Array.from({ length: 14 }, (_, index) => `Thema ${index + 1}`),
      scopeCandidates: ["municipal"],
      stance: "open",
      openQuestions: ["Welche Leitfrage soll zuerst bearbeitet werden?"],
      graphSearchTerms: ["Thema 1", "Thema 2", "Thema 3"],
      materialSignals: [],
      recommendedLane: "create_fast_followup",
      providerPlan: {
        lane: "create_fast_followup",
        plannerProvider: "openai",
        plannerRole: "planner_only",
        structureProvider: "mistral",
        summaryProvider: "claude",
        researchUsed: "none",
        researchProvider: null,
        deepSearchUsed: false,
        graphMatch: "after_structure",
      },
      permissions: {
        nonMutative: true,
        canPublish: false,
        canSave: false,
        canMerge: false,
        canDeepSearch: false,
      },
      plannerDegraded: false,
      degradedReason: null,
      plannerDegradedReason: null,
      qualityStatus: "specific",
      qualityIssues: [],
      ...openAiProviderIdentity(),
    });

    const result = await buildCreateIntelligentFollowup({
      text: "Eine Kommune ringt gleichzeitig mit vierzehn Themenfeldern.",
      locale: "de",
    });

    expect(result.understanding.topics).toHaveLength(14);
    expect(result.understanding.topics[13]?.label).toBe("Thema 14");
  });
});
