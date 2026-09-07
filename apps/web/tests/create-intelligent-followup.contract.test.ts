import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildCreatePlanner: vi.fn(),
}));

vi.mock("@/features/create/createPlanner", () => ({
  buildCreatePlanner: (...args: unknown[]) => mocks.buildCreatePlanner(...args),
}));
vi.mock("@/features/create/createPlannerProviderContract", () => ({
  isCreatePlannerProviderSource: (source: string) =>
    ["openai", "anthropic", "mistral"].includes(source),
  hasValidatedCreatePlannerProviderIdentity: (planner: {
    source?: string;
    plannerSource?: string;
    plannerProvider?: string;
  }) =>
    ["openai", "anthropic", "mistral"].includes(planner.source ?? "") &&
    planner.source === planner.plannerSource &&
    planner.source === planner.plannerProvider,
}));

import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";
import {
  buildCreateStructureBranches,
  buildCreateVisualMap,
  buildCreateVisualSections,
} from "@/features/create/intelligentFollowupContract";
import { buildCreateValidatedDocumentFollowup } from "@/features/create/intelligentFollowupResults";

function buildTechnicalPlanner(
  overrides: Record<string, unknown> = {},
) {
  return {
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
    degradedReason: "provider_error",
    plannerDegradedReason: "provider_error",
    qualityStatus: "failed",
    qualityIssues: ["technical_fallback_only"],
    providerCallAttempted: true,
    providerCallSucceeded: false,
    providerAttemptCount: 2,
    plannerDebug: {
      attemptedProvider: "anthropic",
      usedProvider: "local_fallback",
      attemptedModel: "claude-sonnet-test",
      usedModel: null,
      providerAvailable: true,
      providerErrorCode: "upstream_error",
      providerErrorMessage: "raw provider detail",
      errorMessage: "raw provider detail",
      rawPayloadValid: false,
      rawTextValid: false,
      normalizedPayloadValid: false,
      qualityGatePassed: false,
    },
    ...overrides,
  };
}

describe("create intelligent follow-up contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives validated understanding only from a specific openai planner result", async () => {
    mocks.buildCreatePlanner.mockResolvedValue({
      source: "openai",
      plannerSource: "openai",
      plannerProvider: "openai",
      plannerRole: "planner_only",
      plannerTopic: "ÖPNV und Mobilität",
      plannerCore:
        "Der Beitrag verbindet abendlichen Bus-Takt, Anschlussmobilität sowie Fragen zu Straßenraum, Parkraum und Radwegen.",
      plannerScope: ["district", "municipal"],
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
      scopeCandidates: ["district", "municipal"],
      stance: "open",
      openQuestions: ["Welcher Themenstrang soll zuerst vertieft werden?"],
      graphSearchTerms: ["öpnv", "straßenraum", "parkraum", "anschlussmobilität"],
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
      providerCallAttempted: true,
      providerCallSucceeded: true,
      plannerDebug: {
        attemptedProvider: "openai",
        usedProvider: "openai",
        providerAvailable: true,
        providerErrorCode: null,
        providerErrorMessage: null,
        errorMessage: null,
        rawPayloadValid: true,
        rawTextValid: true,
        normalizedPayloadValid: true,
        qualityGatePassed: true,
      },
    });

    const result = await buildCreateIntelligentFollowup({
      text: "Bei uns im Bezirk fährt der Bus abends nur noch alle 30 Minuten.",
      locale: "de",
      intent: "contribute",
    });

    expect(result.meta?.analysis?.state).toBe("result_ready");
    expect(result.meta?.analysis?.validationStatus).toBe("validated");
    expect(result.degraded).toBe(false);
    expect(result.understanding.topics.map((topic) => topic.label)).toEqual([
      "ÖPNV und Mobilität",
      "Straßenraum und Radverkehr",
      "Parkraum und kommunale Planung",
      "Pendler- und Anschlussmobilität",
    ]);
    expect(result.understanding.statements[0]?.text).toBe(
      "Der Beitrag verbindet abendlichen Bus-Takt, Anschlussmobilität sowie Fragen zu Straßenraum, Parkraum und Radwegen.",
    );

    const branches = buildCreateStructureBranches(result, 3);
    expect(branches).toHaveLength(3);
    expect(branches.map((branch) => branch.title)).toEqual([
      "ÖPNV und Mobilität",
      "Straßenraum und Radverkehr",
      "Parkraum und kommunale Planung",
    ]);

    const visualMap = buildCreateVisualMap(result);
    expect(visualMap.center.label).toBe("Dein Beitrag");
    expect(visualMap.nodes.some((node) => node.kind === "topic")).toBe(true);

    const sections = buildCreateVisualSections(result, 3);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0]?.label.trim().length).toBeGreaterThan(0);
  });

  it("merges an official resolved place into the canonical planner scope", async () => {
    mocks.buildCreatePlanner.mockResolvedValue({
      ...buildTechnicalPlanner({
        source: "openai",
        plannerSource: "openai",
        plannerProvider: "openai",
        plannerTopic: "Sichere Schulwege",
        plannerCore: "Schulwege sollen sicherer werden.",
        shortSummary: "Sichere Schulwege in Wuppertal.",
        topicCandidates: ["Sichere Schulwege"],
        graphSearchTerms: ["sichere Schulwege"],
        providerCallSucceeded: true,
        qualityStatus: "generic",
        qualityIssues: ["scope_too_unclear_for_explicit_jurisdiction"],
        degradedReason: "quality_gate_failed",
        plannerDegradedReason: "quality_gate_failed",
      }),
    });

    const result = await buildCreateIntelligentFollowup({
      text: "In Wuppertal brauchen wir sichere Schulwege.",
      locale: "de",
    });

    expect(result.meta?.planner?.plannerScope).toEqual(["municipal"]);
    expect(result.meta?.planner?.scopeCandidates).toEqual(["municipal"]);
    expect(result.meta?.planner?.qualityStatus).toBe("specific");
    expect(result.meta?.planner?.plannerDegraded).toBe(false);
    expect(result.understanding.scopes).toEqual(["municipal"]);
  });

  it("keeps non-validated planner runs on a technical ai_failed path", async () => {
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
      plannerDebug: {
        attemptedProvider: "openai",
        usedProvider: "local_fallback",
        providerAvailable: true,
        providerErrorCode: null,
        providerErrorMessage: "create_planner_timeout_after_2200ms",
        errorMessage: "create_planner_timeout_after_2200ms",
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      },
    });

    const result = await buildCreateIntelligentFollowup({
      text: "Bitte prüft diese Aussage zur Energieversorgung.",
      locale: "de",
      intent: "check",
    });

    expect(result.degraded).toBe(true);
    expect(result.meta?.analysis?.state).toBe("ai_failed");
    expect(result.meta?.analysis?.validationStatus).toBe("failed");
    expect(result.understanding.topics).toEqual([]);
    expect(result.understanding.statements).toEqual([]);
    expect(result.suggestions).toEqual([]);
    expect(result.meta?.graphMatch.prepared).toBe(false);
    expect(buildCreateStructureBranches(result, 3)).toEqual([]);
  });

  it("renders an English planner failure without German fragments", async () => {
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
      degradedReason: "provider_error",
      plannerDegradedReason: "provider_error",
      qualityStatus: "failed",
      qualityIssues: ["technical_fallback_only"],
      providerCallAttempted: true,
      providerCallSucceeded: false,
      providerAttemptCount: 2,
      plannerDebug: {
        attemptedProvider: "anthropic",
        usedProvider: "local_fallback",
        attemptedModel: "claude-sonnet-test",
        usedModel: null,
        providerAvailable: true,
        providerErrorCode: "upstream_error",
        providerErrorMessage: "raw provider detail",
        errorMessage: "raw provider detail",
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      },
    });

    const result = await buildCreateIntelligentFollowup({
      text: "Please review this contribution.",
      locale: "en",
      intent: "check",
    });

    expect(result.meta?.analysis?.userMessage).toBe(
      "The AI analysis could not be completed. No topics were derived.",
    );
    expect(result.meta?.analysis?.userMessage).not.toMatch(
      /Die |konnte|Themen|durchgeführt/,
    );
    expect(result.meta?.analysis?.userMessage).not.toContain(
      "raw provider detail",
    );
  });

  it("uses the controlled German fallback for an unknown language", async () => {
    mocks.buildCreatePlanner.mockResolvedValue(buildTechnicalPlanner({
      degradedReason: "missing_provider_key",
      plannerDegradedReason: "missing_provider_key",
      providerCallAttempted: false,
      providerAttemptCount: 0,
      plannerDebug: {
        attemptedProvider: null,
        usedProvider: "local_fallback",
        providerAvailable: false,
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      },
    }));

    const result = await buildCreateIntelligentFollowup({
      text: "Veuillez examiner cette contribution.",
      locale: "fr",
      intent: "check",
    });

    expect(result.meta?.analysis?.userMessage).toBe(
      "Die KI-Analyse ist derzeit nicht verfügbar. Es wurden keine Themen oder Zusammenfassungen erzeugt.",
    );
  });

  it("normalizes validated document analyses to the real topic objects", () => {
    const result = buildCreateValidatedDocumentFollowup({
      text: "https://example.com/grundsatzprogramm.pdf",
      sourceUrl: "https://example.com/grundsatzprogramm.pdf",
      documentAnalysis: {
        sourceUrl: "https://example.com/grundsatzprogramm.pdf",
        documentTitle: "Grundsatzprogramm",
        documentType: "party_program",
        pageCount: 78,
        wordCount: 18000,
        topicCount: 12,
        subtopicCount: 18,
        keyStatementCount: 24,
        verifiableClaimCount: 6,
        policyProposalCount: 4,
        subjectBreadth: "broad",
        subjectDepth: "mixed",
        balanceAssessment: "programmatic",
        sourceSpecificity: "partly_specific",
        sourceVerificationStatus: "not_started",
        counterpositionCoverage: "weak",
        summary: "Die Analyse zeigt mehrere Themenstränge im Dokument.",
        topics: [
          { id: "topic-1", label: "ÖPNV und Mobilität", subtopicCount: 4, keyStatementCount: 8, summary: "ÖPNV im Fokus." },
          { id: "topic-2", label: "Straßenraum und Radverkehr", subtopicCount: 3, keyStatementCount: 7, summary: "Straßenraum und Radwege." },
          { id: "topic-3", label: "Parkraum und kommunale Planung", subtopicCount: 2, keyStatementCount: 5, summary: "Parken und Planung." },
        ],
      },
      generatedAt: "2026-07-18T11:00:00.000Z",
    });

    expect(result.meta?.documentAnalysis?.topicCount).toBe(3);
    expect(result.meta?.documentAnalysis?.topics).toHaveLength(3);
    expect(result.understanding.topics.map((topic) => topic.label)).toEqual([
      "ÖPNV und Mobilität",
      "Straßenraum und Radverkehr",
      "Parkraum und kommunale Planung",
    ]);
    expect(buildCreateStructureBranches(result, 12)).toHaveLength(3);
  });
});
