import { z } from "zod";
import {
  ALPHA2_ACTION_KINDS,
  ALPHA2_CONFIDENCE_LEVELS,
  resolveAlpha2ActionGate,
  type Alpha2ActionKind,
} from "@/features/agenticRuntime/alpha2RiskGateContract";
import {
  ALPHA2_DEFAULT_RISK_CLASSES,
  ALPHA2_ORGANIZATION_ROLE_IDS,
  ALPHA2_ROLE_TOOL_PERMISSIONS,
  getAlpha2OrganizationRoleControls,
  isAlpha2OrganizationRoleRiskWithinCeiling,
  type Alpha2OrganizationRoleId,
  type Alpha2RoleToolPermission,
} from "@/features/agenticRuntime/alpha2AgentFleetContract";
import type { Alpha2ExecutionFence } from "@/features/agenticRuntime/alpha2DurableOrchestrator";
import {
  buildAgentSafeTraceStep,
  type AgentSafeTraceStep,
} from "@/features/agenticRuntime/agentRunArtifactSafeTraceContract";

export const VOXY_TOOL_CAPABILITY_SCHEMA_VERSION = "voxy.tool-capability.v1" as const;

export const VOXY_TOOL_CAPABILITY_IDS = [
  "edebatte.topic_context.read",
  "edebatte.dossier_context.read",
  "edebatte.preference_draft.prepare",
  "edebatte.external_notification.request",
] as const;

export const VOXY_TOOL_REQUEST_MODES = ["execute", "preview", "dry_run"] as const;
export const VOXY_TOOL_DECISION_STATUSES = [
  "authorized",
  "review_required",
  "human_only",
  "blocked",
] as const;
export const VOXY_TOOL_RESULT_STATUSES = ["completed", "blocked", "failed"] as const;
export const VOXY_TOOL_ERROR_CLASSES = [
  "validation_error",
  "permission_denied",
  "consent_required",
  "connection_required",
  "review_required",
  "human_gate_required",
  "aborted",
  "timeout",
  "domain_error",
] as const;

export type VoxyToolCapabilityId = (typeof VOXY_TOOL_CAPABILITY_IDS)[number];
export type VoxyToolRequestMode = (typeof VOXY_TOOL_REQUEST_MODES)[number];
export type VoxyToolDecisionStatus = (typeof VOXY_TOOL_DECISION_STATUSES)[number];

const Alpha2ActionKindSchema = z.enum(ALPHA2_ACTION_KINDS);
const Alpha2RiskClassSchema = z.enum(ALPHA2_DEFAULT_RISK_CLASSES);
const Alpha2ToolPermissionSchema = z.enum(ALPHA2_ROLE_TOOL_PERMISSIONS);
const Alpha2OrganizationRoleIdSchema = z.enum(ALPHA2_ORGANIZATION_ROLE_IDS);
const Alpha2ConfidenceSchema = z.enum(ALPHA2_CONFIDENCE_LEVELS);
const VoxyToolCapabilityIdSchema = z.enum(VOXY_TOOL_CAPABILITY_IDS);
const VoxyToolRequestModeSchema = z.enum(VOXY_TOOL_REQUEST_MODES);

const VoxyToolRequiredContextsSchema = z
  .object({
    actor: z.literal(true),
    organization: z.boolean(),
    entitlement: z.boolean(),
    consent: z.boolean(),
    connection: z.boolean(),
  })
  .strict();

export const VoxyToolCapabilitySchema = z
  .object({
    schemaVersion: z.literal(VOXY_TOOL_CAPABILITY_SCHEMA_VERSION),
    capabilityId: VoxyToolCapabilityIdSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    domain: z.string().min(1),
    ownerRef: z.string().min(1),
    inputSchemaRef: z.string().min(1),
    outputSchemaRef: z.string().min(1),
    actionKind: Alpha2ActionKindSchema,
    requiredPermission: Alpha2ToolPermissionSchema,
    riskClass: Alpha2RiskClassSchema,
    reversible: z.boolean(),
    idempotencyRequired: z.boolean(),
    supportsPreview: z.boolean(),
    supportsDryRun: z.boolean(),
    timeoutMs: z.number().int().min(100).max(120_000),
    maxRetries: z.number().int().min(0).max(3),
    requiredContexts: VoxyToolRequiredContextsSchema,
  })
  .strict()
  .superRefine((capability, ctx) => {
    if (capability.actionKind === "read_only" && capability.requiredPermission !== "read_only") {
      ctx.addIssue({ code: "custom", message: "read_only_capability_requires_read_only_permission" });
    }
    if (
      capability.actionKind === "write_reversible" &&
      capability.requiredPermission !== "write_reversible"
    ) {
      ctx.addIssue({
        code: "custom",
        message: "reversible_write_capability_requires_write_reversible_permission",
      });
    }
    if (capability.actionKind !== "read_only" && !capability.idempotencyRequired) {
      ctx.addIssue({ code: "custom", message: "mutating_or_external_capability_requires_idempotency" });
    }
    if (capability.actionKind === "write_reversible" && !capability.reversible) {
      ctx.addIssue({ code: "custom", message: "write_reversible_capability_must_be_reversible" });
    }
  });

export type VoxyToolCapability = z.infer<typeof VoxyToolCapabilitySchema>;

const CAPABILITIES = [
  {
    schemaVersion: VOXY_TOOL_CAPABILITY_SCHEMA_VERSION,
    capabilityId: "edebatte.topic_context.read",
    version: "1.0.0",
    domain: "topic",
    ownerRef: "canonical-topic-domain",
    inputSchemaRef: "topic-context-read.v1",
    outputSchemaRef: "topic-context-reference.v1",
    actionKind: "read_only",
    requiredPermission: "read_only",
    riskClass: "green",
    reversible: true,
    idempotencyRequired: false,
    supportsPreview: true,
    supportsDryRun: true,
    timeoutMs: 10_000,
    maxRetries: 0,
    requiredContexts: {
      actor: true,
      organization: false,
      entitlement: false,
      consent: false,
      connection: false,
    },
  },
  {
    schemaVersion: VOXY_TOOL_CAPABILITY_SCHEMA_VERSION,
    capabilityId: "edebatte.dossier_context.read",
    version: "1.0.0",
    domain: "dossier",
    ownerRef: "decision-dossier-domain",
    inputSchemaRef: "dossier-context-read.v1",
    outputSchemaRef: "dossier-context-reference.v1",
    actionKind: "read_only",
    requiredPermission: "read_only",
    riskClass: "green",
    reversible: true,
    idempotencyRequired: false,
    supportsPreview: true,
    supportsDryRun: true,
    timeoutMs: 10_000,
    maxRetries: 0,
    requiredContexts: {
      actor: true,
      organization: false,
      entitlement: false,
      consent: false,
      connection: false,
    },
  },
  {
    schemaVersion: VOXY_TOOL_CAPABILITY_SCHEMA_VERSION,
    capabilityId: "edebatte.preference_draft.prepare",
    version: "1.0.0",
    domain: "personal-voxy",
    ownerRef: "personal-voxy-consented-memory",
    inputSchemaRef: "personal-voxy-preference-draft.v1",
    outputSchemaRef: "personal-voxy-preference-draft-reference.v1",
    actionKind: "write_reversible",
    requiredPermission: "write_reversible",
    riskClass: "green",
    reversible: true,
    idempotencyRequired: true,
    supportsPreview: true,
    supportsDryRun: true,
    timeoutMs: 10_000,
    maxRetries: 1,
    requiredContexts: {
      actor: true,
      organization: false,
      entitlement: false,
      consent: true,
      connection: false,
    },
  },
  {
    schemaVersion: VOXY_TOOL_CAPABILITY_SCHEMA_VERSION,
    capabilityId: "edebatte.external_notification.request",
    version: "1.0.0",
    domain: "notifications",
    ownerRef: "canonical-notification-domain",
    inputSchemaRef: "external-notification-request.v1",
    outputSchemaRef: "external-notification-review-reference.v1",
    actionKind: "notify_external",
    requiredPermission: "write_reversible",
    riskClass: "yellow",
    reversible: false,
    idempotencyRequired: true,
    supportsPreview: true,
    supportsDryRun: true,
    timeoutMs: 15_000,
    maxRetries: 0,
    requiredContexts: {
      actor: true,
      organization: false,
      entitlement: false,
      consent: true,
      connection: false,
    },
  },
] as const;

export const VOXY_TOOL_CAPABILITIES: readonly VoxyToolCapability[] = CAPABILITIES.map((entry) =>
  VoxyToolCapabilitySchema.parse(entry),
);

const VoxyToolContextSnapshotSchema = z
  .object({
    actorPresent: z.boolean(),
    organizationPresent: z.boolean(),
    entitlementPresent: z.boolean(),
    consentPresent: z.boolean(),
    connectionPresent: z.boolean(),
  })
  .strict();

export const VoxyToolActionCandidateSchema = z
  .object({
    candidateId: z.string().min(1).max(160),
    actorId: z.string().min(1).max(160),
    conversationId: z.string().min(1).max(160),
    finalIntentRef: z.string().min(1).max(240),
    capabilityId: z.string().min(1).max(160),
    capabilityVersion: z.string().min(1).max(40),
    mode: VoxyToolRequestModeSchema,
    executorRoleId: Alpha2OrganizationRoleIdSchema,
    confidence: Alpha2ConfidenceSchema,
    explicitPolicyRef: z.string().min(1).max(240).optional(),
    evidenceRefs: z.array(z.string().min(1).max(320)).min(1).max(32),
    context: VoxyToolContextSnapshotSchema,
  })
  .strict();

export type VoxyToolActionCandidate = z.infer<typeof VoxyToolActionCandidateSchema>;

export const VoxyToolDecisionSchema = z
  .object({
    candidateId: z.string().min(1),
    capabilityId: z.string().min(1),
    capabilityVersion: z.string().min(1),
    status: z.enum(VOXY_TOOL_DECISION_STATUSES),
    canonicalActionKind: Alpha2ActionKindSchema.nullable(),
    autoExecutionAllowed: z.boolean(),
    reasonCodes: z.array(z.string().min(1)).min(1),
    evidenceRefs: z.array(z.string().min(1)).min(1),
  })
  .strict()
  .superRefine((decision, ctx) => {
    if (decision.status === "authorized" && !decision.autoExecutionAllowed) {
      ctx.addIssue({ code: "custom", message: "authorized_tool_decision_must_allow_execution" });
    }
    if (decision.status !== "authorized" && decision.autoExecutionAllowed) {
      ctx.addIssue({ code: "custom", message: "non_authorized_tool_decision_cannot_execute" });
    }
  });

export type VoxyToolDecision = z.infer<typeof VoxyToolDecisionSchema>;

function blockedDecision(input: {
  candidate: VoxyToolActionCandidate;
  reasonCodes: string[];
  capability?: VoxyToolCapability | null;
}): VoxyToolDecision {
  return VoxyToolDecisionSchema.parse({
    candidateId: input.candidate.candidateId,
    capabilityId: input.candidate.capabilityId,
    capabilityVersion: input.candidate.capabilityVersion,
    status: "blocked",
    canonicalActionKind: input.capability?.actionKind ?? null,
    autoExecutionAllowed: false,
    reasonCodes: input.reasonCodes,
    evidenceRefs: input.candidate.evidenceRefs,
  });
}

export function getVoxyToolCapability(capabilityId: string) {
  return VOXY_TOOL_CAPABILITIES.find((capability) => capability.capabilityId === capabilityId) ?? null;
}

function missingContextReasons(capability: VoxyToolCapability, candidate: VoxyToolActionCandidate) {
  const reasons: string[] = [];
  if (!candidate.context.actorPresent) reasons.push("missing_actor_context");
  if (capability.requiredContexts.organization && !candidate.context.organizationPresent) {
    reasons.push("missing_organization_context");
  }
  if (capability.requiredContexts.entitlement && !candidate.context.entitlementPresent) {
    reasons.push("missing_entitlement_context");
  }
  if (capability.requiredContexts.consent && !candidate.context.consentPresent) {
    reasons.push("missing_consent_context");
  }
  if (capability.requiredContexts.connection && !candidate.context.connectionPresent) {
    reasons.push("missing_connection_context");
  }
  return reasons;
}

export function resolveVoxyToolCapabilityDecision(
  rawCandidate: VoxyToolActionCandidate,
): VoxyToolDecision {
  const candidate = VoxyToolActionCandidateSchema.parse(rawCandidate);
  const capability = getVoxyToolCapability(candidate.capabilityId);
  if (!capability) {
    return blockedDecision({ candidate, reasonCodes: ["unknown_capability"] });
  }
  if (candidate.capabilityVersion !== capability.version) {
    return blockedDecision({
      candidate,
      capability,
      reasonCodes: ["stale_or_unknown_capability_version"],
    });
  }
  if (candidate.mode === "preview" && !capability.supportsPreview) {
    return blockedDecision({ candidate, capability, reasonCodes: ["preview_not_supported"] });
  }
  if (candidate.mode === "dry_run" && !capability.supportsDryRun) {
    return blockedDecision({ candidate, capability, reasonCodes: ["dry_run_not_supported"] });
  }

  const contextReasons = missingContextReasons(capability, candidate);
  if (contextReasons.length > 0) {
    return blockedDecision({ candidate, capability, reasonCodes: contextReasons });
  }

  let controls: ReturnType<typeof getAlpha2OrganizationRoleControls>;
  try {
    controls = getAlpha2OrganizationRoleControls(candidate.executorRoleId);
  } catch {
    return blockedDecision({ candidate, capability, reasonCodes: ["executor_controls_unavailable"] });
  }

  if (!controls.toolPermissions.includes(capability.requiredPermission)) {
    return blockedDecision({
      candidate,
      capability,
      reasonCodes: [`missing_role_permission:${capability.requiredPermission}`],
    });
  }
  if (!isAlpha2OrganizationRoleRiskWithinCeiling(candidate.executorRoleId, capability.riskClass)) {
    return blockedDecision({
      candidate,
      capability,
      reasonCodes: [`risk_exceeds_role_ceiling:${capability.riskClass}`],
    });
  }

  const gate = resolveAlpha2ActionGate({
    actionKind: capability.actionKind,
    riskClass: capability.riskClass,
    confidence: candidate.confidence,
    reversible: capability.reversible,
    explicitPolicyRef: candidate.explicitPolicyRef,
    evidenceRefs: candidate.evidenceRefs,
  });

  const status: VoxyToolDecisionStatus =
    gate.decision === "automatic"
      ? "authorized"
      : gate.decision === "human_only"
        ? "human_only"
        : "review_required";

  return VoxyToolDecisionSchema.parse({
    candidateId: candidate.candidateId,
    capabilityId: capability.capabilityId,
    capabilityVersion: capability.version,
    status,
    canonicalActionKind: capability.actionKind,
    autoExecutionAllowed: gate.autoExecutionAllowed,
    reasonCodes: gate.reasonCodes,
    evidenceRefs: gate.evidenceRefs,
  });
}

const VoxyToolArtifactRefSchema = z
  .object({
    id: z.string().min(1).max(240),
    ownerRef: z.string().min(1).max(240),
  })
  .strict();

export const VoxyToolSafeResultSchema = z
  .object({
    resultId: z.string().min(1).max(200),
    capabilityId: VoxyToolCapabilityIdSchema,
    capabilityVersion: z.string().min(1).max(40),
    status: z.enum(VOXY_TOOL_RESULT_STATUSES),
    safeSummary: z.string().min(1).max(500),
    artifactRefs: z.array(VoxyToolArtifactRefSchema).max(32),
    evidenceRefs: z.array(z.string().min(1).max(320)).max(32),
    errorClass: z.enum(VOXY_TOOL_ERROR_CLASSES).optional(),
  })
  .strict()
  .superRefine((result, ctx) => {
    if (result.status === "failed" && !result.errorClass) {
      ctx.addIssue({ code: "custom", message: "failed_tool_result_requires_error_class" });
    }
    if (result.status !== "failed" && result.errorClass) {
      ctx.addIssue({ code: "custom", message: "non_failed_tool_result_cannot_set_error_class" });
    }
  });

export type VoxyToolSafeResult = z.infer<typeof VoxyToolSafeResultSchema>;

export function buildVoxyToolSafeTrace(input: {
  candidate: VoxyToolActionCandidate;
  decision: VoxyToolDecision;
}): AgentSafeTraceStep {
  const candidate = VoxyToolActionCandidateSchema.parse(input.candidate);
  const decision = VoxyToolDecisionSchema.parse(input.decision);
  const status =
    decision.status === "authorized"
      ? "completed"
      : decision.status === "blocked"
        ? "blocked"
        : "review_required";
  const confidenceLabel =
    decision.status === "authorized"
      ? "confirmed_runtime"
      : decision.status === "blocked"
        ? "guarded"
        : "review_required";

  return buildAgentSafeTraceStep({
    taskId: "VOXY-TOOL-CAPABILITY-ADAPTERS-01",
    stepId: `voxy_tool_${candidate.candidateId}`,
    surface: "/voxy",
    userSafeLabel: `Tool capability ${candidate.capabilityId}: ${decision.status}`,
    status,
    confidenceLabel,
    requiredHumanAction: decision.status === "authorized" ? "none" : "continue_manually",
    inputArtifacts: [
      {
        id: candidate.finalIntentRef,
        type: "human_input",
        label: "Final user intent reference",
        reviewState: "present",
      },
    ],
    outputArtifacts: [
      {
        id: `${candidate.candidateId}:decision`,
        type: "candidate_preview",
        label: "Tool capability decision",
        reviewState: decision.status === "authorized" ? "present" : "review_required",
      },
    ],
    evidenceRefs: decision.evidenceRefs,
    reviewState: decision.status,
    publishState: "publish_blocked",
    primaryRole: "personal_voxy",
    supportingRoles: ["governance_compliance"],
  });
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error("voxy_tool_execution_aborted");
}

export async function executeAuthorizedVoxyToolCapability<T>(input: {
  candidate: VoxyToolActionCandidate;
  fence: Alpha2ExecutionFence;
  signal?: AbortSignal;
  invoke: (context: {
    capability: VoxyToolCapability;
    candidate: VoxyToolActionCandidate;
    assertActive: () => Promise<string>;
    idempotencyKey?: string;
    generation?: number;
    attemptToken?: string;
  }) => Promise<T> | T;
}): Promise<T> {
  const candidate = VoxyToolActionCandidateSchema.parse(input.candidate);
  const decision = resolveVoxyToolCapabilityDecision(candidate);
  const capability = getVoxyToolCapability(candidate.capabilityId);
  if (!capability || decision.status !== "authorized" || !decision.autoExecutionAllowed) {
    throw new Error(`voxy_tool_execution_not_authorized:${decision.status}`);
  }
  if (candidate.mode !== "execute") {
    throw new Error("voxy_tool_non_execute_mode_requires_domain_preview_adapter");
  }

  assertNotAborted(input.signal);

  if (capability.actionKind === "read_only") {
    await input.fence.assertActive();
    assertNotAborted(input.signal);
    return input.invoke({
      capability,
      candidate,
      assertActive: input.fence.assertActive,
    });
  }

  if (capability.actionKind !== "write_reversible") {
    throw new Error(`voxy_tool_automatic_effect_kind_forbidden:${capability.actionKind}`);
  }

  return input.fence.runSideEffect({
    effectId: `voxy-tool:${capability.capabilityId}:${capability.version}:${candidate.candidateId}`,
    sink: async (effectFence) => {
      await effectFence.assertActive();
      assertNotAborted(input.signal);
      return input.invoke({
        capability,
        candidate,
        assertActive: effectFence.assertActive,
        idempotencyKey: effectFence.idempotencyKey,
        generation: effectFence.generation,
        attemptToken: effectFence.attemptToken,
      });
    },
  });
}

export function isVoxyToolCapabilityPermission(
  value: string,
): value is Alpha2RoleToolPermission {
  return (ALPHA2_ROLE_TOOL_PERMISSIONS as readonly string[]).includes(value);
}

export function isVoxyToolCapabilityActionKind(value: string): value is Alpha2ActionKind {
  return (ALPHA2_ACTION_KINDS as readonly string[]).includes(value);
}

export function isVoxyToolExecutorRole(value: string): value is Alpha2OrganizationRoleId {
  return (ALPHA2_ORGANIZATION_ROLE_IDS as readonly string[]).includes(value);
}
