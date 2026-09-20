import { describe, expect, it } from "vitest";
import { applySwipeQuestionQualityToCreateLedger } from "@/features/swipes/createLedgerQuestionQuality";
import {
  buildSwipeQuestionAgentOutputPromptFragment,
  SWIPE_QUESTION_AGENT_OUTPUT_FIELD,
} from "@/features/swipes/swipeQuestionAgentOutputContract";
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
        claimCandidates: [
          {
            id: "claim-1",
            branchId: "branch-1",
            text: "Wie ordnest du verbindlichere Regeln für Weiterbildung ein?",
            kind: "question",
            source: "planner_open_question",
            inferredStance: "not_inferred",
            stanceConfirmationStatus: "confirmed",
          },
        ],
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
              sourceClaimId: "claim-1",
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

  it("reads structured agent output from the original claim candidate without losing provenance", () => {
    const ledger = baseLedger();
    const candidate = ledger.branches[0].claimCandidates[0] as any;
    candidate[SWIPE_QUESTION_AGENT_OUTPUT_FIELD] = {
      humanContext: "Beschäftigte brauchen Zeit und Zugang, Betriebe müssen Weiterbildung zugleich organisieren und finanzieren.",
      tradeoff: "Mehr Verbindlichkeit kann Beschäftigten Planung geben, begrenzt aber betriebliche Spielräume.",
      decisionConsequences: {
        agree: [
          {
            title: "Planbarkeit kann steigen",
            detail: "Verbindlichere Regeln können feste Zeitfenster oder Ansprüche planbarer machen.",
            evidenceStatus: "supported",
            evidenceRefs: [{ id: "source-1", label: "Tarifauswertung" }],
          },
        ],
        disagree: [
          {
            title: "Betriebliche Flexibilität kann größer bleiben",
            evidenceStatus: "hypothesis",
            evidenceRefs: [],
          },
        ],
      },
    };

    const finalized = applySwipeQuestionQualityToCreateLedger(ledger);
    const finalizedStatement = finalized.branches[0].swipeDraft?.statements[0] as any;

    expect(finalizedStatement.humanContext).toContain("Beschäftigte brauchen Zeit");
    expect(finalizedStatement.tradeoff).toContain("betriebliche Spielräume");
    expect(finalizedStatement.decisionConsequences.agree[0].evidenceStatus).toBe("supported");
    expect(finalizedStatement.decisionConsequences.agree[0].evidenceRefs[0].id).toBe("source-1");
    expect(finalizedStatement.decisionConsequences.disagree[0].evidenceStatus).toBe("hypothesis");
    expect(finalizedStatement.questionQualityAssessment.ready).toBe(true);
    expect(finalized.branches[0].swipeDraft?.status).toBe("ready_for_review");
    expect(finalized.branches[0].swipeDraft?.visibilityIntent).toBe("public_swipes");
  });

  it("fails malformed structured agent output closed instead of falling back around missing fields", () => {
    const ledger = baseLedger();
    const candidate = ledger.branches[0].claimCandidates[0] as any;
    candidate[SWIPE_QUESTION_AGENT_OUTPUT_FIELD] = {
      tradeoff: "Mehr Regeln stehen betrieblicher Flexibilität gegenüber.",
      decisionConsequences: {
        agree: [{ title: "Weiterbildung wird automatisch besser", evidenceStatus: "unverified" }],
        disagree: [{ title: "Flexibilität bleibt größer", evidenceStatus: "hypothesis" }],
      },
    };

    const finalized = applySwipeQuestionQualityToCreateLedger(ledger);
    const finalizedStatement = finalized.branches[0].swipeDraft?.statements[0] as any;

    expect(finalizedStatement.humanContext).toBeUndefined();
    expect(finalizedStatement.questionQualityAssessment.ready).toBe(false);
    expect(finalizedStatement.questionQualityAssessment.issues).toContain("missing_human_context");
    expect(finalizedStatement.questionQualityAssessment.issues).toContain(
      "unsupported_causal_certainty:agree:0",
    );
    expect(finalized.branches[0].swipeDraft?.status).toBe("needs_review");
  });

  it("publishes one canonical producer prompt fragment with evidence and review guardrails", () => {
    const prompt = buildSwipeQuestionAgentOutputPromptFragment();

    expect(prompt).toContain("SWIPE-QUESTION-QUALITY:");
    expect(prompt).toContain("SWIPE-QUESTION-OUTPUT:");
    expect(prompt).toContain(`claimCandidate.${SWIPE_QUESTION_AGENT_OUTPUT_FIELD}`);
    expect(prompt).toContain("verified|supported|hypothesis|unverified");
    expect(prompt).toContain("veröffentlicht nicht");
  });
});
