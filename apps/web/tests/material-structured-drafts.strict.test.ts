import { describe, expect, it } from "vitest";
import { parseMaterialStructuredDraftPayload } from "@/features/material/materialStructuredDrafts";

const documentText = "Der Verein plant einen barrierefreien Umbau. Variante A bleibt im Budget. Die Mitglieder entscheiden im Oktober.";

function payload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    themes: ["Vereinsheim"],
    decisionPoints: ["Umfang des Umbaus"],
    questions: [
      {
        id: "q-umbau",
        theme: "Vereinsheim",
        originalInput: "Der Verein plant einen barrierefreien Umbau.",
        text: "Welcher Umfang des Umbaus soll priorisiert werden?",
        rationale: "Die Entscheidung steuert die weitere Planung.",
        sourceAnchors: ["barrierefreien Umbau"],
        actorContexts: [],
        procedure: null,
      },
    ],
    options: [
      { questionRef: "q-umbau", text: "Variante A", source: "document", needsReview: true },
      { questionRef: "q-umbau", text: "Weitere Variante prüfen", source: "ai_suggestion", needsReview: true },
    ],
    claimsOrSourceHints: [
      { text: "Die Mitglieder entscheiden im Oktober.", sourceAnchors: ["Die Mitglieder entscheiden im Oktober"] },
    ],
    uncertainties: ["Kosten weiterer Varianten fehlen."],
    ...overrides,
  });
}

describe("material structured draft validation", () => {
  it("accepts grounded drafts and adds trusted provenance outside provider control", () => {
    const parsed = parseMaterialStructuredDraftPayload({
      providerText: payload(),
      documentText,
      graphProvenance: ["topics:vereinsheim"],
    });

    expect(parsed.questions).toHaveLength(1);
    expect(parsed.options).toHaveLength(2);
    expect(parsed.provenance).toEqual(["material_full_text", "topics:vereinsheim"]);
    expect(parsed.questions[0].reviewState).toBe("draft");
    expect(parsed.questions[0].originalInput).toBe(
      "Der Verein plant einen barrierefreien Umbau.",
    );
    expect(parsed.questions[0].publicQuestion).toBe(
      "Welcher Umfang des Umbaus soll priorisiert werden?",
    );
    expect(parsed.questions[0].generalization.outcome).toBe("already_generalized");
    expect(parsed.questionGuardReviews).toHaveLength(1);
  });

  it("rejects non-strict provider output", () => {
    expect(() =>
      parseMaterialStructuredDraftPayload({
        providerText: payload({ inventedField: true }),
        documentText,
      }),
    ).toThrow();
  });

  it("drops invented source anchors and options labelled as document truth", () => {
    const parsed = parseMaterialStructuredDraftPayload({
      providerText: payload({
        questions: [
          {
            id: "q-erfunden",
            theme: "Vereinsheim",
            originalInput: "Der Verein plant einen barrierefreien Umbau.",
            text: "Soll eine erfundene Behauptung bestätigt werden?",
            rationale: "Nicht belegt.",
            sourceAnchors: ["Dieser Satz steht nicht im Dokument"],
            actorContexts: [],
            procedure: null,
          },
          {
            id: "q-umbau",
            theme: "Vereinsheim",
            originalInput: "Der Verein plant einen barrierefreien Umbau.",
            text: "Welcher Umfang des Umbaus soll priorisiert werden?",
            rationale: "Entscheidungspunkt.",
            sourceAnchors: ["barrierefreien Umbau"],
            actorContexts: [],
            procedure: null,
          },
        ],
        options: [
          { questionRef: "q-umbau", text: "Erfundene Dokumentoption", source: "document", needsReview: true },
          { questionRef: "q-umbau", text: "Neue Option erwägen", source: "ai_suggestion", needsReview: true },
        ],
      }),
      documentText,
    });

    expect(parsed.questions.map((question) => question.id)).toEqual(["q-umbau"]);
    expect(parsed.options).toEqual([
      expect.objectContaining({ text: "Neue Option erwägen", source: "ai_suggestion" }),
    ]);
  });

  it("runs the anti-targeting guard before retaining question and option drafts", () => {
    const targetedDocument =
      "Soll Max Mustermann zurücktreten? Der Bericht nennt Max Mustermann als Amtsträger.";
    const parsed = parseMaterialStructuredDraftPayload({
      providerText: payload({
        questions: [
          {
            id: "q-person",
            theme: "Amt",
            originalInput: "Soll Max Mustermann zurücktreten?",
            text: "Soll Max Mustermann zurücktreten?",
            rationale: "Personenbezogene Ausgangsfrage.",
            sourceAnchors: ["Max Mustermann"],
            actorContexts: [
              {
                id: "actor-max",
                name: "Max Mustermann",
                type: "person",
                role: "target",
                evidenceRefs: ["Max Mustermann"],
              },
            ],
            procedure: null,
          },
        ],
        options: [
          {
            questionRef: "q-person",
            text: "Rücktritt",
            source: "ai_suggestion",
            needsReview: true,
          },
        ],
      }),
      documentText: targetedDocument,
    });

    expect(parsed.questions).toEqual([]);
    expect(parsed.options).toEqual([]);
    expect(parsed.questionGuardReviews).toEqual([
      expect.objectContaining({
        originalInput: "Soll Max Mustermann zurücktreten?",
        outcome: "accusation_or_character_judgment_blocked",
        noAutoPublish: true,
      }),
    ]);
  });

  it("drops question and option drafts when a company target is mislabelled as source", () => {
    const targetedDocument =
      "Soll Nestlé diese Kampagne fortsetzen dürfen? Nestlé ist Betreiber der Kampagne.";
    const parsed = parseMaterialStructuredDraftPayload({
      providerText: payload({
        questions: [
          {
            id: "q-company",
            theme: "Kampagne",
            originalInput: "Soll Nestlé diese Kampagne fortsetzen dürfen?",
            text: "Soll Nestlé diese Kampagne fortsetzen dürfen?",
            rationale: "Unternehmensbezogene Ausgangsfrage.",
            sourceAnchors: ["Nestlé"],
            actorContexts: [
              {
                id: "actor-nestle",
                name: "Nestlé",
                type: "company",
                role: "source",
                evidenceRefs: ["Nestlé"],
              },
            ],
            procedure: null,
          },
        ],
        options: [
          {
            questionRef: "q-company",
            text: "Kampagne fortsetzen",
            source: "ai_suggestion",
            needsReview: true,
          },
        ],
      }),
      documentText: targetedDocument,
    });

    expect(parsed.questions).toEqual([]);
    expect(parsed.options).toEqual([]);
    expect(parsed.questionGuardReviews).toEqual([
      expect.objectContaining({
        outcome: "named_actor_targeting_review_required",
        releaseState: "review_required",
        reasons: expect.arrayContaining(["actor_role_conflicts_with_candidate_targeting"]),
      }),
    ]);
  });
});
