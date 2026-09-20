import type { CreateContributionLedgerEntry } from "@features/create/createContributionLedger";
import type { SwipeDecisionConsequences } from "./types";
import { finalizeSwipeQuestionCandidate } from "./questionFinalizer";
import {
  readSwipeQuestionAgentOutput,
  SWIPE_QUESTION_AGENT_OUTPUT_FIELD,
} from "./swipeQuestionAgentOutputContract";

type StructuredSwipeDraftStatement = {
  id: string;
  text: string;
  inferredStance?: unknown;
  stanceConfirmationStatus?: unknown;
  sourceClaimId?: string;
  needsReview?: boolean;
  sensitivityLevel?: unknown;
  humanContext?: string | null;
  tradeoff?: string | null;
  decisionConsequences?: SwipeDecisionConsequences | null;
  questionQualityAssessment?: {
    ready: boolean;
    issues: string[];
    assessedAt?: string | null;
  };
};

function readAgentOutputForStatement(
  branch: CreateContributionLedgerEntry["branches"][number],
  statement: StructuredSwipeDraftStatement,
) {
  if (!statement.sourceClaimId) return null;
  const sourceCandidate = branch.claimCandidates.find(
    (candidate) => candidate.id === statement.sourceClaimId,
  );
  if (!sourceCandidate) return null;
  const record = sourceCandidate as unknown as Record<string, unknown>;
  return readSwipeQuestionAgentOutput(record[SWIPE_QUESTION_AGENT_OUTPUT_FIELD]);
}

function countEvidenceRefs(consequences?: SwipeDecisionConsequences | null): number {
  if (!consequences) return 0;
  return [...consequences.agree, ...consequences.disagree].reduce(
    (sum, consequence) =>
      sum +
      (consequence.evidenceRefs?.filter((ref) => Boolean(ref?.id?.trim())).length ?? 0),
    0,
  );
}

/**
 * Runtime bridge between Create's existing branch ledger and the canonical
 * Swipe question-quality finalizer. It does not invent missing context,
 * tradeoffs or consequences. Existing plain claim drafts therefore fail
 * closed into review until an agent/finalizer provides the structured fields.
 *
 * Producer output can travel losslessly on the original claim candidate under
 * `claimCandidate.swipeQuestion`; this keeps the current Create package shape
 * backwards-compatible while giving agent/source producers one typed contract.
 */
export function applySwipeQuestionQualityToCreateLedger(
  ledger: CreateContributionLedgerEntry,
): CreateContributionLedgerEntry {
  return {
    ...ledger,
    branches: ledger.branches.map((branch) => {
      if (!branch.swipeDraft) return branch;

      const statements = branch.swipeDraft.statements.map((rawStatement) => {
        const statement = rawStatement as StructuredSwipeDraftStatement;
        const agentOutput = readAgentOutputForStatement(branch, statement);
        const decisionConsequences =
          statement.decisionConsequences ?? agentOutput?.decisionConsequences;
        const finalized = finalizeSwipeQuestionCandidate({
          id: statement.id,
          title: statement.text,
          text: statement.text,
          humanContext:
            statement.humanContext ??
            (agentOutput ? agentOutput.humanContext : branch.summary),
          tradeoff: statement.tradeoff ?? agentOutput?.tradeoff,
          decisionConsequences,
          category: branch.title,
          topicTags: [branch.title],
          responsibilityLabel: "Zuständigkeit vor Veröffentlichung prüfen",
          domainLabel: branch.title,
          evidenceCount: countEvidenceRefs(decisionConsequences),
        });

        return {
          ...rawStatement,
          humanContext: finalized.item.humanContext,
          tradeoff: finalized.item.tradeoff,
          decisionConsequences: finalized.item.decisionConsequences,
          questionQualityAssessment: finalized.item.questionQualityAssessment,
          needsReview: Boolean(rawStatement.needsReview) || finalized.requiresHumanReview,
        };
      });

      const qualityRequiresReview = statements.some(
        (statement) =>
          Boolean((statement as StructuredSwipeDraftStatement).needsReview) ||
          (statement as StructuredSwipeDraftStatement).questionQualityAssessment?.ready !== true,
      );

      return {
        ...branch,
        needsReview: branch.needsReview || qualityRequiresReview,
        visibilityIntent: qualityRequiresReview ? "public_after_review" : branch.visibilityIntent,
        swipeDraft: {
          ...branch.swipeDraft,
          statements,
          status: qualityRequiresReview ? "needs_review" : branch.swipeDraft.status,
          visibilityIntent: qualityRequiresReview ? "public_after_review" : branch.swipeDraft.visibilityIntent,
        },
      } as typeof branch;
    }),
  };
}
