import "server-only";

import { z } from "zod";
import { stableHash } from "@core/utils/hash";
import {
  callE150Orchestrator,
  type E150OrchestratorCandidate,
} from "@features/ai/orchestratorE150";
import type { E150JourneyKey } from "@features/ai/e150/journeyProfiles";
import type { VoxyEditorialEvidenceContext } from "./editorialStoryPlan";
import type { VoxyStudioDraft } from "./studioDraft";
import {
  VOXY_EDITORIAL_COUNCIL_ROLES,
  VOXY_EDITORIAL_CRITICAL_RISK_FLAGS,
  VOXY_EDITORIAL_OBJECTION_SEVERITIES,
  buildVoxyEditorialCouncilInputFingerprint,
  evaluateVoxyEditorialCouncil,
  listRequiredVoxyEditorialCouncilRoles,
  type VoxyEditorialAutonomyPolicy,
  type VoxyEditorialCouncilInputBinding,
  type VoxyEditorialCouncilRoleId,
  type VoxyEditorialCouncilRun,
  type VoxyEditorialCouncilStage,
  type VoxyEditorialCriticalRiskFlag,
  type VoxyEditorialObjection,
} from "./editorialAgentCouncil";
import {
  getVoxyEditorialCouncilArtifactRepository,
  type VoxyEditorialCouncilAuditArtifact,
  type VoxyEditorialCouncilDefenseRecord,
} from "./editorialAgentCouncilStore";

const CriticObjectionSchema = z
  .object({
    severity: z.enum(VOXY_EDITORIAL_OBJECTION_SEVERITIES),
    category: z.string().trim().min(1).max(120),
    publicReasonSummary: z.string().trim().min(1).max(1600),
    evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
    affectedClaimIds: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
    affectedSourceIds: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  })
  .strict();

const CriticResponseSchema = z
  .object({
    publicReasonSummary: z.string().trim().min(1).max(2500),
    checksPerformed: z.array(z.string().trim().min(1).max(300)).min(1).max(40),
    evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(80).default([]),
    objections: z.array(CriticObjectionSchema).max(80).default([]),
    criticalRiskFlags: z.array(z.enum(VOXY_EDITORIAL_CRITICAL_RISK_FLAGS)).max(20).default([]),
    verdict: z.enum(["pass", "pass_with_warnings", "fail", "escalate"]),
  })
  .strict();

const DefenseResolutionSchema = z
  .object({
    objectionId: z.string().trim().min(1).max(200),
    state: z.enum(["resolved", "disputed", "escalated"]),
    defenseSummary: z.string().trim().min(1).max(1800),
    defenseEvidenceRefs: z.array(z.string().trim().min(1).max(500)).max(40).default([]),
    resolutionSummary: z.string().trim().min(1).max(1200),
  })
  .strict();

const DefenseResponseSchema = z
  .object({
    publicReasonSummary: z.string().trim().min(1).max(2500),
    checksPerformed: z.array(z.string().trim().min(1).max(300)).min(1).max(40),
    evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(80).default([]),
    objectionResolutions: z.array(DefenseResolutionSchema).max(120),
    verdict: z.enum(["pass", "pass_with_warnings", "fail", "escalate"]),
  })
  .strict();

const JudgeResponseSchema = z
  .object({
    publicReasonSummary: z.string().trim().min(1).max(2500),
    checksPerformed: z.array(z.string().trim().min(1).max(300)).min(1).max(40),
    evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(80).default([]),
    criticalRiskFlags: z.array(z.enum(VOXY_EDITORIAL_CRITICAL_RISK_FLAGS)).max(20).default([]),
    verdict: z.enum(["pass", "pass_with_warnings", "fail", "escalate"]),
  })
  .strict();

type OrchestratorCandidate = E150OrchestratorCandidate;

export type VoxyEditorialCouncilRuntimeInput = {
  stage?: VoxyEditorialCouncilStage;
  draft: VoxyStudioDraft;
  evidence: VoxyEditorialEvidenceContext;
  policy: VoxyEditorialAutonomyPolicy;
  reviewQueueItemId: string;
  decisionGateId: string;
  creatorRunId?: string | null;
  creatorActorId?: string | null;
  renderOutputSha256?: string | null;
  now?: string;
};

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(text);
}

function roleDefinition(roleId: VoxyEditorialCouncilRoleId) {
  const definition = VOXY_EDITORIAL_COUNCIL_ROLES.find((role) => role.id === roleId);
  if (!definition) throw new Error(`voxy_council_role_missing:${roleId}`);
  return definition;
}

function journeyForRole(roleId: VoxyEditorialCouncilRoleId): E150JourneyKey {
  if (["evidence_prosecutor", "claim_auditor", "counter_evidence_researcher"].includes(roleId)) {
    return "sealed_factcheck";
  }
  if (["marketing_critic", "social_critic", "voice_av_critic"].includes(roleId)) {
    return "media";
  }
  return "guided";
}

export function buildVoxyEditorialCouncilBinding(
  input: VoxyEditorialCouncilRuntimeInput,
): VoxyEditorialCouncilInputBinding {
  return {
    studioDraftId: input.draft.draftId,
    studioDraftRevision: input.draft.revision,
    storyPlanId: input.draft.storyPlan.storyPlanId,
    storyPlanRevision: input.draft.storyPlan.revision,
    evidenceSourcePackId: input.evidence.sourcePack.sourcePackId,
    evidenceFingerprint: stableHash({
      sourcePack: input.evidence.sourcePack,
      claims: input.evidence.claims,
      findings: input.evidence.findings,
      openQuestions: input.evidence.openQuestions,
    }),
    locale: input.draft.storyPlan.outputLanguage.toLowerCase(),
    renderOutputSha256: input.renderOutputSha256 ?? null,
  };
}

function canonicalEvidenceRefs(input: VoxyEditorialCouncilRuntimeInput): Set<string> {
  return new Set(
    unique([
      input.draft.draftId,
      input.draft.storyPlan.storyPlanId,
      input.evidence.sourcePack.sourcePackId,
      ...input.evidence.sourcePack.sources.map((source) => source.sourceId),
      ...input.evidence.claims.map((claim) => claim.claimId),
      ...input.evidence.findings.map((finding) => finding.findingId),
      ...input.evidence.openQuestions.map((question) => question.questionId),
    ]),
  );
}

function buildEvidencePayload(input: VoxyEditorialCouncilRuntimeInput) {
  return {
    binding: buildVoxyEditorialCouncilBinding(input),
    storyPlan: input.draft.storyPlan,
    evidence: {
      sourcePack: input.evidence.sourcePack,
      claims: input.evidence.claims,
      findings: input.evidence.findings,
      openQuestions: input.evidence.openQuestions,
    },
  };
}

function baseSystemPrompt(roleId: VoxyEditorialCouncilRoleId) {
  const role = roleDefinition(roleId);
  return [
    "You are an independent quality-control agent for a neutral civic-information system.",
    `Role: ${role.id}. Mission: ${role.mission}`,
    `Adversarial question: ${role.adversarialQuestion}`,
    "Your first duty is to find concrete reasons why this exact revision should NOT proceed.",
    "Do not optimize political persuasion, voting behavior, partisan advantage, emotional manipulation or demographic targeting.",
    "Do not rank political actors or choices, endorse or oppose a political option, or infer how anyone should vote.",
    "Do not invent sources, facts, quotes, numbers, review states or evidence IDs.",
    "Distinguish fact, attributed position, interpretation, scenario, uncertainty and open question.",
    "Treat missing evidence as missing; translation is never evidence.",
    "Do not expose private chain-of-thought. Return only concise audit-safe conclusions, checks, objections and evidence references.",
    "Every material objection must identify what is wrong, why it matters, and the bound evidence IDs supporting the objection when available.",
    "A clean pass means you actively attempted to falsify the output and found no unresolved material objection within your role.",
  ].join("\n");
}

function criticUserPrompt(input: VoxyEditorialCouncilRuntimeInput, roleId: VoxyEditorialCouncilRoleId) {
  return [
    `Review stage: ${input.stage ?? "editorial"}.`,
    "Return exactly this JSON shape:",
    JSON.stringify({
      publicReasonSummary: "string",
      checksPerformed: ["string"],
      evidenceRefs: ["existing-id"],
      objections: [
        {
          severity: "info|warning|blocker|critical",
          category: "string",
          publicReasonSummary: "string",
          evidenceRefs: ["existing-id"],
          affectedClaimIds: ["claim-id"],
          affectedSourceIds: ["source-id"],
        },
      ],
      criticalRiskFlags: VOXY_EDITORIAL_CRITICAL_RISK_FLAGS,
      verdict: "pass|pass_with_warnings|fail|escalate",
    }),
    "Use only evidence IDs present in the payload. If external counter-evidence appears necessary, raise an unresolved blocker describing what must be researched; do not pretend it is canonical evidence.",
    "INPUT:",
    JSON.stringify(buildEvidencePayload(input)),
  ].join("\n");
}

function candidateIdentity(roleId: VoxyEditorialCouncilRoleId, candidate: OrchestratorCandidate, pass: number) {
  return `voxy-council-run-${stableHash({ roleId, provider: candidate.provider, model: candidate.modelName ?? null, pass, raw: candidate.rawText }).slice(0, 32)}`;
}

function invalidEvidenceRefs(values: readonly string[], allowed: Set<string>) {
  return unique(values).filter((ref) => !allowed.has(ref));
}

function criticCandidateToRun(input: {
  candidate: OrchestratorCandidate;
  roleId: VoxyEditorialCouncilRoleId;
  pass: number;
  binding: VoxyEditorialCouncilInputBinding;
  policy: VoxyEditorialAutonomyPolicy;
  creatorRunId: string | null;
  allowedEvidenceRefs: Set<string>;
}): { run: VoxyEditorialCouncilRun; criticalRiskFlags: VoxyEditorialCriticalRiskFlag[] } {
  const definition = roleDefinition(input.roleId);
  const parsed = CriticResponseSchema.parse(parseJson(input.candidate.rawText));
  const inputFingerprint = buildVoxyEditorialCouncilInputFingerprint(input.binding);
  const badRefs = invalidEvidenceRefs(
    [
      ...parsed.evidenceRefs,
      ...parsed.objections.flatMap((objection) => objection.evidenceRefs),
    ],
    input.allowedEvidenceRefs,
  );
  const objections: VoxyEditorialObjection[] = parsed.objections.map((objection, index) => ({
    objectionId: `voxy-objection-${stableHash({ inputFingerprint, roleId: input.roleId, provider: input.candidate.provider, pass: input.pass, index, objection }).slice(0, 32)}`,
    raisedByRole: input.roleId,
    severity: objection.severity,
    category: objection.category,
    publicReasonSummary: objection.publicReasonSummary,
    evidenceRefs: unique(objection.evidenceRefs),
    affectedClaimIds: unique(objection.affectedClaimIds),
    affectedSourceIds: unique(objection.affectedSourceIds),
    state: "open",
    defenseSummary: null,
    defenseEvidenceRefs: [],
    resolutionSummary: null,
  }));
  if (badRefs.length > 0) {
    objections.push({
      objectionId: `voxy-objection-${stableHash({ inputFingerprint, roleId: input.roleId, badRefs }).slice(0, 32)}`,
      raisedByRole: input.roleId,
      severity: "blocker",
      category: "noncanonical_evidence_reference",
      publicReasonSummary: `The reviewer referenced evidence that is not bound to this revision: ${badRefs.join(", ")}.`,
      evidenceRefs: [],
      affectedClaimIds: [],
      affectedSourceIds: [],
      state: "open",
      defenseSummary: null,
      defenseEvidenceRefs: [],
      resolutionSummary: null,
    });
  }
  const runId = candidateIdentity(input.roleId, input.candidate, input.pass);
  return {
    run: {
      runId,
      roleId: input.roleId,
      alpha2RoleId: definition.alpha2RoleId,
      reviewerActorId: `agent:voxy:${input.roleId}:${input.candidate.provider}:${input.pass}`,
      inputFingerprint,
      creatorRunId: input.creatorRunId,
      providerId: input.candidate.provider,
      modelFamily: input.candidate.provider,
      modelId: input.candidate.modelName ?? input.candidate.provider,
      instructionVersion: "voxy-council-instructions-v1",
      policyRevision: input.policy.policyRevision,
      completed: true,
      publicReasonSummary: parsed.publicReasonSummary,
      checksPerformed: unique(parsed.checksPerformed),
      evidenceRefs: unique(parsed.evidenceRefs).filter((ref) => input.allowedEvidenceRefs.has(ref)),
      objections,
      verdict: badRefs.length > 0 ? "fail" : parsed.verdict,
    },
    criticalRiskFlags: parsed.criticalRiskFlags,
  };
}

async function runCriticRole(input: {
  runtime: VoxyEditorialCouncilRuntimeInput;
  roleId: VoxyEditorialCouncilRoleId;
  pass: number;
  binding: VoxyEditorialCouncilInputBinding;
  allowedEvidenceRefs: Set<string>;
}): Promise<{ runs: VoxyEditorialCouncilRun[]; criticalRiskFlags: VoxyEditorialCriticalRiskFlag[] }> {
  const result = await callE150Orchestrator({
    systemPrompt: baseSystemPrompt(input.roleId),
    userPrompt: criticUserPrompt(input.runtime, input.roleId),
    journey: journeyForRole(input.roleId),
    locale: input.runtime.draft.storyPlan.outputLanguage,
    audienceRole: "staff",
    maxTokens: 3_500,
    validationMode: "json_only",
    requiredCapability:
      input.roleId === "counter_evidence_researcher" ? "search" : "core_analysis",
    validateRaw(raw) {
      try {
        return CriticResponseSchema.safeParse(parseJson(raw)).success;
      } catch {
        return false;
      }
    },
    telemetry: {
      runId: `voxy-council:${input.runtime.draft.draftId}:r${input.runtime.draft.revision}`,
      operationId: `${input.roleId}:${input.pass}`,
      operationType: "voxy_editorial_adversarial_review",
      dossierId: input.runtime.draft.dossierId,
      pipeline: "admin_orchestrate",
    },
  });
  const runs: VoxyEditorialCouncilRun[] = [];
  const criticalRiskFlags: VoxyEditorialCriticalRiskFlag[] = [];
  for (const candidate of result.candidates) {
    try {
      const converted = criticCandidateToRun({
        candidate,
        roleId: input.roleId,
        pass: input.pass,
        binding: input.binding,
        policy: input.runtime.policy,
        creatorRunId: input.runtime.creatorRunId ?? null,
        allowedEvidenceRefs: input.allowedEvidenceRefs,
      });
      runs.push(converted.run);
      criticalRiskFlags.push(...converted.criticalRiskFlags);
    } catch {
      // Invalid model output does not become review truth; absence of a required role/run fails closed later.
    }
  }
  return { runs, criticalRiskFlags };
}

function defensePrompt(input: VoxyEditorialCouncilRuntimeInput, objections: VoxyEditorialObjection[]) {
  return [
    "You are the independent defense advocate in an adversarial editorial review.",
    "Try to defeat each objection, but only with evidence already bound to this exact revision.",
    "If the bound evidence cannot defeat an objection, mark it disputed or escalated. Never waive it by rhetoric or unsupported inference.",
    "Do not expose private chain-of-thought. Return only the audit-safe defense conclusion and evidence references.",
    "Return exactly this JSON shape:",
    JSON.stringify({
      publicReasonSummary: "string",
      checksPerformed: ["string"],
      evidenceRefs: ["existing-id"],
      objectionResolutions: [
        {
          objectionId: "existing-objection-id",
          state: "resolved|disputed|escalated",
          defenseSummary: "string",
          defenseEvidenceRefs: ["existing-id"],
          resolutionSummary: "string",
        },
      ],
      verdict: "pass|pass_with_warnings|fail|escalate",
    }),
    "OBJECTIONS:",
    JSON.stringify(objections),
    "BOUND INPUT:",
    JSON.stringify(buildEvidencePayload(input)),
  ].join("\n");
}

async function runDefense(input: {
  runtime: VoxyEditorialCouncilRuntimeInput;
  binding: VoxyEditorialCouncilInputBinding;
  objections: VoxyEditorialObjection[];
  allowedEvidenceRefs: Set<string>;
}): Promise<{
  runs: VoxyEditorialCouncilRun[];
  defense: VoxyEditorialCouncilDefenseRecord;
  updatedObjections: VoxyEditorialObjection[];
}> {
  const roleId: VoxyEditorialCouncilRoleId = "defense_advocate";
  const result = await callE150Orchestrator({
    systemPrompt: baseSystemPrompt(roleId),
    userPrompt: defensePrompt(input.runtime, input.objections),
    journey: "guided",
    locale: input.runtime.draft.storyPlan.outputLanguage,
    audienceRole: "staff",
    maxTokens: 4_000,
    validationMode: "json_only",
    validateRaw(raw) {
      try {
        return DefenseResponseSchema.safeParse(parseJson(raw)).success;
      } catch {
        return false;
      }
    },
    telemetry: {
      runId: `voxy-council:${input.runtime.draft.draftId}:r${input.runtime.draft.revision}`,
      operationId: "defense",
      operationType: "voxy_editorial_objection_defense",
      dossierId: input.runtime.draft.dossierId,
      pipeline: "admin_orchestrate",
    },
  });

  const inputFingerprint = buildVoxyEditorialCouncilInputFingerprint(input.binding);
  const parsedCandidates = result.candidates.flatMap((candidate) => {
    try {
      return [{ candidate, parsed: DefenseResponseSchema.parse(parseJson(candidate.rawText)) }];
    } catch {
      return [];
    }
  });
  if (parsedCandidates.length === 0) throw new Error("voxy_council_defense_no_valid_candidate");

  const runs: VoxyEditorialCouncilRun[] = parsedCandidates.map(({ candidate, parsed }, index) => ({
    runId: candidateIdentity(roleId, candidate, index + 1),
    roleId,
    alpha2RoleId: roleDefinition(roleId).alpha2RoleId,
    reviewerActorId: `agent:voxy:${roleId}:${candidate.provider}:${index + 1}`,
    inputFingerprint,
    creatorRunId: input.runtime.creatorRunId ?? null,
    providerId: candidate.provider,
    modelFamily: candidate.provider,
    modelId: candidate.modelName ?? candidate.provider,
    instructionVersion: "voxy-council-defense-v1",
    policyRevision: input.runtime.policy.policyRevision,
    completed: true,
    publicReasonSummary: parsed.publicReasonSummary,
    checksPerformed: unique(parsed.checksPerformed),
    evidenceRefs: unique(parsed.evidenceRefs).filter((ref) => input.allowedEvidenceRefs.has(ref)),
    objections: [],
    verdict: parsed.verdict,
  }));

  const byCandidate = parsedCandidates.map(({ parsed }) =>
    new Map(parsed.objectionResolutions.map((entry) => [entry.objectionId, entry])),
  );
  const updatedObjections = input.objections.map((objection) => {
    const resolutions = byCandidate
      .map((map) => map.get(objection.objectionId))
      .filter(Boolean) as Array<z.infer<typeof DefenseResolutionSchema>>;
    if (resolutions.length !== parsedCandidates.length) {
      return {
        ...objection,
        state: "disputed" as const,
        defenseSummary: "At least one independent defense review did not resolve this objection.",
        defenseEvidenceRefs: [],
        resolutionSummary: "Defense incomplete across independent reviewers.",
      };
    }
    const canonicalResolved = resolutions.every(
      (resolution) =>
        resolution.state === "resolved" &&
        resolution.defenseEvidenceRefs.length > 0 &&
        invalidEvidenceRefs(resolution.defenseEvidenceRefs, input.allowedEvidenceRefs).length === 0,
    );
    if (canonicalResolved) {
      return {
        ...objection,
        state: "resolved" as const,
        defenseSummary: resolutions.map((entry) => entry.defenseSummary).join(" | "),
        defenseEvidenceRefs: unique(resolutions.flatMap((entry) => entry.defenseEvidenceRefs)),
        resolutionSummary: resolutions.map((entry) => entry.resolutionSummary).join(" | "),
      };
    }
    const escalated = resolutions.some((entry) => entry.state === "escalated");
    return {
      ...objection,
      state: escalated ? ("escalated" as const) : ("disputed" as const),
      defenseSummary: resolutions.map((entry) => entry.defenseSummary).join(" | "),
      defenseEvidenceRefs: unique(
        resolutions
          .flatMap((entry) => entry.defenseEvidenceRefs)
          .filter((ref) => input.allowedEvidenceRefs.has(ref)),
      ),
      resolutionSummary: resolutions.map((entry) => entry.resolutionSummary).join(" | "),
    };
  });

  const defense: VoxyEditorialCouncilDefenseRecord = {
    defenseRunId: `voxy-defense-${stableHash(runs.map((run) => run.runId)).slice(0, 32)}`,
    inputFingerprint,
    providerId: unique(parsedCandidates.map(({ candidate }) => candidate.provider)).join("+"),
    modelId: unique(parsedCandidates.map(({ candidate }) => candidate.modelName ?? candidate.provider)).join("+"),
    publicReasonSummary: parsedCandidates.map(({ parsed }) => parsed.publicReasonSummary).join(" | "),
    objectionResolutions: updatedObjections.map((objection) => ({
      objectionId: objection.objectionId,
      state:
        objection.state === "resolved"
          ? "resolved"
          : objection.state === "escalated"
            ? "escalated"
            : "disputed",
      defenseSummary: objection.defenseSummary ?? "No evidence-backed defense was accepted.",
      defenseEvidenceRefs: objection.defenseEvidenceRefs,
      resolutionSummary: objection.resolutionSummary ?? "Unresolved.",
    })),
  };
  return { runs, defense, updatedObjections };
}

function judgePrompt(input: VoxyEditorialCouncilRuntimeInput, objections: VoxyEditorialObjection[]) {
  return [
    "You are the independent chief judge. You do not rewrite the content and you do not optimize persuasion.",
    "Judge only whether the exact revision can proceed based on the bound evidence and the complete objection/defense record.",
    "Any unresolved blocker, unresolved critical objection, invented evidence, stale binding or material neutrality failure means fail or escalate.",
    "Do not expose private chain-of-thought. Return concise audit-safe reasons only.",
    "Return exactly this JSON shape:",
    JSON.stringify({
      publicReasonSummary: "string",
      checksPerformed: ["string"],
      evidenceRefs: ["existing-id"],
      criticalRiskFlags: VOXY_EDITORIAL_CRITICAL_RISK_FLAGS,
      verdict: "pass|pass_with_warnings|fail|escalate",
    }),
    "FINAL OBJECTION RECORD:",
    JSON.stringify(objections),
    "BOUND INPUT:",
    JSON.stringify(buildEvidencePayload(input)),
  ].join("\n");
}

async function runJudge(input: {
  runtime: VoxyEditorialCouncilRuntimeInput;
  binding: VoxyEditorialCouncilInputBinding;
  objections: VoxyEditorialObjection[];
  allowedEvidenceRefs: Set<string>;
}): Promise<{ runs: VoxyEditorialCouncilRun[]; criticalRiskFlags: VoxyEditorialCriticalRiskFlag[] }> {
  const roleId: VoxyEditorialCouncilRoleId = "chief_judge";
  const result = await callE150Orchestrator({
    systemPrompt: baseSystemPrompt(roleId),
    userPrompt: judgePrompt(input.runtime, input.objections),
    journey: "guided",
    locale: input.runtime.draft.storyPlan.outputLanguage,
    audienceRole: "staff",
    maxTokens: 3_000,
    validationMode: "json_only",
    validateRaw(raw) {
      try {
        return JudgeResponseSchema.safeParse(parseJson(raw)).success;
      } catch {
        return false;
      }
    },
    telemetry: {
      runId: `voxy-council:${input.runtime.draft.draftId}:r${input.runtime.draft.revision}`,
      operationId: "chief-judge",
      operationType: "voxy_editorial_chief_judge",
      dossierId: input.runtime.draft.dossierId,
      pipeline: "admin_orchestrate",
    },
  });
  const inputFingerprint = buildVoxyEditorialCouncilInputFingerprint(input.binding);
  const rawRuns: VoxyEditorialCouncilRun[] = [];
  const criticalRiskFlags: VoxyEditorialCriticalRiskFlag[] = [];
  for (const [index, candidate] of result.candidates.entries()) {
    try {
      const parsed = JudgeResponseSchema.parse(parseJson(candidate.rawText));
      const badRefs = invalidEvidenceRefs(parsed.evidenceRefs, input.allowedEvidenceRefs);
      rawRuns.push({
        runId: candidateIdentity(roleId, candidate, index + 1),
        roleId,
        alpha2RoleId: roleDefinition(roleId).alpha2RoleId,
        reviewerActorId: `agent:voxy:${roleId}:${candidate.provider}:${index + 1}`,
        inputFingerprint,
        creatorRunId: input.runtime.creatorRunId ?? null,
        providerId: candidate.provider,
        modelFamily: candidate.provider,
        modelId: candidate.modelName ?? candidate.provider,
        instructionVersion: "voxy-council-judge-v1",
        policyRevision: input.runtime.policy.policyRevision,
        completed: true,
        publicReasonSummary: parsed.publicReasonSummary,
        checksPerformed: unique(parsed.checksPerformed),
        evidenceRefs: unique(parsed.evidenceRefs).filter((ref) => input.allowedEvidenceRefs.has(ref)),
        objections: [],
        verdict: badRefs.length > 0 ? "fail" : parsed.verdict,
      });
      criticalRiskFlags.push(...parsed.criticalRiskFlags);
    } catch {
      // Invalid judge output is ignored; missing/insufficient judge runs fail closed in evaluation.
    }
  }
  if (rawRuns.length === 0) return { runs: [], criticalRiskFlags };
  const consensusVerdict: VoxyEditorialCouncilRun["verdict"] = rawRuns.every(
    (run) => run.verdict === "pass",
  )
    ? "pass"
    : rawRuns.some((run) => run.verdict === "escalate")
      ? "escalate"
      : "fail";
  return {
    runs: rawRuns.map((run) => ({ ...run, verdict: consensusVerdict })),
    criticalRiskFlags,
  };
}

function applyDefenseToCriticRuns(
  criticRuns: VoxyEditorialCouncilRun[],
  updatedObjections: VoxyEditorialObjection[],
): VoxyEditorialCouncilRun[] {
  const byId = new Map(updatedObjections.map((objection) => [objection.objectionId, objection]));
  return criticRuns.map((run) => ({
    ...run,
    objections: run.objections.map((objection) => byId.get(objection.objectionId) ?? objection),
  }));
}

export async function runVoxyEditorialAgentCouncil(
  rawInput: VoxyEditorialCouncilRuntimeInput,
): Promise<VoxyEditorialCouncilAuditArtifact> {
  const input: VoxyEditorialCouncilRuntimeInput = {
    ...rawInput,
    stage: rawInput.stage ?? "editorial",
  };
  const stage = input.stage ?? "editorial";
  const binding = buildVoxyEditorialCouncilBinding(input);
  const inputFingerprint = buildVoxyEditorialCouncilInputFingerprint(binding);
  const allowedEvidenceRefs = canonicalEvidenceRefs(input);
  const requiredRoles = listRequiredVoxyEditorialCouncilRoles(input.policy.qualityLevel, stage);
  const criticRoles = requiredRoles.filter(
    (roleId) => !["defense_advocate", "chief_judge"].includes(roleId),
  );

  const criticResults = await Promise.all(
    criticRoles.map((roleId) =>
      runCriticRole({ runtime: input, roleId, pass: 1, binding, allowedEvidenceRefs }),
    ),
  );
  let criticRuns = criticResults.flatMap((result) => result.runs);
  const criticalRiskFlags: VoxyEditorialCriticalRiskFlag[] = criticResults.flatMap(
    (result) => result.criticalRiskFlags,
  );

  const coreRepeatRoles: VoxyEditorialCouncilRoleId[] = [
    "evidence_prosecutor",
    "claim_auditor",
    "editorial_critic",
    "neutrality_red_team",
    "language_critic",
    "voice_av_critic",
  ].filter((roleId) => criticRoles.includes(roleId as VoxyEditorialCouncilRoleId)) as VoxyEditorialCouncilRoleId[];
  let repeatIndex = 0;
  while (
    criticRuns.length < Math.max(1, input.policy.minIndependentReviewRuns - 4) &&
    coreRepeatRoles.length > 0 &&
    repeatIndex < coreRepeatRoles.length * 2
  ) {
    const roleId = coreRepeatRoles[repeatIndex % coreRepeatRoles.length];
    const repeated = await runCriticRole({
      runtime: input,
      roleId,
      pass: 2 + Math.floor(repeatIndex / coreRepeatRoles.length),
      binding,
      allowedEvidenceRefs,
    });
    criticRuns = [...criticRuns, ...repeated.runs];
    criticalRiskFlags.push(...repeated.criticalRiskFlags);
    repeatIndex += 1;
  }

  const originalObjections = criticRuns.flatMap((run) => run.objections);
  const defenseResult = await runDefense({
    runtime: input,
    binding,
    objections: originalObjections,
    allowedEvidenceRefs,
  });
  criticRuns = applyDefenseToCriticRuns(criticRuns, defenseResult.updatedObjections);

  const judgeResult = await runJudge({
    runtime: input,
    binding,
    objections: defenseResult.updatedObjections,
    allowedEvidenceRefs,
  });
  criticalRiskFlags.push(...judgeResult.criticalRiskFlags);

  const allRuns = [...criticRuns, ...defenseResult.runs, ...judgeResult.runs];
  const decision = evaluateVoxyEditorialCouncil({
    stage,
    binding,
    policy: input.policy,
    creatorRunId: input.creatorRunId ?? null,
    creatorActorId: input.creatorActorId ?? null,
    runs: allRuns,
    criticalRiskFlags: unique(criticalRiskFlags) as VoxyEditorialCriticalRiskFlag[],
  });
  const completedAt = input.now ?? new Date().toISOString();
  const artifact: VoxyEditorialCouncilAuditArtifact = {
    artifactId: `voxy-council-artifact-${stableHash({ inputFingerprint, decisionId: decision.decisionId, reviewQueueItemId: input.reviewQueueItemId }).slice(0, 32)}`,
    binding,
    inputFingerprint,
    policyRevision: input.policy.policyRevision,
    qualityLevel: input.policy.qualityLevel,
    creatorRunId: input.creatorRunId ?? null,
    creatorActorId: input.creatorActorId ?? null,
    criticRuns: allRuns,
    defense: defenseResult.defense,
    criticalRiskFlags: decision.criticalRiskFlags,
    decision,
    createdAt: completedAt,
    completedAt,
    reviewQueueItemId: input.reviewQueueItemId,
    decisionGateId: input.decisionGateId,
  };

  const repository = getVoxyEditorialCouncilArtifactRepository();
  if (repository.getPersistenceState().mode !== "persistent_primary") {
    throw new Error("voxy_council_audit_not_persistent");
  }
  await repository.save(artifact);
  return artifact;
}
