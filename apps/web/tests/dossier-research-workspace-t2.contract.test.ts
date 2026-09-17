import { describe, expect, it } from "vitest";

import {
  canRetryResearchWorkItem,
  evaluateResearchWorkspace,
  t2CanCreateSecondDossier,
  t2CanPublishOrActivate,
  type DossierResearchPlan,
} from "@features/dossier/researchWorkspaceContract";

const basePlan = (): DossierResearchPlan => ({
  dossierId: "dossier-pension",
  qualificationRevision: "qualification-r1",
  planRevision: "research-plan-r1",
  questions: [
    "How is the current system financed?",
    "What changes under the no-change baseline?",
    "Which domestic and international comparators are relevant?",
  ],
  inclusionCriteria: ["traceable source", "material to the system question"],
  exclusionCriteria: ["untraceable repost without source lineage"],
  workItems: [
    {
      id: "work-current-system",
      question: "Current financing and legal structure",
      material: true,
      status: "complete",
      attempt: 1,
      maxAttempts: 3,
      artifactRefs: ["artifact-current-system"],
      checkpointRef: "checkpoint-current-system",
      failureCode: null,
    },
    {
      id: "work-projection",
      question: "Demographic and financing projection",
      material: true,
      status: "complete",
      attempt: 2,
      maxAttempts: 3,
      artifactRefs: ["artifact-projection"],
      checkpointRef: "checkpoint-projection",
      failureCode: null,
    },
  ],
  sources: [
    {
      sourceArtifactId: "source-primary-1",
      canonicalAssessmentRef: "assessment-primary-1",
      assessmentRevision: "assessment-r1",
      researchRole: "primary",
      independence: "verified_independent",
      freshness: "current",
      contradiction: "none",
      inclusion: "included",
      inclusionRationale: "Primary official source for the current system.",
    },
    {
      sourceArtifactId: "source-secondary-1",
      canonicalAssessmentRef: "assessment-secondary-1",
      assessmentRevision: "assessment-r1",
      researchRole: "secondary",
      independence: "verified_independent",
      freshness: "current",
      contradiction: "reviewed",
      inclusion: "included",
      inclusionRationale: "Independent research context and comparison.",
    },
  ],
  sourceGapRefs: [],
  budget: {
    maxWorkItems: 20,
    maxAttemptsTotal: 40,
    maxCostUnits: 100,
    usedCostUnits: 24,
  },
  humanGate: {
    status: "reviewed",
    reviewerRef: "reviewer-1",
    revision: "research-review-r1",
    reviewedAt: "2026-09-17T08:15:00+02:00",
  },
});

describe("T2 dossier research workspace contract", () => {
  it("accepts a reviewed plan with complete material work and mixed independent sources", () => {
    const result = evaluateResearchWorkspace(basePlan());
    expect(result.complete).toBe(true);
    expect(result.hasPrimary).toBe(true);
    expect(result.hasSecondary).toBe(true);
    expect(result.verifiedIndependentSources).toBe(2);
  });

  it("fails closed for every open material work item", () => {
    for (const status of ["planned", "running", "blocked", "failed"] as const) {
      const plan = basePlan();
      const workItems = plan.workItems.map((item, index) =>
        index === 0
          ? {
              ...item,
              status,
              checkpointRef: status === "running" || status === "blocked" ? "checkpoint" : item.checkpointRef,
              failureCode: status === "failed" ? "provider_error" : null,
            }
          : item,
      );
      const result = evaluateResearchWorkspace({ ...plan, workItems });
      expect(result.complete).toBe(false);
      expect(result.reasons).toContain("material_work_item_incomplete");
    }
  });

  it("requires artifacts for completed work and checkpoints for recoverable work", () => {
    const completedWithoutArtifact = basePlan();
    expect(
      evaluateResearchWorkspace({
        ...completedWithoutArtifact,
        workItems: completedWithoutArtifact.workItems.map((item, index) =>
          index === 0 ? { ...item, artifactRefs: [] } : item,
        ),
      }).reasons,
    ).toContain("completed_work_item_without_artifact");

    const runningWithoutCheckpoint = basePlan();
    expect(
      evaluateResearchWorkspace({
        ...runningWithoutCheckpoint,
        workItems: runningWithoutCheckpoint.workItems.map((item, index) =>
          index === 0 ? { ...item, status: "running", checkpointRef: null } : item,
        ),
      }).reasons,
    ).toContain("recoverable_work_item_without_checkpoint");
  });

  it("requires primary and secondary sources and at least one verified independent source", () => {
    const plan = basePlan();
    expect(evaluateResearchWorkspace({ ...plan, sources: plan.sources.filter((source) => source.researchRole === "primary") }).reasons).toContain("secondary_source_missing");
    expect(evaluateResearchWorkspace({ ...plan, sources: plan.sources.filter((source) => source.researchRole === "secondary") }).reasons).toContain("primary_source_missing");
    expect(evaluateResearchWorkspace({ ...plan, sources: plan.sources.map((source) => ({ ...source, independence: "unknown" as const })) }).reasons).toContain("verified_independent_source_missing");
  });

  it("keeps stale evidence, open contradictions and source gaps incomplete", () => {
    const plan = basePlan();
    expect(evaluateResearchWorkspace({ ...plan, sources: plan.sources.map((source, index) => index === 0 ? { ...source, freshness: "stale" as const } : source) }).complete).toBe(false);
    expect(evaluateResearchWorkspace({ ...plan, sources: plan.sources.map((source, index) => index === 0 ? { ...source, contradiction: "open" as const } : source) }).complete).toBe(false);
    expect(evaluateResearchWorkspace({ ...plan, sourceGapRefs: ["gap-international-comparator"] }).reasons).toContain("material_source_gaps_open");
  });

  it("enforces bounded retry and budget contracts", () => {
    expect(canRetryResearchWorkItem({ ...basePlan().workItems[0]!, status: "failed", attempt: 1, maxAttempts: 3, failureCode: "provider_error" })).toBe(true);
    expect(canRetryResearchWorkItem({ ...basePlan().workItems[0]!, status: "failed", attempt: 3, maxAttempts: 3, failureCode: "provider_error" })).toBe(false);

    const plan = basePlan();
    expect(evaluateResearchWorkspace({ ...plan, budget: { ...plan.budget, usedCostUnits: 101 } }).reasons).toContain("cost_budget_exceeded_or_invalid");
    expect(evaluateResearchWorkspace({ ...plan, budget: { ...plan.budget, maxAttemptsTotal: 1 } }).reasons).toContain("attempt_budget_exceeded");
  });

  it("requires an explicit human research gate", () => {
    const plan = basePlan();
    expect(evaluateResearchWorkspace({ ...plan, humanGate: { status: "pending", reviewerRef: null, revision: null, reviewedAt: null } }).complete).toBe(false);
    expect(evaluateResearchWorkspace({ ...plan, humanGate: { ...plan.humanGate, status: "rejected" } }).reasons).toContain("human_gate_rejected");
  });

  it("allows low-data research to remain visibly incomplete rather than inventing closure", () => {
    const plan = basePlan();
    const lowData = evaluateResearchWorkspace({
      ...plan,
      sources: [plan.sources[0]!],
      sourceGapRefs: ["gap-independent-comparator", "gap-outcome-series"],
    });
    expect(lowData.complete).toBe(false);
    expect(lowData.reasons).toContain("material_source_gaps_open");
    expect(lowData.reasons).toContain("secondary_source_missing");
  });

  it("never creates a second Dossier truth or activates publication", () => {
    expect(t2CanCreateSecondDossier()).toBe(false);
    expect(t2CanPublishOrActivate()).toBe(false);
  });
});
