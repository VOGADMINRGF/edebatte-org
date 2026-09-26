import { describe, expect, it } from "vitest";

import { planAlpha2OpenTasksMutation } from "@/features/agenticRuntime/alpha2OpenTasksSingleWriterContract";

const OPEN_TASKS = `# E150 Open Tasks

## Kanonischer Operativteil

| ID | Status | Priorität | Abhängigkeiten | Scope | Akzeptanzkriterien |
| --- | --- | --- | --- | --- | --- |
| ALPHA2-REVIEW-EVIDENCE-01 | in_progress | P0 | none | test | exact review evidence |

## Historischer Katalog und Evidenz

| ID | Status | Priorität | Abhängigkeiten | Scope | Akzeptanzkriterien |
| --- | --- | --- | --- | --- | --- |
| ARCHIVED-01 | done | P9 | old | archived | immutable |
`;

describe("Alpha2 OpenTasks single-writer review evidence", () => {
  it("fails closed when unresolved-review-thread evidence is missing", () => {
    const plan = planAlpha2OpenTasksMutation({
      openTasksText: OPEN_TASKS,
      expectedFileRevision: "blob:review-evidence:1",
      observedFileRevision: "blob:review-evidence:1",
      taskId: "ALPHA2-REVIEW-EVIDENCE-01",
      expectedFromStatus: "in_progress",
      toStatus: "review",
      actorId: "actor:alpha2",
      runId: "run:review-evidence:1",
      evidenceRefs: ["evidence:ci:exact-head"],
      requestedAt: "2026-09-26T12:00:00.000Z",
      dependenciesSatisfied: true,
      ownership: {
        branch: "feat/review-evidence",
        prNumber: 1085,
        exactHead: true,
        ciState: "success",
      },
    });

    expect(plan).toMatchObject({
      decision: "blocked",
      reasonCodes: ["fresh_review_evidence_required"],
    });
  });

  it("accepts review transition only with an explicit zero unresolved-thread observation", () => {
    const plan = planAlpha2OpenTasksMutation({
      openTasksText: OPEN_TASKS,
      expectedFileRevision: "blob:review-evidence:1",
      observedFileRevision: "blob:review-evidence:1",
      taskId: "ALPHA2-REVIEW-EVIDENCE-01",
      expectedFromStatus: "in_progress",
      toStatus: "review",
      actorId: "actor:alpha2",
      runId: "run:review-evidence:2",
      evidenceRefs: ["evidence:ci:exact-head", "evidence:threads:zero"],
      requestedAt: "2026-09-26T12:01:00.000Z",
      dependenciesSatisfied: true,
      ownership: {
        branch: "feat/review-evidence",
        prNumber: 1085,
        exactHead: true,
        ciState: "success",
        unresolvedReviewThreads: 0,
      },
    });

    expect(plan.decision).toBe("ready");
  });
});
