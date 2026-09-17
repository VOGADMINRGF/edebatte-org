import {
  evaluateCreateInputSafety,
  type CreateInputSafetyDecision,
  type CreateInputSafetyFindingKind,
} from "@/features/create/safety/createInputSafety";

export type PublicQuestionGeneralizationOutcome =
  | "already_generalized"
  | "generalized_from_named_actor"
  | "actor_context_retained"
  | "entity_specific_procedure_review_required"
  | "entity_specific_procedure_review_resolved"
  | "personal_targeting_blocked"
  | "accusation_or_character_judgment_blocked"
  | "fact_or_truth_question_blocked"
  | "safety_blocked"
  | "safety_review_required"
  | "actor_extraction_review_required"
  | "actor_context_evidence_review_required"
  | "named_actor_targeting_review_required";

export type PublicQuestionActorType =
  | "person"
  | "company"
  | "party"
  | "organization"
  | "public_body"
  | "media"
  | "other";

export type PublicQuestionActorRole =
  | "source"
  | "initiator"
  | "affected_party"
  | "competent_authority"
  | "position_holder"
  | "documented_case"
  | "procedure_subject"
  | "context"
  | "target";

export type PublicQuestionActorContext = {
  id: string;
  name: string;
  type: PublicQuestionActorType;
  role: PublicQuestionActorRole;
  evidenceRefs: string[];
};

export type PublicQuestionProcedureContext = {
  kind:
    | "permit"
    | "procurement"
    | "merger"
    | "statute"
    | "parliamentary_procedure"
    | "administrative_procedure"
    | "other";
  entityBindingNecessary: boolean;
  evidenceRefs: string[];
};

export type PublicQuestionActorExtractionStatus =
  | "complete"
  | "incomplete"
  | "unverified";

export type PublicQuestionActorExtractionSource =
  | "entity_registry"
  | "actor_graph"
  | "create_analysis"
  | "material_provider"
  | "voxy_provider"
  | "human_review"
  | "not_available";

/**
 * Trust-boundary evidence for actor extraction. A provider that authored the
 * candidate question may contribute actor hints, but it cannot mark its own
 * extraction as independently complete.
 */
export type PublicQuestionActorExtraction = {
  status: PublicQuestionActorExtractionStatus;
  source: PublicQuestionActorExtractionSource;
  independentFromCandidateProvider: boolean;
  evidenceRefs: string[];
  humanReviewFinding?: "actor_contexts_supplied" | "no_named_actors";
};

export type PublicQuestionReleaseState = "draft_allowed" | "review_required" | "blocked";

export type PublicQuestionGeneralizationResult = {
  originalInput: string;
  candidatePublicQuestion: string;
  publicQuestion: string | null;
  outcome: PublicQuestionGeneralizationOutcome;
  releaseState: PublicQuestionReleaseState;
  actorContexts: PublicQuestionActorContext[];
  actorExtraction: PublicQuestionActorExtraction;
  procedure: PublicQuestionProcedureContext | null;
  originalSafetyDecision: CreateInputSafetyDecision;
  candidateSafetyDecision: CreateInputSafetyDecision;
  findingKinds: CreateInputSafetyFindingKind[];
  evidenceRefs: string[];
  reasons: string[];
  explanation: string;
  requiresHumanReview: boolean;
  noAutoPublish: true;
  noPositionInference: true;
  noBiasOrTrustInference: true;
};

export type EvaluatePublicQuestionGeneralizationInput = {
  originalInput: string;
  candidatePublicQuestion?: string | null;
  actorContexts: PublicQuestionActorContext[];
  actorExtraction?: PublicQuestionActorExtraction | null;
  procedure?: PublicQuestionProcedureContext | null;
  procedureReviewResolution?: {
    previousOutcome: "entity_specific_procedure_review_required";
    decision: "approved_after_human_review";
  } | null;
  locale?: string | null;
  sourceLanguage?: string | null;
  contentLanguage?: string | null;
};

const FACT_OR_TRUTH_QUESTION_RE =
  /^(?:stimmt\s+es|stimmt|trifft\s+es\s+zu|ist\s+es\s+(?:wahr|richtig)|is\s+it\s+true|is\s+the\s+claim\s+correct|did|does|do)\b.*\?$/iu;
const DECISION_QUESTION_RE =
  /\b(soll(?:en|te|ten)?|muss|müssen|darf|dürfen|welche\s+(?:regel|regeln|maßnahme|maßnahmen|option|optionen|priorität|prioritäten)|unter\s+welchen\s+voraussetzungen|bis\s+zu\s+welchem|should|must|may|which\s+(?:rule|rules|measure|measures|option|options|priority|priorities)|under\s+which\s+conditions)\b/iu;
const NORMATIVE_EVALUATION_QUESTION_RE =
  /^(?:ist|sind|is|are)\b.*\b(sinnvoll|gerecht|vertretbar|angemessen|wünschenswert|wuenschenswert|fair|reasonable|appropriate|desirable)\s*\?$/iu;
const CHARACTER_OR_SANCTION_RE =
  /\b(schuldig\w*|schuld|charakter|ehrlich\w*|unehrlich\w*|vertrauenswürdig\w*|unvertrauenswürdig\w*|beliebt\w*|unbeliebt\w*|zurücktreten|zuruecktreten|bestraft\w*|boykott\w*|ausschließ\w*|ausschliess\w*|ausgeschlossen|kündig\w*|kuendig\w*|guilty|character|honest|dishonest|trustworthy|resign|punish\w*|boycott\w*|exclude\w*|fire)\b/iu;

const ACCUSATION_FINDINGS = new Set<CreateInputSafetyFindingKind>([
  "insult_public_actor",
  "insult_private_person",
  "unsupported_allegation",
  "corruption_or_capture_claim",
  "source_bluffing",
]);

const INDEPENDENT_ACTOR_EXTRACTION_SOURCES =
  new Set<PublicQuestionActorExtractionSource>([
    "entity_registry",
    "actor_graph",
    "human_review",
  ]);

function cleanText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalized(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("de-DE")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesActorName(question: string, actor: PublicQuestionActorContext): boolean {
  const questionKey = normalized(question);
  const actorKey = normalized(actor.name);
  return actorKey.length > 1 && (` ${questionKey} `).includes(` ${actorKey} `);
}

type ActorCandidateRelation = "absent" | "context" | "normative_target" | "ambiguous";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classifyActorCandidateRelation(
  question: string,
  actor: PublicQuestionActorContext,
): ActorCandidateRelation {
  const questionKey = normalized(question);
  const actorKey = normalized(actor.name);
  if (!actorKey || !includesActorName(question, actor)) return "absent";

  const actorPattern = escapeRegExp(actorKey).replace(/\s+/g, "\\s+");
  const articlePattern = "(?:der|die|das|den|dem|des|ein|eine|einer|einem|einen|the)?";
  const modalPattern = "(?:soll|sollen|sollte|sollten|darf|dürfen|muss|müssen|should|may|must)";
  const explicitTargetPatterns = [
    new RegExp(`\\b${modalPattern}\\s+${articlePattern}\\s*${actorPattern}(?=\\s|$)`, "u"),
    new RegExp(`(?:^|\\s)(?:über|ueber|gegen)\\s+${articlePattern}\\s*${actorPattern}(?=\\s|$)`, "u"),
  ];
  if (explicitTargetPatterns.some((pattern) => pattern.test(questionKey))) {
    return "normative_target";
  }

  const explicitContextPatterns = [
    new RegExp(
      `\\b(?:laut|gemäß|gemaess)\\s+${articlePattern}\\s*${actorPattern}(?=\\s|$)`,
      "u",
    ),
    new RegExp(
      `\\bvon\\s+${articlePattern}\\s*${actorPattern}\\s+(?:empfohlen|vorgeschlagen|veröffentlicht|veroeffentlicht|dokumentiert|berichtet)\\w*\\b`,
      "u",
    ),
    new RegExp(
      `\\bnach\\s+(?:den\\s+)?(?:angaben|empfehlungen|berichten|leitlinien)\\s+(?:von|der|des)\\s+${actorPattern}(?=\\s|$)`,
      "u",
    ),
    new RegExp(
      `\\baccording\\s+to\\s+(?:the\\s+)?${actorPattern}(?=\\s|$)|(?:^|\\s)${actorPattern}[-\\s]+(?:recommended|reported|documented)\\b`,
      "u",
    ),
  ];
  if (explicitContextPatterns.some((pattern) => pattern.test(questionKey))) {
    return "context";
  }

  return "ambiguous";
}

function isFactOrTruthQuestion(question: string): boolean {
  return FACT_OR_TRUTH_QUESTION_RE.test(cleanText(question));
}

function isDecisionQuestion(question: string): boolean {
  const value = cleanText(question);
  return (
    value.endsWith("?") &&
    (DECISION_QUESTION_RE.test(value) || NORMATIVE_EVALUATION_QUESTION_RE.test(value)) &&
    !isFactOrTruthQuestion(value)
  );
}

function result(
  input: EvaluatePublicQuestionGeneralizationInput,
  params: {
    outcome: PublicQuestionGeneralizationOutcome;
    releaseState: PublicQuestionReleaseState;
    publicQuestion: string | null;
    candidatePublicQuestion: string;
    actorExtraction: PublicQuestionActorExtraction;
    originalSafetyDecision: CreateInputSafetyDecision;
    candidateSafetyDecision: CreateInputSafetyDecision;
    findingKinds: CreateInputSafetyFindingKind[];
    reasons: string[];
    explanation: string;
  },
): PublicQuestionGeneralizationResult {
  const actorContexts = input.actorContexts.map((actor) => ({
    ...actor,
    id: cleanText(actor.id),
    name: cleanText(actor.name),
    evidenceRefs: actor.evidenceRefs.map(cleanText).filter(Boolean),
  }));
  const procedure = input.procedure
    ? {
        ...input.procedure,
        evidenceRefs: input.procedure.evidenceRefs.map(cleanText).filter(Boolean),
      }
    : null;
  const actorExtraction = {
    ...params.actorExtraction,
    evidenceRefs: params.actorExtraction.evidenceRefs.map(cleanText).filter(Boolean),
  };
  return {
    originalInput: String(input.originalInput ?? ""),
    candidatePublicQuestion: params.candidatePublicQuestion,
    publicQuestion: params.publicQuestion,
    outcome: params.outcome,
    releaseState: params.releaseState,
    actorContexts,
    actorExtraction,
    procedure,
    originalSafetyDecision: params.originalSafetyDecision,
    candidateSafetyDecision: params.candidateSafetyDecision,
    findingKinds: params.findingKinds,
    evidenceRefs: Array.from(
      new Set([
        ...actorContexts.flatMap((actor) => actor.evidenceRefs),
        ...actorExtraction.evidenceRefs,
        ...(procedure?.evidenceRefs ?? []),
      ]),
    ),
    reasons: params.reasons,
    explanation: params.explanation,
    requiresHumanReview: params.releaseState !== "draft_allowed",
    noAutoPublish: true,
    noPositionInference: true,
    noBiasOrTrustInference: true,
  };
}

/**
 * Guard contract shared by Create/Voxy and every public QuestionDraft producer.
 * Entity recognition remains an upstream concern: this boundary evaluates the
 * explicit actor role and evidence instead of guessing identities from a name
 * blacklist. It returns a draft decision only and can never publish content.
 */
export function evaluatePublicQuestionGeneralization(
  input: EvaluatePublicQuestionGeneralizationInput,
): PublicQuestionGeneralizationResult {
  const originalInput = cleanText(input.originalInput);
  const candidatePublicQuestion = cleanText(input.candidatePublicQuestion ?? originalInput);
  const safety = evaluateCreateInputSafety({
    text: originalInput,
    locale: input.locale,
    sourceLanguage: input.sourceLanguage,
    contentLanguage: input.contentLanguage,
    routeStage: "analyze",
  });
  const candidateSafety = evaluateCreateInputSafety({
    text: candidatePublicQuestion,
    locale: input.locale,
    sourceLanguage: input.sourceLanguage,
    contentLanguage: input.contentLanguage,
    routeStage: "analyze",
  });
  const findingKinds = Array.from(
    new Set([...safety.findings, ...candidateSafety.findings].map((finding) => finding.kind)),
  );
  const actorExtraction: PublicQuestionActorExtraction = input.actorExtraction
    ? {
        ...input.actorExtraction,
        evidenceRefs: input.actorExtraction.evidenceRefs.map(cleanText).filter(Boolean),
      }
    : {
        status: "unverified",
        source: "not_available",
        independentFromCandidateProvider: false,
        evidenceRefs: [],
      };
  const commonResultParams = {
    candidatePublicQuestion,
    actorExtraction,
    originalSafetyDecision: safety.decision,
    candidateSafetyDecision: candidateSafety.decision,
    findingKinds,
  };
  const targetActors = input.actorContexts.filter((actor) => actor.role === "target");
  const procedureActors = input.actorContexts.filter((actor) => actor.role === "procedure_subject");
  const candidateActorRelations = input.actorContexts.map((actor) => ({
    actor,
    relation: classifyActorCandidateRelation(candidatePublicQuestion, actor),
  }));
  const semanticTargetActors = candidateActorRelations
    .filter(({ relation }) => relation === "normative_target")
    .map(({ actor }) => actor);
  const ambiguousCandidateActors = candidateActorRelations
    .filter(({ relation }) => relation === "ambiguous")
    .map(({ actor }) => actor);
  const namedActorsInInput = input.actorContexts.filter(
    (actor) => includesActorName(originalInput, actor) || includesActorName(candidatePublicQuestion, actor),
  );
  const candidateStillTargetsNamedActor = targetActors.some((actor) => {
    const relation = candidateActorRelations.find(({ actor: entry }) => entry.id === actor.id)?.relation;
    return relation === "normative_target" || relation === "ambiguous";
  });
  const hasAccusationOrCharacterJudgment =
    findingKinds.some((kind) => ACCUSATION_FINDINGS.has(kind)) ||
    CHARACTER_OR_SANCTION_RE.test(originalInput) ||
    CHARACTER_OR_SANCTION_RE.test(candidatePublicQuestion);

  if (isFactOrTruthQuestion(originalInput) || isFactOrTruthQuestion(candidatePublicQuestion)) {
    return result(input, {
      ...commonResultParams,
      outcome: "fact_or_truth_question_blocked",
      releaseState: "blocked",
      publicQuestion: null,
      reasons: [
        "facts_and_truth_are_not_preference_ballots",
        ...(isFactOrTruthQuestion(originalInput) ? ["factual_or_truth_origin_must_be_preserved"] : []),
      ],
      explanation: "Fakten- und Wahrheitsfragen werden nicht als öffentliche Präferenzabstimmung erzeugt.",
    });
  }

  if (safety.decision === "blocked" || candidateSafety.decision === "blocked") {
    return result(input, {
      ...commonResultParams,
      outcome: "safety_blocked",
      releaseState: "blocked",
      publicQuestion: null,
      reasons: [
        "create_input_safety_blocked",
        ...(safety.decision === "blocked" ? ["original_input_safety_blocked"] : []),
        ...(candidateSafety.decision === "blocked" ? ["candidate_question_safety_blocked"] : []),
      ],
      explanation: "Die bestehende Create-Sicherheitsprüfung blockiert diese Frage.",
    });
  }

  if (
    safety.decision === "moderation_required" ||
    candidateSafety.decision === "moderation_required"
  ) {
    return result(input, {
      ...commonResultParams,
      outcome: "safety_review_required",
      releaseState: "review_required",
      publicQuestion: null,
      reasons: [
        "create_input_safety_requires_moderation",
        ...(safety.decision === "moderation_required" ? ["original_input_moderation_required"] : []),
        ...(candidateSafety.decision === "moderation_required" ? ["candidate_question_moderation_required"] : []),
      ],
      explanation: "Die Frage benötigt die bestehende Moderationsprüfung und darf nicht als normaler Entwurf weitergehen.",
    });
  }

  const hasValidGeneralization =
    targetActors.length > 0 &&
    normalized(candidatePublicQuestion) !== normalized(originalInput) &&
    !candidateStillTargetsNamedActor &&
    isDecisionQuestion(candidatePublicQuestion) &&
    candidateSafety.decision !== "factcheck_required" &&
    !CHARACTER_OR_SANCTION_RE.test(candidatePublicQuestion);
  const procedure = input.procedure;
  const hasValidProcedureContext =
    procedure?.entityBindingNecessary === true &&
    procedure.evidenceRefs.some((ref) => cleanText(ref).length > 0) &&
    procedureActors.length > 0 &&
    isDecisionQuestion(candidatePublicQuestion);

  if (namedActorsInInput.length > 0 && hasAccusationOrCharacterJudgment) {
    return result(input, {
      ...commonResultParams,
      outcome: "accusation_or_character_judgment_blocked",
      releaseState: "blocked",
      publicQuestion: null,
      reasons: ["accusation_character_or_sanction_targets_named_actor"],
      explanation: "Anschuldigungen, Charakterurteile und Sanktionen gegen benannte Akteure werden nicht als öffentliche Abstimmung erzeugt.",
    });
  }

  if (targetActors.some((actor) => actor.type === "person")) {
    return result(input, {
      ...commonResultParams,
      outcome: "personal_targeting_blocked",
      releaseState: "blocked",
      publicQuestion: null,
      reasons: ["person_is_ballot_target"],
      explanation: "Eine Person darf nicht Ziel einer normalen öffentlichen Abstimmung sein.",
    });
  }

  if (semanticTargetActors.some((actor) => actor.type === "person")) {
    return result(input, {
      ...commonResultParams,
      outcome: "personal_targeting_blocked",
      releaseState: "blocked",
      publicQuestion: null,
      reasons: ["person_is_semantic_ballot_target", "actor_role_conflicts_with_candidate_targeting"],
      explanation: "Eine Person darf unabhängig von ihrer gelieferten Akteursrolle nicht Ziel einer normalen öffentlichen Abstimmung sein.",
    });
  }

  if (
    !hasValidGeneralization &&
    !hasValidProcedureContext &&
    (targetActors.length > 0 ||
      semanticTargetActors.length > 0 ||
      ambiguousCandidateActors.length > 0)
  ) {
    return result(input, {
      ...commonResultParams,
      outcome: "named_actor_targeting_review_required",
      releaseState: "review_required",
      publicQuestion: null,
      reasons: [
        ...(semanticTargetActors.length > 0 ? ["actor_role_conflicts_with_candidate_targeting"] : []),
        ...(ambiguousCandidateActors.length > 0 ? ["actor_targeting_semantics_ambiguous"] : []),
        "named_actor_remains_ballot_target",
        "generalization_missing_or_invalid",
      ],
      explanation: "Vor einem öffentlichen Entwurf ist eine sachliche Generalisierung erforderlich.",
    });
  }

  const nonAllowSafetyDecisions = [safety.decision, candidateSafety.decision].filter(
    (decision) => decision !== "allow",
  );
  if (nonAllowSafetyDecisions.length > 0) {
    return result(input, {
      ...commonResultParams,
      outcome: "safety_review_required",
      releaseState: "review_required",
      publicQuestion: null,
      reasons: [
        "create_input_safety_not_cleared",
        ...Array.from(new Set(nonAllowSafetyDecisions)).map((decision) => `safety_decision:${decision}`),
      ],
      explanation: "Die bestehende Create-Sicherheitsprüfung ist nicht vollständig freigegeben; ein normaler öffentlicher Entwurf bleibt gesperrt.",
    });
  }

  if (
    input.actorContexts.some(
      (actor) => actor.evidenceRefs.map(cleanText).filter(Boolean).length === 0,
    )
  ) {
    return result(input, {
      ...commonResultParams,
      outcome: "actor_context_evidence_review_required",
      releaseState: "review_required",
      publicQuestion: null,
      reasons: ["named_actor_context_requires_evidence"],
      explanation: "Eine Akteursnennung benötigt einen belegten Kontext, bevor ein öffentlicher Entwurf entstehen kann.",
    });
  }

  if (!isDecisionQuestion(candidatePublicQuestion)) {
    return result(input, {
      ...commonResultParams,
      outcome: "named_actor_targeting_review_required",
      releaseState: "review_required",
      publicQuestion: null,
      reasons: ["decision_question_missing_or_unclear"],
      explanation: "Die Eingabe benötigt eine überprüfbare Formulierung als Entscheidungsfrage.",
    });
  }

  const hasIndependentlyCompleteActorExtraction =
    actorExtraction.status === "complete" &&
    actorExtraction.independentFromCandidateProvider === true &&
    actorExtraction.evidenceRefs.length > 0 &&
    INDEPENDENT_ACTOR_EXTRACTION_SOURCES.has(actorExtraction.source) &&
    (actorExtraction.source !== "human_review" ||
      (input.actorContexts.length > 0
        ? actorExtraction.humanReviewFinding === "actor_contexts_supplied"
        : actorExtraction.humanReviewFinding === "no_named_actors"));

  if (!hasIndependentlyCompleteActorExtraction) {
    return result(input, {
      ...commonResultParams,
      outcome: "actor_extraction_review_required",
      releaseState: "review_required",
      publicQuestion: candidatePublicQuestion,
      reasons: [
        "actor_extraction_not_independently_complete",
        `actor_extraction_status:${actorExtraction.status}`,
        `actor_extraction_source:${actorExtraction.source}`,
        ...(actorExtraction.source === "human_review" &&
        !actorExtraction.humanReviewFinding
          ? ["human_review_actor_finding_required"]
          : []),
        ...(actorExtraction.source === "human_review" &&
        input.actorContexts.length > 0 &&
        actorExtraction.humanReviewFinding !== "actor_contexts_supplied"
          ? ["human_review_actor_contexts_must_be_acknowledged"]
          : []),
        ...(actorExtraction.source === "human_review" &&
        input.actorContexts.length === 0 &&
        actorExtraction.humanReviewFinding !== "no_named_actors"
          ? ["human_review_no_named_actors_must_be_explicit"]
          : []),
      ],
      explanation: "Die Akteurs-/Entity-Erkennung ist nicht unabhängig vollständig belegt; die Frage bleibt im Human Review.",
    });
  }

  if (hasValidProcedureContext) {
    const hasExplicitHumanProcedureResolution =
      input.procedureReviewResolution?.previousOutcome ===
        "entity_specific_procedure_review_required" &&
      input.procedureReviewResolution.decision ===
        "approved_after_human_review" &&
      actorExtraction.source === "human_review";

    if (hasExplicitHumanProcedureResolution) {
      return result(input, {
        ...commonResultParams,
        outcome: "entity_specific_procedure_review_resolved",
        releaseState: "draft_allowed",
        publicQuestion: candidatePublicQuestion,
        reasons: [
          "entity_binding_is_procedure_specific",
          "procedure_specific_human_review_completed",
        ],
        explanation:
          "Die notwendige Akteursbindung im formalen Verfahren wurde mit unabhängiger menschlicher Evidenz geprüft. Der Entwurf bleibt weiterhin getrennt von jeder Veröffentlichung.",
      });
    }

    return result(input, {
      ...commonResultParams,
      outcome: "entity_specific_procedure_review_required",
      releaseState: "review_required",
      publicQuestion: candidatePublicQuestion,
      reasons: ["entity_binding_is_procedure_specific", "human_review_before_public_release"],
      explanation: "Die Akteursbindung ist verfahrensbezogen und muss vor einer öffentlichen Freigabe geprüft werden.",
    });
  }

  if (hasValidGeneralization) {
    return result(input, {
      ...commonResultParams,
      outcome: "generalized_from_named_actor",
      releaseState: "draft_allowed",
      publicQuestion: candidatePublicQuestion,
      reasons: ["named_actor_removed_from_ballot_target", "general_rule_or_measure_retained"],
      explanation:
        "Ich habe die Frage auf die allgemeine Regel dahinter formuliert, damit nicht ein einzelner Akteur zum Abstimmungsziel wird.",
    });
  }

  if (input.actorContexts.length > 0) {
    return result(input, {
      ...commonResultParams,
      outcome: "actor_context_retained",
      releaseState: "draft_allowed",
      publicQuestion: candidatePublicQuestion,
      reasons: ["actor_is_context_not_ballot_target"],
      explanation: "Der Akteur bleibt als belegter Kontext erhalten und ist nicht das Abstimmungsziel.",
    });
  }

  return result(input, {
    ...commonResultParams,
    outcome: "already_generalized",
    releaseState: "draft_allowed",
    publicQuestion: candidatePublicQuestion,
    reasons: ["general_rule_measure_or_priority_is_ballot_target"],
    explanation: "Die Frage richtet sich bereits auf eine allgemeine Regel, Maßnahme oder Priorität.",
  });
}
