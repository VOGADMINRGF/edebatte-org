import { describe, expect, it } from "vitest";
import { buildCreateHandoffDraft } from "@/features/create/createHandoff";
import { buildCreateTechnicalFollowup } from "@/features/create/intelligentFollowupResults";
import type { CreateIntelligentFollowupResult } from "@/features/create/intelligentFollowupContract";

function buildSemanticFollowup(): CreateIntelligentFollowupResult {
  return {
    understanding: {
      summary: "Bus-Takt, Straßenraum und Parkraum wurden valide erkannt.",
      categories: [{ id: "claim", label: "Aussage", confidence: "high" }],
      topics: [
        { id: "topic-1", label: "ÖPNV und Mobilität", confidence: "high" },
        { id: "topic-2", label: "Straßenraum und Radverkehr", confidence: "high" },
      ],
      statements: [
        {
          id: "statement-1",
          text: "Der Bus fährt abends nur noch alle 30 Minuten.",
          kind: "claim",
          stance: "open",
          confidence: "high",
        },
      ],
      scopes: ["district"],
      openQuestion: "Welcher Themenstrang soll zuerst vertieft werden?",
      confidence: "high",
    },
    suggestions: [],
    sourceText:
      "Bei uns im Bezirk fährt der Bus abends nur noch alle 30 Minuten und die Hauptstraße soll umgebaut werden.",
    generatedAt: "2026-07-18T16:00:00.000Z",
    meta: {
      planner: {
        source: "openai",
        plannerSource: "openai",
        plannerProvider: "openai",
        plannerRole: "planner_only",
        plannerTopic: "ÖPNV und Mobilität",
        plannerCore:
          "Der Beitrag verbindet abendlichen Bus-Takt, Straßenraum, Radverkehr und Parkraum.",
        plannerScope: ["district"],
        plannerStance: "open",
        plannerClusters: ["ÖPNV und Mobilität", "Straßenraum und Radverkehr"],
        plannerOpenQuestions: ["Welcher Themenstrang soll zuerst vertieft werden?"],
        shortSummary:
          "Der Beitrag verbindet Bus-Takt, Straßenumbau und kommunale Verkehrsplanung.",
        topicCandidates: ["ÖPNV und Mobilität", "Straßenraum und Radverkehr"],
        clusterCandidates: ["ÖPNV und Mobilität", "Straßenraum und Radverkehr"],
        scopeCandidates: ["district"],
        stance: "open",
        openQuestions: ["Welcher Themenstrang soll zuerst vertieft werden?"],
        graphSearchTerms: ["öpnv", "straßenraum"],
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
      },
      graphMatch: {
        stage: "after_structure",
        prepared: true,
        requiresConfirmation: true,
        searchTerms: ["öpnv", "straßenraum"],
        matches: [],
        matchedTopics: [],
        matchedDossiers: [],
        matchedClaims: [],
        matchedAnlassraeume: [],
        matchedVotes: [],
        shouldCreateNewTopic: true,
      },
      researchUsed: "none",
      researchProvider: null,
      deepSearchUsed: false,
      analysis: {
        state: "result_ready",
        analysisId: "analysis-valid",
        sourceType: "text",
        sourceUrl: null,
        sourceContentHash: "hash-valid",
        analyzedAt: "2026-07-18T16:00:00.000Z",
        orchestrationRunId: "orch-valid",
        schemaVersion: "create_followup.v2",
        validationStatus: "validated",
        evidenceReferences: [],
        confidence: 0.91,
        sourceLoaded: true,
        userMessage: null,
      },
    },
  };
}

describe("create handoff valid-input contract", () => {
  it("keeps the direct handoff contract strict for invalid technical inputs", () => {
    const invalid = buildCreateTechnicalFollowup({
      text: "https://example.org/link",
      analysisState: "ai_failed",
      sourceType: "link",
      sourceUrl: "https://example.org/link",
      sourceLoaded: false,
      userMessage: "Keine validierte semantische Analyse vorhanden.",
      generatedAt: "2026-07-18T16:30:00.000Z",
    });

    expect(() =>
      buildCreateHandoffDraft({
        result: invalid,
        selectedAction: "request_review",
      }),
    ).toThrowError("create_handoff_requires_planner_and_graph_meta");
  });

  it("still builds a handoff when valid planner and graph meta are present", () => {
    const draft = buildCreateHandoffDraft({
      result: buildSemanticFollowup(),
      selectedAction: "request_review",
      id: "handoff-valid",
      createdAt: "2026-07-18T16:45:00.000Z",
    });

    expect(draft.id).toBe("handoff-valid");
    expect(draft.plannerResult.plannerTopic).toBe("ÖPNV und Mobilität");
    expect(draft.graphMatches.stage).toBe("after_structure");
    expect(draft.claims.length).toBeGreaterThan(0);
    expect(draft.openQuestions.length).toBeGreaterThan(0);
  });

  it("preserves a factual origin as blocked when Create proposes a normative handoff question", () => {
    const followup = buildSemanticFollowup();
    followup.sourceText = "Stimmt es, dass die Emissionen seit 2020 gesunken sind?";
    followup.understanding.openQuestion = "Soll Deutschland die Emissionen stärker senken?";
    if (followup.meta?.planner) {
      followup.meta.planner.plannerOpenQuestions = [];
      followup.meta.planner.openQuestions = [];
    }

    const draft = buildCreateHandoffDraft({
      result: followup,
      selectedAction: "request_review",
      id: "handoff-factual-origin",
    });

    expect(draft.openQuestions).toHaveLength(1);
    expect(draft.openQuestions[0].generalization).toMatchObject({
      outcome: "fact_or_truth_question_blocked",
      releaseState: "blocked",
      publicQuestion: null,
    });
  });
});
