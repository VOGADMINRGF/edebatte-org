import { describe, expect, it } from "vitest";

import {
  ALPHA2_OPENTASKS_SINGLE_WRITER_GUARDRAILS,
  applyAlpha2OpenTasksMutation,
  buildAlpha2OpenTasksSingleWriterSafeTrace,
  planAlpha2OpenTasksMutation,
  type Alpha2OpenTasksMutationInput,
} from "@/features/agenticRuntime/alpha2OpenTasksSingleWriterContract";

const REVISION = "blob:opentasks:1";

const OPEN_TASKS = `# E150 Open Tasks

## Kanonischer Operativteil

| ID | Status | Priorität | Abhängigkeiten | Scope | Akzeptanzkriterien |
| --- | --- | --- | --- | --- | --- |
| BLOCKED-01 | blocked | P0 | gate | blocked | human authorize |
| READY-01 | codex_ready | P0 | none | ready | claim |
| RUNNING-01 | in_progress | P0 | READY-01 | running | exact-head review |
| REVIEW-01 | review | P0 | PR #1 | review | human close |
| MANUAL-01 | manual_gate | P0 | provider | manual | human reopen |
| DONE-01 | done | P1 | none | done | terminal |

## Historischer Katalog und Evidenz

| ID | Status | Priorität | Abhängigkeiten | Scope | Akzeptanzkriterien |
| --- | --- | --- | --- | --- | --- |
| READY-01 | blocked | P9 | old | archived | must remain untouched |
`;

function owner(overrides: Partial<NonNullable<Alpha2OpenTasksMutationInput["ownership"]>> = {}) {
  return {
    branch: "feat/ready-01",
    prNumber: 1083,
    exactHead: true,
    ciState: "success" as const,
    unresolvedReviewThreads: 0,
    ...overrides,
  };
}

function mutation(
  overrides: Partial<Alpha2OpenTasksMutationInput> = {},
): Alpha2OpenTasksMutationInput {
  return {
    openTasksText: OPEN_TASKS,
    expectedFileRevision: REVISION,
    observedFileRevision: REVISION,
    taskId: "READY-01",
    expectedFromStatus: "codex_ready",
    toStatus: "in_progress",
    actorId: "actor:alpha2",
    runId: "run:alpha2:1",
    evidenceRefs: ["evidence:preflight:1", "evidence:owner:1083"],
    requestedAt: "2026-09-26T12:00:00.000Z",
    dependenciesSatisfied: true,
    ownership: owner(),
    ...overrides,
  };
}

describe("Alpha2 OpenTasks single-writer contract", () => {
  it("retains #447 authority and never grants direct repository mutation", () => {
    expect(ALPHA2_OPENTASKS_SINGLE_WRITER_GUARDRAILS).toEqual({
      secondOpenTasksAuthorityAllowed: false,
      lastWriterWinsAllowed: false,
      directGitHubMutationAllowed: false,
      mergeAuthorizationIncluded: false,
      deployAuthorizationIncluded: false,
      publishAuthorizationIncluded: false,
      human447AuthorityRetained: true,
      automaticCutoverAllowed: false,
      historicalCatalogMutationAllowed: false,
      secretInputAllowed: false,
    });

    const plan = planAlpha2OpenTasksMutation(mutation());
    expect(plan).toMatchObject({
      decision: "ready",
      directWriteAllowed: false,
      requiresCompareAndSwap: true,
      human447AuthorityRetained: true,
    });
  });

  it("requires explicit #447 authorization for promotion and final closeout transitions", () => {
    const promote = planAlpha2OpenTasksMutation(
      mutation({
        taskId: "BLOCKED-01",
        expectedFromStatus: "blocked",
        toStatus: "codex_ready",
        ownership: undefined,
      }),
    );
    expect(promote).toMatchObject({
      decision: "blocked",
      reasonCodes: ["human_447_authorization_required"],
    });

    const promoted = planAlpha2OpenTasksMutation(
      mutation({
        taskId: "BLOCKED-01",
        expectedFromStatus: "blocked",
        toStatus: "codex_ready",
        ownership: undefined,
        human447Authorization: true,
      }),
    );
    expect(promoted.decision).toBe("ready");

    const done = planAlpha2OpenTasksMutation(
      mutation({
        taskId: "REVIEW-01",
        expectedFromStatus: "review",
        toStatus: "done",
        human447Authorization: true,
      }),
    );
    expect(done.decision).toBe("ready");
  });

  it("fails closed on stale file revision instead of last-writer-wins", () => {
    const plan = planAlpha2OpenTasksMutation(
      mutation({ observedFileRevision: "blob:someone-else-wrote" }),
    );
    expect(plan.decision).toBe("blocked");
    expect(plan.reasonCodes).toContain("file_revision_conflict");
  });

  it("requires dependencies and exact owner evidence before claiming codex_ready", () => {
    expect(
      planAlpha2OpenTasksMutation(mutation({ dependenciesSatisfied: false })).reasonCodes,
    ).toContain("dependencies_not_satisfied");

    expect(
      planAlpha2OpenTasksMutation(mutation({ ownership: undefined })).reasonCodes,
    ).toContain("owner_evidence_required");

    expect(
      planAlpha2OpenTasksMutation(mutation({ ownership: owner({ exactHead: false }) })).reasonCodes,
    ).toContain("owner_not_exact_head");
  });

  it("requires fresh exact-head CI and resolved review evidence before review", () => {
    const ready = planAlpha2OpenTasksMutation(
      mutation({
        taskId: "RUNNING-01",
        expectedFromStatus: "in_progress",
        toStatus: "review",
      }),
    );
    expect(ready.decision).toBe("ready");

    const failedCi = planAlpha2OpenTasksMutation(
      mutation({
        taskId: "RUNNING-01",
        expectedFromStatus: "in_progress",
        toStatus: "review",
        ownership: owner({ ciState: "failure" }),
      }),
    );
    expect(failedCi).toMatchObject({
      decision: "blocked",
      reasonCodes: ["fresh_review_evidence_required"],
    });

    const unresolved = planAlpha2OpenTasksMutation(
      mutation({
        taskId: "RUNNING-01",
        expectedFromStatus: "in_progress",
        toStatus: "review",
        ownership: owner({ unresolvedReviewThreads: 1 }),
      }),
    );
    expect(unresolved.decision).toBe("blocked");
  });

  it("uses manual_gate only when a real human gate is evidenced", () => {
    const blocked = planAlpha2OpenTasksMutation(
      mutation({ toStatus: "manual_gate", humanGateRequired: false }),
    );
    expect(blocked).toMatchObject({
      decision: "blocked",
      reasonCodes: ["human_gate_evidence_required"],
    });

    const gated = planAlpha2OpenTasksMutation(
      mutation({ toStatus: "manual_gate", humanGateRequired: true }),
    );
    expect(gated.decision).toBe("ready");
  });

  it("never reopens done and requires human authorization to reopen review/manual_gate", () => {
    const terminal = planAlpha2OpenTasksMutation(
      mutation({
        taskId: "DONE-01",
        expectedFromStatus: "done",
        toStatus: "codex_ready",
      }),
    );
    expect(terminal.reasonCodes).toContain("done_is_terminal");

    for (const [taskId, fromStatus] of [
      ["REVIEW-01", "review"],
      ["MANUAL-01", "manual_gate"],
    ] as const) {
      const blocked = planAlpha2OpenTasksMutation(
        mutation({ taskId, expectedFromStatus: fromStatus, toStatus: "codex_ready" }),
      );
      expect(blocked.reasonCodes).toContain("human_447_authorization_required");
    }
  });

  it("applies exactly one operative status cell and preserves the historical catalog byte-for-byte", () => {
    const history = OPEN_TASKS.slice(OPEN_TASKS.indexOf("## Historischer Katalog und Evidenz"));
    const plan = planAlpha2OpenTasksMutation(mutation());
    const result = applyAlpha2OpenTasksMutation({
      currentText: OPEN_TASKS,
      currentFileRevision: REVISION,
      plan,
    });

    expect(result.decision).toBe("applied");
    expect(result.nextText).toContain("| READY-01 | in_progress | P0 |");
    expect(result.nextText.slice(result.nextText.indexOf("## Historischer Katalog und Evidenz")))
      .toBe(history);
    expect(result.nextText).toContain("| READY-01 | blocked | P9 | old | archived |");
    expect(result.receipt).toMatchObject({ applied: true, alreadyApplied: false });
  });

  it("re-checks CAS at apply time and blocks a concurrent writer", () => {
    const plan = planAlpha2OpenTasksMutation(mutation());
    const result = applyAlpha2OpenTasksMutation({
      currentText: OPEN_TASKS,
      currentFileRevision: "blob:changed-after-plan",
      plan,
    });
    expect(result).toMatchObject({
      decision: "blocked",
      reasonCodes: ["compare_and_swap_failed"],
    });
    expect(result.nextText).toBe(OPEN_TASKS);
  });

  it("is idempotent after a successful apply even when the file revision advanced", () => {
    const plan = planAlpha2OpenTasksMutation(mutation());
    const first = applyAlpha2OpenTasksMutation({
      currentText: OPEN_TASKS,
      currentFileRevision: REVISION,
      plan,
    });
    const replay = applyAlpha2OpenTasksMutation({
      currentText: first.nextText,
      currentFileRevision: "blob:new-after-commit",
      plan,
    });

    expect(replay).toMatchObject({
      decision: "already_applied",
      reasonCodes: ["target_status_already_present"],
      receipt: { applied: false, alreadyApplied: true, idempotencyKey: plan.idempotencyKey },
    });
    expect(replay.nextText).toBe(first.nextText);
  });

  it("blocks duplicate operative task IDs instead of choosing a winner", () => {
    const duplicate = OPEN_TASKS.replace(
      "| RUNNING-01 | in_progress | P0 |",
      "| READY-01 | blocked | P0 |",
    );
    const plan = planAlpha2OpenTasksMutation(mutation({ openTasksText: duplicate }));
    expect(plan.decision).toBe("blocked");
    expect(plan.reasonCodes.some((reason) => reason.includes("duplicate_task_id"))).toBe(true);
  });

  it("keeps receipt and SafeTrace metadata-only", () => {
    const plan = planAlpha2OpenTasksMutation(mutation());
    const trace = buildAlpha2OpenTasksSingleWriterSafeTrace(plan);
    expect(trace).toMatchObject({
      taskId: "READY-01",
      decision: "ready",
      containsSecret: false,
      containsRawOpenTasks: false,
      containsCredential: false,
      containsToken: false,
      directGitHubMutationAllowed: false,
    });
    expect(JSON.stringify(trace)).not.toContain("archived");
    expect(JSON.stringify(trace)).not.toContain(OPEN_TASKS);
  });
});
