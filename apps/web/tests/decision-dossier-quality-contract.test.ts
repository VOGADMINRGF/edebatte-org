import {
  canTransitionDossierLifecycle,
  evaluateDossierReadiness,
  validateDecisionContextSnapshot,
} from "@features/dossier/decisionDossierQualityContract";

describe("decision dossier quality contract", () => {
  it("allows only explicit lifecycle transitions", () => {
    expect(canTransitionDossierLifecycle("draft", "in_review")).toBe(true);
    expect(canTransitionDossierLifecycle("published", "material_change_detected")).toBe(true);
    expect(canTransitionDossierLifecycle("published", "draft")).toBe(false);
    expect(canTransitionDossierLifecycle("archived", "published")).toBe(false);
  });

  it("fails closed when a material dimension is missing", () => {
    const result = evaluateDossierReadiness({
      lifecycleState: "in_review",
      coverage: [
        {
          id: "financing",
          label: "Finanzierung",
          state: "missing",
          material: true,
          sourceSegmentIds: [],
          claimIds: [],
          note: null,
        },
      ],
      sourceLedger: [],
      claimLedger: [],
      findings: [],
      translationChecks: [],
      independentReReviewCompleted: true,
      humanReviewRevision: "review-1",
    });

    expect(result.publishReady).toBe(false);
    expect(result.hardBlockers).toContain("material_dimension:financing:missing");
  });

  it("blocks unprocessed relevant source segments and pending claims", () => {
    const result = evaluateDossierReadiness({
      lifecycleState: "in_review",
      coverage: [],
      sourceLedger: [
        {
          sourceArtifactId: "source-1",
          sourceSegmentId: "segment-1",
          locator: "p. 42",
          processed: false,
          relevant: true,
          inclusionStatus: "pending_review",
          rationale: null,
        },
      ],
      claimLedger: [
        {
          claimId: "claim-1",
          sourceSegmentIds: ["segment-1"],
          status: "pending_review",
          targetDimensionIds: ["legal"],
          rationale: null,
        },
      ],
      findings: [],
      translationChecks: [],
      independentReReviewCompleted: true,
      humanReviewRevision: "review-1",
    });

    expect(result.publishReady).toBe(false);
    expect(result.hardBlockers).toEqual(
      expect.arrayContaining([
        "relevant_source_segments_unprocessed",
        "relevant_source_segments_pending_review",
        "claims_pending_review",
      ]),
    );
  });

  it("blocks semantic translation drift", () => {
    const result = evaluateDossierReadiness({
      lifecycleState: "in_review",
      coverage: [],
      sourceLedger: [],
      claimLedger: [],
      findings: [],
      translationChecks: [
        {
          canonicalLocale: "de",
          targetLocale: "pl",
          sourceRevision: "r1",
          translationRevision: "tr1",
          semanticEquivalent: true,
          scopePreserved: true,
          uncertaintyPreserved: false,
          quantificationPreserved: true,
          normativeStrengthPreserved: true,
          requiresReview: false,
        },
      ],
      independentReReviewCompleted: true,
      humanReviewRevision: "review-1",
    });

    expect(result.publishReady).toBe(false);
    expect(result.hardBlockers).toContain("translation_equivalence:pl");
  });

  it("permits an explicit audited material-risk override but records its use", () => {
    const result = evaluateDossierReadiness({
      lifecycleState: "in_review",
      coverage: [],
      sourceLedger: [],
      claimLedger: [],
      findings: [
        {
          id: "f1",
          severity: "hard_blocker",
          code: "missing_association_source",
          message: "Relevant association did not provide a source.",
          material: true,
        },
      ],
      translationChecks: [],
      independentReReviewCompleted: true,
      humanReviewRevision: "review-1",
      humanOverride: {
        approved: true,
        reason: "Source unavailable after documented outreach; gap stays public.",
        materialRiskAccepted: true,
      },
    });

    expect(result.publishReady).toBe(true);
    expect(result.overrideUsed).toBe(true);
    expect(result.decisionReady).toBe(false);
  });

  it("requires a fully bound decision context snapshot", () => {
    expect(
      validateDecisionContextSnapshot({
        decisionId: "decision-1",
        dossierId: "dossier-1",
        dossierRevision: "dossier-r4",
        scenarioSetRevision: "set-r2",
        scenarioRevisionIds: ["scenario-a-r2", "scenario-b-r2"],
        evidenceRevision: "evidence-r8",
        actorPositionRevisionIds: ["actor-1-r3"],
        translationRevision: null,
        capturedAt: "2026-09-17T08:00:00+02:00",
      }),
    ).toEqual([]);

    expect(
      validateDecisionContextSnapshot({
        decisionId: "decision-1",
        dossierId: "dossier-1",
        dossierRevision: "",
        scenarioSetRevision: "set-r2",
        scenarioRevisionIds: [],
        evidenceRevision: "evidence-r8",
        actorPositionRevisionIds: [],
        translationRevision: null,
        capturedAt: "2026-09-17T08:00:00+02:00",
      }),
    ).toEqual(expect.arrayContaining(["missing_dossier_revision", "missing_scenario_revisions"]));
  });
});
