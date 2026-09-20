import type {
  SourceSwipeQualitySetResult,
  SourceVoteReadinessWithSwipeQuality,
} from "@features/themenradar/sourceSwipeQuestionQualityBridge";

/**
 * Stable type-only boundary for consumers on the Swipe side. The Source bridge
 * owns evidence/T1 convergence; Swipe surfaces consume its effective readiness
 * without gaining Source release authority.
 */
export type SwipeSourceConvergenceResult = SourceVoteReadinessWithSwipeQuality;
export type SwipeSourceConvergenceSetResult = SourceSwipeQualitySetResult;

export const SWIPE_SOURCE_CONVERGENCE_GUARDRAILS = {
  noAutoPublish: true,
  sourcePipelineMayRelease: false,
  humanReviewRequiredBeforePublicFinalization: true,
} as const;
