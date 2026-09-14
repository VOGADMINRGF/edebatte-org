/**
 * T0 architecture-only contract. This module describes references to existing
 * owners; it deliberately creates no runtime objects, state, or persistence.
 */
export const DECISION_DOSSIER_T0_ROLE = "T0" as const;

export type ArchitectureConcept =
  | "SystemQuestion" | "ResearchObject" | "ContextEvent" | "Metric" | "Projection"
  | "Assumption" | "PolicyBuildingBlock" | "ScenarioSet" | "Scenario" | "Impact"
  | "Tradeoff" | "Comparator" | "DecisionBinding";

export type EpistemicCategory =
  | "FACT" | "MEASURED_VALUE" | "ESTIMATE" | "PROJECTION" | "MODEL_RESULT"
  | "ASSUMPTION" | "INTERPRETATION" | "OPINION" | "NORMATIVE_JUDGMENT" | "UNKNOWN";

export type OwnerEntry = Readonly<{
  concept: ArchitectureConcept; canonicalOwner: string; canonicalReference: string;
  t0Responsibility: string; laterTaskOwner: "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7";
  allowedReferences: readonly string[]; forbiddenOwnershipDuplication: string;
  revisionSensitive: boolean; readinessRelevant: boolean;
}>;

const entry = (value: OwnerEntry) => value;
export const DECISION_DOSSIER_ARCHITECTURE_OWNERS = Object.freeze([
  entry({ concept: "SystemQuestion", canonicalOwner: "CanonicalTopic + DecisionQuestion", canonicalReference: "canonical topic ID + jurisdiction", t0Responsibility: "reference only", laterTaskOwner: "T1", allowedReferences: ["CanonicalTopic", "DecisionQuestion", "JurisdictionContext"], forbiddenOwnershipDuplication: "second topic or decision owner", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "ResearchObject", canonicalOwner: "Dossier + ResearchTask", canonicalReference: "dossier ID", t0Responsibility: "reference only", laterTaskOwner: "T2", allowedReferences: ["Dossier", "ResearchTask", "ResearchArtifact"], forbiddenOwnershipDuplication: "second research store", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "ContextEvent", canonicalOwner: "Dossier claim/source/revision domain", canonicalReference: "claim/source/revision IDs", t0Responsibility: "reference only", laterTaskOwner: "T3", allowedReferences: ["AtomicClaim", "SourceArtifact", "DossierRevision"], forbiddenOwnershipDuplication: "event truth outside dossier", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "Metric", canonicalOwner: "Atomic quantified claim + evidence", canonicalReference: "claim/evidence IDs", t0Responsibility: "require definitional references", laterTaskOwner: "T3", allowedReferences: ["AtomicClaim", "EvidenceAssessment"], forbiddenOwnershipDuplication: "second metric truth", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "Projection", canonicalOwner: "Atomic prediction + model provenance", canonicalReference: "claim/model/source IDs", t0Responsibility: "prohibit measurement rendering", laterTaskOwner: "T3", allowedReferences: ["AtomicClaim", "EvidenceAssessment", "DossierRevision"], forbiddenOwnershipDuplication: "second projection owner", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "Assumption", canonicalOwner: "Dossier atomic evidence context", canonicalReference: "claim/revision IDs", t0Responsibility: "make explicit", laterTaskOwner: "T3", allowedReferences: ["AtomicClaim", "DossierRevision"], forbiddenOwnershipDuplication: "silent default assumption", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "PolicyBuildingBlock", canonicalOwner: "Dossier scenario domain", canonicalReference: "future scenario reference", t0Responsibility: "owner boundary only", laterTaskOwner: "T4", allowedReferences: ["Dossier"], forbiddenOwnershipDuplication: "T0 policy runtime", revisionSensitive: true, readinessRelevant: false }),
  entry({ concept: "ScenarioSet", canonicalOwner: "Dossier scenario domain", canonicalReference: "future scenario-set reference", t0Responsibility: "owner boundary only", laterTaskOwner: "T4", allowedReferences: ["Dossier", "DossierRevision"], forbiddenOwnershipDuplication: "T0 scenario store", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "Scenario", canonicalOwner: "Dossier scenario domain", canonicalReference: "future scenario reference", t0Responsibility: "owner boundary only", laterTaskOwner: "T4", allowedReferences: ["ScenarioSet", "DossierRevision"], forbiddenOwnershipDuplication: "T0 recommendation", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "Impact", canonicalOwner: "Dossier evidence domain", canonicalReference: "claim/evidence/affected-group references", t0Responsibility: "separate observed/modelled/normative", laterTaskOwner: "T5", allowedReferences: ["AtomicClaim", "EvidenceAssessment"], forbiddenOwnershipDuplication: "second impact truth", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "Tradeoff", canonicalOwner: "Dossier evidence domain", canonicalReference: "claim/evidence references", t0Responsibility: "separate value judgment", laterTaskOwner: "T5", allowedReferences: ["AtomicClaim", "EvidenceAssessment"], forbiddenOwnershipDuplication: "auto normative conclusion", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "Comparator", canonicalOwner: "Dossier evidence domain", canonicalReference: "source/jurisdiction/metric references", t0Responsibility: "require transfer boundary", laterTaskOwner: "T5", allowedReferences: ["SourceArtifact", "JurisdictionContext", "AtomicClaim"], forbiddenOwnershipDuplication: "automatic transfer", revisionSensitive: true, readinessRelevant: true }),
  entry({ concept: "DecisionBinding", canonicalOwner: "Poll/TopicRound", canonicalReference: "poll/topic-round ID + revision refs", t0Responsibility: "staleness invariant only", laterTaskOwner: "T6", allowedReferences: ["Poll", "TopicRound", "DossierRevision", "ScenarioSet", "Scenario"], forbiddenOwnershipDuplication: "dossier activates decision", revisionSensitive: true, readinessRelevant: true }),
] as const);

export const EPISTEMIC_MAPPING: Readonly<Record<EpistemicCategory, readonly string[]>> = Object.freeze({
  FACT: ["factual claim", "EvidenceAssessment"], MEASURED_VALUE: ["quantified claim", "EvidenceAssessment"], ESTIMATE: ["quantified or prediction claim", "uncertainty"], PROJECTION: ["prediction claim", "model provenance"], MODEL_RESULT: ["quantified or prediction claim", "model reference"], ASSUMPTION: ["explicit assumption reference"], INTERPRETATION: ["interpretation claim"], OPINION: ["non_checkable_opinion"], NORMATIVE_JUDGMENT: ["normative_position", "value"], UNKNOWN: ["unknown assessment", "evidence gap"],
});

export type MaterialDimension = Readonly<{ material: boolean; status: "complete" | "gap" | "unknown"; evidenceReferences: readonly string[]; reviewStatus: "reviewed" | "pending" | "rejected"; gap: string | null; freshness: "fresh" | "stale" | "unknown"; revision: string | null }>;
export type DecisionBindingSnapshot = Readonly<{ boundRevision: string; materialRevisions: Readonly<Record<string, string>> }>;

export function validateArchitectureOwners(entries: readonly OwnerEntry[]) {
  const seen = new Set<ArchitectureConcept>();
  for (const value of entries) {
    if (!value.canonicalOwner || !value.canonicalReference || !value.t0Responsibility || seen.has(value.concept)) return false;
    seen.add(value.concept);
  }
  return seen.size === DECISION_DOSSIER_ARCHITECTURE_OWNERS.length;
}
export function canRender(category: EpistemicCategory, renderedAs: "fact" | "measurement" | "evidence" | "value") {
  if (category === "PROJECTION" && renderedAs === "measurement") return false;
  if (category === "NORMATIVE_JUDGMENT" && renderedAs === "fact") return false;
  if (category === "UNKNOWN") return false;
  if (category === "OPINION" && renderedAs === "evidence") return false;
  return true;
}
export function hasRequiredProvenance(category: EpistemicCategory, provenance: readonly string[]) {
  return !(["PROJECTION", "MODEL_RESULT", "MEASURED_VALUE"] as const).includes(category as any) || provenance.length > 0;
}
export function readyForHumanDeliberation(dimensions: readonly MaterialDimension[]) { return dimensions.every((d) => !d.material || d.reviewStatus !== "rejected"); }
export function decisionReady(dimensions: readonly MaterialDimension[]) { return dimensions.every((d) => !d.material || (d.status === "complete" && d.reviewStatus === "reviewed" && d.evidenceReferences.length > 0 && d.freshness === "fresh" && !d.gap)); }
export function isBindingStale(binding: DecisionBindingSnapshot, currentMaterialRevisions: Readonly<Record<string, string>>) { return Object.entries(binding.materialRevisions).some(([key, revision]) => currentMaterialRevisions[key] !== revision); }
export function t0Allows(action: string) { return ["reference_owner", "validate_fixture", "validate_architecture"].includes(action); }
export function t0CanReleasePublicCandidate() { return false; }
