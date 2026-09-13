import { describe, expect, it } from "vitest";

import {
  createEmptyVoxyCoCreationState,
  evaluateVoxyCoCreationPublicQuestion,
  isVoxyCoCreationReadyForExport,
  VOXY_EDITORIAL_REVIEW_STATUSES,
  VoxyCoCreationStateSchema,
} from "@/features/voxy/coCreationState";

const completeGuardContext = {
  actorContexts: [],
  actorExtraction: {
    status: "complete" as const,
    source: "actor_graph" as const,
    independentFromCandidateProvider: true,
    evidenceRefs: ["actor-graph-run-1"],
  },
};

describe("voxy co-creation state contract", () => {
  it("keeps author approval and editorial review as separate gates", () => {
    const authorOnlyApproved = {
      ...createEmptyVoxyCoCreationState(),
      authorApprovalStatus: "author_confirmed" as const,
      editorialReviewStatus: "submitted" as const,
    };

    const editorialOnlyApproved = {
      ...createEmptyVoxyCoCreationState(),
      authorApprovalStatus: "needs_author_input" as const,
      editorialReviewStatus: "approved_for_export" as const,
    };

    expect(isVoxyCoCreationReadyForExport(authorOnlyApproved)).toBe(false);
    expect(isVoxyCoCreationReadyForExport(editorialOnlyApproved)).toBe(false);
  });

  it("requires both gates before export readiness", () => {
    const ready = {
      ...createEmptyVoxyCoCreationState(),
      rawObservation: "Kommunen benötigen wirksame Hitzeschutzmaßnahmen.",
      publicQuestion: "Welche Maßnahmen sollten Kommunen gegen Hitze priorisieren?",
      authorApprovalStatus: "author_confirmed" as const,
      editorialReviewStatus: "approved_for_export" as const,
    };

    expect(isVoxyCoCreationReadyForExport(ready, completeGuardContext)).toBe(true);
  });

  it("does not export a provider-authored public question with unverified actor extraction", () => {
    const state = {
      ...createEmptyVoxyCoCreationState(),
      rawObservation: "Nestlé betreibt diese Kampagne.",
      publicQuestion: "Soll Nestlé diese Kampagne fortsetzen dürfen?",
      authorApprovalStatus: "author_confirmed" as const,
      editorialReviewStatus: "approved_for_export" as const,
    };

    const guard = evaluateVoxyCoCreationPublicQuestion(state);
    expect(guard.outcome).toBe("actor_extraction_review_required");
    expect(isVoxyCoCreationReadyForExport(state)).toBe(false);
  });

  it("keeps a factual original out of Voxy export even when the candidate is normative", () => {
    const state = {
      ...createEmptyVoxyCoCreationState(),
      rawObservation: "Stimmt es, dass die Emissionen seit 2020 gesunken sind?",
      publicQuestion: "Soll Deutschland die Emissionen stärker senken?",
      authorApprovalStatus: "author_confirmed" as const,
      editorialReviewStatus: "approved_for_export" as const,
    };

    const guard = evaluateVoxyCoCreationPublicQuestion(state, completeGuardContext);
    expect(guard.outcome).toBe("fact_or_truth_question_blocked");
    expect(isVoxyCoCreationReadyForExport(state, completeGuardContext)).toBe(false);
  });

  it("keeps blocked safety input out of Voxy export", () => {
    const state = {
      ...createEmptyVoxyCoCreationState(),
      rawObservation: "Sollen wir diese Gruppe verprügeln?",
      publicQuestion: "Welche Maßnahmen sollten Konflikte friedlich lösen?",
      authorApprovalStatus: "author_confirmed" as const,
      editorialReviewStatus: "approved_for_export" as const,
    };

    const guard = evaluateVoxyCoCreationPublicQuestion(state, completeGuardContext);
    expect(guard.outcome).toBe("safety_blocked");
    expect(isVoxyCoCreationReadyForExport(state, completeGuardContext)).toBe(false);
  });

  it("treats approved_for_export as distinct from publication", () => {
    expect(VOXY_EDITORIAL_REVIEW_STATUSES).toContain("approved_for_export");
    expect(VOXY_EDITORIAL_REVIEW_STATUSES).not.toContain("published");
  });

  it("models the required co-creation fields as a typed contract", () => {
    const parsed = VoxyCoCreationStateSchema.parse({
      ...createEmptyVoxyCoCreationState(),
      authorIntent: "Ich will das Problem als faire Reformfrage sichtbar machen.",
      rawObservation: "Viele Bewerber erleben Ghosting nach offiziellen Zusagen.",
      nonNegotiableThesis: "Das Problem ist strukturell, nicht nur individuell.",
      structuralIssue: "Fehlende Verbindlichkeit im Bewerbungsprozess.",
      publicQuestion: "Welche Mindeststandards braucht ein fairer Bewerbungsprozess?",
      verifiedFacts: ["Absagefristen fehlen oft."],
      assumptions: ["Interne Prozesse sind ueberlastet."],
      openQuestions: ["Wie haeufig ist das in kleinen Betrieben?"],
      sensitiveClaims: ["Kein Vorwurf gegen konkrete Firmen ohne Beleg."],
      bothSidesObligations: {
        sideA: ["Arbeitgeber muessen Rueckmeldungen verlässlich machen."],
        sideB: ["Bewerber muessen zugesagte Termine ebenfalls einhalten."],
      },
      reformProposal: "Ein transparenter Mindeststandard fuer Rueckmeldungen.",
      safeguards: ["Keine Namensnennung ohne dossiergebundene Belege."],
      tonePreference: "scharf, aber fair",
      authorApprovalStatus: "author_confirmed",
      editorialReviewStatus: "submitted",
    });

    expect(parsed.authorApprovalStatus).toBe("author_confirmed");
    expect(parsed.editorialReviewStatus).toBe("submitted");
  });
});
