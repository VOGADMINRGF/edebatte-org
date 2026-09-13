import * as React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import PollQuestionOptionsReviewPanel from "@/features/create/PollQuestionOptionsReviewPanel";
import {
  buildPollQuestionOptionsReviewFromReviewContext,
  buildPollQuestionOptionsReviewFromVoxyDialog,
} from "@/features/create/pollQuestionOptionsReviewContract";
import { buildCanonicalLanguageBridgeRecord } from "@/features/create/languageBridgeTrustFormatContract";
import { buildCanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import { buildParticipationHandoffCandidate } from "@/features/create/participationHandoffContract";
import { buildVoxyCocreationDialog } from "@/features/create/voxyCocreationDialogContract";

function buildReviewContextFixture(input?: {
  sourceLanguage?: string;
  readingLanguage?: string;
  originalText?: string;
  openQuestions?: string[];
  sourceGaps?: string[];
  claims?: string[];
  counterPositions?: string[];
  participationCandidate?: {
    recommendation: string;
    title: string;
    prompt: string;
    options?: string[];
  } | null;
}) {
  const sourceLanguage = input?.sourceLanguage ?? "de";
  const readingLanguage = input?.readingLanguage ?? "de";
  const sourcePack = buildCanonicalSourcePack({
    sourcePackId: "source-pack-1",
    sources: [],
    openGaps: input?.sourceGaps ?? [],
  });
  const languageBridge = buildCanonicalLanguageBridgeRecord({
    sourceLanguage,
    contentLanguage: readingLanguage,
    readingLocale: readingLanguage,
    uiLocale: "de",
    originalText:
      input?.originalText ??
      "Wir brauchen sichere Schulwege und klare Prioritäten.",
    summaryText: input?.claims?.[0] ?? "Sichere Schulwege priorisieren.",
    openQuestions: input?.openQuestions ?? [],
    trustState: "source_needed",
  });

  return {
    primaryUnifiedItem: null,
    unifiedItems: [],
    sourcePack,
    languageBridge,
    multilingualThread: {
      readingLocale: readingLanguage,
    },
    multilingualEvidence: null,
    participationCandidates: input?.participationCandidate
      ? [
          buildParticipationHandoffCandidate({
            id: "candidate-1",
            recommendation: input.participationCandidate.recommendation,
            title: input.participationCandidate.title,
            prompt: input.participationCandidate.prompt,
            options: input.participationCandidate.options ?? [],
          }),
        ]
      : [],
    crossLingualSuggestions: [],
    socialOutputDrafts: [],
    dossierWorkspaceSurface: {
      title: "Arbeitsstand",
      sections: {
        claims: input?.claims ?? ["Sichere Schulwege sollen priorisiert werden."],
        counterPositions: input?.counterPositions ?? [],
        openQuestions: input?.openQuestions ?? [],
      },
    },
    voxyBriefing: null,
    voxyScriptSegments: [],
    voxyReviewState: null,
    voxyRenderJob: null,
    voxyPublishDraft: null,
  } as any;
}

describe("poll question options review contract", () => {
  it("keeps multilingual ranking candidates review-first and visible", () => {
    const model = buildPollQuestionOptionsReviewFromReviewContext(
      buildReviewContextFixture({
        sourceLanguage: "tr",
        readingLanguage: "de",
        originalText:
          "Aileler için hangi önlem önce gelmeli?",
        openQuestions: ["Welche Gruppen in beiden Sprachen müssen einbezogen werden?"],
        claims: ["Sichere Schulwege betreffen Familien und Mieter:innen."],
        participationCandidate: {
          recommendation: "poll",
          title: "Prioritäten mehrsprachig prüfen",
          prompt: "Welche Maßnahme soll zuerst kommen?",
          options: ["Sicherere Querungen", "Tempo 30", "Mehr Schulbusse"],
        },
      }),
      {
        audience: "admin",
        contributionRef: {
          id: "handoff-1",
          title: "Mehrsprachige Schulwege",
          href: "/create?resume=handoff-1",
        },
      },
    );

    expect(model).not.toBeNull();
    expect(model?.questionType).toBe("ranking");
    expect(model?.translationIsEvidence).toBe(false);
    expect(model?.biasReviewNeeds.map((item) => item.id)).toContain(
      "translation_misread_risk",
    );
    expect(model?.eligibilitySignals.map((item) => item.id)).toContain(
      "multilingual_review_needed",
    );

    const html = renderToStaticMarkup(
      React.createElement(PollQuestionOptionsReviewPanel, {
        model,
        dataTestId: "poll-question-options-review",
      }),
    );

    expect(html).toContain("Poll/Frage vorbereiten");
    expect(html).toContain("Vorschlag, kein Poll");
    expect(html).toContain("Ranking");
    expect(html).not.toContain("translation_misread_risk");
    expect(html).not.toContain("ranking");
  });

  it("derives pro-contra options from an existing review context", () => {
    const model = buildPollQuestionOptionsReviewFromReviewContext(
      buildReviewContextFixture({
        originalText:
          "Die Stadt sollte sichere Querungen priorisieren, aber Lieferzonen müssen mitgedacht werden.",
        openQuestions: ["Welche Maßnahme soll zuerst kommen?"],
        claims: ["Sichere Querungen zuerst."],
        counterPositions: ["Nein, Lieferzonen und Gewerbezugang zuerst."],
        participationCandidate: {
          recommendation: "poll",
          title: "Priorität abfragen",
          prompt: "Welche Maßnahme soll zuerst kommen?",
          options: [
            "Ja, sichere Querungen zuerst",
            "Nein, Lieferzonen und Gewerbezugang zuerst",
          ],
        },
      }),
      {
        audience: "workspace",
        dossierRef: {
          id: "dossier-1",
          title: "Schulwege und Prioritäten",
          href: "/dossier/dossier-1/studio",
        },
        contributionRef: {
          id: "handoff-2",
          title: "Sichere Schulwege",
          href: "/create?resume=handoff-2",
        },
      },
    );

    expect(model).not.toBeNull();
    expect(model?.questionType).toBe("pro_contra");
    expect(model?.optionItems.map((item) => item.optionType)).toEqual([
      "support",
      "oppose",
    ]);
    expect(model?.proposedQuestion).toBe("Welche Maßnahme soll zuerst kommen?");
    expect(model?.downstreamReadiness.find((item) => item.id === "publicPoll")?.status).toBe(
      "needs_review",
    );
    expect(model?.questionGuard).toMatchObject({
      outcome: "actor_extraction_review_required",
      releaseState: "review_required",
    });
  });

  it("keeps low-context Arabic input as open review work instead of a poll", () => {
    const dialog = buildVoxyCocreationDialog({
      contributionRef: {
        id: "local-1",
        title: "النص ما زال أوليًا",
        href: "/account",
      },
      sourceLanguage: "ar",
      readingLanguage: "de",
      uiLocale: "de",
      originalText: "نحتاج شيئًا أفضل.",
      summaryText: "Noch sehr knapp",
      sourcePresent: false,
      openQuestions: ["Was genau soll zuerst geklärt werden?"],
      uncertaintyNotes: ["source_needed", "review_first_only"],
      claimCount: 0,
      questionCount: 1,
      voxyBriefingState: "not_connected",
      surface: "account",
      maxCards: 3,
    });

    const model = buildPollQuestionOptionsReviewFromVoxyDialog(dialog, {
      contributionRef: {
        id: "local-1",
        title: "Arabischer Entwurf",
        href: "/account",
      },
    });

    expect(model).not.toBeNull();
    expect(model?.rtlDisplayHint).toBe(true);
    expect(model?.questionType).toBe("open_question");
    expect(model?.pollStatus).toBe("needs_source_review");
    expect(model?.noPollAction).toBe(true);
  });

  it("does not create options when a factual original is reframed as a normative poll", () => {
    const model = buildPollQuestionOptionsReviewFromReviewContext(
      buildReviewContextFixture({
        originalText: "Stimmt es, dass die Emissionen seit 2020 gesunken sind?",
        openQuestions: ["Soll Deutschland die Emissionen stärker senken?"],
        participationCandidate: {
          recommendation: "poll",
          title: "Emissionspolitik",
          prompt: "Soll Deutschland die Emissionen stärker senken?",
          options: ["Ja", "Nein", "Andere Maßnahme"],
        },
      }),
    );

    expect(model?.questionGuard).toMatchObject({
      outcome: "fact_or_truth_question_blocked",
      releaseState: "blocked",
    });
    expect(model?.optionItems).toEqual([]);
    expect(model?.proposedQuestion).toBeNull();
    expect(model?.downstreamReadiness.find((item) => item.id === "publicPoll")?.status).toBe(
      "blocked",
    );
  });
});
