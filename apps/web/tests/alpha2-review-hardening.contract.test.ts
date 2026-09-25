import { describe, expect, it } from "vitest";
import {
  Alpha2RunRecordSchema,
  createAlpha2RunRecord,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";
import { resolveAlpha2ActionGate } from "@/features/agenticRuntime/alpha2RiskGateContract";
import { parseAlpha2CanonicalOpenTasks } from "@/features/agenticRuntime/alpha2OpenTasksEligibilityContract";

const NOW = "2026-08-26T05:36:00.000Z";

describe("Alpha-Foxtrott 2 review hardening", () => {
  it("escalates orange/red review-boundary actions to human-only", () => {
    for (const riskClass of ["orange", "red"] as const) {
      expect(
        resolveAlpha2ActionGate({
          actionKind: "publish_external",
          riskClass,
          confidence: "high",
          reversible: false,
          evidenceRefs: ["review:red-publish"],
        }),
      ).toMatchObject({
        decision: "human_only",
        autoExecutionAllowed: false,
        reasonCodes: [`risk_class:${riskClass}`],
      });
    }
  });

  it("rejects non-root records that identify themselves as the root", () => {
    const child = createAlpha2RunRecord({
      runId: "child-run",
      parentRunId: "parent-run",
      rootRunId: "root-run",
      idempotencyKey: "root-run:child-run",
      taskId: "ALPHA2-RUN-CONTRACT-01",
      kind: "diagnostic",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "diagnostic" },
      now: NOW,
    });
    expect(() => Alpha2RunRecordSchema.parse({ ...child, rootRunId: child.runId })).toThrow(
      "alpha2_child_run_cannot_reference_itself_as_root",
    );
  });

  it("fails closed on duplicate task ids in the operative OpenTasks head", () => {
    const duplicate = `
## Kanonischer Operativteil
| ID | Status | Priorität | Abhängigkeiten | Scope | Akzeptanzkriterien |
| --- | --- | --- | --- | --- | --- |
| DUPLICATE-01 | codex_ready | P0 | none | first | first |
| DUPLICATE-01 | blocked | P0 | gate | second | second |
## Historischer Katalog und Evidenz
`;
    expect(() => parseAlpha2CanonicalOpenTasks(duplicate)).toThrow(
      "alpha2_duplicate_task_id_in_operative_head:DUPLICATE-01",
    );
  });
});
