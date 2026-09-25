import { describe, expect, it } from "vitest";
import {
  consumeAlpha2HumanResumeApproval,
  createAlpha2RunRecord,
  transitionAlpha2Run,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";

const NOW = "2026-08-26T05:30:00.000Z";

function createQueuedRun() {
  return createAlpha2RunRecord({
    runId: "run-gate-immutability",
    idempotencyKey: "run-gate-immutability",
    taskId: "ALPHA2-RUN-CONTRACT-01",
    kind: "engineering_slice",
    primaryRole: "governance_compliance",
    riskClass: "orange",
    route: { mode: "automatic", capabilityClass: "governance" },
    now: NOW,
  });
}

describe("Alpha-Foxtrott 2 human-gate immutability", () => {
  it("requires an auditable decision when leaving a pending human gate", () => {
    const gated = transitionAlpha2Run(createQueuedRun(), "human_gate", {
      humanGate: { state: "pending", reason: "Human decision required" },
    });
    expect(() =>
      transitionAlpha2Run(gated, "failed", {
        humanGate: { state: "not_required" },
        errorCode: "attempted_gate_clear",
      }),
    ).toThrow("alpha2_human_gate_exit_requires_decision");
  });

  it("prevents rejected decisions from being overwritten on retry", () => {
    const gated = transitionAlpha2Run(createQueuedRun(), "human_gate", {
      humanGate: { state: "pending", reason: "Human decision required" },
    });
    const rejectedFailure = transitionAlpha2Run(gated, "failed", {
      humanGate: { state: "rejected", decisionRef: "decision:rejected" },
      errorCode: "human_gate_rejected",
    });
    const retryQueued = transitionAlpha2Run(rejectedFailure, "queued");

    expect(() =>
      transitionAlpha2Run(retryQueued, "running", {
        humanGate: { state: "not_required" },
      }),
    ).toThrow("alpha2_human_gate_decision_is_immutable");

    expect(() =>
      transitionAlpha2Run(retryQueued, "running", {
        humanGate: { state: "approved", decisionRef: "decision:fabricated-override" },
      }),
    ).toThrow("alpha2_human_gate_decision_is_immutable");
  });

  it("requires an approval to reference the exact pending runtime gate", () => {
    const gated = transitionAlpha2Run(createQueuedRun(), "human_gate", {
      humanGate: {
        state: "pending",
        reason: "Human decision required",
        gateRef: "alpha2_gate_expected",
      },
    });

    expect(() =>
      transitionAlpha2Run(gated, "running", {
        humanGate: {
          state: "approved",
          gateRef: "alpha2_gate_other",
          decisionRef: "decision:wrong-gate",
        },
      }),
    ).toThrow("alpha2_human_gate_approval_ref_mismatch");
  });

  it("derives an initial gate resume mode from durable state and rejects caller overrides", () => {
    const gated = transitionAlpha2Run(createQueuedRun(), "human_gate", {
      humanGate: { state: "pending", reason: "Human decision required" },
    });

    expect(gated.attempt).toBe(0);
    expect(gated.humanGate.resumeMode).toBe("start_new_attempt");

    expect(() =>
      transitionAlpha2Run(gated, "running", {
        humanGate: {
          state: "approved",
          decisionRef: "decision:spoofed-resume-mode",
          resumeMode: "resume_attempt",
        },
      }),
    ).toThrow("alpha2_human_gate_resume_mode_mismatch");

    const approved = transitionAlpha2Run(gated, "running", {
      humanGate: {
        state: "approved",
        decisionRef: "decision:approved",
      },
    });

    expect(approved.humanGate.resumeMode).toBe("start_new_attempt");
    const consumed = consumeAlpha2HumanResumeApproval(approved);
    expect(consumed.attempt).toBe(1);
    expect(consumed.preExecutorResumeMode).toBe("start_new_attempt");
  });
});
