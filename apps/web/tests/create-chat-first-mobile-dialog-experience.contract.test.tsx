import type * as React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import CreateLinkIntakeClarification from "@/features/create/CreateLinkIntakeClarification";
import CreateVisualFollowup from "@/features/create/CreateVisualFollowup";
import { buildCreateTechnicalFollowup } from "@/features/create/intelligentFollowupResults";
import { detectCreateLinkIntake } from "@/features/create/linkIntake";
import {
  getCreateSurfaceModeDefinitions,
  getCreateSurfaceTexts,
} from "@/features/create/createSurfaceConfig";

const FOLLOWUP_RESULT = {
  understanding: {
    summary: "Du möchtest die Schulwegsicherheit rund um die Grundschule verbessern.",
    dossierContext: "Sichere Schulwege im Bezirk",
    categories: [
      { id: "hint", label: "Hinweis", confidence: "high" as const },
    ],
    topics: [
      { id: "mobility_urban", label: "Mobilität & Stadtentwicklung", confidence: "high" as const },
      { id: "local_community", label: "Kommunales & Lebensumfeld", confidence: "medium" as const },
    ],
    statements: [
      {
        id: "s1",
        text: "Vor der Schule fehlen sichere Querungen und Tempo-30-Kontrollen.",
        kind: "demand" as const,
        stance: "pro" as const,
        confidence: "high" as const,
      },
    ],
    scopes: ["district" as const],
    confidence: "high" as const,
  },
  suggestions: [
    {
      id: "dossier:auto",
      kind: "dossier" as const,
      title: "Sichere Schulwege im Bezirk",
      reason: "Das Thema passt zu einem bestehenden Arbeitsstand.",
      confidence: "high" as const,
      href: "/dossier?topic=schulwege",
      requiresConfirmation: true as const,
    },
  ],
  sourceText: "Vor der Schule fehlen sichere Querungen und Tempo-30-Kontrollen.",
  generatedAt: "2026-05-08T12:00:00.000Z",
  meta: {
    researchUsed: "none" as const,
    researchProvider: null,
    deepSearchUsed: false,
    analysis: {
      state: "result_ready" as const,
      analysisId: "analysis-schoolways",
      sourceType: "text" as const,
      sourceUrl: null,
      sourceContentHash: "hash-schoolways",
      analyzedAt: "2026-05-08T12:00:00.000Z",
      orchestrationRunId: "orch-schoolways",
      schemaVersion: "create_followup.v2",
      validationStatus: "validated" as const,
      evidenceReferences: [],
      confidence: 0.84,
      sourceLoaded: true,
      userMessage: null,
    },
  },
};

const MULTI_BRANCH_FOLLOWUP_RESULT = {
  understanding: {
    summary:
      "Du beschreibst mehrere Mobilitäts- und Planungsfragen rund um Abendtakt, S-Bahn-Anschluss, Straßenumbau und Parkraum.",
    dossierContext: "Mobilität und Straßenumbau im Bezirk",
    categories: [
      { id: "hint", label: "Hinweis", confidence: "high" as const },
    ],
    topics: [
      { id: "topic-1", label: "ÖPNV und Mobilität", confidence: "high" as const },
      { id: "topic-2", label: "Straßenraum und Radverkehr", confidence: "high" as const },
      { id: "topic-3", label: "Parkraum und kommunale Planung", confidence: "high" as const },
      { id: "topic-4", label: "Pendler- und Anschlussmobilität", confidence: "medium" as const },
    ],
    statements: [
      {
        id: "s1",
        text: "Bei uns im Bezirk fährt der Bus abends nur noch alle 30 Minuten.",
        kind: "claim" as const,
        stance: "open" as const,
        confidence: "high" as const,
      },
      {
        id: "s2",
        text: "Dadurch verpassen viele Beschäftigte den Anschluss an die S-Bahn.",
        kind: "claim" as const,
        stance: "open" as const,
        confidence: "high" as const,
      },
      {
        id: "s3",
        text: "Gleichzeitig soll die Hauptstraße umgebaut werden, aber niemand weiß, ob dabei Parkplätze wegfallen oder neue Radwege entstehen.",
        kind: "claim" as const,
        stance: "open" as const,
        confidence: "high" as const,
      },
    ],
    scopes: ["municipal" as const],
    confidence: "high" as const,
  },
  suggestions: [
    {
      id: "dossier:auto",
      kind: "dossier" as const,
      title: "Kommunale Prioritäten und Zielkonflikte",
      reason: "Mehrere Themen sollen gemeinsam in einen Arbeitsstand überführt werden.",
      confidence: "high" as const,
      href: "/dossier?topic=kommunale-prioritaeten",
      requiresConfirmation: true as const,
    },
    {
      id: "vote:auto",
      kind: "vote" as const,
      title: "Welche Prioritäten sollen zuerst bearbeitet werden?",
      reason: "Die Leitfrage passt zur beschriebenen Abwägung.",
      confidence: "medium" as const,
      href: "/swipes?topic=kommunale-prioritaeten",
      requiresConfirmation: true as const,
    },
  ],
  sourceText:
    "Bei uns im Bezirk fährt der Bus abends nur noch alle 30 Minuten. Dadurch verpassen viele Beschäftigte den Anschluss an die S-Bahn. Gleichzeitig soll die Hauptstraße umgebaut werden, aber niemand weiß, ob dabei Parkplätze wegfallen oder neue Radwege entstehen.",
  generatedAt: "2026-05-09T12:00:00.000Z",
  meta: {
    researchUsed: "none" as const,
    researchProvider: null,
    deepSearchUsed: false,
    analysis: {
      state: "result_ready" as const,
      analysisId: "analysis-bus-street",
      sourceType: "text" as const,
      sourceUrl: null,
      sourceContentHash: "hash-bus-street",
      analyzedAt: "2026-05-09T12:00:00.000Z",
      orchestrationRunId: "orch-bus-street",
      schemaVersion: "create_followup.v2",
      validationStatus: "validated" as const,
      evidenceReferences: [],
      confidence: 0.88,
      sourceLoaded: true,
      userMessage: null,
    },
  },
};

const OVERFLOW_MULTI_BRANCH_FOLLOWUP_RESULT = {
  ...MULTI_BRANCH_FOLLOWUP_RESULT,
  understanding: {
    ...MULTI_BRANCH_FOLLOWUP_RESULT.understanding,
    topics: [
      ...MULTI_BRANCH_FOLLOWUP_RESULT.understanding.topics,
      { id: "topic-5", label: "Lieferverkehr und Schulwege", confidence: "medium" as const },
    ],
  },
};

const PROVISIONAL_QUOTA_FOLLOWUP_RESULT = buildCreateTechnicalFollowup({
  text:
    "In Rahnsdorf fehlen sichere Querungen an Kita, Straße und Haltestelle. Radfahrer kommen schlecht durch, Bauprojekte verdrängen Grünflächen und der Haushalt ist knapp.",
  analysisState: "ai_failed",
  sourceType: "text",
  sourceLoaded: true,
  userMessage:
    "Die KI-Analyse konnte noch nicht durchgeführt werden. Es wurden keine Themen abgeleitet.",
});

const FOLLOWUP_ACTIONS = {
  onPrepareSubmission: () => {},
  onPrepareAnlassraum: () => {},
  onOpenDossierAppend: () => {},
  onOpenDossierCreate: () => {},
  onPrepareVote: () => {},
  onRequestEditorialReview: () => {},
  onStartOptionalService: () => {},
  onSaveOnly: () => {},
};

function renderVisualFollowup() {
  return renderToStaticMarkup(
    <CreateVisualFollowup
      result={FOLLOWUP_RESULT}
      factcheckMessage="Optional. Startet erst nach bewusster Bestätigung. Keine automatische Kostenbuchung."
      onConfirm={() => {}}
      onEdit={() => {}}
      {...FOLLOWUP_ACTIONS}
      continuationValue=""
      onContinuationChange={() => {}}
      onContinueConversation={() => {}}
    />,
  );
}

function renderVisualFollowupInEditMode() {
  return renderToStaticMarkup(
    <CreateVisualFollowup
      result={FOLLOWUP_RESULT}
      showCorrectionComposer
      onConfirm={() => {}}
      onEdit={() => {}}
      {...FOLLOWUP_ACTIONS}
      continuationValue=""
      onContinuationChange={() => {}}
      onContinueConversation={() => {}}
    />,
  );
}

function renderMultiBranchVisualFollowup(
  isConfirmed = false,
  extraProps: Partial<React.ComponentProps<typeof CreateVisualFollowup>> = {},
) {
  return renderToStaticMarkup(
    <CreateVisualFollowup
      result={MULTI_BRANCH_FOLLOWUP_RESULT}
      isConfirmed={isConfirmed}
      factcheckMessage="Optional. Startet erst nach bewusster Bestätigung. Keine automatische Kostenbuchung."
      onConfirm={() => {}}
      onEdit={() => {}}
      {...FOLLOWUP_ACTIONS}
      continuationValue=""
      onContinuationChange={() => {}}
      onContinueConversation={() => {}}
      {...extraProps}
    />,
  );
}

function renderProvisionalQuotaFollowup() {
  return renderToStaticMarkup(
    <CreateVisualFollowup
      result={PROVISIONAL_QUOTA_FOLLOWUP_RESULT}
      onConfirm={() => {}}
      onEdit={() => {}}
      {...FOLLOWUP_ACTIONS}
      continuationValue=""
      onContinuationChange={() => {}}
      onContinueConversation={() => {}}
    />,
  );
}

describe("create chat-first mobile dialog experience contract", () => {
  it("keeps visible create copy free of technical internal terms", () => {
    const html = renderVisualFollowup();
    const linkHtml = renderToStaticMarkup(
      <CreateLinkIntakeClarification
        locale="de"
        detection={detectCreateLinkIntake("https://example.com/artikel")}
        selectedIntentId="extract_claims"
        additionalContext=""
        onSelectIntent={() => {}}
        onAdditionalContextChange={() => {}}
      />,
    );
    const surfaceTexts = getCreateSurfaceTexts("de");
    const modeDefinitions = Object.values(getCreateSurfaceModeDefinitions("de"));
    const visibleConfigText = [
      surfaceTexts.followupQuestionLabel,
      surfaceTexts.followupNextStepLabel,
      surfaceTexts.followupNextStepLead,
      surfaceTexts.followupGuidedTitle,
      surfaceTexts.followupGuidedLead,
      ...modeDefinitions.flatMap((mode) => [
        mode.description,
        mode.helperText,
        mode.placeholder,
        mode.ctaLabel,
        mode.firstQuestion,
        mode.firstQuestionPlaceholder,
        mode.postStartTitle,
        mode.postStartLead,
        ...mode.openPoints,
        ...mode.nextActions,
      ]),
    ].join(" ");

    const combined = `${html} ${linkHtml} ${visibleConfigText}`;
    expect(combined).not.toContain("Part06");
    expect(combined).not.toContain("Dossier-Kontext");
    expect(combined).not.toContain("Anschlussdaten");
    expect(combined).not.toContain("sourceHints");
    expect(combined).not.toContain("evidenceNeeds");
    expect(combined).not.toContain("Claims");
  });

  it("shows draft mode as a dialog question instead of a panel-heavy flow", () => {
    const guided = getCreateSurfaceModeDefinitions("de").guided;
    const texts = getCreateSurfaceTexts("de");

    expect(guided.firstQuestion).toBe("Wofür soll der Entwurf zuerst genutzt werden?");
    expect(guided.firstQuestionPlaceholder).toContain("Beitrag");
    expect(guided.postStartLead).toContain("statt dich in ein Formular zu schicken");
    expect(texts.followupGuidedTitle).toContain("Ich baue daraus einen kompakten Arbeitsstand");
  });

  it("keeps the pre-confirmation flow statement-first with one primary confirmation action", () => {
    const html = renderVisualFollowup();

    expect(html).toContain("Chat-Arbeitsstand für deinen Beitrag");
    expect(html).not.toContain("1 · Beitrag aufgenommen");
    expect(html).toContain("Themenstruktur bestätigen");
    expect(html).toContain("Themen ändern");
    expect(html).not.toContain("Aussage schärfen");
    expect(html).not.toContain("Quelle vormerken");
    expect(html).not.toContain("Später weiterarbeiten");
    expect((html.match(/btn-primary/g) ?? []).length).toBe(1);
    expect(html).not.toContain("Faktencheck / Deep Search starten");
  });

  it("renders a compact understood state before details", () => {
    const html = renderMultiBranchVisualFollowup();

    expect(html).toContain("Ich habe diese Themen erkannt.");
    expect(html).toContain("Erkannte Themen");
    expect(html).toContain("aus deinem Beitrag erkannt");
    expect(html).toContain("Deine Struktur");
    expect(html).toContain("ÖPNV und Mobilität");
    expect(html).toContain("Straßenraum und Radverkehr");
    expect(html).toContain("Parkraum und kommunale Planung");
    expect(html).toContain("data-create-chat-thread");
    expect(html).toContain("data-create-structure-rail");
    expect(html).toContain("data-mobile-inline-create-actions");
    expect(html).not.toContain("data-create-pipeline-rail");
    expect(html).toContain("data-create-inline-structure-summary");
    expect(html).toContain("data-create-topic-branches");
    expect(html).not.toContain("1 · Beitrag aufgenommen");
    expect(html).not.toContain("3 · Entscheidung offen");
    expect(html).toContain("Was du jetzt tun kannst");
    expect(html).toContain("Themenstruktur bestätigen");
    expect(html).not.toContain("Themenzweig");
    expect(html).toContain("Details &amp; Transparenz");
    expect(html).not.toContain("Korrektur oder Ergänzung");
    expect(html).not.toContain("Original oben anzeigen");
  });

  it("keeps the technical planner fallback in a clearly degraded clarification state", () => {
    const html = renderProvisionalQuotaFollowup();

    expect(html).toContain("Dein Beitrag ist angekommen.");
    expect(html).toContain("Du kannst die Einordnung erneut versuchen oder später fortsetzen.");
    expect(html).toContain("Es wurden keine Themen abgeleitet.");
    expect(html).not.toContain("Analyse blockiert");
    expect(html).not.toContain("Eingabe speichern");
    expect(html).not.toContain("Themenstruktur bestätigen");
    expect(html).not.toContain("Aussage schärfen");
    expect(html).not.toContain("Quelle vormerken");
    expect(html).not.toContain("Später weiterarbeiten");
    expect(html).not.toContain("KI-Suche aktivieren");
    expect(html).not.toContain("Bericht an die Redaktion senden");
  });

  it("only opens the correction composer after edit mode is active", () => {
    const defaultHtml = renderVisualFollowup();
    const editHtml = renderVisualFollowupInEditMode();

    expect(defaultHtml).not.toContain("Korrektur oder Ergänzung");
    expect(defaultHtml).not.toContain("Antwort fortsetzen");
    expect(editHtml).toContain("Korrektur oder Ergänzung");
    expect(editHtml).toContain("Antwort fortsetzen");
  });

  it("shows the next-step choices only after confirmation and keeps external source analysis secondary", () => {
    const html = renderMultiBranchVisualFollowup(true);

    expect(html).toContain("Was du jetzt tun kannst");
    expect(html).toContain("Aussage schärfen");
    expect(html).toContain("Frage vormerken");
    expect(html).toContain("Thema vormerken");
    expect(html).toContain("Quelle vormerken");
    expect(html).toContain("Für Community vorbereiten");
    expect(html).toContain("Später weiterarbeiten");
    expect(html).toContain("Kein Auto-Publish");
  });

  it("offers a compact link and overflow decision without auto-starting external search", () => {
    const html = renderToStaticMarkup(
      <CreateVisualFollowup
        result={OVERFLOW_MULTI_BRANCH_FOLLOWUP_RESULT}
        linkDetection={detectCreateLinkIntake("https://example.com/artikel Mehr Themen bitte prüfen")}
        compactBranchLimit={4}
        expandedBranchLimit={6}
        expandedTopicAccess={{
          canPreviewAllTopics: true,
          isPrivilegedPreview: false,
          costState: "uses_search_credit",
        }}
        onConfirm={() => {}}
        onEdit={() => {}}
        {...FOLLOWUP_ACTIONS}
        continuationValue=""
        onContinuationChange={() => {}}
        onContinueConversation={() => {}}
      />,
    );

    expect(html).toContain("Ich habe 5 Themen erkannt. Vier zeige ich dir kompakt.");
    expect(html).toContain("Ein weiteres Thema wurde erkannt.");
    expect(html).toContain("Alle 5 Themen anzeigen");
    expect(html).toContain("Nur mit diesen 4 weiterarbeiten");
    expect(html).toContain("Später");
    expect(html).toContain("Die vollständige Quellenprüfung nutzt 1 Recherche-Kontingent.");
    expect(html).not.toContain("0 EUR");
  });

  it("surfaces the place clarification prominently for vague local references", () => {
    const html = renderToStaticMarkup(
      <CreateVisualFollowup
        result={{
          ...FOLLOWUP_RESULT,
          sourceText: "Bei uns in der Stadt ist der Schulweg morgens gefährlich.",
          understanding: {
            ...FOLLOWUP_RESULT.understanding,
            openQuestion: "Auf welchen Ort, Bezirk oder welche Kommune bezieht sich dein Hinweis?",
          },
        }}
        onConfirm={() => {}}
        onEdit={() => {}}
        {...FOLLOWUP_ACTIONS}
        continuationValue=""
        onContinuationChange={() => {}}
        onContinueConversation={() => {}}
      />,
    );

    expect(html).toContain("Um welchen Ort geht es?");
    expect(html).toContain("Ort ergänzen");
    expect(html).toContain("Ort später ergänzen");
  });

  it("does not turn non-local open questions into place clarification", () => {
    const html = renderToStaticMarkup(
      <CreateVisualFollowup
        result={{
          ...FOLLOWUP_RESULT,
          sourceText:
            "Ich bin für besseren Tierschutz und Tierhaltung. Das sollte Europa und weltweit einheitlich umgesetzt werden.",
          understanding: {
            ...FOLLOWUP_RESULT.understanding,
            openQuestion: "Welche Produkte, Länder, Standards und Kontrollmechanismen sind gemeint?",
          },
        }}
        onConfirm={() => {}}
        onEdit={() => {}}
        {...FOLLOWUP_ACTIONS}
        continuationValue=""
        onContinuationChange={() => {}}
        onContinueConversation={() => {}}
      />,
    );

    expect(html).not.toContain("Um welchen Ort geht es?");
    expect(html).not.toContain("Ort ergänzen");
    expect(html).not.toContain("Ort später ergänzen");
    expect(html).not.toContain("Offene Fragen");
    expect(html).toContain("Details &amp; Transparenz");
  });

  it("shows the correction composer only after the user chooses edit", () => {
    const compactHtml = renderVisualFollowup();
    const editHtml = renderVisualFollowupInEditMode();

    expect(compactHtml).not.toContain("Korrektur oder Ergänzung");
    expect(compactHtml).not.toContain("Antwort fortsetzen");
    expect(editHtml).toContain("Korrektur oder Ergänzung");
    expect(editHtml).toContain("Antwort fortsetzen");
  });

  it("keeps the link flow honest about non-automatic evaluation", () => {
    const html = renderToStaticMarkup(
      <CreateLinkIntakeClarification
        locale="de"
        detection={detectCreateLinkIntake("https://example.com/artikel")}
        selectedIntentId="prepare_factcheck"
        additionalContext=""
        onSelectIntent={() => {}}
        onAdditionalContextChange={() => {}}
      />,
    );

    expect(html).toContain("Quellenhinweis");
    expect(html).toContain("Der Inhalt wurde noch nicht automatisch ausgewertet.");
    expect(html).toContain("Keine automatische Kostenbuchung");
    expect(html).not.toContain("sourceHints");
  });

  it("keeps the mobile follow-up layout single-column with details collapsed by default", () => {
    const followupSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateVisualFollowup.tsx"),
      "utf8",
    );
    const clientSource = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );
    const linkClarificationSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateLinkIntakeClarification.tsx"),
      "utf8",
    );

    expect(followupSource).toContain("Details & Transparenz");
    expect(followupSource).toContain("PlaceClarificationPanel");
    expect(followupSource).toContain("StructureProposalPanel");
    expect(followupSource).toContain("NextStepPanel");
    expect(followupSource).toContain("data-create-chat-thread");
    expect(followupSource).toContain("data-mobile-inline-create-actions");
    expect(followupSource).toContain("nextStepsCount");
    expect(followupSource).toContain("Erkannte Themen");
    expect(followupSource).toContain("unreadLabel");
    expect(followupSource).toContain("data-structure-overview-grid");
    expect(followupSource).toContain("data-create-structure-rail");
    expect(followupSource).toContain("const [detailsOpen, setDetailsOpen] = React.useState(false);");
    expect(followupSource).toContain("{detailsOpen ? (");
    expect(followupSource).toContain("aria-expanded={detailsOpen}");
    expect(clientSource).not.toContain("CreateInlineAnalysisScene");
    expect(clientSource).toContain("CreateWorkspaceShell");
    expect(linkClarificationSource).not.toContain("sourceHints");
  });
});
