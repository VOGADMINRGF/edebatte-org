import { describe, expect, it } from "vitest";
import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionActorContext,
  type PublicQuestionActorExtraction,
} from "@/features/create/safety/publicQuestionGeneralization";

function actor(
  overrides: Partial<PublicQuestionActorContext> = {},
): PublicQuestionActorContext {
  return {
    id: "actor-1",
    name: "Nestlé",
    type: "company",
    role: "target",
    evidenceRefs: ["source-1"],
    ...overrides,
  };
}

const completeActorExtraction: PublicQuestionActorExtraction = {
  status: "complete",
  source: "actor_graph",
  independentFromCandidateProvider: true,
  evidenceRefs: ["actor-graph-run-1"],
};

describe("public question generalization and anti-targeting contract", () => {
  it("generalizes a company-targeted Nestlé question to the underlying advertising rule", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Darf Nestlé Milchprodukte für Babys noch bis 7 Jahre bewerben?",
      candidatePublicQuestion:
        "Bis zu welchem Kindesalter sollte Werbung für Säuglings- und Kleinkindernahrung zulässig sein?",
      actorContexts: [actor()],
      actorExtraction: completeActorExtraction,
    });

    expect(result.outcome).toBe("generalized_from_named_actor");
    expect(result.publicQuestion).not.toContain("Nestlé");
    expect(result.originalInput).toContain("Nestlé");
    expect(result.releaseState).toBe("draft_allowed");
  });

  it("generalizes a party proposal without turning the party into the ballot target", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Darf Partei X vorschlagen, Leistung Y abzuschaffen?",
      candidatePublicQuestion: "Soll Leistung Y abgeschafft, reformiert oder beibehalten werden?",
      actorContexts: [actor({ name: "Partei X", type: "party" })],
      actorExtraction: completeActorExtraction,
    });

    expect(result.outcome).toBe("generalized_from_named_actor");
    expect(result.publicQuestion).toBe(
      "Soll Leistung Y abgeschafft, reformiert oder beibehalten werden?",
    );
  });

  it("blocks a person as the direct target of a public ballot", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Soll Max Mustermann als Kandidat zugelassen werden?",
      actorContexts: [actor({ name: "Max Mustermann", type: "person" })],
    });

    expect(result.outcome).toBe("personal_targeting_blocked");
    expect(result.releaseState).toBe("blocked");
    expect(result.publicQuestion).toBeNull();
  });

  it("blocks a personal guilt question", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Ist Max Mustermann schuldig?",
      actorContexts: [actor({ name: "Max Mustermann", type: "person" })],
    });

    expect(result.outcome).toBe("accusation_or_character_judgment_blocked");
    expect(result.reasons).toContain("accusation_character_or_sanction_targets_named_actor");
  });

  it("blocks a character judgment about a named person", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Soll über den unehrlichen Charakter von Max Mustermann abgestimmt werden?",
      actorContexts: [actor({ name: "Max Mustermann", type: "person" })],
    });

    expect(result.outcome).toBe("accusation_or_character_judgment_blocked");
    expect(result.publicQuestion).toBeNull();
  });

  it("routes a neutral, evidenced entity-specific procedure to human review", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Die Stadtwerke GmbH beantragt die Genehmigung für das Wärmenetz.",
      candidatePublicQuestion:
        "Soll der Stadtwerke GmbH die Genehmigung für das beantragte Wärmenetz erteilt werden?",
      actorContexts: [
        actor({
          name: "Stadtwerke GmbH",
          type: "company",
          role: "procedure_subject",
          evidenceRefs: ["antrag-2026-09"],
        }),
      ],
      procedure: {
        kind: "permit",
        entityBindingNecessary: true,
        evidenceRefs: ["antrag-2026-09"],
      },
      actorExtraction: completeActorExtraction,
    });

    expect(result.outcome).toBe("entity_specific_procedure_review_required");
    expect(result.releaseState).toBe("review_required");
    expect(result.requiresHumanReview).toBe(true);
  });

  it.each([
    [
      "permit",
      "Stadtwerke GmbH",
      "Soll der Stadtwerke GmbH die Genehmigung für das beantragte Wärmenetz erteilt werden?",
    ],
    [
      "procurement",
      "Anbieter GmbH",
      "Soll der Anbieter GmbH im formalen Vergabeverfahren der Zuschlag erteilt werden?",
    ],
    [
      "parliamentary_procedure",
      "Deutscher Bundestag",
      "Soll der Deutsche Bundestag im formalen parlamentarischen Verfahren den dokumentierten Antrag beschließen?",
    ],
  ] as const)(
    "allows a neutral %s case only after explicit procedure-specific human review",
    (kind, name, question) => {
      const result = evaluatePublicQuestionGeneralization({
        originalInput: `Formaler Vorgang mit ${name}.`,
        candidatePublicQuestion: question,
        actorContexts: [
          actor({
            name,
            type: kind === "parliamentary_procedure" ? "public_body" : "company",
            role: "procedure_subject",
            evidenceRefs: [`procedure:${kind}`],
          }),
        ],
        procedure: {
          kind,
          entityBindingNecessary: true,
          evidenceRefs: [`procedure:${kind}`],
        },
        actorExtraction: {
          status: "complete",
          source: "human_review",
          independentFromCandidateProvider: true,
          evidenceRefs: [`human-review:${kind}`],
          humanReviewFinding: "actor_contexts_supplied",
        },
        procedureReviewResolution: {
          previousOutcome: "entity_specific_procedure_review_required",
          decision: "approved_after_human_review",
        },
      });

      expect(result.outcome).toBe("entity_specific_procedure_review_resolved");
      expect(result.releaseState).toBe("draft_allowed");
      expect(result.requiresHumanReview).toBe(false);
      expect(result.noAutoPublish).toBe(true);
    },
  );

  it("does not resolve a procedure-specific question from registry evidence alone", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Formales Genehmigungsverfahren für Stadtwerke GmbH.",
      candidatePublicQuestion:
        "Soll der Stadtwerke GmbH die Genehmigung für das beantragte Wärmenetz erteilt werden?",
      actorContexts: [
        actor({
          name: "Stadtwerke GmbH",
          type: "company",
          role: "procedure_subject",
          evidenceRefs: ["permit:1"],
        }),
      ],
      procedure: {
        kind: "permit",
        entityBindingNecessary: true,
        evidenceRefs: ["permit:1"],
      },
      actorExtraction: {
        status: "complete",
        source: "entity_registry",
        independentFromCandidateProvider: true,
        evidenceRefs: ["registry:1"],
      },
      procedureReviewResolution: {
        previousOutcome: "entity_specific_procedure_review_required",
        decision: "approved_after_human_review",
      },
    });

    expect(result.outcome).toBe("entity_specific_procedure_review_required");
    expect(result.releaseState).toBe("review_required");
  });

  it("does not resolve a procedure-specific question without human evidence", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Formales Genehmigungsverfahren für Stadtwerke GmbH.",
      candidatePublicQuestion:
        "Soll der Stadtwerke GmbH die Genehmigung für das beantragte Wärmenetz erteilt werden?",
      actorContexts: [
        actor({
          name: "Stadtwerke GmbH",
          type: "company",
          role: "procedure_subject",
          evidenceRefs: ["permit:1"],
        }),
      ],
      procedure: {
        kind: "permit",
        entityBindingNecessary: true,
        evidenceRefs: ["permit:1"],
      },
      actorExtraction: {
        status: "complete",
        source: "human_review",
        independentFromCandidateProvider: true,
        evidenceRefs: [],
      },
      procedureReviewResolution: {
        previousOutcome: "entity_specific_procedure_review_required",
        decision: "approved_after_human_review",
      },
    });

    expect(result.outcome).toBe("actor_extraction_review_required");
    expect(result.releaseState).toBe("review_required");
  });

  it.each([
    "Soll die Stadtwerke GmbH für den angeblichen Betrug bestraft werden?",
    "Soll die unehrliche Stadtwerke GmbH vom Verfahren ausgeschlossen werden?",
  ])("never lets procedure review override accusation or character safety: %s", (question) => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: question,
      candidatePublicQuestion: question,
      actorContexts: [
        actor({
          name: "Stadtwerke GmbH",
          type: "company",
          role: "procedure_subject",
          evidenceRefs: ["permit:1"],
        }),
      ],
      procedure: {
        kind: "permit",
        entityBindingNecessary: true,
        evidenceRefs: ["permit:1"],
      },
      actorExtraction: {
        status: "complete",
        source: "human_review",
        independentFromCandidateProvider: true,
        evidenceRefs: ["human-review:1"],
        humanReviewFinding: "actor_contexts_supplied",
      },
      procedureReviewResolution: {
        previousOutcome: "entity_specific_procedure_review_required",
        decision: "approved_after_human_review",
      },
    });

    expect(result.releaseState).toBe("blocked");
    expect(result.outcome).not.toBe("entity_specific_procedure_review_resolved");
  });

  it("never lets a procedure resolution override private-person targeting", () => {
    const question = "Soll Max Mustermann die persönliche Genehmigung erhalten?";
    const result = evaluatePublicQuestionGeneralization({
      originalInput: question,
      candidatePublicQuestion: question,
      actorContexts: [
        actor({
          name: "Max Mustermann",
          type: "person",
          role: "procedure_subject",
          evidenceRefs: ["permit:person:1"],
        }),
      ],
      procedure: {
        kind: "permit",
        entityBindingNecessary: true,
        evidenceRefs: ["permit:person:1"],
      },
      actorExtraction: {
        status: "complete",
        source: "human_review",
        independentFromCandidateProvider: true,
        evidenceRefs: ["human-review:person:1"],
        humanReviewFinding: "actor_contexts_supplied",
      },
      procedureReviewResolution: {
        previousOutcome: "entity_specific_procedure_review_required",
        decision: "approved_after_human_review",
      },
    });

    expect(result.outcome).toBe("personal_targeting_blocked");
    expect(result.releaseState).toBe("blocked");
  });

  it("never lets a procedure resolution turn a factual question into a ballot", () => {
    const question = "Stimmt es, dass Stadtwerke GmbH die Genehmigung erhalten hat?";
    const result = evaluatePublicQuestionGeneralization({
      originalInput: question,
      candidatePublicQuestion: question,
      actorContexts: [
        actor({
          name: "Stadtwerke GmbH",
          type: "company",
          role: "procedure_subject",
          evidenceRefs: ["permit:1"],
        }),
      ],
      procedure: {
        kind: "permit",
        entityBindingNecessary: true,
        evidenceRefs: ["permit:1"],
      },
      actorExtraction: {
        status: "complete",
        source: "human_review",
        independentFromCandidateProvider: true,
        evidenceRefs: ["human-review:1"],
        humanReviewFinding: "actor_contexts_supplied",
      },
      procedureReviewResolution: {
        previousOutcome: "entity_specific_procedure_review_required",
        decision: "approved_after_human_review",
      },
    });

    expect(result.outcome).toBe("fact_or_truth_question_blocked");
    expect(result.releaseState).toBe("blocked");
  });

  it("allows a neutral question that is already generalized", () => {
    const question = "Welche Regeln sollten für Werbung für Kleinkindernahrung gelten?";
    const result = evaluatePublicQuestionGeneralization({
      originalInput: question,
      actorContexts: [],
      actorExtraction: completeActorExtraction,
    });

    expect(result.outcome).toBe("already_generalized");
    expect(result.publicQuestion).toBe(question);
  });

  it("keeps normative evaluation distinct from a factual truth check", () => {
    const question = "Ist ein allgemeines Tempolimit sinnvoll?";
    const result = evaluatePublicQuestionGeneralization({
      originalInput: question,
      actorContexts: [],
      actorExtraction: completeActorExtraction,
    });

    expect(result.outcome).toBe("already_generalized");
    expect(result.publicQuestion).toBe(question);
  });

  it("retains an organization as a documented source without making it the target", () => {
    const question =
      "Sollten die von der WHO empfohlenen Hitzeschutzmaßnahmen übernommen werden?";
    const result = evaluatePublicQuestionGeneralization({
      originalInput: question,
      actorContexts: [actor({ name: "WHO", type: "organization", role: "source" })],
      actorExtraction: completeActorExtraction,
    });

    expect(result.outcome).toBe("actor_context_retained");
    expect(result.actorContexts[0]).toMatchObject({ name: "WHO", role: "source" });
    expect(result.publicQuestion).toBe(question);
  });

  it("does not treat a factual WHO context question as a decision question", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Sind die von der WHO empfohlenen Hitzeschutzmaßnahmen wirksam?",
      actorContexts: [actor({ name: "WHO", type: "organization", role: "source" })],
      actorExtraction: completeActorExtraction,
    });

    expect(result.releaseState).toBe("review_required");
    expect(result.outcome).not.toBe("actor_context_retained");
    expect(result.publicQuestion).toBeNull();
  });

  it("retains a named actor as case context only", () => {
    const question = "Sollten einheitliche Rückrufregeln für Lebensmittelhersteller gelten?";
    const result = evaluatePublicQuestionGeneralization({
      originalInput: question,
      actorContexts: [actor({ role: "documented_case" })],
      actorExtraction: completeActorExtraction,
    });

    expect(result.outcome).toBe("actor_context_retained");
    expect(result.reasons).toContain("actor_is_context_not_ballot_target");
  });

  it("does not turn a factual truth check into a preference ballot", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Stimmt es, dass die Emissionen seit 2020 gesunken sind?",
      actorContexts: [],
    });

    expect(result.outcome).toBe("fact_or_truth_question_blocked");
    expect(result.releaseState).toBe("blocked");
  });

  it("blocks an AI-generated normative candidate when the original is factual", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Stimmt es, dass die Emissionen seit 2020 gesunken sind?",
      candidatePublicQuestion: "Soll Deutschland die Emissionen stärker senken?",
      actorContexts: [],
    });

    expect(result.outcome).toBe("fact_or_truth_question_blocked");
    expect(result.releaseState).toBe("blocked");
    expect(result.publicQuestion).toBeNull();
    expect(result.reasons).toContain("factual_or_truth_origin_must_be_preserved");
  });

  it("rejects a company target even when upstream labels it as a source", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Soll Nestlé diese Kampagne fortsetzen dürfen?",
      actorContexts: [actor({ role: "source" })],
    });

    expect(result.outcome).toBe("named_actor_targeting_review_required");
    expect(result.releaseState).toBe("review_required");
    expect(result.publicQuestion).toBeNull();
    expect(result.reasons).toContain("actor_role_conflicts_with_candidate_targeting");
  });

  it("rejects a party target even when upstream labels it as context", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Soll Partei X Leistung Y abschaffen dürfen?",
      actorContexts: [actor({ name: "Partei X", type: "party", role: "context" })],
    });

    expect(result.outcome).toBe("named_actor_targeting_review_required");
    expect(result.releaseState).toBe("review_required");
    expect(result.reasons).toContain("actor_role_conflicts_with_candidate_targeting");
  });

  it("routes ambiguous actor semantics to review instead of trusting the supplied role", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Welche Regeln sollten gemeinsam mit Nestlé entwickelt werden?",
      actorContexts: [actor({ role: "context" })],
    });

    expect(result.outcome).toBe("named_actor_targeting_review_required");
    expect(result.releaseState).toBe("review_required");
    expect(result.publicQuestion).toBeNull();
    expect(result.reasons).toContain("actor_targeting_semantics_ambiguous");
  });

  it.each([
    ["company", "Soll Nestlé diese Kampagne fortsetzen dürfen?"],
    ["party", "Soll Partei X Leistung Y abschaffen dürfen?"],
    ["person", "Soll Max Mustermann diese Regeln bestimmen dürfen?"],
  ])(
    "keeps an unverified empty actor list for a named %s candidate in review",
    (_actorType, question) => {
      const result = evaluatePublicQuestionGeneralization({
        originalInput: question,
        actorContexts: [],
        actorExtraction: {
          status: "unverified",
          source: "material_provider",
          independentFromCandidateProvider: false,
          evidenceRefs: [],
        },
      });

      expect(result.outcome).toBe("actor_extraction_review_required");
      expect(result.releaseState).toBe("review_required");
      expect(result.requiresHumanReview).toBe(true);
    },
  );

  it("allows a general decision question only with independently complete actor extraction", () => {
    const question = "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?";
    const result = evaluatePublicQuestionGeneralization({
      originalInput: question,
      actorContexts: [],
      actorExtraction: completeActorExtraction,
    });

    expect(result.outcome).toBe("already_generalized");
    expect(result.releaseState).toBe("draft_allowed");
  });

  it("keeps complete actor extraction without evidence references in review", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
      actorContexts: [],
      actorExtraction: {
        status: "complete",
        source: "actor_graph",
        independentFromCandidateProvider: true,
        evidenceRefs: [],
      },
    });

    expect(result.outcome).toBe("actor_extraction_review_required");
    expect(result.releaseState).toBe("review_required");
  });

  it("keeps self-attested material-provider extraction in review", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
      actorContexts: [],
      actorExtraction: {
        status: "complete",
        source: "material_provider",
        independentFromCandidateProvider: true,
        evidenceRefs: ["material-provider-run-1"],
      },
    });

    expect(result.outcome).toBe("actor_extraction_review_required");
    expect(result.releaseState).toBe("review_required");
  });

  it("routes incomplete actor extraction to review even for a general question", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
      actorContexts: [],
      actorExtraction: {
        status: "incomplete",
        source: "create_analysis",
        independentFromCandidateProvider: true,
        evidenceRefs: ["analysis-run-1"],
      },
    });

    expect(result.outcome).toBe("actor_extraction_review_required");
    expect(result.releaseState).toBe("review_required");
  });

  it("blocks violent original input before a safe-looking candidate can become a draft", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Sollen wir diese Gruppe verprügeln?",
      candidatePublicQuestion: "Welche Maßnahmen sollten Konflikte friedlich lösen?",
      actorContexts: [],
      actorExtraction: completeActorExtraction,
    });

    expect(result.outcome).toBe("safety_blocked");
    expect(result.releaseState).toBe("blocked");
    expect(result.publicQuestion).toBeNull();
  });

  it("keeps moderation-required original input out of the normal draft path", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Wir regeln das selbst. Welche Maßnahmen sollen gelten?",
      candidatePublicQuestion: "Welche Maßnahmen sollten Konflikte friedlich lösen?",
      actorContexts: [],
      actorExtraction: completeActorExtraction,
    });

    expect(result.outcome).toBe("safety_review_required");
    expect(result.releaseState).toBe("review_required");
    expect(result.publicQuestion).toBeNull();
  });

  it("keeps fact-check-required origin content out of a preference ballot", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Nestlé manipuliert absichtlich die Zahlen.",
      candidatePublicQuestion: "Sollten strengere Transparenzregeln für Unternehmensdaten gelten?",
      actorContexts: [],
      actorExtraction: completeActorExtraction,
    });

    expect(result.originalSafetyDecision).toBe("factcheck_required");
    expect(result.outcome).toBe("safety_review_required");
    expect(result.releaseState).toBe("review_required");
    expect(result.publicQuestion).toBeNull();
  });

  it("requires review when a named organization remains the target without a generalization", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Soll Unternehmen Z diese Kampagne fortsetzen dürfen?",
      actorContexts: [actor({ name: "Unternehmen Z" })],
    });

    expect(result.outcome).toBe("named_actor_targeting_review_required");
    expect(result.releaseState).toBe("review_required");
  });

  it("never authorizes automatic publication", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
      actorContexts: [],
    });

    expect(result.noAutoPublish).toBe(true);
    expect(result).not.toHaveProperty("publish");
  });

  it("does not infer positions, political bias, or trust from actor identity", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Welche Regeln sollten für Wahlkampfwerbung gelten?",
      actorContexts: [actor({ name: "Partei X", type: "party", role: "position_holder" })],
    });

    expect(result.noPositionInference).toBe(true);
    expect(result.noBiasOrTrustInference).toBe(true);
    expect(result.actorContexts[0]).toEqual({
      id: "actor-1",
      name: "Partei X",
      type: "party",
      role: "position_holder",
      evidenceRefs: ["source-1"],
    });
    expect(result.actorContexts[0]).not.toHaveProperty("bias");
    expect(result.actorContexts[0]).not.toHaveProperty("trust");
  });

  it("does not trust a context role that contradicts an actor-directed character judgment", () => {
    const result = evaluatePublicQuestionGeneralization({
      originalInput: "Soll die unehrliche Partei X ausgeschlossen werden?",
      actorContexts: [actor({ name: "Partei X", type: "party", role: "context" })],
    });

    expect(result.outcome).toBe("accusation_or_character_judgment_blocked");
    expect(result.releaseState).toBe("blocked");
  });

  it("keeps the original input exactly reviewable", () => {
    const originalInput = "  Welche Maßnahmen sollten Kommunen priorisieren?\n";
    const result = evaluatePublicQuestionGeneralization({ originalInput, actorContexts: [] });

    expect(result.originalInput).toBe(originalInput);
  });
});
