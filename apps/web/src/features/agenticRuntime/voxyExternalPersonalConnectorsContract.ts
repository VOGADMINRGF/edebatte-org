import type { Alpha2ActionKind } from "@/features/agenticRuntime/alpha2RiskGateContract";

export const VOXY_EXTERNAL_PERSONAL_CONNECTOR_SCHEMA_VERSION =
  "voxy.external-personal-connector.v1" as const;

export const VOXY_EXTERNAL_PROVIDER_KINDS = [
  "calendar",
  "mail",
  "files",
  "browser",
] as const;

export const VOXY_EXTERNAL_CONNECTION_STATUSES = [
  "pending",
  "active",
  "revoked",
  "expired",
  "error",
] as const;

export const VOXY_EXTERNAL_CAPABILITY_SCOPES = [
  "calendar.read",
  "calendar.write",
  "mail.read",
  "mail.send",
  "files.read",
  "files.write",
  "files.share",
  "browser.read",
  "browser.submit",
  "browser.purchase",
  "browser.publish",
] as const;

export const VOXY_EXTERNAL_ADAPTER_OPERATION_IDS = [
  "calendar.availability.read",
  "calendar.event.create",
  "calendar.event.update",
  "mail.search.read",
  "mail.message.read",
  "mail.message.send",
  "mail.message.reply",
  "files.search.read",
  "files.content.read",
  "files.content.write",
  "files.item.share",
  "browser.navigate.read",
  "browser.retrieve.read",
  "browser.form.submit",
  "browser.purchase.submit",
  "browser.publish.submit",
] as const;

export const VOXY_EXTERNAL_CONNECTOR_GUARDRAILS = {
  secondToolBusAllowed: false,
  secondOrchestratorAllowed: false,
  secondQueueAllowed: false,
  secondSecretOwnerAllowed: false,
  directProviderExecutionAllowed: false,
  directCredentialExposureAllowed: false,
  directWriteWithoutToolGateAllowed: false,
  humanGateDowngradeAllowed: false,
  politicalProfilingAllowed: false,
  providerActivationIncluded: false,
  oauthActivationIncluded: false,
  secretProvisioningIncluded: false,
} as const;

export type VoxyExternalProviderKind =
  (typeof VOXY_EXTERNAL_PROVIDER_KINDS)[number];
export type VoxyExternalConnectionStatus =
  (typeof VOXY_EXTERNAL_CONNECTION_STATUSES)[number];
export type VoxyExternalCapabilityScope =
  (typeof VOXY_EXTERNAL_CAPABILITY_SCOPES)[number];
export type VoxyExternalAdapterOperationId =
  (typeof VOXY_EXTERNAL_ADAPTER_OPERATION_IDS)[number];

export type VoxyExternalPersonalConnection = {
  schemaVersion: typeof VOXY_EXTERNAL_PERSONAL_CONNECTOR_SCHEMA_VERSION;
  connectionId: string;
  actorId: string;
  providerKind: VoxyExternalProviderKind;
  capabilityScopes: readonly VoxyExternalCapabilityScope[];
  status: VoxyExternalConnectionStatus;
  credentialRef: string;
  visibleScopeSummary: readonly string[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  revokeHandoffRef: string;
  reauthorizeHandoffRef: string;
  guardrails: typeof VOXY_EXTERNAL_CONNECTOR_GUARDRAILS;
};

export type VoxyExternalAdapterOperation = {
  operationId: VoxyExternalAdapterOperationId;
  providerKind: VoxyExternalProviderKind;
  requiredScopes: readonly VoxyExternalCapabilityScope[];
  actionKind: Alpha2ActionKind;
  readOnly: boolean;
  reversible: boolean;
  requiresVoxyToolCapabilityGate: true;
  requiresAlpha2ActionGate: boolean;
  requiresAlpha2ExecutionFence: boolean;
  requiresExplicitConfirmation: boolean;
  directExecutionAllowed: false;
};

export type VoxyExternalConnectionRuntimeContext = {
  actorId: string;
  now: string;
  currentConnection: VoxyExternalPersonalConnection | null;
  requestedOperationId: VoxyExternalAdapterOperationId;
  currentUserContextPresent: boolean;
  voxyToolCapabilityAuthorized: boolean;
  alpha2ActionGateAuthorized: boolean;
  alpha2ExecutionFencePresent: boolean;
  explicitConfirmationPresent: boolean;
};

export type VoxyExternalConnectionDecision = {
  allowed: boolean;
  operation: VoxyExternalAdapterOperation;
  connectionId: string | null;
  reasonCodes: readonly string[];
  requiresVoxyToolCapabilityGate: true;
  requiresAlpha2ActionGate: boolean;
  requiresAlpha2ExecutionFence: boolean;
  directExecutionAllowed: false;
};

export type VoxyExternalConnectorSafeTrace = {
  schemaVersion: typeof VOXY_EXTERNAL_PERSONAL_CONNECTOR_SCHEMA_VERSION;
  actorId: string;
  connectionId: string | null;
  providerKind: VoxyExternalProviderKind;
  operationId: VoxyExternalAdapterOperationId;
  actionKind: Alpha2ActionKind;
  allowed: boolean;
  reasonCodes: readonly string[];
  containsCredential: false;
  containsToken: false;
  containsCookie: false;
  containsRawProviderPayload: false;
};

const CONNECTION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const ACTOR_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const OPAQUE_CREDENTIAL_REF = /^(?:secret|vault|credential|keyring)-ref:[A-Za-z0-9][A-Za-z0-9._:/-]{2,239}$/;
const HANDOFF_REF = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,239}$/;
const SUSPICIOUS_SECRET_MARKERS = [
  "access_token",
  "refresh_token",
  "bearer ",
  "cookie=",
  "authorization:",
  "eyj",
] as const;

const OPERATION_CATALOG = [
  {
    operationId: "calendar.availability.read",
    providerKind: "calendar",
    requiredScopes: ["calendar.read"],
    actionKind: "read_only",
    readOnly: true,
    reversible: true,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: false,
    requiresAlpha2ExecutionFence: false,
    requiresExplicitConfirmation: false,
    directExecutionAllowed: false,
  },
  {
    operationId: "calendar.event.create",
    providerKind: "calendar",
    requiredScopes: ["calendar.write"],
    actionKind: "write_reversible",
    readOnly: false,
    reversible: true,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: true,
    requiresAlpha2ExecutionFence: true,
    requiresExplicitConfirmation: true,
    directExecutionAllowed: false,
  },
  {
    operationId: "calendar.event.update",
    providerKind: "calendar",
    requiredScopes: ["calendar.write"],
    actionKind: "write_reversible",
    readOnly: false,
    reversible: true,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: true,
    requiresAlpha2ExecutionFence: true,
    requiresExplicitConfirmation: true,
    directExecutionAllowed: false,
  },
  {
    operationId: "mail.search.read",
    providerKind: "mail",
    requiredScopes: ["mail.read"],
    actionKind: "read_only",
    readOnly: true,
    reversible: true,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: false,
    requiresAlpha2ExecutionFence: false,
    requiresExplicitConfirmation: false,
    directExecutionAllowed: false,
  },
  {
    operationId: "mail.message.read",
    providerKind: "mail",
    requiredScopes: ["mail.read"],
    actionKind: "read_only",
    readOnly: true,
    reversible: true,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: false,
    requiresAlpha2ExecutionFence: false,
    requiresExplicitConfirmation: false,
    directExecutionAllowed: false,
  },
  {
    operationId: "mail.message.send",
    providerKind: "mail",
    requiredScopes: ["mail.send"],
    actionKind: "notify_external",
    readOnly: false,
    reversible: false,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: true,
    requiresAlpha2ExecutionFence: true,
    requiresExplicitConfirmation: true,
    directExecutionAllowed: false,
  },
  {
    operationId: "mail.message.reply",
    providerKind: "mail",
    requiredScopes: ["mail.send"],
    actionKind: "notify_external",
    readOnly: false,
    reversible: false,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: true,
    requiresAlpha2ExecutionFence: true,
    requiresExplicitConfirmation: true,
    directExecutionAllowed: false,
  },
  {
    operationId: "files.search.read",
    providerKind: "files",
    requiredScopes: ["files.read"],
    actionKind: "read_only",
    readOnly: true,
    reversible: true,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: false,
    requiresAlpha2ExecutionFence: false,
    requiresExplicitConfirmation: false,
    directExecutionAllowed: false,
  },
  {
    operationId: "files.content.read",
    providerKind: "files",
    requiredScopes: ["files.read"],
    actionKind: "read_only",
    readOnly: true,
    reversible: true,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: false,
    requiresAlpha2ExecutionFence: false,
    requiresExplicitConfirmation: false,
    directExecutionAllowed: false,
  },
  {
    operationId: "files.content.write",
    providerKind: "files",
    requiredScopes: ["files.write"],
    actionKind: "write_reversible",
    readOnly: false,
    reversible: true,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: true,
    requiresAlpha2ExecutionFence: true,
    requiresExplicitConfirmation: true,
    directExecutionAllowed: false,
  },
  {
    operationId: "files.item.share",
    providerKind: "files",
    requiredScopes: ["files.share"],
    actionKind: "notify_external",
    readOnly: false,
    reversible: false,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: true,
    requiresAlpha2ExecutionFence: true,
    requiresExplicitConfirmation: true,
    directExecutionAllowed: false,
  },
  {
    operationId: "browser.navigate.read",
    providerKind: "browser",
    requiredScopes: ["browser.read"],
    actionKind: "read_only",
    readOnly: true,
    reversible: true,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: false,
    requiresAlpha2ExecutionFence: false,
    requiresExplicitConfirmation: false,
    directExecutionAllowed: false,
  },
  {
    operationId: "browser.retrieve.read",
    providerKind: "browser",
    requiredScopes: ["browser.read"],
    actionKind: "read_only",
    readOnly: true,
    reversible: true,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: false,
    requiresAlpha2ExecutionFence: false,
    requiresExplicitConfirmation: false,
    directExecutionAllowed: false,
  },
  {
    operationId: "browser.form.submit",
    providerKind: "browser",
    requiredScopes: ["browser.submit"],
    actionKind: "write_irreversible",
    readOnly: false,
    reversible: false,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: true,
    requiresAlpha2ExecutionFence: true,
    requiresExplicitConfirmation: true,
    directExecutionAllowed: false,
  },
  {
    operationId: "browser.purchase.submit",
    providerKind: "browser",
    requiredScopes: ["browser.purchase"],
    actionKind: "spend_money",
    readOnly: false,
    reversible: false,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: true,
    requiresAlpha2ExecutionFence: true,
    requiresExplicitConfirmation: true,
    directExecutionAllowed: false,
  },
  {
    operationId: "browser.publish.submit",
    providerKind: "browser",
    requiredScopes: ["browser.publish"],
    actionKind: "publish_external",
    readOnly: false,
    reversible: false,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: true,
    requiresAlpha2ExecutionFence: true,
    requiresExplicitConfirmation: true,
    directExecutionAllowed: false,
  },
] as const satisfies readonly VoxyExternalAdapterOperation[];

export const VOXY_EXTERNAL_ADAPTER_OPERATIONS: readonly VoxyExternalAdapterOperation[] =
  OPERATION_CATALOG;

function parseIso(value: string | null) {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function containsSuspiciousSecretMaterial(value: string) {
  const normalized = value.toLowerCase();
  return SUSPICIOUS_SECRET_MARKERS.some((marker) => normalized.includes(marker));
}

function hasUniqueScopes(scopes: readonly VoxyExternalCapabilityScope[]) {
  return new Set(scopes).size === scopes.length;
}

export function getVoxyExternalAdapterOperation(operationId: VoxyExternalAdapterOperationId) {
  return VOXY_EXTERNAL_ADAPTER_OPERATIONS.find((entry) => entry.operationId === operationId) ?? null;
}

export function validateVoxyExternalPersonalConnection(
  connection: VoxyExternalPersonalConnection,
): readonly string[] {
  const reasons: string[] = [];
  if (connection.schemaVersion !== VOXY_EXTERNAL_PERSONAL_CONNECTOR_SCHEMA_VERSION) {
    reasons.push("schema_version_invalid");
  }
  if (!CONNECTION_ID.test(connection.connectionId)) reasons.push("connection_id_invalid");
  if (!ACTOR_ID.test(connection.actorId)) reasons.push("actor_id_invalid");
  if (connection.capabilityScopes.length === 0) reasons.push("scopes_missing");
  if (!hasUniqueScopes(connection.capabilityScopes)) reasons.push("duplicate_scopes");
  if (!OPAQUE_CREDENTIAL_REF.test(connection.credentialRef)) reasons.push("credential_ref_not_opaque");
  if (containsSuspiciousSecretMaterial(connection.credentialRef)) reasons.push("credential_ref_contains_secret_material");
  if (connection.visibleScopeSummary.length === 0) reasons.push("visible_scope_summary_missing");
  if (connection.visibleScopeSummary.some((entry) => containsSuspiciousSecretMaterial(entry))) {
    reasons.push("visible_scope_summary_contains_secret_material");
  }
  if (parseIso(connection.createdAt) === null) reasons.push("created_at_invalid");
  if (parseIso(connection.updatedAt) === null) reasons.push("updated_at_invalid");
  if (connection.expiresAt !== null && parseIso(connection.expiresAt) === null) reasons.push("expires_at_invalid");
  if (connection.lastVerifiedAt !== null && parseIso(connection.lastVerifiedAt) === null) {
    reasons.push("last_verified_at_invalid");
  }
  if (!HANDOFF_REF.test(connection.revokeHandoffRef)) reasons.push("revoke_handoff_ref_invalid");
  if (!HANDOFF_REF.test(connection.reauthorizeHandoffRef)) reasons.push("reauthorize_handoff_ref_invalid");
  return reasons;
}

export function resolveVoxyExternalConnectionDecision(
  runtime: VoxyExternalConnectionRuntimeContext,
): VoxyExternalConnectionDecision {
  const operation = getVoxyExternalAdapterOperation(runtime.requestedOperationId);
  if (!operation) {
    throw new Error(`unknown external adapter operation: ${runtime.requestedOperationId}`);
  }

  const reasons: string[] = [];
  const connection = runtime.currentConnection;

  if (!connection) {
    reasons.push("connection_required");
  } else {
    reasons.push(...validateVoxyExternalPersonalConnection(connection));
    if (connection.actorId !== runtime.actorId) reasons.push("actor_connection_mismatch");
    if (connection.providerKind !== operation.providerKind) reasons.push("provider_kind_mismatch");
    if (connection.status !== "active") reasons.push(`connection_status:${connection.status}`);

    const now = parseIso(runtime.now);
    if (now === null) {
      reasons.push("runtime_now_invalid");
    } else if (connection.expiresAt !== null) {
      const expiresAt = parseIso(connection.expiresAt);
      if (expiresAt !== null && expiresAt <= now) reasons.push("connection_expired");
    }

    for (const scope of operation.requiredScopes) {
      if (!connection.capabilityScopes.includes(scope)) reasons.push(`missing_scope:${scope}`);
    }
  }

  if (!runtime.currentUserContextPresent) reasons.push("current_user_context_required");
  if (!runtime.voxyToolCapabilityAuthorized) reasons.push("voxy_tool_capability_gate_required");

  if (operation.requiresAlpha2ActionGate && !runtime.alpha2ActionGateAuthorized) {
    reasons.push("alpha2_action_gate_required");
  }
  if (operation.requiresAlpha2ExecutionFence && !runtime.alpha2ExecutionFencePresent) {
    reasons.push("alpha2_execution_fence_required");
  }
  if (operation.requiresExplicitConfirmation && !runtime.explicitConfirmationPresent) {
    reasons.push("explicit_confirmation_required");
  }

  return {
    allowed: reasons.length === 0,
    operation,
    connectionId: connection?.connectionId ?? null,
    reasonCodes: reasons,
    requiresVoxyToolCapabilityGate: true,
    requiresAlpha2ActionGate: operation.requiresAlpha2ActionGate,
    requiresAlpha2ExecutionFence: operation.requiresAlpha2ExecutionFence,
    directExecutionAllowed: false,
  };
}

export function buildVoxyExternalConnectorSafeTrace(input: {
  runtime: VoxyExternalConnectionRuntimeContext;
  decision: VoxyExternalConnectionDecision;
}): VoxyExternalConnectorSafeTrace {
  return {
    schemaVersion: VOXY_EXTERNAL_PERSONAL_CONNECTOR_SCHEMA_VERSION,
    actorId: input.runtime.actorId,
    connectionId: input.decision.connectionId,
    providerKind: input.decision.operation.providerKind,
    operationId: input.decision.operation.operationId,
    actionKind: input.decision.operation.actionKind,
    allowed: input.decision.allowed,
    reasonCodes: input.decision.reasonCodes,
    containsCredential: false,
    containsToken: false,
    containsCookie: false,
    containsRawProviderPayload: false,
  };
}
