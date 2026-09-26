import { describe, expect, it } from "vitest";

import {
  ALPHA2_GITHUB_STATE_GUARDRAILS,
  buildAlpha2GitHubStateSafeTrace,
  buildAlpha2GitHubStateSnapshot,
  toAlpha2TaskOwnershipEvidence,
  type Alpha2GitHubStateInput,
} from "@/features/agenticRuntime/alpha2GitHubStateAdapter";
import {
  evaluateAlpha2TaskEligibility,
  type Alpha2OpenTaskRecord,
} from "@/features/agenticRuntime/alpha2OpenTasksEligibilityContract";

const HEAD = "1111111111111111111111111111111111111111";
const MAIN = "2222222222222222222222222222222222222222";
const MERGE_BASE = "3333333333333333333333333333333333333333";
const OBSERVED_AT = "2026-09-26T10:00:00.000Z";

function observation(
  overrides: Partial<Alpha2GitHubStateInput> = {},
): Alpha2GitHubStateInput {
  return {
    taskId: "ALPHA2-GITHUB-STATE-ADAPTER-01",
    expectedBranch: "feat/alpha2-github-state-adapter-01",
    expectedHeadSha: HEAD,
    observedMainSha: MAIN,
    branch: {
      name: "feat/alpha2-github-state-adapter-01",
      exists: true,
      headSha: HEAD,
      observedAt: OBSERVED_AT,
    },
    pullRequests: [
      {
        number: 1077,
        branch: "feat/alpha2-github-state-adapter-01",
        state: "open",
        headSha: HEAD,
        baseSha: MAIN,
        observedAt: OBSERVED_AT,
      },
    ],
    compare: {
      baseSha: MAIN,
      headSha: HEAD,
      mergeBaseSha: MERGE_BASE,
      aheadBy: 2,
      behindBy: 0,
      observedAt: OBSERVED_AT,
    },
    checks: [
      { name: "Web contracts", headSha: HEAD, state: "success", observedAt: OBSERVED_AT },
      { name: "Web quality", headSha: HEAD, state: "success", observedAt: OBSERVED_AT },
    ],
    deployments: [
      { name: "preview", headSha: HEAD, state: "success", observedAt: OBSERVED_AT },
    ],
    review: {
      prNumber: 1077,
      headSha: HEAD,
      decision: "approved",
      unresolvedThreads: 0,
      observedAt: OBSERVED_AT,
    },
    observedAt: OBSERVED_AT,
    ...overrides,
  };
}

function task(overrides: Partial<Alpha2OpenTaskRecord> = {}): Alpha2OpenTaskRecord {
  return {
    id: "ALPHA2-GITHUB-STATE-ADAPTER-01",
    status: "in_progress",
    priority: "P0",
    dependencies: "ALPHA2-AGENT-REGISTRY-01",
    scope: "read-only GitHub evidence",
    acceptance: "exact-head evidence",
    ...overrides,
  };
}

describe("Alpha2 GitHub state adapter contract", () => {
  it("normalizes coherent exact-head evidence without granting merge authority", () => {
    const snapshot = buildAlpha2GitHubStateSnapshot(observation());

    expect(snapshot).toMatchObject({
      taskId: "ALPHA2-GITHUB-STATE-ADAPTER-01",
      branch: "feat/alpha2-github-state-adapter-01",
      prNumber: 1077,
      expectedHeadSha: HEAD,
      observedBranchHeadSha: HEAD,
      observedPrHeadSha: HEAD,
      observedMainSha: MAIN,
      mergeBaseSha: MERGE_BASE,
      aheadBy: 2,
      behindBy: 0,
      exactHead: true,
      ciState: "success",
      deploymentState: "success",
      reviewDecision: "approved",
      unresolvedReviewThreads: 0,
      ownerConflict: false,
      evidenceComplete: true,
      mergeAuthorized: false,
      githubMutationAllowed: false,
      reasonCodes: [],
    });
    expect(ALPHA2_GITHUB_STATE_GUARDRAILS).toEqual({
      readOnly: true,
      githubMutationAllowed: false,
      mergeAuthorizationIncluded: false,
      deployAuthorizationIncluded: false,
      openTasksMutationAllowed: false,
      secondEligibilityPolicyAllowed: false,
      secretInputAllowed: false,
    });
  });

  it("ignores stale CI evidence and fails closed when no exact-head check exists", () => {
    const staleHead = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const snapshot = buildAlpha2GitHubStateSnapshot(
      observation({
        checks: [
          { name: "Web CI", headSha: staleHead, state: "success", observedAt: OBSERVED_AT },
        ],
      }),
    );

    expect(snapshot.exactHead).toBe(true);
    expect(snapshot.ciState).toBe("unknown");
    expect(snapshot.reasonCodes).toEqual(
      expect.arrayContaining(["stale_ci_evidence_ignored", "exact_head_ci_missing"]),
    );
  });

  it("represents exact-head CI failure explicitly", () => {
    const snapshot = buildAlpha2GitHubStateSnapshot(
      observation({
        checks: [
          { name: "Web contracts", headSha: HEAD, state: "success", observedAt: OBSERVED_AT },
          { name: "Web quality", headSha: HEAD, state: "failure", observedAt: OBSERVED_AT },
        ],
      }),
    );

    expect(snapshot.ciState).toBe("failure");
    expect(snapshot.reasonCodes).toContain("exact_head_ci_failed");
  });

  it("fails exact-head ownership when branch, PR or compare evidence disagrees", () => {
    const wrongHead = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const snapshot = buildAlpha2GitHubStateSnapshot(
      observation({
        branch: {
          name: "feat/alpha2-github-state-adapter-01",
          exists: true,
          headSha: wrongHead,
          observedAt: OBSERVED_AT,
        },
        pullRequests: [
          {
            number: 1077,
            branch: "feat/alpha2-github-state-adapter-01",
            state: "open",
            headSha: wrongHead,
            baseSha: MAIN,
            observedAt: OBSERVED_AT,
          },
        ],
        compare: {
          baseSha: MAIN,
          headSha: wrongHead,
          mergeBaseSha: MERGE_BASE,
          aheadBy: 1,
          behindBy: 0,
          observedAt: OBSERVED_AT,
        },
      }),
    );

    expect(snapshot.exactHead).toBe(false);
    expect(snapshot.reasonCodes).toEqual(
      expect.arrayContaining(["branch_head_mismatch", "pr_head_mismatch", "compare_head_stale"]),
    );
  });

  it("detects duplicate open PR ownership instead of picking one implicitly", () => {
    const snapshot = buildAlpha2GitHubStateSnapshot(
      observation({
        pullRequests: [
          {
            number: 1077,
            branch: "feat/alpha2-github-state-adapter-01",
            state: "open",
            headSha: HEAD,
            baseSha: MAIN,
            observedAt: OBSERVED_AT,
          },
          {
            number: 1078,
            branch: "feat/alpha2-github-state-adapter-01",
            state: "open",
            headSha: HEAD,
            baseSha: MAIN,
            observedAt: OBSERVED_AT,
          },
        ],
      }),
    );

    expect(snapshot.ownerConflict).toBe(true);
    expect(snapshot.prNumber).toBeNull();
    expect(snapshot.exactHead).toBe(false);
    expect(snapshot.reasonCodes).toContain("multiple_open_pr_owners");
  });

  it("preserves merge-base and ahead/behind evidence without treating it as merge permission", () => {
    const snapshot = buildAlpha2GitHubStateSnapshot(
      observation({
        compare: {
          baseSha: MAIN,
          headSha: HEAD,
          mergeBaseSha: MERGE_BASE,
          aheadBy: 5,
          behindBy: 3,
          observedAt: OBSERVED_AT,
        },
      }),
    );

    expect(snapshot.mergeBaseSha).toBe(MERGE_BASE);
    expect(snapshot.aheadBy).toBe(5);
    expect(snapshot.behindBy).toBe(3);
    expect(snapshot.mergeAuthorized).toBe(false);
  });

  it("fails closed on missing/stale review evidence and preserves unresolved threads", () => {
    const missing = buildAlpha2GitHubStateSnapshot(observation({ review: null }));
    expect(missing.evidenceComplete).toBe(false);
    expect(missing.unresolvedReviewThreads).toBeNull();
    expect(missing.reasonCodes).toContain("review_observation_missing");

    const unresolved = buildAlpha2GitHubStateSnapshot(
      observation({
        review: {
          prNumber: 1077,
          headSha: HEAD,
          decision: "review_required",
          unresolvedThreads: 2,
          observedAt: OBSERVED_AT,
        },
      }),
    );
    expect(unresolved.unresolvedReviewThreads).toBe(2);
    expect(unresolved.reasonCodes).toContain("unresolved_review_threads");
  });

  it("feeds the existing eligibility contract instead of creating a second policy", () => {
    const clean = buildAlpha2GitHubStateSnapshot(observation());
    const cleanEligibility = evaluateAlpha2TaskEligibility({
      task: task(),
      ownership: toAlpha2TaskOwnershipEvidence(clean),
    });
    expect(cleanEligibility.continuationEligible).toBe(true);
    expect(cleanEligibility.mustReuseExistingOwner).toBe(true);

    const failedCi = buildAlpha2GitHubStateSnapshot(
      observation({
        checks: [
          { name: "Web CI", headSha: HEAD, state: "failure", observedAt: OBSERVED_AT },
        ],
      }),
    );
    const blocked = evaluateAlpha2TaskEligibility({
      task: task(),
      ownership: toAlpha2TaskOwnershipEvidence(failedCi),
    });
    expect(blocked.newSliceEligible).toBe(false);
    expect(blocked.reasonCodes).toContain("owner_ci_failed");
  });

  it("emits SafeTrace metadata only and never accepts or exposes credentials", () => {
    const snapshot = buildAlpha2GitHubStateSnapshot(observation());
    const trace = buildAlpha2GitHubStateSafeTrace(snapshot);

    expect(trace).toMatchObject({
      taskId: snapshot.taskId,
      branch: snapshot.branch,
      prNumber: 1077,
      exactHead: true,
      containsCredential: false,
      containsToken: false,
      containsCookie: false,
      containsRawProviderPayload: false,
    });
    expect(JSON.stringify(trace)).not.toContain(HEAD);
    expect(JSON.stringify(trace)).not.toContain(MAIN);
  });
});