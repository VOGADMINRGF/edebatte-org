export type BranchActionIntent =
  | "prepare_qr_poll"
  | "prepare_swipes"
  | "request_review_or_sources"
  | "save_only";

export type BranchDecisionStatus = "draft" | "prepared";

export type ClaimInferredStance = "pro" | "contra" | "mixed" | "unclear" | "not_inferred";
export type ClaimStanceConfirmationStatus = "inferred_only" | "confirmed" | "corrected" | "not_requested";

export type ClaimUserStanceDecision =
  | "count_as_support"
  | "count_as_opposition"
  | "add_nuance"
  | "keep_separate"
  | "save_without_counting"
  | "request_review";

export type ClaimCandidate = {
  id: string;
  branchId: string;
  text: string;
  kind: "claim" | "question";
  source: "planner_core" | "planner_open_question" | "planner_cluster";
  inferredStance: ClaimInferredStance;
  stanceConfirmationStatus: ClaimStanceConfirmationStatus;
  userStanceDecision?: ClaimUserStanceDecision;
};

export type ExistingMatchUserDecision =
  | "count_my_position"
  | "count_as_opposition"
  | "add_as_nuance"
  | "keep_separate"
  | "request_review";

export type ExistingMatchDifferenceReason =
  | "other_scope"
  | "other_target_group"
  | "other_demand"
  | "other_reasoning"
  | "different_stance"
  | "custom_text";

export type ExistingMatchDecisionDraft = {
  userDecision: ExistingMatchUserDecision;
  differenceReason?: ExistingMatchDifferenceReason | null;
  userNuanceText?: string | null;
};

export type ExistingMatch = {
  id: string;
  title: string;
  targetType: "claim" | "topic" | "anlassraum" | "dossier";
  summary?: string;
  matchedClaimText?: string | null;
  currentSupportCount?: number;
  currentOpposeCount?: number;
  currentNeutralCount?: number;
  matchConfidence?: number;
  whyMatched?: string;
  userDecision: ExistingMatchUserDecision | null;
  differenceReason?: ExistingMatchDifferenceReason | null;
  userNuanceText?: string | null;
  requiresConfirmation: true;
  recordedAsDraftOnly?: true;
  confirmedAt?: null;
  countedAt?: null;
  mergedAt?: null;
};

export type PlaceResolutionMatchType = "exact" | "fuzzy" | "alias" | "profile_context" | "ambiguous";

export type PlaceResolutionCandidate = {
  id: string;
  streetName?: string | null;
  city: string;
  district?: string | null;
  municipality?: string | null;
  state?: string | null;
  country?: string | null;
  registryId?: string | null;
  matchType: PlaceResolutionMatchType;
  confidence: number;
  reason: string;
};

export type JurisdictionCandidate = {
  level: "district" | "municipality" | "state" | "federal" | "eu" | "unknown";
  label: string;
  authorityName?: string | null;
  topicDependency?: string | null;
  confidence: number;
  reason: string;
  needsReview: boolean;
};

export type PlaceResolutionStatus =
  | "not_attempted"
  | "resolved"
  | "unresolved"
  | "failed"
  | "timeout";

export type PlaceResolutionSource = "directory" | "registry" | "user_input" | "none";

export type CreateRegionContextSource =
  | "contribution_text"
  | "confirmed_context"
  | "profile_suggestion"
  | "none";

export type CreateRegionContextStatus =
  | "resolved"
  | "suggested"
  | "needs_clarification"
  | "not_location_bound"
  | "unresolved";

export type StreetRegistryLookupStatus =
  | "not_configured"
  | "no_match"
  | "possible_match"
  | "exact_match"
  | "ambiguous"
  | "error";

export type StreetRegistryLookupSource =
  | "street_registry"
  | "osm_later"
  | "region_directory"
  | "user_input"
  | "none";

export type StreetVerificationStatus =
  | "unchecked"
  | "possible_match"
  | "verified"
  | "ambiguous"
  | "skipped"
  | "unavailable";

export type StreetRegistryMatch = {
  streetName: string;
  municipality?: string | null;
  district?: string | null;
  postalCode?: string | null;
  regionId?: string | null;
  confidence: number;
  sourceLabel: string;
  isOfficialStreetMatch: boolean;
};

export type StreetRegistryLookupResult = {
  query: string;
  normalizedQuery: string;
  status: StreetRegistryLookupStatus;
  matches: StreetRegistryMatch[];
  source: StreetRegistryLookupSource;
  message: string;
};

export type PlaceResolutionResult = {
  normalizedInput: string;
  exactStreetMatch: boolean;
  exactPlaceMatch: boolean;
  candidates: PlaceResolutionCandidate[];
  selectedCandidate?: PlaceResolutionCandidate | null;
  needsUserConfirmation: boolean;
  confidence: "low" | "medium" | "high";
  warnings: string[];
  jurisdictionCandidates: JurisdictionCandidate[];
  jurisdictionConfirmation?: {
    status: "not_required" | "unconfirmed" | "confirmed";
    candidateKey: string | null;
  };
};

export type CreateCitizenConcernKind =
  | "public_concern"
  | "source_without_request"
  | "private_case"
  | "emergency"
  | "unsafe_content"
  | "unclear";

export type CreateCitizenSafetySummary = {
  decision:
    | "allow"
    | "revise_required"
    | "factcheck_required"
    | "graph_review_required"
    | "moderation_required"
    | "blocked";
  sensitiveFindingKinds: string[];
  requiresHumanReview: boolean;
  emergencyNoticeRequired: boolean;
};

/**
 * Citizen-first context attached to the existing contribution package. This
 * is a reviewable intake view of the canonical place, jurisdiction and match
 * contracts, not a second Create or region workflow.
 */
export type CreateCitizenIntakeContext = {
  concernKind: CreateCitizenConcernKind;
  regionStatus: CreateRegionContextStatus;
  regionSource: CreateRegionContextSource;
  regionChipLabel: string | null;
  selectedRegionLabel: string | null;
  detectedRegionLabels: string[];
  regionHierarchy: string[];
  clarificationQuestion: string | null;
  detectedStreetName: string | null;
  placeResolution: PlaceResolutionResult;
  jurisdictionCandidates: JurisdictionCandidate[];
  jurisdictionConfirmation: {
    status: "not_required" | "unconfirmed" | "confirmed";
    candidateKey: string | null;
  };
  desiredChange: string | null;
  safety: CreateCitizenSafetySummary;
  matching: {
    requiresConfirmation: true;
    allowedDecisions: ExistingMatchUserDecision[];
    noSilentMerge: true;
  };
  guardrails: {
    noAutoPublish: true;
    noAutoMandate: true;
    noTruthDecision: true;
    noProfileRegionAsFact: true;
  };
};

export type ContributionPackageScopeConfidence = "low" | "medium" | "high";

export type TopicBranchDecision = {
  id: string;
  title: string;
  summary: string;
  claimCandidates: ClaimCandidate[];
  placeCandidates?: string[];
  localIssueCandidates?: string[];
  needsPlaceClarification?: boolean;
  placeClarificationQuestion?: string | null;
  scopeConfidence?: ContributionPackageScopeConfidence;
  placeClarificationStatus?: "pending" | "answered" | "skipped";
  detectedStreetName?: string | null;
  correctedStreetName?: string | null;
  suppliedPlace?: string | null;
  placeResolution?: PlaceResolutionResult | null;
  placeResolutionStatus?: PlaceResolutionStatus;
  placeResolutionCandidateLabel?: string | null;
  placeResolutionSource?: PlaceResolutionSource;
  streetRegistryStatus?: StreetRegistryLookupStatus;
  streetRegistrySource?: StreetRegistryLookupSource;
  streetRegistryMatches?: StreetRegistryMatch[];
  selectedStreetMatch?: StreetRegistryMatch | null;
  streetVerificationStatus?: StreetVerificationStatus;
  confirmedPlaceCandidateId?: string | null;
  placeConfirmationStatus?: "unconfirmed" | "confirmed" | "corrected" | "skipped";
  sensitivityLevel: "standard" | "civic_sensitive" | "legal_sensitive" | "high_risk";
  sensitivityNote?: string;
  selectedAction: BranchActionIntent | null;
  status: BranchDecisionStatus;
  existingMatches: ExistingMatch[];
};

export type ContributionPackage = {
  id: string;
  kind: "multi_branch_draft";
  headline: string;
  summary: string;
  branches: TopicBranchDecision[];
  source: "gpt_planner";
  requiresConfirmation: true;
  createdAt: string;
};
