import { describe, expect, it } from "vitest";
import {
  Alpha2RunRecordSchema,
  alpha2ReviewCompletionGateRef,
  alpha2ReviewResumeGateRef,
  appendAlpha2Checkpoint,
  assertAlpha2RunEvolution,
  createAlpha2RunRecord,
  isAlpha2RunTransitionAllowed,
  linkAlpha2ChildRun,
  transitionAlpha2Run,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";
import {
  Alpha2ActionGateInputSchema,
  isAlpha2AutomaticActionAllowed,
  resolveAlpha2ActionGate,
} from "@/features/agenticRuntime/alpha2RiskGateContract";
import { assertAlpha2LedgerIdentity } from "@/features/agenticRuntime/alpha2RunLedgerContract";

const NOW = "2026-08-23T21:00:00.000Z";
const EVIDENCE = ["task:ALPHA2-RUN-CONTRACT-01"];

describe("Alpha-Foxtrott 2 control-plane contracts", () => {
  it("creates a provider-agnostic queued root run with bounded budget", () => {
    const run = createAlpha2RunRecord({
      runId: "run-root",
      idempotencyKey: "ALPHA2-RUN-CONTRACT-01:run-root",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      supportingRoles: ["research_source", "governance_compliance"],
      riskClass: "yellow",
      route: {
        mode: "automatic",
        capabilityClass: "engineering_contract",
        fallbackAllowed: true,
      },
      budget: {
        maxAttempts: 3,
        maxModelCalls: 6,
        maxWallClockMs: 15 * 60 * 1000,
        maxEstimatedCostEur: 5,
      },
      now: NOW,
    });

    expect(run).toMatchObject({
      schemaVersion: "alpha2.run.v1",
      runId: "run-root",
      rootRunId: "run-root",
      parentRunId: null,
      status: "queued",
      attempt: 0,
      humanGate: { state: "not_required" },
      route: { mode: "automatic", capabilityClass: "engineering_contract" },
    });
    expect(run.supportingRoles).toEqual(["research_source"]);
  });

  it("allows bounded resume transitions without consuming a retry attempt but keeps terminal runs terminal", () => {
    const queued = createAlpha2RunRecord({
      runId: "run-transition",
      idempotencyKey: "transition-key",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "engineering_contract" },
      now: NOW,
    });
    const running = transitionAlpha2Run(queued, "running", { now: "2026-08-23T21:01:00.000Z" });
    const waiting = transitionAlpha2Run(running, "waiting", { now: "2026-08-23T21:02:00.000Z" });
    const resumed = transitionAlpha2Run(waiting, "running", { now: "2026-08-23T21:03:00.000Z" });
    const completed = transitionAlpha2Run(resumed, "completed", { now: "2026-08-23T21:04:00.000Z" });

    expect(resumed.attempt).toBe(1);
    expect(completed.finishedAt).toBe("2026-08-23T21:04:00.000Z");
    expect(isAlpha2RunTransitionAllowed("completed", "running")).toBe(false);
    expect(() => transitionAlpha2Run(completed, "running")).toThrow(
      "alpha2_invalid_run_transition:completed->running",
    );
  });

  it("requires explicit approval before leaving a pending human gate", () => {
    const queued = createAlpha2RunRecord({
      runId: "run-gated",
      idempotencyKey: "gated-key",
      taskId: "ALPHA2-RISK-GATE-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "orange",
      route: { mode: "automatic", capabilityClass: "governance" },
      now: NOW,
    });
    expect(() => transitionAlpha2Run(queued, "human_gate")).toThrow(
      "alpha2_human_gate_status_requires_pending_gate",
    );
    const gated = transitionAlpha2Run(queued, "human_gate", {
      now: "2026-08-23T21:01:00.000Z",
      humanGate: { state: "pending", reason: "Architecture decision requires human approval" },
    });
    expect(() => transitionAlpha2Run(gated, "running")).toThrow(
      "alpha2_human_gate_exit_requires_approval",
    );
    expect(() =>
      transitionAlpha2Run(gated, "running", {
        humanGate: { state: "rejected", decisionRef: "decision:rejected" },
      }),
    ).toThrow("alpha2_human_gate_exit_requires_approval");
    const approved = transitionAlpha2Run(gated, "running", {
      now: "2026-08-23T21:02:00.000Z",
      humanGate: { state: "approved", decisionRef: "decision:approved" },
    });
    expect(approved).toMatchObject({
      status: "running",
      humanGate: { state: "approved", decisionRef: "decision:approved" },
    });
    expect(() => assertAlpha2RunEvolution(gated, approved)).not.toThrow();
    const bypass = Alpha2RunRecordSchema.parse({
      ...gated,
      status: "queued",
      humanGate: { state: "not_required" },
    });
    expect(() => assertAlpha2RunEvolution(gated, bypass)).toThrow(
      "alpha2_invalid_run_transition:human_gate->queued",
    );
    const decisionBypass = Alpha2RunRecordSchema.parse({
      ...gated,
      status: "failed",
      humanGate: { state: "not_required" },
      lastErrorCode: "alpha2_direct_cas_bypass",
    });
    expect(() => assertAlpha2RunEvolution(gated, decisionBypass)).toThrow(
      "alpha2_human_gate_exit_requires_decision",
    );
  });

  it("accepts only an audited human decision when review resumes running", () => {
    const queued = createAlpha2RunRecord({
      runId: "run-reviewed",
      idempotencyKey: "reviewed-key",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "engineering_contract" },
      now: NOW,
    });
    const reviewed = transitionAlpha2Run(queued, "review", {
      now: "2026-08-23T21:01:00.000Z",
    });
    expect(() =>
      transitionAlpha2Run(reviewed, "running", {
        now: "2026-08-23T21:02:00.000Z",
        humanGate: { state: "approved", decisionRef: "decision:review-approved" },
      }),
    ).toThrow("alpha2_review_exit_requires_audited_approval");

    const unauditedBypass = Alpha2RunRecordSchema.parse({
      ...reviewed,
      status: "running",
      humanGate: {
        state: "approved",
        resumeMode: "start_new_attempt",
        decisionRef: "decision:review-approved",
      },
    });
    expect(() => assertAlpha2RunEvolution(reviewed, unauditedBypass)).toThrow(
      "alpha2_review_exit_requires_audited_approval",
    );

    const approved = transitionAlpha2Run(reviewed, "running", {
      now: "2026-08-23T21:02:00.000Z",
      humanGate: {
        state: "approved",
        gateRef: alpha2ReviewResumeGateRef(reviewed),
        resumeMode: "start_new_attempt",
        decisionRef: "decision:review-approved",
        decidedAt: "2026-08-23T21:02:00.000Z",
      },
    });
    expect(() => assertAlpha2RunEvolution(reviewed, approved)).not.toThrow();

    const completionApproval = {
      state: "approved" as const,
      gateRef: alpha2ReviewCompletionGateRef(reviewed),
      decisionRef: "decision:review-completed-only",
      decidedAt: "2026-08-23T21:02:00.000Z",
    };
    expect(() =>
      transitionAlpha2Run(reviewed, "running", {
        now: "2026-08-23T21:02:00.000Z",
        humanGate: completionApproval,
      }),
    ).toThrow("alpha2_review_resume_requires_bound_approval");

    const directPurposeBypass = Alpha2RunRecordSchema.parse({
      ...reviewed,
      status: "running",
      startedAt: "2026-08-23T21:02:00.000Z",
      humanGate: {
        ...completionApproval,
        resumeMode: "start_new_attempt",
      },
    });
    expect(() => assertAlpha2RunEvolution(reviewed, directPurposeBypass)).toThrow(
      "alpha2_review_exit_requires_audited_approval",
    );
  });

  it("requires a current completion-bound human decision before review completes", () => {
    const queued = createAlpha2RunRecord({
      runId: "run-reviewed-completion",
      idempotencyKey: "reviewed-completion-key",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "engineering_contract" },
      now: NOW,
    });
    const reviewed = transitionAlpha2Run(queued, "review", {
      now: "2026-08-23T21:01:00.000Z",
    });

    expect(() =>
      transitionAlpha2Run(reviewed, "completed", {
        now: "2026-08-23T21:02:00.000Z",
      }),
    ).toThrow("alpha2_review_exit_requires_approval");
    expect(() =>
      transitionAlpha2Run(reviewed, "completed", {
        now: "2026-08-23T21:02:00.000Z",
        humanGate: {
          state: "approved",
          gateRef: "gate:enter-review",
          reason: "approve entering review",
          decisionRef: "decision:enter-review",
          decidedAt: "2026-08-23T21:02:00.000Z",
        },
      }),
    ).toThrow("alpha2_review_completion_requires_bound_approval");
    expect(() =>
      transitionAlpha2Run(reviewed, "completed", {
        now: "2026-08-23T21:02:00.000Z",
        humanGate: {
          state: "approved",
          decisionRef: "decision:review-completed",
        },
      }),
    ).toThrow("alpha2_review_exit_requires_audited_approval");
    expect(() =>
      transitionAlpha2Run(reviewed, "completed", {
        now: "2026-08-23T21:02:00.000Z",
        humanGate: {
          state: "approved",
          gateRef: alpha2ReviewCompletionGateRef(reviewed),
          decisionRef: "decision:stale-review-completion",
          decidedAt: "2026-08-23T21:00:59.000Z",
        },
      }),
    ).toThrow("alpha2_review_completion_requires_bound_approval");

    const directBypass = Alpha2RunRecordSchema.parse({
      ...reviewed,
      status: "completed",
      finishedAt: "2026-08-23T21:02:00.000Z",
    });
    expect(() => assertAlpha2RunEvolution(reviewed, directBypass)).toThrow(
      "alpha2_review_exit_requires_audited_approval",
    );

    const approved = transitionAlpha2Run(reviewed, "completed", {
      now: "2026-08-23T21:02:00.000Z",
      humanGate: {
        state: "approved",
        gateRef: alpha2ReviewCompletionGateRef(reviewed),
        decisionRef: "decision:review-completed",
        decidedAt: "2026-08-23T21:02:00.000Z",
      },
    });
    expect(() => assertAlpha2RunEvolution(reviewed, approved)).not.toThrow();
    expect(approved).toMatchObject({
      status: "completed",
      humanGate: {
        state: "approved",
        gateRef: alpha2ReviewCompletionGateRef(reviewed),
        decisionRef: "decision:review-completed",
        decidedAt: "2026-08-23T21:02:00.000Z",
      },
    });
  });

  it("does not reuse approval that predates entry into the current review", () => {
    const queued = createAlpha2RunRecord({
      runId: "run-old-review-approval",
      idempotencyKey: "old-review-approval-key",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "engineering_contract" },
      now: NOW,
    });
    const gated = transitionAlpha2Run(queued, "human_gate", {
      now: "2026-08-23T21:00:30.000Z",
      humanGate: {
        state: "pending",
        reason: "approve prior review completion",
        gateRef:
          "alpha2:review-completion:run-old-review-approval:2026-08-23T21:00:00.000Z",
      },
    });
    const reviewed = transitionAlpha2Run(gated, "review", {
      now: "2026-08-23T21:01:00.000Z",
      humanGate: {
        state: "approved",
        reason: "approve prior review completion",
        gateRef:
          "alpha2:review-completion:run-old-review-approval:2026-08-23T21:00:00.000Z",
        resumeMode: "start_new_attempt",
        decisionRef: "decision:prior-review-completion",
        decidedAt: "2026-08-23T21:00:45.000Z",
      },
    });

    expect(() =>
      transitionAlpha2Run(reviewed, "completed", {
        now: "2026-08-23T21:02:00.000Z",
      }),
    ).toThrow("alpha2_review_completion_requires_bound_approval");

    expect(() => transitionAlpha2Run(reviewed, "running")).toThrow(
      "alpha2_review_resume_requires_bound_approval",
    );

    const resumed = transitionAlpha2Run(reviewed, "running", {
      now: "2026-08-23T21:02:00.000Z",
      humanGate: {
        state: "approved",
        gateRef: alpha2ReviewResumeGateRef(reviewed),
        resumeMode: "start_new_attempt",
        decisionRef: "decision:current-review-resume",
        decidedAt: "2026-08-23T21:02:00.000Z",
      },
    });
    expect(resumed.humanGateHistory).toContainEqual(reviewed.humanGate);
    expect(() => assertAlpha2RunEvolution(reviewed, resumed)).not.toThrow();
  });

  it("prevents a rejected human gate from resuming through an indirect retry path", () => {
    const queued = createAlpha2RunRecord({
      runId: "run-rejected-retry",
      idempotencyKey: "rejected-retry-key",
      taskId: "ALPHA2-RISK-GATE-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "orange",
      route: { mode: "automatic", capabilityClass: "governance" },
      now: NOW,
    });
    const gated = transitionAlpha2Run(queued, "human_gate", {
      humanGate: { state: "pending", reason: "Human decision required" },
    });
    const rejectedFailure = transitionAlpha2Run(gated, "failed", {
      humanGate: { state: "rejected", decisionRef: "decision:rejected" },
      errorCode: "human_gate_rejected",
    });
    const retryQueued = transitionAlpha2Run(rejectedFailure, "queued");
    expect(retryQueued.humanGate.state).toBe("rejected");
    expect(() => transitionAlpha2Run(retryQueued, "running")).toThrow(
      "alpha2_execution_blocked_by_human_gate_decision",
    );
  });

  it("keeps checkpoints idempotent and preserves canonical safe-trace identities", () => {
    const parent = createAlpha2RunRecord({
      runId: "mission-1",
      idempotencyKey: "mission-1",
      taskId: "ALPHA2-ORCHESTRATOR-LOOP-01",
      kind: "mission",
      primaryRole: "governance_compliance",
      riskClass: "yellow",
      route: { mode: "automatic", capabilityClass: "orchestration" },
      now: NOW,
    });
    const child = createAlpha2RunRecord({
      runId: "slice-1",
      parentRunId: "mission-1",
      rootRunId: "mission-1",
      idempotencyKey: "mission-1:slice-1",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "engineering_contract" },
      now: NOW,
    });
    const linked = linkAlpha2ChildRun(parent, child);
    const checkpointed = appendAlpha2Checkpoint(linked, {
      checkpointId: "cp-1",
      createdAt: "2026-08-23T21:05:00.000Z",
      cursor: "contract_written",
      evidenceRefs: ["commit:example"],
      safeTraceStepRefs: [{ stepId: "alpha2:contract-write", roleId: "governance_compliance" }],
      artifactRefs: [
        {
          id: "alpha2:contract-write:output",
          type: "review_handoff",
          label: "Alpha2 contract review handoff",
          reviewState: "review_required",
        },
      ],
    });
    const duplicate = appendAlpha2Checkpoint(checkpointed, {
      checkpointId: "cp-1",
      createdAt: "2026-08-23T21:06:00.000Z",
      cursor: "contract_written",
      evidenceRefs: ["commit:example"],
      safeTraceStepRefs: [{ stepId: "alpha2:contract-write", roleId: "governance_compliance" }],
      artifactRefs: [
        {
          id: "alpha2:contract-write:output",
          type: "review_handoff",
          label: "Alpha2 contract review handoff",
          reviewState: "review_required",
        },
      ],
    });
    expect(linked.childRunIds).toEqual(["slice-1"]);
    expect(checkpointed.checkpoints).toHaveLength(1);
    expect(checkpointed.checkpoints[0]?.artifactRefs[0]).toMatchObject({
      id: "alpha2:contract-write:output",
      type: "review_handoff",
      reviewState: "review_required",
    });
    expect(duplicate.checkpoints).toHaveLength(1);
    expect(() =>
      appendAlpha2Checkpoint(checkpointed, {
        checkpointId: "cp-1",
        createdAt: "2026-08-23T21:06:00.000Z",
        cursor: "different_outcome",
        evidenceRefs: [],
        safeTraceStepRefs: [],
        artifactRefs: [],
      }),
    ).toThrow("alpha2_checkpoint_id_conflict");
  });

  it("requires the canonical root ID for every non-root child", () => {
    expect(() =>
      createAlpha2RunRecord({
        runId: "grandchild-1",
        parentRunId: "slice-1",
        idempotencyKey: "mission-1:slice-1:grandchild-1",
        taskId: "ALPHA2-RUN-CONTRACT-01",
        kind: "diagnostic",
        primaryRole: "governance_compliance",
        riskClass: "green",
        route: { mode: "automatic", capabilityClass: "diagnostic" },
        now: NOW,
      }),
    ).toThrow("alpha2_child_run_requires_root_run_id");
    const grandchild = createAlpha2RunRecord({
      runId: "grandchild-1",
      parentRunId: "slice-1",
      rootRunId: "mission-1",
      idempotencyKey: "mission-1:slice-1:grandchild-1",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "diagnostic",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "diagnostic" },
      now: NOW,
    });
    expect(grandchild.rootRunId).toBe("mission-1");
  });

  it("rejects changes to immutable ledger identity", () => {
    const run = createAlpha2RunRecord({
      runId: "immutable-run",
      idempotencyKey: "immutable-idempotency-key",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "engineering_contract" },
      now: NOW,
    });

    expect(() =>
      assertAlpha2LedgerIdentity(run, {
        ...run,
        idempotencyKey: "changed-idempotency-key",
      }),
    ).toThrow("alpha2_ledger_idempotency_key_mismatch");
    expect(() =>
      assertAlpha2LedgerIdentity(run, {
        ...run,
        taskId: "ALPHA2-PERSISTENT-RUN-LEDGER-01",
      }),
    ).toThrow("alpha2_ledger_idempotency_conflict");

    const child = createAlpha2RunRecord({
      runId: "immutable-child",
      parentRunId: "immutable-parent",
      rootRunId: "immutable-root",
      idempotencyKey: "immutable-lineage-key",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "engineering_contract" },
      now: NOW,
    });
    expect(() =>
      assertAlpha2LedgerIdentity(child, {
        ...child,
        rootRunId: "different-root",
      }),
    ).toThrow("alpha2_ledger_lineage_conflict");
    expect(() =>
      assertAlpha2LedgerIdentity(child, {
        ...child,
        parentRunId: "different-parent",
      }),
    ).toThrow("alpha2_ledger_lineage_conflict");
    expect(() => assertAlpha2LedgerIdentity(child, { ...child })).not.toThrow();
  });

  it("never auto-executes human-sovereignty actions and retains evidence", () => {
    const actionKinds = [
      "notify_external",
      "merge_code",
      "deploy",
      "spend_money",
      "enter_contract",
      "change_rights_or_entitlements",
      "destructive_infrastructure",
      "security_or_secret",
    ] as const;
    for (const actionKind of actionKinds) {
      expect(
        resolveAlpha2ActionGate({
          actionKind,
          riskClass: "green",
          confidence: "high",
          reversible: true,
          explicitPolicyRef: "policy:test",
          evidenceRefs: EVIDENCE,
        }),
      ).toMatchObject({ decision: "human_only", autoExecutionAllowed: false, evidenceRefs: EVIDENCE });
    }
  });

  it("keeps external publication and public political claims review-gated", () => {
    for (const actionKind of ["publish_external", "public_political_claim"] as const) {
      expect(
        resolveAlpha2ActionGate({
          actionKind,
          riskClass: "green",
          confidence: "high",
          reversible: true,
          explicitPolicyRef: "policy:test",
          evidenceRefs: EVIDENCE,
        }),
      ).toMatchObject({ decision: "review_required", autoExecutionAllowed: false, evidenceRefs: EVIDENCE });
    }
  });

  it("requires evidence for every gate decision", () => {
    const result = Alpha2ActionGateInputSchema.safeParse({
      actionKind: "read_only",
      riskClass: "green",
      confidence: "high",
      reversible: true,
    });
    expect(result.success).toBe(false);
  });

  it("permits only low-risk reversible writes with explicit policy and evidence to auto-run", () => {
    expect(
      isAlpha2AutomaticActionAllowed({
        actionKind: "write_reversible",
        riskClass: "green",
        confidence: "high",
        reversible: true,
        explicitPolicyRef: "policy:alpha2-low-risk-write-v1",
        evidenceRefs: EVIDENCE,
      }),
    ).toBe(true);
    expect(
      isAlpha2AutomaticActionAllowed({
        actionKind: "write_reversible",
        riskClass: "green",
        confidence: "high",
        reversible: true,
        evidenceRefs: EVIDENCE,
      }),
    ).toBe(false);
  });

  it("enforces immutable audit-history prefixes while accepting valid appends", () => {
    const created = createAlpha2RunRecord({
      runId: "run-audit-prefix",
      idempotencyKey: "audit-prefix-key",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "engineering_contract" },
      now: NOW,
    });
    const existing = Alpha2RunRecordSchema.parse({
      ...created,
      checkpoints: [
        {
          checkpointId: "cp-audit-1",
          createdAt: "2026-08-23T21:01:00.000Z",
          status: "queued",
          cursor: "first",
        },
        {
          checkpointId: "cp-audit-2",
          createdAt: "2026-08-23T21:02:00.000Z",
          status: "queued",
          cursor: "second",
        },
      ],
      evidenceRefs: ["evidence:first", "evidence:second"],
      safeTraceStepRefs: [
        { stepId: "trace:first", roleId: "governance_compliance" },
      ],
      artifactRefs: [
        {
          id: "artifact:first",
          type: "review_handoff",
          label: "First audit artifact",
          reviewState: "present",
        },
      ],
    });

    expect(() =>
      assertAlpha2RunEvolution(
        existing,
        Alpha2RunRecordSchema.parse({
          ...existing,
          checkpoints: existing.checkpoints.slice(1),
        }),
      ),
    ).toThrow("alpha2_checkpoint_history_conflict");
    expect(() =>
      assertAlpha2RunEvolution(
        existing,
        Alpha2RunRecordSchema.parse({
          ...existing,
          checkpoints: [
            { ...existing.checkpoints[0], cursor: "rewritten" },
            existing.checkpoints[1],
          ],
        }),
      ),
    ).toThrow("alpha2_checkpoint_history_conflict");
    expect(() =>
      assertAlpha2RunEvolution(
        existing,
        Alpha2RunRecordSchema.parse({
          ...existing,
          checkpoints: [...existing.checkpoints].reverse(),
        }),
      ),
    ).toThrow("alpha2_checkpoint_history_conflict");
    expect(() =>
      assertAlpha2RunEvolution(
        existing,
        Alpha2RunRecordSchema.parse({
          ...existing,
          evidenceRefs: existing.evidenceRefs.slice(1),
        }),
      ),
    ).toThrow("alpha2_evidence_history_conflict");
    expect(() =>
      assertAlpha2RunEvolution(
        existing,
        Alpha2RunRecordSchema.parse({
          ...existing,
          safeTraceStepRefs: [{ stepId: "trace:rewritten", roleId: "research_source" }],
        }),
      ),
    ).toThrow("alpha2_safe_trace_history_conflict");
    expect(() =>
      assertAlpha2RunEvolution(
        existing,
        Alpha2RunRecordSchema.parse({
          ...existing,
          artifactRefs: [{ ...existing.artifactRefs[0], label: "Rewritten artifact" }],
        }),
      ),
    ).toThrow("alpha2_artifact_history_conflict");

    const appended = Alpha2RunRecordSchema.parse({
      ...existing,
      checkpoints: [
        ...existing.checkpoints,
        {
          checkpointId: "cp-audit-3",
          createdAt: "2026-08-23T21:03:00.000Z",
          status: "queued",
          cursor: "third",
        },
      ],
      evidenceRefs: [...existing.evidenceRefs, "evidence:third"],
      safeTraceStepRefs: [
        ...existing.safeTraceStepRefs,
        { stepId: "trace:second", roleId: "governance_compliance" },
      ],
      artifactRefs: [
        ...existing.artifactRefs,
        {
          id: "artifact:second",
          type: "review_handoff",
          label: "Second audit artifact",
          reviewState: "review_required",
        },
      ],
    });
    expect(() => assertAlpha2RunEvolution(existing, appended)).not.toThrow();
  });
});
