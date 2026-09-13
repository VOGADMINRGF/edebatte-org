import { z } from "zod";
import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionActorContext,
  type PublicQuestionActorExtraction,
  type PublicQuestionGeneralizationResult,
  type PublicQuestionProcedureContext,
} from "@/features/create/safety/publicQuestionGeneralization";

export const VOXY_AUTHOR_APPROVAL_STATUSES = [
  "draft",
  "needs_author_input",
  "author_confirmed",
  "author_rejected",
] as const;

export type VoxyAuthorApprovalStatus =
  (typeof VOXY_AUTHOR_APPROVAL_STATUSES)[number];

export const VOXY_EDITORIAL_REVIEW_STATUSES = [
  "not_submitted",
  "submitted",
  "needs_changes",
  "approved_for_export",
  "rejected",
] as const;

export type VoxyEditorialReviewStatus =
  (typeof VOXY_EDITORIAL_REVIEW_STATUSES)[number];

export const VoxyBothSidesObligationsSchema = z.object({
  sideA: z.array(z.string()),
  sideB: z.array(z.string()),
});

export type VoxyBothSidesObligations = z.infer<
  typeof VoxyBothSidesObligationsSchema
>;

export const VoxyCoCreationStateSchema = z.object({
  authorIntent: z.string(),
  rawObservation: z.string(),
  nonNegotiableThesis: z.string(),
  structuralIssue: z.string(),
  publicQuestion: z.string(),
  verifiedFacts: z.array(z.string()),
  assumptions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  sensitiveClaims: z.array(z.string()),
  bothSidesObligations: VoxyBothSidesObligationsSchema,
  reformProposal: z.string(),
  safeguards: z.array(z.string()),
  tonePreference: z.string(),
  authorApprovalStatus: z.enum(VOXY_AUTHOR_APPROVAL_STATUSES),
  editorialReviewStatus: z.enum(VOXY_EDITORIAL_REVIEW_STATUSES),
});

export type VoxyCoCreationState = z.infer<typeof VoxyCoCreationStateSchema>;

export type VoxyPublicQuestionGuardContext = {
  actorContexts: PublicQuestionActorContext[];
  actorExtraction: PublicQuestionActorExtraction;
  procedure?: PublicQuestionProcedureContext | null;
  locale?: string | null;
};

export function createEmptyVoxyCoCreationState(): VoxyCoCreationState {
  return {
    authorIntent: "",
    rawObservation: "",
    nonNegotiableThesis: "",
    structuralIssue: "",
    publicQuestion: "",
    verifiedFacts: [],
    assumptions: [],
    openQuestions: [],
    sensitiveClaims: [],
    bothSidesObligations: {
      sideA: [],
      sideB: [],
    },
    reformProposal: "",
    safeguards: [],
    tonePreference: "",
    authorApprovalStatus: "draft",
    editorialReviewStatus: "not_submitted",
  };
}

export function isVoxyCoCreationReadyForExport(
  state: VoxyCoCreationState,
  guardContext?: VoxyPublicQuestionGuardContext,
): boolean {
  const questionGuard = evaluateVoxyCoCreationPublicQuestion(state, guardContext);
  return (
    state.authorApprovalStatus === "author_confirmed" &&
    state.editorialReviewStatus === "approved_for_export" &&
    questionGuard.releaseState === "draft_allowed" &&
    questionGuard.publicQuestion !== null
  );
}

export function evaluateVoxyCoCreationPublicQuestion(
  state: VoxyCoCreationState,
  guardContext?: VoxyPublicQuestionGuardContext,
): PublicQuestionGeneralizationResult {
  const originalInput =
    state.rawObservation.trim() ||
    state.authorIntent.trim() ||
    state.publicQuestion.trim();

  return evaluatePublicQuestionGeneralization({
    originalInput,
    candidatePublicQuestion: state.publicQuestion,
    actorContexts: guardContext?.actorContexts ?? [],
    actorExtraction: guardContext?.actorExtraction ?? {
      status: "unverified",
      source: "voxy_provider",
      independentFromCandidateProvider: false,
      evidenceRefs: [],
    },
    procedure: guardContext?.procedure,
    locale: guardContext?.locale,
  });
}
