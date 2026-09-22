import "server-only";

import {
  applyReviewQueueOperation,
  getReviewQueueOperationsRepository,
} from "@features/reviewQueueOperations";
import {
  evaluateVoxyEditorialCouncil,
  type VoxyEditorialCouncilDecision,
} from "./editorialAgentCouncil";
import {
  getEffectiveVoxyEditorialAutonomyPolicy,
  getVoxyEditorialAutonomyRepository,
} from "./editorialAutonomyStore";
import {
  getVoxyEditorialCouncilArtifactRepository,
  type VoxyEditorialCouncilAuditArtifact,
} from "./editorialAgentCouncilStore";
import { buildVoxyEditorialCouncilBinding } from "./editorialAgentCouncilRuntime";
import type { VoxyEditorialEvidenceContext } from "./editorialStoryPlan";
import {
  approveVoxyStudioDraftForRender,
  buildVoxyStudioEditorialReviewItemId,
  buildVoxyStudioEvidenceBoundRenderReviewGateId,
  type VoxyStudioDraftServiceDependencies,
} from "./studioDraftService";
import type { VoxyStudioDraft } from "./studioDraft";

function agentPrincipal(decision: VoxyEditorialCouncilDecision): string {
  return `agent:voxy-chief-judge:${decision.decisionId.slice(-32)}`;
}

export async function approveVoxyStudioDraftFromAgentCouncil(input: {
  draft: VoxyStudioDraft;
  evidence: VoxyEditorialEvidenceContext;
  artifact: VoxyEditorialCouncilAuditArtifact;
  deps: VoxyStudioDraftServiceDependencies;
}) {
  const councilRepository = getVoxyEditorialCouncilArtifactRepository();
  if (councilRepository.getPersistenceState().mode !== "persistent_primary") {
    throw new Error("voxy_council_audit_not_persistent");
  }
  const persisted = await councilRepository.get(input.artifact.artifactId);
  if (!persisted) throw new Error("voxy_council_artifact_not_persisted");
  if (persisted.decision.decisionId !== input.artifact.decision.decisionId) {
    throw new Error("voxy_council_artifact_decision_mismatch");
  }

  const autonomyRepository = getVoxyEditorialAutonomyRepository();
  if (autonomyRepository.getPersistenceState().mode !== "persistent_primary") {
    throw new Error("voxy_autonomy_policy_not_persistent");
  }
  const { record: activePolicy, configured } =
    await getEffectiveVoxyEditorialAutonomyPolicy(autonomyRepository);
  if (!configured) throw new Error("voxy_autonomy_policy_not_configured");
  if (activePolicy.policy.policyRevision !== persisted.policyRevision) {
    throw new Error("voxy_council_policy_revision_stale");
  }

  if (input.draft.status !== "needs_review") {
    throw new Error(`voxy_council_approval_not_allowed:${input.draft.status}`);
  }
  const reviewItemId = buildVoxyStudioEditorialReviewItemId(
    input.draft,
    input.evidence.sourcePack.sourcePackId,
  );
  const decisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
    input.draft,
    input.evidence.sourcePack.sourcePackId,
  );
  if (persisted.reviewQueueItemId !== reviewItemId) {
    throw new Error("voxy_council_review_item_stale");
  }
  if (persisted.decisionGateId !== decisionGateId) {
    throw new Error("voxy_council_decision_gate_stale");
  }

  const currentBinding = buildVoxyEditorialCouncilBinding({
    stage: "editorial",
    draft: input.draft,
    evidence: input.evidence,
    policy: activePolicy.policy,
    reviewQueueItemId: reviewItemId,
    decisionGateId,
    creatorRunId: persisted.creatorRunId,
  });
  if (JSON.stringify(currentBinding) !== JSON.stringify(persisted.binding)) {
    throw new Error("voxy_council_input_binding_stale");
  }

  const recomputed = evaluateVoxyEditorialCouncil({
    stage: "editorial",
    binding: currentBinding,
    policy: activePolicy.policy,
    creatorRunId: persisted.creatorRunId,
    runs: persisted.criticRuns,
    criticalRiskFlags: persisted.criticalRiskFlags,
  });
  if (recomputed.decisionId !== persisted.decision.decisionId) {
    throw new Error("voxy_council_decision_recompute_mismatch");
  }
  if (
    recomputed.outcome !== "agent_approved" ||
    recomputed.auditComplete !== true ||
    recomputed.criticalRiskFlags.length > 0
  ) {
    throw new Error(`voxy_council_not_autonomously_approved:${recomputed.outcome}`);
  }

  const reviewRepository = getReviewQueueOperationsRepository();
  if (reviewRepository.getPersistenceState().mode !== "persistent_primary") {
    throw new Error("voxy_studio_editorial_review_not_persistent");
  }
  const actor = agentPrincipal(recomputed);
  const note = [
    `Agent Council ${recomputed.decisionId} approved exact draft/story/evidence revision.`,
    recomputed.publicDecisionSummary,
    `artifact=${persisted.artifactId}`,
    `policyRevision=${persisted.policyRevision}`,
    `runs=${recomputed.reviewRunIds.length}`,
    `modelFamilies=${recomputed.modelFamilies.join(",")}`,
  ].join(" ");

  const review = await applyReviewQueueOperation({
    itemId: reviewItemId,
    action: "mark_ready",
    requestedByUserId: actor,
    note,
  });

  try {
    const draft = await approveVoxyStudioDraftForRender(
      {
        draftId: input.draft.draftId,
        expectedRevision: input.draft.revision,
        approvedByUserId: actor,
      },
      input.deps,
    );
    return {
      draft,
      review,
      council: persisted,
      actorType: "agent" as const,
      actorId: actor,
      renderTriggered: false,
      uploadTriggered: false,
      publishTriggered: false,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "agent_render_approval_failed";
    await applyReviewQueueOperation({
      itemId: reviewItemId,
      action: "block",
      requestedByUserId: actor,
      note: `Council mark_ready was invalidated before render approval completed: ${reason}`,
    }).catch(() => undefined);
    throw error;
  }
}
