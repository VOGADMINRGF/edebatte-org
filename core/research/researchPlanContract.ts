import type { ResearchTaskDossierBinding } from "./types";
import {
  SOURCE_ARTIFACT_TYPES,
  type SourceArtifactType,
} from "../../features/analyze/atomicClaimSourceRelationContract";

export const RESEARCH_PLAN_REVIEW_STATES = [
  "draft",
  "needs_human_review",
  "reviewed_for_execution",
] as const;

export const RESEARCH_REQUIREMENT_STATUSES = [
  "open",
  "needs_human_review",
] as const;

export const RESEARCH_SOURCE_ROLES = ["primary", "secondary"] as const;

export const RESEARCH_INDEPENDENCE_REQUIREMENTS = [
  "independent",
  "multiple_families",
  "review_required",
] as const;

export const RESEARCH_LINEAGE_REQUIREMENTS = [
  "original_preferred",
  "provenance_required",
  "review_required",
] as const;

export const RESEARCH_COUNTEREVIDENCE_REQUIREMENTS = [
  "required",
  "review_required",
] as const;

export const RESEARCH_FRESHNESS_KINDS = [
  "current_required",
  "explicit_cutoff",
  "review_required",
] as const;

export type ResearchPlanReviewState =
  (typeof RESEARCH_PLAN_REVIEW_STATES)[number];
export type ResearchRequirementStatus =
  (typeof RESEARCH_REQUIREMENT_STATUSES)[number];
export type ResearchSourceRole = (typeof RESEARCH_SOURCE_ROLES)[number];
export type ResearchIndependenceRequirement =
  (typeof RESEARCH_INDEPENDENCE_REQUIREMENTS)[number];
export type ResearchLineageRequirement =
  (typeof RESEARCH_LINEAGE_REQUIREMENTS)[number];
export type ResearchCounterevidenceRequirement =
  (typeof RESEARCH_COUNTEREVIDENCE_REQUIREMENTS)[number];
export type ResearchFreshnessKind = (typeof RESEARCH_FRESHNESS_KINDS)[number];

export type ResearchOpenRequirement = {
  requirementId: string;
  description: string;
  status: ResearchRequirementStatus;
};

export type ResearchFreshnessRequirement = {
  requirementId: string;
  kind: ResearchFreshnessKind;
  cutoff: string | null;
  status: ResearchRequirementStatus;
};

export type ResearchSourceRequirement = {
  requirementId: string;
  role: ResearchSourceRole;
  requiredArtifactTypes: SourceArtifactType[];
  requiredSourceFamilyCount: number;
  independenceRequirement: ResearchIndependenceRequirement;
  lineageRequirement: ResearchLineageRequirement;
  counterevidenceRequirement: ResearchCounterevidenceRequirement;
  freshnessRequirement: ResearchFreshnessRequirement;
  status: ResearchRequirementStatus;
};

export type ResearchArtifactReference = {
  artifactId: string;
  sourceFamilyId: string | null;
  sourceType: SourceArtifactType | null;
};

export type ResearchWorkItem = {
  workItemId: string;
  researchTaskId: string;
  question: string;
  rationale: string;
  inclusionCriteria: string[];
  exclusionRationales: string[];
  sourceRequirements: ResearchSourceRequirement[];
  sourceGaps: ResearchOpenRequirement[];
  artifactReferences: ResearchArtifactReference[];
  sourceFamilyReferences: string[];
  contradictionRequirements: ResearchOpenRequirement[];
  consensusDissentRequirements: ResearchOpenRequirement[];
  challengeRequirements: ResearchOpenRequirement[];
  actorConflictRequirements: ResearchOpenRequirement[];
  freshnessRequirements: ResearchFreshnessRequirement[];
  humanReviewState: ResearchPlanReviewState;
};

export type ResearchCompletenessCriterion = {
  criterionId: string;
  description: string;
  requiredWorkItemIds: string[];
  humanReviewRequired: boolean;
};

export type ResearchPlanContext = {
  jurisdiction: string | null;
  locale: string | null;
};

export type ResearchPlan = {
  planId: string;
  binding: ResearchTaskDossierBinding;
  researchTaskIds: string[];
  workItems: ResearchWorkItem[];
  completenessCriteria: ResearchCompletenessCriterion[];
  planReviewState: ResearchPlanReviewState;
  context: ResearchPlanContext;
};

export type ResearchPlanValidationResult = {
  valid: boolean;
  errors: string[];
};

const HASH_64_RE = /^[a-f0-9]{64}$/i;
const ISO_CUTOFF_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: string[],
) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value).sort()) {
    if (!allowedSet.has(key)) errors.push(`${path}.${key}:unknown_field`);
  }
}

function validateRequiredText(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!clean(value)) errors.push(`${path}:required_non_blank_string`);
}

function validateNullableText(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (value !== null && !clean(value)) {
    errors.push(`${path}:must_be_null_or_non_blank_string`);
  }
}

function validateNullableSourceArtifactType(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (value === null) return;
  const sourceType = clean(value);
  if (!sourceType || !isOneOf(sourceType, SOURCE_ARTIFACT_TYPES)) {
    errors.push(`${path}:invalid_source_artifact_type`);
  }
}

function validateUniqueTextArray(
  value: unknown,
  path: string,
  errors: string[],
  options: { minItems?: number } = {},
): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path}:must_be_array`);
    return [];
  }
  if (value.length < (options.minItems ?? 0)) {
    errors.push(`${path}:too_few_items`);
  }
  const normalized: string[] = [];
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const text = clean(entry);
    if (!text) {
      errors.push(`${path}[${index}]:required_non_blank_string`);
      return;
    }
    if (seen.has(text)) {
      errors.push(`${path}[${index}]:duplicate_value`);
      return;
    }
    seen.add(text);
    normalized.push(text);
  });
  return normalized;
}

function validateBinding(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!isRecord(value)) {
    errors.push(`${path}:must_be_object`);
    return;
  }
  rejectUnknownKeys(
    value,
    ["dossierId", "dossierRevisionSeq", "dossierRevisionHash"],
    path,
    errors,
  );
  validateRequiredText(value.dossierId, `${path}.dossierId`, errors);
  if (
    !Number.isSafeInteger(value.dossierRevisionSeq) ||
    Number(value.dossierRevisionSeq) <= 0
  ) {
    errors.push(`${path}.dossierRevisionSeq:must_be_positive_safe_integer`);
  }
  if (!HASH_64_RE.test(clean(value.dossierRevisionHash))) {
    errors.push(`${path}.dossierRevisionHash:must_be_64_hex`);
  }
}

function validateRequirementStatus(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!isOneOf(value, RESEARCH_REQUIREMENT_STATUSES)) {
    errors.push(`${path}:invalid_requirement_status`);
  }
}

function validateOpenRequirement(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!isRecord(value)) {
    errors.push(`${path}:must_be_object`);
    return;
  }
  rejectUnknownKeys(
    value,
    ["requirementId", "description", "status"],
    path,
    errors,
  );
  validateRequiredText(value.requirementId, `${path}.requirementId`, errors);
  validateRequiredText(value.description, `${path}.description`, errors);
  validateRequirementStatus(value.status, `${path}.status`, errors);
}

function validateOpenRequirementArray(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push(`${path}:must_be_array`);
    return;
  }
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    validateOpenRequirement(entry, `${path}[${index}]`, errors);
    if (!isRecord(entry)) return;
    const id = clean(entry.requirementId);
    if (!id) return;
    if (ids.has(id)) errors.push(`${path}[${index}].requirementId:duplicate_value`);
    ids.add(id);
  });
}

function validateFreshnessRequirement(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!isRecord(value)) {
    errors.push(`${path}:must_be_object`);
    return;
  }
  rejectUnknownKeys(
    value,
    ["requirementId", "kind", "cutoff", "status"],
    path,
    errors,
  );
  validateRequiredText(value.requirementId, `${path}.requirementId`, errors);
  if (!isOneOf(value.kind, RESEARCH_FRESHNESS_KINDS)) {
    errors.push(`${path}.kind:invalid_freshness_kind`);
  }
  validateRequirementStatus(value.status, `${path}.status`, errors);

  if (value.kind === "explicit_cutoff") {
    if (!ISO_CUTOFF_RE.test(clean(value.cutoff))) {
      errors.push(`${path}.cutoff:explicit_cutoff_requires_iso_value`);
    }
  } else if (value.cutoff !== null) {
    errors.push(`${path}.cutoff:must_be_null_without_explicit_cutoff`);
  }
}

function validateFreshnessRequirementArray(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push(`${path}:must_be_array`);
    return;
  }
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    validateFreshnessRequirement(entry, `${path}[${index}]`, errors);
    if (!isRecord(entry)) return;
    const id = clean(entry.requirementId);
    if (!id) return;
    if (ids.has(id)) errors.push(`${path}[${index}].requirementId:duplicate_value`);
    ids.add(id);
  });
}

function validateSourceRequirement(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!isRecord(value)) {
    errors.push(`${path}:must_be_object`);
    return;
  }
  rejectUnknownKeys(
    value,
    [
      "requirementId",
      "role",
      "requiredArtifactTypes",
      "requiredSourceFamilyCount",
      "independenceRequirement",
      "lineageRequirement",
      "counterevidenceRequirement",
      "freshnessRequirement",
      "status",
    ],
    path,
    errors,
  );
  validateRequiredText(value.requirementId, `${path}.requirementId`, errors);
  if (!isOneOf(value.role, RESEARCH_SOURCE_ROLES)) {
    errors.push(`${path}.role:invalid_source_role`);
  }
  validateUniqueTextArray(
    value.requiredArtifactTypes,
    `${path}.requiredArtifactTypes`,
    errors,
  );
  if (Array.isArray(value.requiredArtifactTypes)) {
    value.requiredArtifactTypes.forEach((entry, index) => {
      const sourceType = clean(entry);
      if (sourceType && !isOneOf(sourceType, SOURCE_ARTIFACT_TYPES)) {
        errors.push(`${path}.requiredArtifactTypes[${index}]:invalid_source_artifact_type`);
      }
    });
  }
  if (
    !Number.isSafeInteger(value.requiredSourceFamilyCount) ||
    Number(value.requiredSourceFamilyCount) < 1
  ) {
    errors.push(`${path}.requiredSourceFamilyCount:must_be_positive_safe_integer`);
  }
  if (!isOneOf(value.independenceRequirement, RESEARCH_INDEPENDENCE_REQUIREMENTS)) {
    errors.push(`${path}.independenceRequirement:invalid_independence_requirement`);
  }
  if (!isOneOf(value.lineageRequirement, RESEARCH_LINEAGE_REQUIREMENTS)) {
    errors.push(`${path}.lineageRequirement:invalid_lineage_requirement`);
  }
  if (!isOneOf(value.counterevidenceRequirement, RESEARCH_COUNTEREVIDENCE_REQUIREMENTS)) {
    errors.push(`${path}.counterevidenceRequirement:invalid_counterevidence_requirement`);
  }
  validateFreshnessRequirement(
    value.freshnessRequirement,
    `${path}.freshnessRequirement`,
    errors,
  );
  validateRequirementStatus(value.status, `${path}.status`, errors);
}

function validateSourceRequirementArray(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push(`${path}:must_be_array`);
    return;
  }
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    validateSourceRequirement(entry, `${path}[${index}]`, errors);
    if (!isRecord(entry)) return;
    const id = clean(entry.requirementId);
    if (!id) return;
    if (ids.has(id)) errors.push(`${path}[${index}].requirementId:duplicate_value`);
    ids.add(id);
  });
}

function validateArtifactReferences(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push(`${path}:must_be_array`);
    return;
  }
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${itemPath}:must_be_object`);
      return;
    }
    rejectUnknownKeys(entry, ["artifactId", "sourceFamilyId", "sourceType"], itemPath, errors);
    const artifactId = clean(entry.artifactId);
    validateRequiredText(entry.artifactId, `${itemPath}.artifactId`, errors);
    if (artifactId) {
      if (ids.has(artifactId)) errors.push(`${itemPath}.artifactId:duplicate_value`);
      ids.add(artifactId);
    }
    validateNullableText(entry.sourceFamilyId, `${itemPath}.sourceFamilyId`, errors);
    validateNullableSourceArtifactType(entry.sourceType, `${itemPath}.sourceType`, errors);
  });
}

function validateReviewState(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!isOneOf(value, RESEARCH_PLAN_REVIEW_STATES)) {
    errors.push(`${path}:invalid_plan_review_state`);
  }
}

function validateWorkItem(
  value: unknown,
  index: number,
  taskIds: Set<string>,
  errors: string[],
): string | null {
  const path = `workItems[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${path}:must_be_object`);
    return null;
  }
  rejectUnknownKeys(
    value,
    [
      "workItemId",
      "researchTaskId",
      "question",
      "rationale",
      "inclusionCriteria",
      "exclusionRationales",
      "sourceRequirements",
      "sourceGaps",
      "artifactReferences",
      "sourceFamilyReferences",
      "contradictionRequirements",
      "consensusDissentRequirements",
      "challengeRequirements",
      "actorConflictRequirements",
      "freshnessRequirements",
      "humanReviewState",
    ],
    path,
    errors,
  );

  const workItemId = clean(value.workItemId);
  validateRequiredText(value.workItemId, `${path}.workItemId`, errors);
  const taskId = clean(value.researchTaskId);
  validateRequiredText(value.researchTaskId, `${path}.researchTaskId`, errors);
  if (taskId && !taskIds.has(taskId)) {
    errors.push(`${path}.researchTaskId:not_in_plan_task_set`);
  }
  validateRequiredText(value.question, `${path}.question`, errors);
  validateRequiredText(value.rationale, `${path}.rationale`, errors);
  validateUniqueTextArray(value.inclusionCriteria, `${path}.inclusionCriteria`, errors);
  validateUniqueTextArray(value.exclusionRationales, `${path}.exclusionRationales`, errors);
  validateSourceRequirementArray(value.sourceRequirements, `${path}.sourceRequirements`, errors);
  validateOpenRequirementArray(value.sourceGaps, `${path}.sourceGaps`, errors);
  validateArtifactReferences(value.artifactReferences, `${path}.artifactReferences`, errors);
  validateUniqueTextArray(
    value.sourceFamilyReferences,
    `${path}.sourceFamilyReferences`,
    errors,
  );
  validateOpenRequirementArray(
    value.contradictionRequirements,
    `${path}.contradictionRequirements`,
    errors,
  );
  validateOpenRequirementArray(
    value.consensusDissentRequirements,
    `${path}.consensusDissentRequirements`,
    errors,
  );
  validateOpenRequirementArray(
    value.challengeRequirements,
    `${path}.challengeRequirements`,
    errors,
  );
  validateOpenRequirementArray(
    value.actorConflictRequirements,
    `${path}.actorConflictRequirements`,
    errors,
  );
  validateFreshnessRequirementArray(
    value.freshnessRequirements,
    `${path}.freshnessRequirements`,
    errors,
  );
  validateReviewState(value.humanReviewState, `${path}.humanReviewState`, errors);
  return workItemId || null;
}

function validateCompletenessCriterion(
  value: unknown,
  index: number,
  workItemIds: Set<string>,
  errors: string[],
): string | null {
  const path = `completenessCriteria[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${path}:must_be_object`);
    return null;
  }
  rejectUnknownKeys(
    value,
    ["criterionId", "description", "requiredWorkItemIds", "humanReviewRequired"],
    path,
    errors,
  );
  const criterionId = clean(value.criterionId);
  validateRequiredText(value.criterionId, `${path}.criterionId`, errors);
  validateRequiredText(value.description, `${path}.description`, errors);
  const requiredIds = validateUniqueTextArray(
    value.requiredWorkItemIds,
    `${path}.requiredWorkItemIds`,
    errors,
    { minItems: 1 },
  );
  for (const workItemId of requiredIds) {
    if (!workItemIds.has(workItemId)) {
      errors.push(`${path}.requiredWorkItemIds:unknown_work_item:${workItemId}`);
    }
  }
  if (typeof value.humanReviewRequired !== "boolean") {
    errors.push(`${path}.humanReviewRequired:must_be_boolean`);
  }
  return criterionId || null;
}

/**
 * Validates T2B plan structure only. It deliberately does not evaluate research
 * progress, evidence quality, publication readiness or decision readiness.
 */
export function validateResearchPlan(input: unknown): ResearchPlanValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { valid: false, errors: ["plan:must_be_object"] };
  }

  rejectUnknownKeys(
    input,
    [
      "planId",
      "binding",
      "researchTaskIds",
      "workItems",
      "completenessCriteria",
      "planReviewState",
      "context",
    ],
    "plan",
    errors,
  );

  validateRequiredText(input.planId, "plan.planId", errors);
  validateBinding(input.binding, "plan.binding", errors);
  const taskIds = new Set(
    validateUniqueTextArray(input.researchTaskIds, "plan.researchTaskIds", errors, {
      minItems: 1,
    }),
  );
  validateReviewState(input.planReviewState, "plan.planReviewState", errors);

  if (!isRecord(input.context)) {
    errors.push("plan.context:must_be_object");
  } else {
    rejectUnknownKeys(input.context, ["jurisdiction", "locale"], "plan.context", errors);
    validateNullableText(input.context.jurisdiction, "plan.context.jurisdiction", errors);
    validateNullableText(input.context.locale, "plan.context.locale", errors);
  }

  const workItemIds = new Set<string>();
  if (!Array.isArray(input.workItems)) {
    errors.push("plan.workItems:must_be_array");
  } else {
    input.workItems.forEach((entry, index) => {
      const id = validateWorkItem(entry, index, taskIds, errors);
      if (!id) return;
      if (workItemIds.has(id)) errors.push(`workItems[${index}].workItemId:duplicate_value`);
      workItemIds.add(id);
    });
  }

  const criterionIds = new Set<string>();
  if (!Array.isArray(input.completenessCriteria)) {
    errors.push("plan.completenessCriteria:must_be_array");
  } else {
    input.completenessCriteria.forEach((entry, index) => {
      const id = validateCompletenessCriterion(entry, index, workItemIds, errors);
      if (!id) return;
      if (criterionIds.has(id)) {
        errors.push(`completenessCriteria[${index}].criterionId:duplicate_value`);
      }
      criterionIds.add(id);
    });
  }

  const stableErrors = Array.from(new Set(errors)).sort();
  return { valid: stableErrors.length === 0, errors: stableErrors };
}
