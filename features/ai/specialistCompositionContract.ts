import { z } from "zod";

export const SPECIALIST_EXECUTION_STATES = [
  "planned",
  "executed",
  "skipped",
  "failed",
  "degraded",
] as const;

export const SPECIALIST_REQUIREMENTS = ["required", "optional"] as const;
export const SPECIALIST_VALIDATION_STATES = ["valid", "invalid", "review_required"] as const;
export const SPECIALIST_SOURCE_RELATIONS = [
  "supports",
  "contradicts",
  "contextualizes",
  "insufficient",
] as const;

const NonBlankString = z.string().trim().min(1);
const HashString = z.string().regex(/^[a-f0-9]{64}$/i);
const Confidence = z.number().min(0).max(1);

export const SpecialistExecutionSchema = z
  .object({
    contractVersion: NonBlankString,
    runId: NonBlankString,
    role: NonBlankString,
    requirement: z.enum(SPECIALIST_REQUIREMENTS),
    executionState: z.enum(SPECIALIST_EXECUTION_STATES),
    provider: NonBlankString.optional(),
    model: NonBlankString.optional(),
    attemptCount: z.number().int().min(0),
    durationMs: z.number().int().min(0),
    safeErrorClass: NonBlankString.nullable(),
    inputArtifactHashes: z.array(HashString),
    outputHash: HashString.nullable(),
    sourceRefs: z.array(NonBlankString),
    evidenceRefs: z.array(NonBlankString),
    confidence: Confidence.nullable(),
    validationState: z.enum(SPECIALIST_VALIDATION_STATES),
    fallbackUsed: z.boolean(),
    fallbackReason: NonBlankString.nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const providerExpected = value.executionState === "planned" || value.executionState === "executed";
    if (providerExpected && (!value.provider || !value.model)) {
      ctx.addIssue({ code: "custom", message: "specialist_provider_model_required_for_planned_or_executed" });
    }
    if (!providerExpected && (value.provider || value.model)) {
      ctx.addIssue({ code: "custom", message: "specialist_provider_model_forbidden_without_planned_or_executed_state" });
    }
    if (!value.fallbackUsed && value.fallbackReason !== null) {
      ctx.addIssue({ code: "custom", message: "specialist_fallback_reason_requires_fallback" });
    }
  });

export type SpecialistExecution = z.infer<typeof SpecialistExecutionSchema>;

export const StructureResultSchema = z
  .object({
    sourceArtifactRefs: z.array(NonBlankString).min(1),
    documentOutline: z.array(
      z.object({ sectionId: NonBlankString, title: NonBlankString, segmentIds: z.array(NonBlankString) }).strict(),
    ),
    topicClusters: z.array(
      z.object({ topicId: NonBlankString, label: NonBlankString, segmentIds: z.array(NonBlankString).min(1) }).strict(),
    ),
    claimCandidates: z.array(
      z.object({
        candidateId: NonBlankString,
        text: NonBlankString,
        sourceArtifactRef: NonBlankString,
        segmentRefs: z.array(NonBlankString).min(1),
      }).strict(),
    ),
    argumentRelations: z.array(
      z.object({ fromCandidateId: NonBlankString, toCandidateId: NonBlankString, relation: NonBlankString }).strict(),
    ),
    unclassifiedSegments: z.array(NonBlankString),
    structureCoverage: z.number().min(0).max(1),
    execution: SpecialistExecutionSchema,
  })
  .strict();

export type StructureResult = z.infer<typeof StructureResultSchema>;

export const GroundingCoverageResultSchema = z
  .object({
    sourceArtifactRefs: z.array(NonBlankString).min(1),
    sourceModalities: z.array(
      z.object({ sourceArtifactRef: NonBlankString, modality: NonBlankString }).strict(),
    ),
    coveredSegments: z.array(NonBlankString),
    uncoveredSegments: z.array(NonBlankString),
    sourceCoverage: z.array(
      z.object({ sourceArtifactRef: NonBlankString, ratio: z.number().min(0).max(1) }).strict(),
    ),
    evidenceMappings: z.array(
      z.object({
        candidateId: NonBlankString,
        relation: z.enum(SPECIALIST_SOURCE_RELATIONS),
        evidenceRef: NonBlankString,
        sourceArtifactRef: NonBlankString,
        segmentId: NonBlankString.nullable(),
        pageRef: NonBlankString.nullable(),
        timestampRef: NonBlankString.nullable(),
      }).strict(),
    ),
    extractionLimitations: z.array(NonBlankString),
    unsupportedCandidateIds: z.array(NonBlankString),
    execution: SpecialistExecutionSchema,
  })
  .strict();

export type GroundingCoverageResult = z.infer<typeof GroundingCoverageResultSchema>;

export const CanonicalClaimSchema = z
  .object({
    claimId: NonBlankString,
    text: NonBlankString,
    evidenceRefs: z.array(NonBlankString),
    confidence: Confidence,
    uncertainty: NonBlankString.nullable(),
  })
  .strict();

export const CanonicalAnalysisResultSchema = z
  .object({
    sourceArtifactRefs: z.array(NonBlankString).min(1),
    normalizedThemes: z.array(NonBlankString),
    atomicClaims: z.array(CanonicalClaimSchema),
    relationships: z.array(
      z.object({ fromClaimId: NonBlankString, toClaimId: NonBlankString, relation: NonBlankString }).strict(),
    ),
    responsibilities: z.array(NonBlankString),
    openQuestions: z.array(NonBlankString),
    contradictions: z.array(NonBlankString),
    summaryDraft: NonBlankString,
    sourceCoverageReceipt: z
      .object({ coveredSourceArtifactRefs: z.array(NonBlankString), uncoveredSourceArtifactRefs: z.array(NonBlankString) })
      .strict(),
    execution: SpecialistExecutionSchema,
  })
  .strict();

export type CanonicalAnalysisResult = z.infer<typeof CanonicalAnalysisResultSchema>;

export const CRITIC_SEVERITIES = ["none", "low", "medium", "high"] as const;

export const CriticResultSchema = z
  .object({
    targetAnalysisHash: HashString,
    unsupportedClaims: z.array(NonBlankString),
    omissions: z.array(NonBlankString),
    contradictions: z.array(NonBlankString),
    overinterpretations: z.array(NonBlankString),
    missingPerspectives: z.array(NonBlankString),
    summaryCritique: NonBlankString,
    severity: z.enum(CRITIC_SEVERITIES),
    reviewRecommendations: z.array(NonBlankString),
    execution: SpecialistExecutionSchema,
  })
  .strict();

export type CriticResult = z.infer<typeof CriticResultSchema>;

export const ComposedAnalysisResultSchema = z
  .object({
    composedThemes: z.array(NonBlankString),
    retainedClaims: z.array(CanonicalClaimSchema.extend({ evidenceRefs: z.array(NonBlankString).min(1) })),
    rejectedClaimCandidates: z.array(
      z.object({ claimId: NonBlankString, reason: z.enum(["missing_evidence", "critic_unsupported"]) }).strict(),
    ),
    visibleContradictions: z.array(NonBlankString),
    uncertainties: z.array(NonBlankString),
    composedSummary: NonBlankString,
    openQuestions: z.array(NonBlankString),
    provenanceGraph: z.array(
      z.object({
        sourceArtifactRef: NonBlankString,
        specialistOutputRole: NonBlankString,
        targetField: NonBlankString,
      }).strict(),
    ),
    roleExecutions: z.array(SpecialistExecutionSchema),
    degraded: z.boolean(),
    degradedReasons: z.array(NonBlankString),
    requiresHumanReview: z.boolean(),
    validationState: z.enum(SPECIALIST_VALIDATION_STATES),
    providerAttempts: z.array(
      z.object({
        role: NonBlankString,
        provider: NonBlankString,
        model: NonBlankString,
        attemptCount: z.number().int().min(0),
        durationMs: z.number().int().min(0),
        fallbackUsed: z.boolean(),
        fallbackReason: NonBlankString.nullable(),
      }).strict(),
    ),
  })
  .strict()
  .superRefine((value, ctx) => {
    value.retainedClaims.forEach((claim, index) => {
      if (claim.evidenceRefs.length === 0) {
        ctx.addIssue({ code: "custom", path: ["retainedClaims", index, "evidenceRefs"], message: "composed_claim_requires_evidence" });
      }
    });
  });

export type ComposedAnalysisResult = z.infer<typeof ComposedAnalysisResultSchema>;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((a, b) => a.localeCompare(b));
}

function executionDegradedReason(execution: SpecialistExecution): string | null {
  if (execution.requirement !== "required") return null;
  if (execution.executionState === "executed" && execution.validationState === "valid") return null;
  return `required_role_not_valid:${execution.role}:${execution.executionState}:${execution.validationState}`;
}

function providerAttempt(execution: SpecialistExecution) {
  if (!execution.provider || !execution.model) return null;
  return {
    role: execution.role,
    provider: execution.provider,
    model: execution.model,
    attemptCount: execution.attemptCount,
    durationMs: execution.durationMs,
    fallbackUsed: execution.fallbackUsed,
    fallbackReason: execution.fallbackReason,
  };
}

export type ComposeSpecialistAnalysisInput = {
  canonical: CanonicalAnalysisResult;
  structure?: StructureResult | null;
  grounding?: GroundingCoverageResult | null;
  critic?: CriticResult | null;
};

export function composeSpecialistAnalysis(input: ComposeSpecialistAnalysisInput): ComposedAnalysisResult {
  const canonical = CanonicalAnalysisResultSchema.parse(input.canonical);
  const structure = input.structure ? StructureResultSchema.parse(input.structure) : null;
  const grounding = input.grounding ? GroundingCoverageResultSchema.parse(input.grounding) : null;
  const critic = input.critic ? CriticResultSchema.parse(input.critic) : null;

  const unsupported = new Set(critic?.unsupportedClaims ?? []);
  const retainedClaims: Array<z.infer<typeof CanonicalClaimSchema>> = [];
  const rejectedClaimCandidates: ComposedAnalysisResult["rejectedClaimCandidates"] = [];

  for (const claim of canonical.atomicClaims) {
    if (claim.evidenceRefs.length === 0) {
      rejectedClaimCandidates.push({ claimId: claim.claimId, reason: "missing_evidence" });
      continue;
    }
    if (unsupported.has(claim.claimId)) {
      rejectedClaimCandidates.push({ claimId: claim.claimId, reason: "critic_unsupported" });
      continue;
    }
    retainedClaims.push(claim);
  }

  const roleExecutions = [
    ...(structure ? [structure.execution] : []),
    ...(grounding ? [grounding.execution] : []),
    canonical.execution,
    ...(critic ? [critic.execution] : []),
  ];

  const degradedReasons = uniqueSorted([
    ...roleExecutions.map(executionDegradedReason).filter((value): value is string => Boolean(value)),
    ...rejectedClaimCandidates.map((claim) => `claim_rejected:${claim.claimId}:${claim.reason}`),
    ...(grounding?.extractionLimitations.map((value) => `coverage_limitation:${value}`) ?? []),
  ]);

  const sourceArtifactRefs = uniqueSorted([
    ...canonical.sourceArtifactRefs,
    ...(structure?.sourceArtifactRefs ?? []),
    ...(grounding?.sourceArtifactRefs ?? []),
  ]);

  const specialistRoles = uniqueSorted(roleExecutions.map((execution) => execution.role));
  const provenanceGraph = sourceArtifactRefs.flatMap((sourceArtifactRef) =>
    specialistRoles.map((specialistOutputRole) => ({
      sourceArtifactRef,
      specialistOutputRole,
      targetField: "composedAnalysis",
    })),
  );

  const providerAttempts = roleExecutions
    .map(providerAttempt)
    .filter((value): value is NonNullable<ReturnType<typeof providerAttempt>> => value !== null);

  const degraded = degradedReasons.length > 0;
  const requiresHumanReview = degraded || (critic ? critic.severity !== "none" : false);

  return ComposedAnalysisResultSchema.parse({
    composedThemes: uniqueSorted(canonical.normalizedThemes),
    retainedClaims,
    rejectedClaimCandidates,
    visibleContradictions: uniqueSorted([
      ...canonical.contradictions,
      ...(critic?.contradictions ?? []),
    ]),
    uncertainties: uniqueSorted([
      ...canonical.atomicClaims.map((claim) => claim.uncertainty).filter((value): value is string => Boolean(value)),
      ...(critic?.overinterpretations ?? []),
      ...(critic?.omissions ?? []),
      ...(critic?.missingPerspectives ?? []),
    ]),
    composedSummary: canonical.summaryDraft,
    openQuestions: uniqueSorted([
      ...canonical.openQuestions,
      ...(critic?.reviewRecommendations ?? []),
    ]),
    provenanceGraph,
    roleExecutions,
    degraded,
    degradedReasons,
    requiresHumanReview,
    validationState: requiresHumanReview ? "review_required" : "valid",
    providerAttempts,
  });
}
