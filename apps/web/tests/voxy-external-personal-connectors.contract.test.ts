import { describe, expect, it } from "vitest";
import {
  VOXY_EXTERNAL_ADAPTER_OPERATIONS,
  VOXY_EXTERNAL_CONNECTOR_GUARDRAILS,
  VOXY_EXTERNAL_PERSONAL_CONNECTOR_SCHEMA_VERSION,
  buildVoxyExternalConnectorSafeTrace,
  resolveVoxyExternalConnectionDecision,
  validateVoxyExternalPersonalConnection,
  type VoxyExternalPersonalConnection,
} from "@/features/agenticRuntime/voxyExternalPersonalConnectorsContract";

function connection(
  overrides: Partial<VoxyExternalPersonalConnection> = {},
): VoxyExternalPersonalConnection {
  return {
    schemaVersion: VOXY_EXTERNAL_PERSONAL_CONNECTOR_SCHEMA_VERSION,
    connectionId: "connection:calendar:actor-1",
    actorId: "actor-1",
    providerKind: "calendar",
    capabilityScopes: ["calendar.read"],
    status: "active",
    credentialRef: "secret-ref:personal-connections/calendar/actor-1",
    visibleScopeSummary: ["Kalender lesen"],
    createdAt: "2026-09-26T08:00:00.000Z",
    updatedAt: "2026-09-26T08:00:00.000Z",
    expiresAt: "2026-10-26T08:00:00.000Z",
    lastVerifiedAt: "2026-09-26T08:00:00.000Z",
    revokeHandoffRef: "personal-connections/revoke/calendar",
    reauthorizeHandoffRef: "personal-connections/reauthorize/calendar",
    guardrails: VOXY_EXTERNAL_CONNECTOR_GUARDRAILS,
    ...overrides,
  };
}

function runtime(
  currentConnection: VoxyExternalPersonalConnection | null,
  requestedOperationId:
    | "calendar.availability.read"
    | "calendar.event.create"
    | "mail.message.send"
    | "browser.purchase.submit" = "calendar.availability.read",
) {
  return {
    actorId: "actor-1",
    now: "2026-09-26T09:00:00.000Z",
    currentConnection,
    requestedOperationId,
    currentUserContextPresent: true,
    voxyToolCapabilityAuthorized: true,
    alpha2ActionGateAuthorized: false,
    alpha2ExecutionFencePresent: false,
    explicitConfirmationPresent: false,
  } as const;
}

describe("Voxy external personal connectors contract", () => {
  it("keeps this slice provider-neutral and outside secret/tool-bus ownership", () => {
    expect(VOXY_EXTERNAL_CONNECTOR_GUARDRAILS).toEqual({
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
    });

    for (const operation of VOXY_EXTERNAL_ADAPTER_OPERATIONS) {
      expect(operation.requiresVoxyToolCapabilityGate).toBe(true);
      expect(operation.directExecutionAllowed).toBe(false);
      if (!operation.readOnly) {
        expect(operation.requiresAlpha2ActionGate).toBe(true);
        expect(operation.requiresAlpha2ExecutionFence).toBe(true);
        expect(operation.requiresExplicitConfirmation).toBe(true);
      }
    }
  });

  it("accepts opaque credential references but rejects token-like material", () => {
    expect(validateVoxyExternalPersonalConnection(connection())).toEqual([]);

    expect(
      validateVoxyExternalPersonalConnection(
        connection({ credentialRef: "access_token=top-secret-value" }),
      ),
    ).toEqual(
      expect.arrayContaining([
        "credential_ref_not_opaque",
        "credential_ref_contains_secret_material",
      ]),
    );

    expect(
      validateVoxyExternalPersonalConnection(
        connection({ visibleScopeSummary: ["Authorization: Bearer secret"] }),
      ),
    ).toContain("visible_scope_summary_contains_secret_material");
  });

  it("fails closed when the connection is missing, revoked, expired, stale or belongs to another actor", () => {
    expect(resolveVoxyExternalConnectionDecision(runtime(null)).allowed).toBe(false);
    expect(resolveVoxyExternalConnectionDecision(runtime(null)).reasonCodes).toContain(
      "connection_required",
    );

    const revoked = resolveVoxyExternalConnectionDecision(
      runtime(connection({ status: "revoked" })),
    );
    expect(revoked.allowed).toBe(false);
    expect(revoked.reasonCodes).toContain("connection_status:revoked");

    const expired = resolveVoxyExternalConnectionDecision(
      runtime(connection({ expiresAt: "2026-09-26T08:30:00.000Z" })),
    );
    expect(expired.allowed).toBe(false);
    expect(expired.reasonCodes).toContain("connection_expired");

    const foreignActor = resolveVoxyExternalConnectionDecision(
      runtime(connection({ actorId: "actor-2" })),
    );
    expect(foreignActor.allowed).toBe(false);
    expect(foreignActor.reasonCodes).toContain("actor_connection_mismatch");
  });

  it("allows read-only access only for the declared provider scope and current user context", () => {
    const allowed = resolveVoxyExternalConnectionDecision(runtime(connection()));
    expect(allowed.allowed).toBe(true);
    expect(allowed.operation.actionKind).toBe("read_only");
    expect(allowed.requiresAlpha2ActionGate).toBe(false);
    expect(allowed.requiresAlpha2ExecutionFence).toBe(false);

    const missingScope = resolveVoxyExternalConnectionDecision(
      runtime(connection({ capabilityScopes: ["calendar.write"] })),
    );
    expect(missingScope.allowed).toBe(false);
    expect(missingScope.reasonCodes).toContain("missing_scope:calendar.read");

    const noUserContext = resolveVoxyExternalConnectionDecision({
      ...runtime(connection()),
      currentUserContextPresent: false,
    });
    expect(noUserContext.allowed).toBe(false);
    expect(noUserContext.reasonCodes).toContain("current_user_context_required");
  });

  it("requires the existing action gate, execution fence and explicit confirmation for reversible writes", () => {
    const calendarWrite = connection({ capabilityScopes: ["calendar.write"] });
    const blocked = resolveVoxyExternalConnectionDecision(
      runtime(calendarWrite, "calendar.event.create"),
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.reasonCodes).toEqual(
      expect.arrayContaining([
        "alpha2_action_gate_required",
        "alpha2_execution_fence_required",
        "explicit_confirmation_required",
      ]),
    );

    const allowed = resolveVoxyExternalConnectionDecision({
      ...runtime(calendarWrite, "calendar.event.create"),
      alpha2ActionGateAuthorized: true,
      alpha2ExecutionFencePresent: true,
      explicitConfirmationPresent: true,
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.operation.actionKind).toBe("write_reversible");
    expect(allowed.operation.reversible).toBe(true);
    expect(allowed.directExecutionAllowed).toBe(false);
  });

  it("never downgrades external or irreversible effects", () => {
    const mail = connection({
      connectionId: "connection:mail:actor-1",
      providerKind: "mail",
      capabilityScopes: ["mail.send"],
    });
    const mailDecision = resolveVoxyExternalConnectionDecision({
      ...runtime(mail, "mail.message.send"),
      alpha2ActionGateAuthorized: true,
      alpha2ExecutionFencePresent: true,
      explicitConfirmationPresent: true,
    });
    expect(mailDecision.allowed).toBe(true);
    expect(mailDecision.operation.actionKind).toBe("notify_external");
    expect(mailDecision.operation.readOnly).toBe(false);
    expect(mailDecision.operation.directExecutionAllowed).toBe(false);

    const browser = connection({
      connectionId: "connection:browser:actor-1",
      providerKind: "browser",
      capabilityScopes: ["browser.purchase"],
    });
    const purchase = resolveVoxyExternalConnectionDecision({
      ...runtime(browser, "browser.purchase.submit"),
      alpha2ActionGateAuthorized: true,
      alpha2ExecutionFencePresent: true,
      explicitConfirmationPresent: true,
    });
    expect(purchase.allowed).toBe(true);
    expect(purchase.operation.actionKind).toBe("spend_money");
    expect(purchase.operation.directExecutionAllowed).toBe(false);
  });

  it("re-checks revocation at execution decision time", () => {
    const active = connection();
    expect(resolveVoxyExternalConnectionDecision(runtime(active)).allowed).toBe(true);

    const revoked = { ...active, status: "revoked" as const, updatedAt: "2026-09-26T08:59:00.000Z" };
    expect(resolveVoxyExternalConnectionDecision(runtime(revoked)).allowed).toBe(false);
  });

  it("emits only safe trace metadata and no credential or raw provider payload", () => {
    const currentConnection = connection();
    const decision = resolveVoxyExternalConnectionDecision(runtime(currentConnection));
    const trace = buildVoxyExternalConnectorSafeTrace({
      runtime: runtime(currentConnection),
      decision,
    });

    expect(trace).toMatchObject({
      connectionId: currentConnection.connectionId,
      providerKind: "calendar",
      operationId: "calendar.availability.read",
      allowed: true,
      containsCredential: false,
      containsToken: false,
      containsCookie: false,
      containsRawProviderPayload: false,
    });
    expect(JSON.stringify(trace)).not.toContain(currentConnection.credentialRef);
  });
});
