import { describe, expect, it } from "vitest";
import { applySwipeQuestionQualityToCreateLedger } from "@/features/swipes/createLedgerQuestionQuality";
import type { CreateContributionLedgerEntry } from "@features/create/createContributionLedger";

function baseLedger(): CreateContributionLedgerEntry {
  return {
    ledgerId: "ledger-1",
    packageId: "package-1",
    userId: "user-1",
    sourceText: "Weiterbildung im Arbeitsalltag",
    createdAt: "2026-09-20T09:00:00.000Z",
    updatedAt: "2026-09-20T09:00:00.000Z",
    locale: "de",
    entryPoint: "create",
    draftSaveStatus: "server_saved",
    branches: [
      {
        branchId: "branch-1",
        title: "Weiterbildung",
        summary: "Weiterbildung scheitert im Arbeitsalltag oft an Zeit, Geld oder fehlenden Angeboten.",
        selectedAction: "public_swipes_prepare",
        status: "swipe_draft_prepared",
        visibilityIntent: "public_swipes",
        claimCandidates: [],
        placeCandidates: [],
        localIssueCandidates: [],
        needsPlaceClarification: false,
        placeClarificationStatus: "answered",
        placeResolutionSource: "none",
        inferredStance: "not_inferred",
        stanceConfirmationStatus: "not_requested",
        sensitivityLevel: "standard",
        needsReview: false,
        swipeDraft: {
          draftId: "swipe-draft-1",
          packageId: "package-1",
          branchId: "branch-1",
          statements: [
            {
              id: "statement-1",
              text: "Wie ordnest du verbindlichere Regeln für Weiterbildung ein?",
              inferredStance: "not_inferred",
              stanceConfirmationStatus: "confirmed",
              needsReview: false,
              sensitivityLevel: "standard",
            },
          ],
          status: "ready_for_review",
          visibilityIntent: "public_swipes",
          publishedAt: null,
          createdAt: "2026-09-20T09:00:00.000Z",
          updatedAt: "2026-09-20T09:00:00.000Z",
          guardrails: {
            noAutoPublish: true,
            noAutoVote: true,
            noAutoMerge: true,
          },
        },
        handoffStatus: "prepared",
        handoffTargetType: "swipes",
        handoffTargetUrl: null,
      },
    ],
  } as CreateContributionLedgerEntry;
}

describe("Create ledger swipe question-quality bridge", () => {
  it("fails existing plain planner claims closed into review", () => {
    const ledger = applySwipeQuestionQualityToCreateLedger(baseLedger());
    const branch = ledger.branches[0];
    const statement = branch.swipeDraft?.statements[0] as any;

    expect(branch.needsReview).toBe(true);
    expect(branch.visibilityIntent).toBe("public_after_review");
    expect(branch.swipeDraft?.status).toBe("needs_review");
    expect(branch.swipeDraft?.visibilityIntent).toBe("public_after_review");
    expect(statement.humanContext).toContain("Weiterbildung scheitert");
    expect(statement.questionQualityAssessment.ready).toBe(false);
    expect(statement.questionQualityAssessment.issues).toContain("missing_tradeoff");
    expect(statement.questionQualityAssessment.issues).toContain("missing_directional_consequences");
  });

  it("preserves structured fields when a future agent supplies them", () => {
    const ledger = baseLedger();
    const statement = ledger.branches[0].swipeDraft!.statements[0] as any;
    statement.tradeoff = "Mehr Verbindlichkeit kann Beschäftigten Planung geben, begrenzt aber betriebliche Spielräume.";
    statement.decisionConsequences = {
      agree: [
        {
          title: "Planbarkeit kann steigen",
          evidenceStatus: "supported",
          evidenceRefs: [{ id: "source-1" }],
        },
      ],
      disagree: [
        {
          title: "Betriebliche Flexibilität kann größer bleiben",
          evidenceStatus: "hypothesis",
        },
      ],
    };

    const finalized = applySwipeQuestionQualityToCreateLedger(ledger);
    const finalizedStatement = finalized.branches[0].swipeDraft?.statements[0] as any;

    expect(finalizedStatement.tradeoff).toContain("betriebliche Spielräume");
    expect(finalizedStatement.decisionConsequences.agree[0].evidenceStatus).toBe("supported");
    expect(finalizedStatement.questionQualityAssessment.ready).toBe(true);
    expect(finalized.branches[0].swipeDraft?.status).toBe("ready_for_review");
  });
});
