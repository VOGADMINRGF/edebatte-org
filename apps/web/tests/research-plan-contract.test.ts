import { describe, expect, it } from "vitest";
import {
  validateResearchPlan,
  type ResearchPlan,
} from "@core/research/researchPlanContract";

const HASH_A = "a".repeat(64);

function validPlan(): ResearchPlan {
  return {
    planId: "plan-1",
    binding: {
      dossierId: "dossier-1",
      dossierRevisionSeq: 3,
      dossierRevisionHash: HASH_A,
    },
    researchTaskIds: ["task-1"],
    workItems: [
      {
        workItemId: "work-1",
        researchTaskId: "task-1",
        question: "Welche belastbaren Informationen fehlen zur offenen Sachfrage?",
        rationale: "Der Research-Slice soll offene Evidenzbedarfe explizit und prüfbar halten.",
        inclusionCriteria: ["Primär- oder belastbare Sekundärquellen mit nachvollziehbarer Herkunft"],
        exclusionRationales: ["Reine Wiederholungen ohne zusätzliche Herkunft oder Evidenz"],
        sourceRequirements: [
          {
            requirementId: "source-primary",
            role: "primary",
            requiredArtifactTypes: ["primary_document", "official_record"],
            requiredSourceFamilyCount: 2,
            independenceRequirement: "multiple_families",
            lineageRequirement: "provenance_required",
            counterevidenceRequirement: "required",
            freshnessRequirement: {
              requirementId: "fresh-source-primary",
              kind: "explicit_cutoff",
              cutoff: "2026-09-01T00:00:00Z",
              status: "open",
            },
            status: "open",
          },
        ],
        sourceGaps: [
          {
            requirementId: "gap-primary",
            description: "Mindestens eine unabhängige Primärquelle fehlt noch.",
            status: "open",
          },
        ],
        artifactReferences: [
          {
            artifactId: "artifact-hint-1",
            sourceFamilyId: "family-1",
            sourceType: "official_record",
          },
        ],
        sourceFamilyReferences: ["family-1"],
        contradictionRequirements: [
          {
            requirementId: "contradiction-1",
            description: "Widersprechende belastbare Evidenz muss gezielt gesucht und geprüft werden.",
            status: "needs_human_review",
          },
        ],
        consensusDissentRequirements: [
          {
            requirementId: "consensus-1",
            description: "Konsens und Dissens dürfen erst nach Quellenprüfung beschrieben werden.",
            status: "open",
          },
        ],
        challengeRequirements: [
          {
            requirementId: "challenge-1",
            description: "Die stärkste Gegenposition bleibt als offene Prüfanforderung erhalten.",
            status: "open",
          },
        ],
        actorConflictRequirements: [
          {
            requirementId: "actor-conflict-1",
            description: "Mögliche Akteurskonflikte benötigen menschliche Prüfung.",
            status: "needs_human_review",
          },
        ],
        freshnessRequirements: [
          {
            requirementId: "fresh-work-1",
            kind: "current_required",
            cutoff: null,
            status: "open",
          },
        ],
        humanReviewState: "needs_human_review",
      },
    ],
    completenessCriteria: [
      {
        criterionId: "criterion-1",
        description: "Alle offenen Anforderungen des WorkItems wurden geprüft.",
        requiredWorkItemIds: ["work-1"],
        humanReviewRequired: true,
      },
    ],
    planReviewState: "needs_human_review",
    context: {
      jurisdiction: null,
      locale: null,
    },
  };
}

function clonePlan(): Record<string, any> {
  return structuredClone(validPlan()) as Record<string, any>;
}

describe("T2B pure ResearchPlan contract", () => {
  it("accepts a structurally complete plan while all research requirements remain open", () => {
    const plan = validPlan();
    const result = validateResearchPlan(plan);

    expect(result).toEqual({ valid: true, errors: [] });
    expect(plan.workItems[0].sourceGaps[0].status).toBe("open");
    expect(plan.workItems[0].contradictionRequirements[0].status).toBe("needs_human_review");
    expect(plan.workItems[0].artifactReferences).toHaveLength(1);
  });

  it("does not allow intent or references to masquerade as executed or completed research", () => {
    const plan = clonePlan();
    plan.researchComplete = true;
    plan.evidenceVerified = true;
    plan.decisionReady = true;
    plan.workItems[0].sourceGaps[0].status = "fulfilled";
    plan.workItems[0].sourceRequirements[0].status = "verified";
    plan.completenessCriteria[0].fulfilled = true;

    const result = validateResearchPlan(plan);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "plan.decisionReady:unknown_field",
        "plan.evidenceVerified:unknown_field",
        "plan.researchComplete:unknown_field",
        "workItems[0].sourceGaps[0].status:invalid_requirement_status",
        "workItems[0].sourceRequirements[0].status:invalid_requirement_status",
        "completenessCriteria[0].fulfilled:unknown_field",
      ]),
    );
  });

  it("fails closed on unknown source artifact vocabulary", () => {
    const plan = clonePlan();
    plan.workItems[0].sourceRequirements[0].requiredArtifactTypes = ["official_record", "invented_source_type"];
    plan.workItems[0].artifactReferences[0].sourceType = "invented_source_type";

    const result = validateResearchPlan(plan);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "workItems[0].sourceRequirements[0].requiredArtifactTypes[1]:invalid_source_artifact_type",
        "workItems[0].artifactReferences[0].sourceType:invalid_source_artifact_type",
      ]),
    );
  });

  it("requires WorkItems and completeness criteria to reference declared plan members", () => {
    const plan = clonePlan();
    plan.workItems[0].researchTaskId = "task-not-declared";
    plan.completenessCriteria[0].requiredWorkItemIds = ["work-not-declared"];

    const result = validateResearchPlan(plan);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "workItems[0].researchTaskId:not_in_plan_task_set",
        "completenessCriteria[0].requiredWorkItemIds:unknown_work_item:work-not-declared",
      ]),
    );
  });

  it("rejects duplicate identifiers and malformed dossier bindings", () => {
    const plan = clonePlan();
    plan.binding.dossierRevisionSeq = 0;
    plan.binding.dossierRevisionHash = "short";
    plan.researchTaskIds = ["task-1", "task-1"];
    plan.workItems.push({ ...structuredClone(plan.workItems[0]), workItemId: "work-1" });
    plan.completenessCriteria.push({
      ...structuredClone(plan.completenessCriteria[0]),
      criterionId: "criterion-1",
    });

    const result = validateResearchPlan(plan);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "plan.binding.dossierRevisionSeq:must_be_positive_safe_integer",
        "plan.binding.dossierRevisionHash:must_be_64_hex",
        "plan.researchTaskIds[1]:duplicate_value",
        "workItems[1].workItemId:duplicate_value",
        "completenessCriteria[1].criterionId:duplicate_value",
      ]),
    );
  });

  it("enforces explicit freshness cutoff semantics without inferring freshness", () => {
    const plan = clonePlan();
    plan.workItems[0].sourceRequirements[0].freshnessRequirement = {
      requirementId: "fresh-source-primary",
      kind: "explicit_cutoff",
      cutoff: null,
      status: "open",
    };
    plan.workItems[0].freshnessRequirements[0] = {
      requirementId: "fresh-work-1",
      kind: "current_required",
      cutoff: "2026-09-01",
      status: "open",
    };

    const result = validateResearchPlan(plan);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "workItems[0].sourceRequirements[0].freshnessRequirement.cutoff:explicit_cutoff_requires_iso_value",
        "workItems[0].freshnessRequirements[0].cutoff:must_be_null_without_explicit_cutoff",
      ]),
    );
  });

  it("returns deterministic sorted validation errors", () => {
    const plan = clonePlan();
    plan.planId = "";
    plan.context.locale = "";
    plan.planReviewState = "completed";

    const first = validateResearchPlan(plan);
    const second = validateResearchPlan(plan);

    expect(first).toEqual(second);
    expect(first.errors).toEqual([...first.errors].sort());
  });
});
