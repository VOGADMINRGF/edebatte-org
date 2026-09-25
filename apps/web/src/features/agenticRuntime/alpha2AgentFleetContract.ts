import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  AGENT_ROLE_IDS,
  loadAgentRegistry,
  type AgentRoleId,
} from "@/features/agenticRuntime/agentRegistryBootstrapContract";

export const ALPHA2_ORGANIZATION_ROLE_IDS = [
  "alpha_orchestrator",
  "chief_critic",
  "knowledge_curator",
  "risk_governor",
  "product_agent",
  "engineering_agent",
  "review_agent",
  "qa_agent",
  "visual_qa_agent",
  "sre_support_agent",
  "security_agent",
  "research_agent",
  "evidence_agent",
  "dossier_agent",
  "neutrality_red_team",
  "global_governance_agent",
  "system_challenger",
  "growth_agent",
  "membership_agent",
  "community_agent",
  "funding_agent",
  "analytics_agent",
  "editorial_agent",
  "voxy_agent",
  "distribution_agent",
  "brand_trust_agent",
] as const;

export const ALPHA2_ROLE_IDS = [...AGENT_ROLE_IDS, ...ALPHA2_ORGANIZATION_ROLE_IDS] as const;
export const ALPHA2_PROVIDER_IDS = ["openai", "codex", "oss", "anthropic"] as const;
export const ALPHA2_DEFAULT_RISK_CLASSES = ["green", "yellow", "orange", "red"] as const;
export const ALPHA2_ROLE_TOOL_PERMISSIONS = ["read_only", "write_reversible"] as const;
export const ALPHA2_MODEL_CLASSES = [
  "reasoning",
  "engineering",
  "review",
  "research",
  "content",
  "support",
  "visual_qa",
] as const;

export type Alpha2OrganizationRoleId = (typeof ALPHA2_ORGANIZATION_ROLE_IDS)[number];
export type Alpha2RoleId = (typeof ALPHA2_ROLE_IDS)[number];
export type Alpha2ProviderId = (typeof ALPHA2_PROVIDER_IDS)[number];
export type Alpha2DefaultRiskClass = (typeof ALPHA2_DEFAULT_RISK_CLASSES)[number];
export type Alpha2RoleToolPermission = (typeof ALPHA2_ROLE_TOOL_PERMISSIONS)[number];
export type Alpha2ModelClass = (typeof ALPHA2_MODEL_CLASSES)[number];

export const Alpha2RoleIdSchema = z.enum(ALPHA2_ROLE_IDS);
const Alpha2OrganizationRoleIdSchema = z.enum(ALPHA2_ORGANIZATION_ROLE_IDS);
const Alpha2ProviderIdSchema = z.enum(ALPHA2_PROVIDER_IDS);
const Alpha2DefaultRiskSchema = z.enum(ALPHA2_DEFAULT_RISK_CLASSES);
const Alpha2RoleToolPermissionSchema = z.enum(ALPHA2_ROLE_TOOL_PERMISSIONS);
const Alpha2ModelClassSchema = z.enum(ALPHA2_MODEL_CLASSES);

const Alpha2OrganizationRoleSchema = z
  .object({
    id: Alpha2OrganizationRoleIdSchema,
    title: z.string().min(1),
    domains: z.array(z.string().min(1)).min(1),
    capabilities: z.array(z.string().min(1)).min(1),
    toolPermissions: z.array(Alpha2RoleToolPermissionSchema).min(1),
    defaultRisk: Alpha2DefaultRiskSchema,
    riskCeiling: Alpha2DefaultRiskSchema,
    defaultModelClass: Alpha2ModelClassSchema,
    evaluationSuiteRefs: z.array(z.string().min(1)).min(1),
  })
  .strict();

const Alpha2ProviderSchema = z
  .object({
    id: Alpha2ProviderIdSchema,
    enabledByDefault: z.boolean(),
    purposes: z.array(z.string().min(1)).min(1),
    requiresRuntimeCredential: z.boolean(),
  })
  .strict();

const Alpha2CapabilityRouteSchema = z
  .object({
    capability: z.string().min(1),
    preferredProviders: z.array(Alpha2ProviderIdSchema).min(1),
    fallbackProviders: z.array(Alpha2ProviderIdSchema).default([]),
    independentReviewRequired: z.boolean(),
  })
  .strict();

const Alpha2RegistryExtensionSchema = z
  .object({
    schemaVersion: z.literal("alpha2.registry.v1"),
    controlPlane: z
      .object({
        id: z.literal("alpha_orchestrator"),
        maxParallelWorkers: z.number().int().min(1).max(64),
        workerSliceMaxTasks: z.number().int().min(1).max(3),
        modelAgnostic: z.literal(true),
        durableLedger: z.literal("mongodb"),
        executionQueue: z.literal("bullmq_redis"),
        legacyRunnerRemainsBounded: z.literal(true),
      })
      .strict(),
    providers: z.array(Alpha2ProviderSchema).length(ALPHA2_PROVIDER_IDS.length),
    organizationRoles: z
      .array(Alpha2OrganizationRoleSchema)
      .length(ALPHA2_ORGANIZATION_ROLE_IDS.length),
    capabilityRoutes: z.array(Alpha2CapabilityRouteSchema).min(1),
    globalDeniedActions: z.array(z.string().min(1)).min(1),
  })
  .strict();

const RegistryEnvelopeSchema = z.object({
  alpha2: Alpha2RegistryExtensionSchema,
});

export type Alpha2AgentFleetRegistry = z.infer<typeof Alpha2RegistryExtensionSchema>;
export type Alpha2OrganizationRole = Alpha2AgentFleetRegistry["organizationRoles"][number];
export type Alpha2CapabilityRoute = Alpha2AgentFleetRegistry["capabilityRoutes"][number];

const ALPHA2_RISK_RANK: Record<Alpha2DefaultRiskClass, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

function resolveRepoFile(...segments: string[]) {
  const cwd = process.cwd();
  const candidates = [cwd, resolve(cwd, ".."), resolve(cwd, "..", "..")] .map((base) =>
    resolve(base, ...segments),
  );
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`repo_file_not_found:${segments.join("/")}`);
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

let cachedFleet: Alpha2AgentFleetRegistry | null = null;

export function loadAlpha2AgentFleetRegistry(): Alpha2AgentFleetRegistry {
  if (cachedFleet) return cachedFleet;
  const raw = JSON.parse(
    readFileSync(resolveRepoFile(".codex", "agents", "registry.json"), "utf8"),
  );
  const parsed = RegistryEnvelopeSchema.parse(raw).alpha2;

  const actualRoleIds = parsed.organizationRoles.map((role) => role.id);
  if (unique(actualRoleIds).length !== ALPHA2_ORGANIZATION_ROLE_IDS.length) {
    throw new Error("alpha2_registry_duplicate_organization_role");
  }
  for (const roleId of ALPHA2_ORGANIZATION_ROLE_IDS) {
    if (!actualRoleIds.includes(roleId)) throw new Error(`alpha2_registry_missing_role:${roleId}`);
  }
  for (const role of parsed.organizationRoles) {
    if (unique(role.toolPermissions).length !== role.toolPermissions.length) {
      throw new Error(`alpha2_registry_duplicate_tool_permission:${role.id}`);
    }
    if (unique(role.evaluationSuiteRefs).length !== role.evaluationSuiteRefs.length) {
      throw new Error(`alpha2_registry_duplicate_evaluation_suite_ref:${role.id}`);
    }
    if (ALPHA2_RISK_RANK[role.defaultRisk] > ALPHA2_RISK_RANK[role.riskCeiling]) {
      throw new Error(`alpha2_registry_default_risk_exceeds_ceiling:${role.id}`);
    }
  }

  const providerIds = parsed.providers.map((provider) => provider.id);
  if (unique(providerIds).length !== ALPHA2_PROVIDER_IDS.length) {
    throw new Error("alpha2_registry_duplicate_provider");
  }
  for (const providerId of ALPHA2_PROVIDER_IDS) {
    if (!providerIds.includes(providerId)) {
      throw new Error(`alpha2_registry_missing_provider:${providerId}`);
    }
  }

  const routeCapabilities = parsed.capabilityRoutes.map((route) => route.capability);
  if (unique(routeCapabilities).length !== routeCapabilities.length) {
    throw new Error("alpha2_registry_duplicate_capability_route");
  }
  const advertisedCapabilities = unique(
    parsed.organizationRoles.flatMap((role) => role.capabilities),
  );
  for (const capability of advertisedCapabilities) {
    if (!routeCapabilities.includes(capability)) {
      throw new Error(`alpha2_registry_missing_capability_route:${capability}`);
    }
  }

  cachedFleet = parsed;
  return parsed;
}

export function isAlpha2RoleId(value: string): value is Alpha2RoleId {
  return (ALPHA2_ROLE_IDS as readonly string[]).includes(value);
}

export function isAlpha2OrganizationRoleId(
  value: Alpha2RoleId,
): value is Alpha2OrganizationRoleId {
  return (ALPHA2_ORGANIZATION_ROLE_IDS as readonly string[]).includes(value);
}

export function resolveAlpha2Role(roleId: Alpha2RoleId) {
  if ((AGENT_ROLE_IDS as readonly string[]).includes(roleId)) {
    const legacy = loadAgentRegistry().roles.find((role) => role.id === roleId as AgentRoleId);
    if (!legacy) throw new Error(`alpha2_legacy_role_not_found:${roleId}`);
    return {
      id: legacy.id as Alpha2RoleId,
      title: legacy.title,
      domains: [...legacy.primaryDomains],
      capabilities: [...legacy.allowedArtifacts],
      defaultRisk: "yellow" as const,
      source: "v3_product_registry" as const,
    };
  }

  const role = loadAlpha2AgentFleetRegistry().organizationRoles.find((entry) => entry.id === roleId);
  if (!role) throw new Error(`alpha2_organization_role_not_found:${roleId}`);
  return { ...role, source: "alpha2_organization_registry" as const };
}

export function getAlpha2OrganizationRoleControls(roleId: Alpha2OrganizationRoleId) {
  const role = loadAlpha2AgentFleetRegistry().organizationRoles.find((entry) => entry.id === roleId);
  if (!role) throw new Error(`alpha2_organization_role_not_found:${roleId}`);
  return {
    toolPermissions: [...role.toolPermissions],
    riskCeiling: role.riskCeiling,
    defaultModelClass: role.defaultModelClass,
    evaluationSuiteRefs: [...role.evaluationSuiteRefs],
  };
}

export function isAlpha2OrganizationRoleRiskWithinCeiling(
  roleId: Alpha2OrganizationRoleId,
  riskClass: Alpha2DefaultRiskClass,
) {
  const role = getAlpha2OrganizationRoleControls(roleId);
  return ALPHA2_RISK_RANK[riskClass] <= ALPHA2_RISK_RANK[role.riskCeiling];
}

export function findAlpha2CapabilityRoute(capability: string) {
  return loadAlpha2AgentFleetRegistry().capabilityRoutes.find(
    (entry) => entry.capability === capability,
  );
}

export function resolveAlpha2CapabilityRoute(capability: string) {
  const route = findAlpha2CapabilityRoute(capability);
  if (!route) throw new Error(`alpha2_capability_route_not_found:${capability}`);
  return route;
}

export function selectAlpha2Provider(input: {
  capability: string;
  availableProviders: readonly Alpha2ProviderId[];
  preferredProvider?: Alpha2ProviderId;
}) {
  const route = resolveAlpha2CapabilityRoute(input.capability);
  const available = new Set(input.availableProviders);
  const allowed = [...route.preferredProviders, ...route.fallbackProviders];

  if (input.preferredProvider) {
    if (!allowed.includes(input.preferredProvider)) {
      throw new Error(`alpha2_provider_not_allowed_for_capability:${input.preferredProvider}`);
    }
    if (!available.has(input.preferredProvider)) {
      throw new Error(`alpha2_provider_not_available:${input.preferredProvider}`);
    }
    return {
      providerId: input.preferredProvider,
      route,
      selectedBy: "explicit_preference" as const,
    };
  }

  const providerId = allowed.find((candidate) => available.has(candidate));
  if (!providerId) throw new Error(`alpha2_no_available_provider:${input.capability}`);
  return {
    providerId,
    route,
    selectedBy: route.preferredProviders.includes(providerId)
      ? ("preferred_route" as const)
      : ("fallback_route" as const),
  };
}

export function getAlpha2DefaultEnabledProviders() {
  return loadAlpha2AgentFleetRegistry()
    .providers.filter((provider) => provider.enabledByDefault)
    .map((provider) => provider.id);
}

export function getAlpha2ControlPlaneLimits() {
  const controlPlane = loadAlpha2AgentFleetRegistry().controlPlane;
  return {
    maxParallelWorkers: controlPlane.maxParallelWorkers,
    workerSliceMaxTasks: controlPlane.workerSliceMaxTasks,
    modelAgnostic: controlPlane.modelAgnostic,
    durableLedger: controlPlane.durableLedger,
    executionQueue: controlPlane.executionQueue,
  };
}
