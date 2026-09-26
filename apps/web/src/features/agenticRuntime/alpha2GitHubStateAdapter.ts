import type { Alpha2TaskOwnershipEvidence } from "@/features/agenticRuntime/alpha2OpenTasksEligibilityContract";

export const ALPHA2_GITHUB_STATE_SCHEMA_VERSION = 1 as const;

export const ALPHA2_GITHUB_STATE_GUARDRAILS = {
  readOnly: true,
  githubMutationAllowed: false,
  mergeAuthorizationIncluded: false,
  deployAuthorizationIncluded: false,
  openTasksMutationAllowed: false,
  secondEligibilityPolicyAllowed: false,
  secretInputAllowed: false,
} as const;

export type Alpha2GitHubCiState = "unknown" | "pending" | "success" | "failure";
export type Alpha2GitHubDeploymentState = Alpha2GitHubCiState;

export type Alpha2GitHubBranchObservation = {
  name: string;
  exists: boolean;
  headSha: string | null;
  observedAt: string;
};

export type Alpha2GitHubPullRequestObservation = {
  number: number;
  branch: string;
  state: "open" | "closed" | "merged";
  headSha: string;
  baseSha: string;
  observedAt: string;
};

export type Alpha2GitHubCompareObservation = {
  baseSha: string;
  headSha: string;
  mergeBaseSha: string | null;
  aheadBy: number;
  behindBy: number;
  observedAt: string;
};

export type Alpha2GitHubCheckObservation = {
  name: string;
  headSha: string;
  state: Exclude<Alpha2GitHubCiState, "unknown">;
  observedAt: string;
};

export type Alpha2GitHubDeploymentObservation = {
  name: string;
  headSha: string;
  state: Alpha2GitHubDeploymentState;
  observedAt: string;
};

export type Alpha2GitHubReviewObservation = {
  prNumber: number;
  headSha: string;
  decision: "approved" | "changes_requested" | "review_required" | "unknown";
  unresolvedThreads: number;
  observedAt: string;
};

export type Alpha2GitHubStateInput = {
  taskId: string;
  expectedBranch: string;
  expectedHeadSha: string;
  observedMainSha: string | null;
  branch: Alpha2GitHubBranchObservation | null;
  pullRequests: readonly Alpha2GitHubPullRequestObservation[];
  compare: Alpha2GitHubCompareObservation | null;
  checks: readonly Alpha2GitHubCheckObservation[];
  deployments?: readonly Alpha2GitHubDeploymentObservation[];
  review: Alpha2GitHubReviewObservation | null;
  observedAt: string;
};

export type Alpha2GitHubStateSnapshot = {
  schemaVersion: typeof ALPHA2_GITHUB_STATE_SCHEMA_VERSION;
  taskId: string;
  branch: string;
  prNumber: number | null;
  expectedHeadSha: string;
  observedBranchHeadSha: string | null;
  observedPrHeadSha: string | null;
  observedMainSha: string | null;
  mergeBaseSha: string | null;
  aheadBy: number | null;
  behindBy: number | null;
  exactHead: boolean;
  ciState: Alpha2GitHubCiState;
  deploymentState: Alpha2GitHubDeploymentState;
  reviewDecision: Alpha2GitHubReviewObservation["decision"] | "missing";
  unresolvedReviewThreads: number | null;
  ownerConflict: boolean;
  evidenceComplete: boolean;
  mergeAuthorized: false;
  githubMutationAllowed: false;
  reasonCodes: string[];
  observedAt: string;
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalizeAggregateState(
  observations: readonly { state: Alpha2GitHubCiState }[],
): Alpha2GitHubCiState {
  if (observations.length === 0) return "unknown";
  if (observations.some((observation) => observation.state === "failure")) return "failure";
  if (observations.some((observation) => observation.state === "pending")) return "pending";
  if (observations.every((observation) => observation.state === "success")) return "success";
  return "unknown";
}

/**
 * Normalize already-observed GitHub state into one fail-closed evidence snapshot.
 * This adapter does not call GitHub and cannot mutate GitHub. Network/provider readers live
 * outside this contract and must supply observations tied to the exact SHA they actually saw.
 */
export function buildAlpha2GitHubStateSnapshot(
  input: Alpha2GitHubStateInput,
): Alpha2GitHubStateSnapshot {
  const reasons: string[] = [];
  const branch = input.branch;

  if (!input.observedMainSha) reasons.push("main_observation_missing");
  if (!branch || !branch.exists) reasons.push("branch_missing");
  if (branch && branch.name !== input.expectedBranch) reasons.push("branch_name_mismatch");
  if (branch?.headSha !== input.expectedHeadSha) reasons.push("branch_head_mismatch");

  const openOwners = input.pullRequests.filter(
    (pullRequest) => pullRequest.state === "open" && pullRequest.branch === input.expectedBranch,
  );
  const ownerConflict = openOwners.length > 1;
  if (ownerConflict) reasons.push("multiple_open_pr_owners");
  if (openOwners.length === 0) reasons.push("open_pr_missing");

  const owner = openOwners.length === 1 ? openOwners[0] : null;
  if (owner && owner.headSha !== input.expectedHeadSha) reasons.push("pr_head_mismatch");
  if (owner && owner.baseSha !== input.observedMainSha) reasons.push("pr_base_observation_mismatch");

  const compare = input.compare;
  if (!compare) {
    reasons.push("compare_observation_missing");
  } else {
    if (compare.baseSha !== input.observedMainSha) reasons.push("compare_base_stale");
    if (compare.headSha !== input.expectedHeadSha) reasons.push("compare_head_stale");
    if (!compare.mergeBaseSha) reasons.push("merge_base_missing");
    if (compare.aheadBy < 0 || compare.behindBy < 0) reasons.push("compare_counts_invalid");
  }

  const exactChecks = input.checks.filter((check) => check.headSha === input.expectedHeadSha);
  const staleChecks = input.checks.filter((check) => check.headSha !== input.expectedHeadSha);
  if (staleChecks.length > 0) reasons.push("stale_ci_evidence_ignored");
  const ciState = normalizeAggregateState(exactChecks);
  if (ciState === "unknown") reasons.push("exact_head_ci_missing");
  if (ciState === "pending") reasons.push("exact_head_ci_pending");
  if (ciState === "failure") reasons.push("exact_head_ci_failed");

  const deployments = input.deployments ?? [];
  const exactDeployments = deployments.filter(
    (deployment) => deployment.headSha === input.expectedHeadSha,
  );
  if (deployments.some((deployment) => deployment.headSha !== input.expectedHeadSha)) {
    reasons.push("stale_deployment_evidence_ignored");
  }
  const deploymentState = normalizeAggregateState(exactDeployments);

  const review = input.review;
  if (!review) {
    reasons.push("review_observation_missing");
  } else {
    if (owner && review.prNumber !== owner.number) reasons.push("review_pr_mismatch");
    if (review.headSha !== input.expectedHeadSha) reasons.push("review_head_stale");
    if (review.unresolvedThreads < 0) reasons.push("review_thread_count_invalid");
    if (review.unresolvedThreads > 0) reasons.push("unresolved_review_threads");
    if (review.decision === "changes_requested") reasons.push("review_changes_requested");
  }

  const exactHead = Boolean(
    input.observedMainSha &&
      branch?.exists &&
      branch.name === input.expectedBranch &&
      branch.headSha === input.expectedHeadSha &&
      owner &&
      owner.headSha === input.expectedHeadSha &&
      owner.baseSha === input.observedMainSha &&
      compare &&
      compare.baseSha === input.observedMainSha &&
      compare.headSha === input.expectedHeadSha &&
      compare.mergeBaseSha &&
      !ownerConflict,
  );

  const evidenceComplete = Boolean(
    exactHead &&
      ciState !== "unknown" &&
      review &&
      review.prNumber === owner?.number &&
      review.headSha === input.expectedHeadSha &&
      review.unresolvedThreads >= 0,
  );

  return {
    schemaVersion: ALPHA2_GITHUB_STATE_SCHEMA_VERSION,
    taskId: input.taskId,
    branch: input.expectedBranch,
    prNumber: owner?.number ?? null,
    expectedHeadSha: input.expectedHeadSha,
    observedBranchHeadSha: branch?.headSha ?? null,
    observedPrHeadSha: owner?.headSha ?? null,
    observedMainSha: input.observedMainSha,
    mergeBaseSha: compare?.mergeBaseSha ?? null,
    aheadBy: compare?.aheadBy ?? null,
    behindBy: compare?.behindBy ?? null,
    exactHead,
    ciState,
    deploymentState,
    reviewDecision: review?.decision ?? "missing",
    unresolvedReviewThreads: review?.unresolvedThreads ?? null,
    ownerConflict,
    evidenceComplete,
    mergeAuthorized: false,
    githubMutationAllowed: false,
    reasonCodes: unique(reasons),
    observedAt: input.observedAt,
  };
}

export function toAlpha2TaskOwnershipEvidence(
  snapshot: Alpha2GitHubStateSnapshot,
): Alpha2TaskOwnershipEvidence {
  return {
    branch: snapshot.branch,
    prNumber: snapshot.prNumber,
    exactHead: snapshot.exactHead,
    ciState: snapshot.ciState,
    unresolvedReviewThreads: snapshot.unresolvedReviewThreads,
  };
}

export function buildAlpha2GitHubStateSafeTrace(snapshot: Alpha2GitHubStateSnapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    taskId: snapshot.taskId,
    branch: snapshot.branch,
    prNumber: snapshot.prNumber,
    exactHead: snapshot.exactHead,
    ciState: snapshot.ciState,
    deploymentState: snapshot.deploymentState,
    ownerConflict: snapshot.ownerConflict,
    evidenceComplete: snapshot.evidenceComplete,
    reasonCodes: snapshot.reasonCodes,
    containsCredential: false,
    containsToken: false,
    containsCookie: false,
    containsRawProviderPayload: false,
  } as const;
}