import { describe, expect, it } from "vitest";
import type { Alpha2ExecutionFence } from "@/features/agenticRuntime/alpha2DurableOrchestrator";
import {
  VOXY_TOOL_CAPABILITIES,
  VoxyToolActionCandidateSchema,
  VoxyToolSafeResultSchema,
  buildVoxyToolSafeTrace,
  executeAuthorizedVoxyToolCapability,
  resolveVoxyToolCapabilityDecision,
  type VoxyToolActionCandidate,
} from "@/features/agenticRuntime/voxyToolCapabilityAdaptersContract";

function candidate(
  overrides: Partial<VoxyToolActionCandidate> = {},
): VoxyToolActionCandidate {
  return VoxyToolActionCandidateSchema.parse({
    candidateId: "candidate-1",
    actorId: "user-1",
    conversationId: "conversation-1",
    finalIntentRef: "message:user-final-1",
    capabilityId: "edebatte.topic_context.read",
    capabilityVersion: "1.0.0",
    mode: "execute",
    executorRoleId: "research_agent",
    confidence: "high",
    evidenceRefs: ["conversation:conversation-1", "message:user-final-1"],
    context: {
      actorPresent: true,
      organizationPresent: false,
      entitlementPresent: false,
      consentPresent: false,
      connectionPresent: false,
    },
    ...overrides,
  });
}

function fakeFence() {
  const effectIds: string[] = [];
  let assertCount = 0;
  const fence: Alpha2ExecutionFence = {
    token: "attempt-token-1",
    generation: 3,
    async assertActive() {
      assertCount += 1;
      return "run-1";
    },
    async runSideEffect<T>(input: {
      effectId: string;
      sink: (fence: {
        idempotencyKey: string;
        generation: number;
        attemptToken: string;
        assertActive: () => Promise<string>;
      }) => Promise<T> | T;
    }): Promise<T> {
      effectIds.push(input.effectId);
      return input.sink({
        idempotencyKey: `idempotent:${input.effectId}`,
        generation: 3,
        attemptToken: "attempt-token-1",
        assertActive: this.assertActive,
      });
    },
  };
  return {
    fence,
    effectIds,
    get assertCount() {
      return assertCount;
    },
  };
}

describe("Voxy tool capability adapters", () => {
  it("keeps a small static internal capability registry with canonical action kinds", () => {
    expect(VOXY_TOOL_CAPABILITIES.map((entry) => entry.capabilityId)).toEqual([
      "edebatte.topic_context.read",
      "edebatte.dossier_context.read",
      "edebatte.preference_draft.prepare",
      "edebatte.external_notification.request",
    ]);
    expect(VOXY_TOOL_CAPABILITIES.find((entry) => entry.capabilityId.endsWith("notification.request")))
      .toMatchObject({ actionKind: "notify_external", reversible: false });
  });

  it("fails closed for unknown and stale capabilities", () => {
    const unknown = resolveVoxyToolCapabilityDecision(
      candidate({ capabilityId: "invented.runtime.endpoint" }),
    );
    expect(unknown).toMatchObject({ status: "blocked", autoExecutionAllowed: false });
    expect(unknown.reasonCodes).toContain("unknown_capability");

    const stale = resolveVoxyToolCapabilityDecision(
      candidate({ capabilityVersion: "0.9.0" }),
    );
    expect(stale.status).toBe("blocked");
    expect(stale.reasonCodes).toContain("stale_or_unknown_capability_version");
  });

  it("does not allow the candidate to smuggle its own action classification", () => {
    const parsed = VoxyToolActionCandidateSchema.safeParse({
      ...candidate(),
      actionKind: "read_only",
    });
    expect(parsed.success).toBe(false);
  });

  it("fails closed on missing role permission and missing consent", () => {
    const noPermission = resolveVoxyToolCapabilityDecision(
      candidate({
        capabilityId: "edebatte.preference_draft.prepare",
        executorRoleId: "security_agent",
        context: {
          actorPresent: true,
          organizationPresent: false,
          entitlementPresent: false,
          consentPresent: true,
          connectionPresent: false,
        },
      }),
    );
    expect(noPermission.status).toBe("blocked");
    expect(noPermission.reasonCodes).toContain("missing_role_permission:write_reversible");

    const noConsent = resolveVoxyToolCapabilityDecision(
      candidate({
        capabilityId: "edebatte.preference_draft.prepare",
        executorRoleId: "product_agent",
      }),
    );
    expect(noConsent.status).toBe("blocked");
    expect(noConsent.reasonCodes).toContain("missing_consent_context");
  });

  it("allows a green read-only capability automatically through the existing Alpha2 gate", () => {
    const decision = resolveVoxyToolCapabilityDecision(candidate());
    expect(decision).toMatchObject({
      status: "authorized",
      canonicalActionKind: "read_only",
      autoExecutionAllowed: true,
    });
    expect(decision.reasonCodes).toContain("read_only_no_external_effect");
  });

  it("requires the existing explicit-policy boundary for reversible writes", () => {
    const base = candidate({
      capabilityId: "edebatte.preference_draft.prepare",
      executorRoleId: "product_agent",
      context: {
        actorPresent: true,
        organizationPresent: false,
        entitlementPresent: false,
        consentPresent: true,
        connectionPresent: false,
      },
    });

    const withoutPolicy = resolveVoxyToolCapabilityDecision(base);
    expect(withoutPolicy.status).toBe("review_required");
    expect(withoutPolicy.autoExecutionAllowed).toBe(false);
    expect(withoutPolicy.reasonCodes).toContain("missing_explicit_policy");

    const withPolicy = resolveVoxyToolCapabilityDecision({
      ...base,
      explicitPolicyRef: "policy:personal-voxy-preference-draft:v1",
    });
    expect(withPolicy).toMatchObject({
      status: "authorized",
      canonicalActionKind: "write_reversible",
      autoExecutionAllowed: true,
    });
  });

  it("keeps external notification human-only even with high confidence and consent", () => {
    const decision = resolveVoxyToolCapabilityDecision(
      candidate({
        capabilityId: "edebatte.external_notification.request",
        executorRoleId: "membership_agent",
        context: {
          actorPresent: true,
          organizationPresent: false,
          entitlementPresent: false,
          consentPresent: true,
          connectionPresent: false,
        },
        explicitPolicyRef: "policy:notification:v1",
      }),
    );
    expect(decision).toMatchObject({
      status: "human_only",
      canonicalActionKind: "notify_external",
      autoExecutionAllowed: false,
    });
    expect(decision.reasonCodes).toContain("human_sovereignty:notify_external");
  });

  it("routes reversible automatic execution through the existing Alpha2 execution fence", async () => {
    const request = candidate({
      candidateId: "candidate-write-1",
      capabilityId: "edebatte.preference_draft.prepare",
      executorRoleId: "product_agent",
      explicitPolicyRef: "policy:personal-voxy-preference-draft:v1",
      context: {
        actorPresent: true,
        organizationPresent: false,
        entitlementPresent: false,
        consentPresent: true,
        connectionPresent: false,
      },
    });
    const firstFence = fakeFence();
    let observedIdempotencyKey = "";
    const result = await executeAuthorizedVoxyToolCapability({
      candidate: request,
      fence: firstFence.fence,
      invoke: async ({ idempotencyKey }) => {
        observedIdempotencyKey = idempotencyKey ?? "";
        return { ref: "preference-draft:1" };
      },
    });

    expect(result).toEqual({ ref: "preference-draft:1" });
    expect(firstFence.effectIds).toEqual([
      "voxy-tool:edebatte.preference_draft.prepare:1.0.0:candidate-write-1",
    ]);
    expect(observedIdempotencyKey).toContain(firstFence.effectIds[0]);

    const replayFence = fakeFence();
    await executeAuthorizedVoxyToolCapability({
      candidate: request,
      fence: replayFence.fence,
      invoke: async () => ({ ref: "preference-draft:1" }),
    });
    expect(replayFence.effectIds[0]).toBe(firstFence.effectIds[0]);
  });

  it("does not enter the effect sink after cancellation", async () => {
    const request = candidate({
      capabilityId: "edebatte.preference_draft.prepare",
      executorRoleId: "product_agent",
      explicitPolicyRef: "policy:personal-voxy-preference-draft:v1",
      context: {
        actorPresent: true,
        organizationPresent: false,
        entitlementPresent: false,
        consentPresent: true,
        connectionPresent: false,
      },
    });
    const controller = new AbortController();
    controller.abort("user_cancelled");
    const executionFence = fakeFence();
    let invoked = false;

    await expect(
      executeAuthorizedVoxyToolCapability({
        candidate: request,
        fence: executionFence.fence,
        signal: controller.signal,
        invoke: async () => {
          invoked = true;
          return null;
        },
      }),
    ).rejects.toThrow("voxy_tool_execution_aborted");
    expect(invoked).toBe(false);
    expect(executionFence.effectIds).toHaveLength(0);
  });

  it("rejects generic execution for a human-only external effect", async () => {
    const request = candidate({
      capabilityId: "edebatte.external_notification.request",
      executorRoleId: "membership_agent",
      explicitPolicyRef: "policy:notification:v1",
      context: {
        actorPresent: true,
        organizationPresent: false,
        entitlementPresent: false,
        consentPresent: true,
        connectionPresent: false,
      },
    });
    const executionFence = fakeFence();
    await expect(
      executeAuthorizedVoxyToolCapability({
        candidate: request,
        fence: executionFence.fence,
        invoke: async () => "should-not-run",
      }),
    ).rejects.toThrow("voxy_tool_execution_not_authorized:human_only");
    expect(executionFence.effectIds).toHaveLength(0);
  });

  it("keeps safe results reference-only and rejects truth, publish or secret escalation fields", () => {
    const safe = {
      resultId: "tool-result-1",
      capabilityId: "edebatte.topic_context.read",
      capabilityVersion: "1.0.0",
      status: "completed",
      safeSummary: "Kanonischer Themenkontext wurde gelesen.",
      artifactRefs: [{ id: "topic:123", ownerRef: "canonical-topic-domain" }],
      evidenceRefs: ["topic:123:revision:4"],
    } as const;
    expect(VoxyToolSafeResultSchema.safeParse(safe).success).toBe(true);
    expect(
      VoxyToolSafeResultSchema.safeParse({ ...safe, truthStatus: "verified" }).success,
    ).toBe(false);
    expect(
      VoxyToolSafeResultSchema.safeParse({ ...safe, publishState: "published" }).success,
    ).toBe(false);
    expect(VoxyToolSafeResultSchema.safeParse({ ...safe, accessToken: "secret" }).success).toBe(
      false,
    );
  });

  it("builds a user-safe trace from references rather than raw intent content", () => {
    const request = candidate();
    const decision = resolveVoxyToolCapabilityDecision(request);
    const trace = buildVoxyToolSafeTrace({ candidate: request, decision });
    expect(trace.roleId).toBe("personal_voxy");
    expect(trace.evidenceRefs).toEqual(request.evidenceRefs);
    expect(JSON.stringify(trace)).not.toContain("accessToken");
    expect(JSON.stringify(trace)).not.toContain("rawPrompt");
    expect(trace.publishState).toBe("publish_blocked");
  });
});
