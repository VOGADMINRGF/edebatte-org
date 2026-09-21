import { describe, expect, it } from "vitest";

import {
  buildVoxyVisualQaHumanReviewCommand,
  isVoxyVisualQaReviewDecisionGateId,
} from "@/features/voxyVideo/visualQaHumanReviewCommand";

const GATE =
  "voxy-visual-qa:870b79a25107b6f3f64b8d5b811efc7fe95ea128:r1:voxy-visual-qa-checkpoint-v4:r1:ff398b39";

describe("Voxy visual QA human review command", () => {
  it("accepts only revision-consistent V4 visual QA decision gates", () => {
    expect(isVoxyVisualQaReviewDecisionGateId(GATE)).toBe(true);
    expect(
      isVoxyVisualQaReviewDecisionGateId(
        GATE.replace("checkpoint-v4:r1", "checkpoint-v4:r2"),
      ),
    ).toBe(false);
    expect(isVoxyVisualQaReviewDecisionGateId("voxy-visual-qa:manual"))
      .toBe(false);
  });

  it("maps explicit human approval into the existing audit-only decision store contract", () => {
    const command = buildVoxyVisualQaHumanReviewCommand({
      decisionGateId: GATE,
      decision: "approved",
      reviewerComment: "Alle drei Formate und die revisionsgebundene Evidence visuell geprüft.",
    });

    expect(command.decisionGateId).toBe(GATE);
    expect(command.previewReviewFlowId).toBe(`voxy-visual-qa-review:${GATE}`);
    expect(command.decisionType).toBe("mark_review_ready");
    expect(command.decisionPayload.reviewReadyReason).toContain("Alle drei Formate");
    expect(command.checklistResults).toHaveLength(5);
    expect(command.checklistResults.every((item) => item.status === "acceptable_for_review_ready"))
      .toBe(true);
    expect(command.decisionEffects).toMatchObject({
      createsRenderJob: false,
      createsMediaFile: false,
      createsUpload: false,
      triggersPublish: false,
      runtimeClaimAllowed: false,
    });
    expect(command.executionFlags).toMatchObject({
      renderAllowed: false,
      uploadAllowed: false,
      publishAllowed: false,
      schedulingAllowed: false,
      runtimeClaimAllowed: false,
    });
  });

  it("maps needs-changes and rejection without creating runtime side effects", () => {
    const needsChanges = buildVoxyVisualQaHumanReviewCommand({
      decisionGateId: GATE,
      decision: "needs_changes",
      reviewerComment: "Pocket-Mark im Portraitformat erneut prüfen.",
    });
    const rejected = buildVoxyVisualQaHumanReviewCommand({
      decisionGateId: GATE,
      decision: "rejected",
      reviewerComment: "Die aktuelle Evidence ist visuell nicht freigabefähig.",
    });

    expect(needsChanges.decisionType).toBe("request_revision");
    expect(needsChanges.previewReviewStatusHint).toBe("needs_revision");
    expect(rejected.decisionType).toBe("reject_preview");
    expect(rejected.executionFlags.previewRendered).toBe(false);
  });

  it("requires a reviewer comment", () => {
    expect(() =>
      buildVoxyVisualQaHumanReviewCommand({
        decisionGateId: GATE,
        decision: "approved",
        reviewerComment: "   ",
      }),
    ).toThrow("voxy_visual_qa_reviewer_comment_required");
  });
});
