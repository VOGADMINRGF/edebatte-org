import { describe, expect, it } from "vitest";
import { SWIPE_SOURCE_CONVERGENCE_GUARDRAILS } from "@/features/swipes/sourceConvergenceContract";

describe("Swipe Source convergence contract", () => {
  it("keeps publication and source release authority outside the convergence layer", () => {
    expect(SWIPE_SOURCE_CONVERGENCE_GUARDRAILS).toEqual({
      noAutoPublish: true,
      sourcePipelineMayRelease: false,
      humanReviewRequiredBeforePublicFinalization: true,
    });
  });
});
