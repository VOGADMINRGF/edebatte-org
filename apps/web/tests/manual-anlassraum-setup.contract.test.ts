import { describe, expect, it } from "vitest";
import {
  buildManualAnlassraumStartDraft,
  buildManualAnlassraumServerDraftSavePayload,
  buildManualAnlassraumContinueCreateHref,
  buildManualAnlassraumPrefill,
  createEmptyManualAnlassraumSetup,
  getManualAnlassraumSignalTitle,
  readManualAnlassraumServerDraftSnapshot,
  resolveManualAnlassraumActionState,
} from "@/features/surfaces/runden/manualAnlassraumSetup";

describe("manual anlassraum setup contract", () => {
  it("starts with KI disabled and two empty option slots", () => {
    const setup = createEmptyManualAnlassraumSetup();

    expect(setup.aiSupportMode).toBe("disabled");
    expect(setup.communityOptionsMode).toBe("disabled");
    expect(setup.visibility).toBe("private_draft");
    expect(setup.options).toEqual(["", ""]);
  });

  it("allows saving and internal start without KI once frame input exists", () => {
    const setup = {
      ...createEmptyManualAnlassraumSetup(),
      title: "Schulwege rund um die Grundschule",
      options: ["Ja, sofort sichern", "Erst weiter prüfen"],
    };

    const actionState = resolveManualAnlassraumActionState(setup);

    expect(actionState.canSaveDraft).toBe(true);
    expect(actionState.canStartInternal).toBe(true);
    expect(actionState.canSubmitPublicReview).toBe(true);
    expect(actionState.publicReviewRequirements).toEqual([]);
  });

  it("requires at least two options before public review submission", () => {
    const setup = {
      ...createEmptyManualAnlassraumSetup(),
      votingQuestion: "Welche Lösung soll zuerst umgesetzt werden?",
      options: ["Nur eine Option", ""],
    };

    const actionState = resolveManualAnlassraumActionState(setup);

    expect(actionState.canSaveDraft).toBe(true);
    expect(actionState.canSubmitPublicReview).toBe(false);
    expect(actionState.publicReviewRequirements).toContain(
      "Für eine öffentliche Einreichung braucht es mindestens zwei Optionen.",
    );
  });

  it("builds a continue-to-create href with prefill and no auto-analyze flags", () => {
    const setup = {
      ...createEmptyManualAnlassraumSetup(),
      title: "Sichere Schulwege",
      votingQuestion: "Welche Maßnahme soll zuerst kommen?",
      description: "Eltern und Kinder melden seit Wochen kritische Kreuzungen.",
      visibility: "public_after_review" as const,
      communityOptionsMode: "review_required" as const,
      aiSupportMode: "optional_suggestions" as const,
      options: ["Zebrastreifen", "Tempo 30", "Mehr Schulweghelfer"],
    };

    const href = buildManualAnlassraumContinueCreateHref({
      setup,
      returnTo: "/runden/new",
      draftId: "65a111111111111111111122",
    });

    expect(href).toContain("mode=source");
    expect(href).toContain("source=runden");
    expect(href).toContain("reason=manual_anlassraum_continue_create");
    expect(href).toContain("draftId=65a111111111111111111122");
    expect(href).toContain("signalTitle=Sichere+Schulwege");
    expect(href).toContain("returnTo=%2Frunden%2Fnew");
    expect(href).toContain("prefill=");
    expect(href).not.toContain("autoAnalyze");
    expect(href).not.toContain("autoPublish");
    expect(href).not.toContain("autoDossier");
  });

  it("formats the prefill as a readable manual draft summary", () => {
    const setup = {
      ...createEmptyManualAnlassraumSetup(),
      title: "Neue Radwege im Kiez",
      votingQuestion: "Welche Strecke hat Vorrang?",
      options: ["Nordroute", "Südroute"],
    };

    expect(getManualAnlassraumSignalTitle(setup)).toBe("Neue Radwege im Kiez");
    expect(buildManualAnlassraumPrefill(setup)).toContain("Manueller Anlassraum-Entwurf");
    expect(buildManualAnlassraumPrefill(setup)).toContain("Titel: Neue Radwege im Kiez");
    expect(buildManualAnlassraumPrefill(setup)).toContain("Optionen:");
    expect(buildManualAnlassraumPrefill(setup)).toContain("- Nordroute");
    expect(buildManualAnlassraumPrefill(setup)).toContain("- Südroute");
  });

  it("builds a resumable no-ai round draft on the existing start-draft structure", () => {
    const setup = {
      ...createEmptyManualAnlassraumSetup(),
      title: "Sichere Schulwege, jetzt",
      votingQuestion: "Welche Maßnahme soll zuerst starten?",
      description: "Eltern, Kinder und Schule melden seit Wochen kritische Situationen.",
      options: ["Zebrastreifen", "Tempo 30"],
    };

    const draft = buildManualAnlassraumStartDraft(setup);

    expect(draft).toMatchObject({
      origin: "round_handoff",
      intent: "round_suggestion",
      targetHint: "rounds",
      noAutoPublish: true,
      noAutoDossier: true,
      noAutoAnlassraum: true,
      noAutoDeepSearch: true,
      noAutoGraphWrite: true,
    });
    expect(draft?.text).toContain("Titel: Sichere Schulwege, jetzt");
    expect(draft?.text).toContain("Abstimmungsfrage: Welche Maßnahme soll zuerst starten?");
    expect(draft?.preview?.suggestedNextSteps).toContain("Runde weiterbearbeiten");
    expect(draft?.preview?.suggestedNextSteps).toContain("Nur bei Bedarf in /create vertiefen");
  });

  it("serializes and reads the manual round server draft on the existing drafts structure", () => {
    const setup = {
      ...createEmptyManualAnlassraumSetup(),
      title: "Ruhiger Verkehr vor der Schule",
      votingQuestion: "Welche Maßnahme setzen wir zuerst um?",
      description: "Sicherer Schulweg mit klaren nächsten Schritten.",
      options: ["Tempo 30", "Zebrastreifen"],
    };

    const payload = buildManualAnlassraumServerDraftSavePayload({
      setup,
      draftId: "65a111111111111111111122",
    });
    const snapshot = readManualAnlassraumServerDraftSnapshot({
      _id: "65a111111111111111111122",
      source: payload.source,
      updatedAt: "2026-07-03T12:00:00.000Z",
      analysis: payload.analysis,
    });

    expect(payload).toMatchObject({
      draftId: "65a111111111111111111122",
      source: "runden_manual_anlassraum",
      textPrepared: expect.stringContaining("Manueller Anlassraum-Entwurf"),
      analysis: {
        manualAnlassraumDraft: {
          questionGuard: {
            releaseState: "review_required",
            outcome: "actor_extraction_review_required",
          },
        },
      },
    });
    expect(snapshot).toMatchObject({
      draftId: "65a111111111111111111122",
      updatedAt: "2026-07-03T12:00:00.000Z",
      setup: {
        title: "Ruhiger Verkehr vor der Schule",
        votingQuestion: "Welche Maßnahme setzen wir zuerst um?",
      },
    });
  });
});
