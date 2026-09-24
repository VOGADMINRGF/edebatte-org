import { describe, expect, it } from "vitest";
import {
  CanonicalAnalysisResultSchema,
  ComposedAnalysisResultSchema,
  CriticResultSchema,
  GroundingCoverageResultSchema,
  StructureResultSchema,
  composeSpecialistAnalysis,
  type CanonicalAnalysisResult,
  type CriticResult,
  type GroundingCoverageResult,
  type SpecialistExecution,
  type StructureResult,
} from "@features/ai/specialistCompositionContract";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

function execution(
  role: string,
  requirement: SpecialistExecution["requirement"] = "required",
): SpecialistExecution {
  return {
    contractVersion: "e150.specialist.v1",
    runId: "run-1",
    role,
    requirement,
    executionState: "executed",
    provider: "fixture-provider",
    model: "fixture-model",
    attemptCount: 1,
    durationMs: 10,
    safeErrorClass: null,
    inputArtifactHashes: [HASH_A],
    outputHash: HASH_B,
    sourceRefs: ["source-1"],
    evidenceRefs: ["evidence-1"],
    confidence: 0.9,
    validationState: "valid",
    fallbackUsed: false,
    fallbackReason: null,
  };
}

function canonical(): CanonicalAnalysisResult {
  return {
    sourceArtifactRefs: ["source-1"],
    normalizedThemes: ["Haushalt", "Haushalt"],
    atomicClaims: [
      {
        claimId: "claim-supported",
        text: "Die Maßnahme ist im Haushaltsentwurf genannt.",
        evidenceRefs: ["evidence-1"],
        confidence: 0.9,
        uncertainty: null,
      },
      {
        claimId: "claim-ungrounded",
        text: "Diese Aussage hat keine Evidenz.",
        evidenceRefs: [],
        confidence: 0.5,
        uncertainty: "Quelle fehlt",
      },
      {
        claimId: "claim-critic-rejected",
        text: "Diese Aussage wird vom Critic als unbelegt markiert.",
        evidenceRefs: ["evidence-2"],
        confidence: 0.7,
        uncertainty: null,
      },
    ],
    relationships: [],
    responsibilities: [],
    openQuestions: ["Welche Mittel sind final beschlossen?"],
    contradictions: ["Entwurf und Beschluss unterscheiden sich."],
    summaryDraft: "Der Entwurf nennt die Maßnahme; offene Punkte bleiben sichtbar.",
    sourceCoverageReceipt: {
      coveredSourceArtifactRefs: ["source-1"],
      uncoveredSourceArtifactRefs: [],
    },
    execution: execution("canonical_analysis"),
  };
}

function readyCanonical(): CanonicalAnalysisResult {
  const value = canonical();
  value.atomicClaims = value.atomicClaims.filter((claim) => claim.claimId === "claim-supported");
  return value;
}

function critic(): CriticResult {
  return {
    targetAnalysisHash: HASH_B,
    unsupportedClaims: ["claim-critic-rejected"],
    omissions: ["Beschlussfassung ist noch zu prüfen."],
    contradictions: ["Eine Gegenquelle nennt einen anderen Betrag."],
    overinterpretations: ["Entwurf darf nicht als finaler Beschluss gelesen werden."],
    missingPerspectives: ["Kommunale Auswirkung fehlt."],
    summaryCritique: "Die Zusammenfassung benötigt menschliche Prüfung.",
    severity: "medium",
    reviewRecommendations: ["Finalen Beschluss prüfen."],
    execution: {
      ...execution("critic"),
      outputHash: HASH_C,
    },
  };
}

function structure(): StructureResult {
  return {
    sourceArtifactRefs: ["source-1"],
    documentOutline: [
      { sectionId: "section-1", title: "Haushalt", segmentIds: ["segment-1"] },
    ],
    topicClusters: [
      { topicId: "topic-1", label: "Haushalt", segmentIds: ["segment-1"] },
    ],
    claimCandidates: [
      {
        candidateId: "candidate-1",
        text: "Die Maßnahme ist genannt.",
        sourceArtifactRef: "source-1",
        segmentRefs: ["segment-1"],
      },
    ],
    argumentRelations: [],
    unclassifiedSegments: [],
    structureCoverage: 1,
    execution: execution("structure"),
  };
}

function grounding(): GroundingCoverageResult {
  return {
    sourceArtifactRefs: ["source-1"],
    sourceModalities: [{ sourceArtifactRef: "source-1", modality: "document" }],
    coveredSegments: ["segment-1"],
    uncoveredSegments: [],
    sourceCoverage: [{ sourceArtifactRef: "source-1", ratio: 1 }],
    evidenceMappings: [
      {
        candidateId: "candidate-1",
        relation: "supports",
        evidenceRef: "evidence-1",
        sourceArtifactRef: "source-1",
        segmentId: "segment-1",
        pageRef: "p. 4",
        timestampRef: null,
      },
    ],
    extractionLimitations: [],
    unsupportedCandidateIds: [],
    execution: execution("grounding_coverage"),
  };
}

describe("#629 specialist composition Slice 1", () => {
  it("accepts all five typed stage contracts without any provider call", () => {
    expect(StructureResultSchema.parse(structure()).execution.role).toBe("structure");
    expect(GroundingCoverageResultSchema.parse(grounding()).execution.role).toBe("grounding_coverage");
    expect(CanonicalAnalysisResultSchema.parse(canonical()).execution.role).toBe("canonical_analysis");
    expect(CriticResultSchema.parse(critic()).execution.role).toBe("critic");

    const composed = composeSpecialistAnalysis({
      structure: structure(),
      grounding: grounding(),
      canonical: canonical(),
      critic: critic(),
    });

    expect(ComposedAnalysisResultSchema.parse(composed)).toEqual(composed);
  });

  it("never retains a canonical claim without evidence", () => {
    const composed = composeSpecialistAnalysis({ canonical: canonical() });

    expect(composed.retainedClaims.map((claim) => claim.claimId)).toEqual([
      "claim-supported",
      "claim-critic-rejected",
    ]);
    expect(composed.rejectedClaimCandidates).toContainEqual({
      claimId: "claim-ungrounded",
      reason: "missing_evidence",
    });
  });

  it("rejects canonical evidence refs that are absent from supplied grounding mappings", () => {
    const composed = composeSpecialistAnalysis({
      grounding: grounding(),
      canonical: canonical(),
    });

    expect(composed.retainedClaims.map((claim) => claim.claimId)).toEqual(["claim-supported"]);
    expect(composed.rejectedClaimCandidates).toContainEqual({
      claimId: "claim-critic-rejected",
      reason: "ungrounded_evidence",
    });
  });

  it("rejects grounding mappings that reference a foreign source artifact", () => {
    const invalid = grounding();
    invalid.evidenceMappings[0].sourceArtifactRef = "source-foreign";

    expect(() => GroundingCoverageResultSchema.parse(invalid)).toThrow();
  });

  it("rejects grounding mappings that reference an unknown segment", () => {
    const invalid = grounding();
    invalid.evidenceMappings[0].segmentId = "segment-foreign";

    expect(() => GroundingCoverageResultSchema.parse(invalid)).toThrow();
  });

  it("lets a hash-bound critic reject claims without mutating the canonical draft", () => {
    const input = canonical();
    const composed = composeSpecialistAnalysis({ canonical: input, critic: critic() });

    expect(composed.retainedClaims.map((claim) => claim.claimId)).toEqual(["claim-supported"]);
    expect(composed.rejectedClaimCandidates).toContainEqual({
      claimId: "claim-critic-rejected",
      reason: "critic_unsupported",
    });
    expect(composed.composedSummary).toBe(input.summaryDraft);
    expect(composed.requiresHumanReview).toBe(true);
  });

  it("fails closed on a critic targeting a different canonical analysis hash", () => {
    const mismatchedCritic = critic();
    mismatchedCritic.targetAnalysisHash = HASH_A;

    const composed = composeSpecialistAnalysis({
      canonical: canonical(),
      critic: mismatchedCritic,
    });

    expect(composed.retainedClaims.map((claim) => claim.claimId)).toContain("claim-critic-rejected");
    expect(composed.degradedReasons).toContain("critic_target_hash_mismatch");
    expect(composed.openQuestions).not.toContain("Finalen Beschluss prüfen.");
    expect(composed.provenanceGraph.some((edge) => edge.specialistOutputRole === "critic")).toBe(false);
  });

  it("preserves contradictions, uncertainties and open review questions visibly", () => {
    const composed = composeSpecialistAnalysis({ canonical: canonical(), critic: critic() });

    expect(composed.visibleContradictions).toContain("Entwurf und Beschluss unterscheiden sich.");
    expect(composed.visibleContradictions).toContain("Eine Gegenquelle nennt einen anderen Betrag.");
    expect(composed.uncertainties).toContain("Quelle fehlt");
    expect(composed.uncertainties).toContain("Entwurf darf nicht als finaler Beschluss gelesen werden.");
    expect(composed.openQuestions).toContain("Welche Mittel sind final beschlossen?");
    expect(composed.openQuestions).toContain("Finalen Beschluss prüfen.");
  });

  it("builds provenance only from sources actually assigned to each specialist role", () => {
    const structured = structure();
    structured.sourceArtifactRefs = ["source-structure"];
    structured.claimCandidates[0].sourceArtifactRef = "source-structure";
    structured.execution = {
      ...structured.execution,
      sourceRefs: ["source-structure"],
    };

    const analysis = readyCanonical();
    analysis.sourceArtifactRefs = ["source-canonical"];
    analysis.sourceCoverageReceipt = {
      coveredSourceArtifactRefs: ["source-canonical"],
      uncoveredSourceArtifactRefs: [],
    };
    analysis.execution = {
      ...analysis.execution,
      sourceRefs: ["source-canonical"],
    };

    const composed = composeSpecialistAnalysis({
      structure: structured,
      canonical: analysis,
    });

    expect(composed.provenanceGraph).toHaveLength(2);
    expect(composed.provenanceGraph).toContainEqual({
      sourceArtifactRef: "source-structure",
      specialistOutputRole: "structure",
      targetField: "composedAnalysis",
    });
    expect(composed.provenanceGraph).toContainEqual({
      sourceArtifactRef: "source-canonical",
      specialistOutputRole: "canonical_analysis",
      targetField: "composedAnalysis",
    });
    expect(composed.provenanceGraph).not.toContainEqual({
      sourceArtifactRef: "source-canonical",
      specialistOutputRole: "structure",
      targetField: "composedAnalysis",
    });
  });

  it("marks an attempted required failure as degraded and preserves its attempt metadata", () => {
    const badGrounding = grounding();
    badGrounding.execution = {
      ...badGrounding.execution,
      executionState: "failed",
      validationState: "review_required",
      safeErrorClass: "upstream_unavailable",
      outputHash: null,
    };

    const composed = composeSpecialistAnalysis({
      grounding: badGrounding,
      canonical: readyCanonical(),
    });

    expect(composed.degraded).toBe(true);
    expect(composed.requiresHumanReview).toBe(true);
    expect(composed.degradedReasons).toContain(
      "required_role_not_valid:grounding_coverage:failed:review_required",
    );
    expect(composed.providerAttempts).toContainEqual(
      expect.objectContaining({
        role: "grounding_coverage",
        attemptCount: 1,
      }),
    );
  });

  it("marks an attempted optional failure as degraded and preserves the real attempt count", () => {
    const optionalStructure = structure();
    optionalStructure.execution = {
      ...execution("structure", "optional"),
      executionState: "failed",
      attemptCount: 2,
      validationState: "review_required",
      safeErrorClass: "upstream_unavailable",
      outputHash: null,
    };

    const composed = composeSpecialistAnalysis({
      structure: optionalStructure,
      canonical: readyCanonical(),
    });

    expect(composed.degraded).toBe(true);
    expect(composed.degradedReasons).toContain(
      "optional_role_not_valid:structure:failed:review_required",
    );
    expect(composed.providerAttempts).toContainEqual(
      expect.objectContaining({
        role: "structure",
        attemptCount: 2,
      }),
    );
  });

  it("keeps an optional skipped role non-degrading and records no provider attempt for it", () => {
    const skippedStructure = structure();
    skippedStructure.execution = {
      ...execution("structure", "optional"),
      executionState: "skipped",
      provider: undefined,
      model: undefined,
      attemptCount: 0,
      safeErrorClass: null,
      outputHash: null,
      sourceRefs: [],
      evidenceRefs: [],
      confidence: null,
      validationState: "valid",
    };

    const composed = composeSpecialistAnalysis({
      structure: skippedStructure,
      canonical: readyCanonical(),
    });

    expect(composed.degraded).toBe(false);
    expect(composed.providerAttempts).toHaveLength(1);
    expect(composed.providerAttempts[0].role).toBe("canonical_analysis");
    expect(composed.provenanceGraph.some((edge) => edge.specialistOutputRole === "structure")).toBe(false);
  });

  it("keeps provider attempts limited to execution metadata and does not synthesize source truth", () => {
    const composed = composeSpecialistAnalysis({
      structure: structure(),
      grounding: grounding(),
      canonical: canonical(),
      critic: critic(),
    });

    expect(composed.providerAttempts).toHaveLength(4);
    expect(composed.providerAttempts[0]).not.toHaveProperty("prompt");
    expect(composed.providerAttempts[0]).not.toHaveProperty("sourceText");
    expect(composed.provenanceGraph.every((edge) => edge.sourceArtifactRef === "source-1")).toBe(true);
  });

  it("fails closed when attempted execution metadata omits provider/model", () => {
    const invalid = structure() as any;
    invalid.execution.provider = undefined;

    expect(() => StructureResultSchema.parse(invalid)).toThrow();
  });

  it("fails closed when skipped execution metadata claims a provider attempt", () => {
    const invalid = structure() as any;
    invalid.execution.requirement = "optional";
    invalid.execution.executionState = "skipped";
    invalid.execution.attemptCount = 1;

    expect(() => StructureResultSchema.parse(invalid)).toThrow();
  });

  it("is deterministic for identical input", () => {
    const input = {
      structure: structure(),
      grounding: grounding(),
      canonical: canonical(),
      critic: critic(),
    };

    expect(composeSpecialistAnalysis(input)).toEqual(composeSpecialistAnalysis(input));
  });
});
