import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import CreateVisualFollowup from "@/features/create/CreateVisualFollowup";

const FOLLOWUP_RESULT = {
  understanding: {
    summary: "Du möchtest sichere Schulwege im Quartier verbessern.",
    dossierContext: "Sichere Schulwege",
    categories: [{ id: "hint", label: "Hinweis", confidence: "high" as const }],
    topics: [
      { id: "mobility", label: "Mobilität & Stadtentwicklung", confidence: "high" as const },
      { id: "community", label: "Kommunales & Lebensumfeld", confidence: "medium" as const },
    ],
    statements: [
      {
        id: "s1",
        text: "Vor der Schule fehlen sichere Querungen und klare Tempo-30-Kontrollen.",
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
      title: "Sichere Schulwege",
      reason: "Das Thema passt zu einem bestehenden Arbeitsstand.",
      confidence: "high" as const,
      href: "/dossier?topic=schulwege",
      requiresConfirmation: true as const,
    },
  ],
  sourceText: "Vor der Schule fehlen sichere Querungen und klare Tempo-30-Kontrollen.",
  generatedAt: "2026-05-10T12:00:00.000Z",
};

describe("create curated dialog workspace contract", () => {
  it("keeps composer and curated dialog follow-up in a single flow", () => {
    const clientSource = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );
    const followupSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateVisualFollowup.tsx"),
      "utf8",
    );
    const linkClarificationSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateLinkIntakeClarification.tsx"),
      "utf8",
    );
    const linkIntakeSource = readFileSync(
      resolve(process.cwd(), "src/features/create/linkIntake.ts"),
      "utf8",
    );

    expect(clientSource).toContain("SharedCreateComposer");
    expect(clientSource).toContain("CreateWorkspaceShell");
    expect(clientSource).toContain("CreateVisualFollowup");
    expect(clientSource).toContain("CreateLinkIntakeClarification");
    expect(clientSource).toContain("create-dialog-workspace");
    expect(clientSource).toContain("CreateSubmittedContributionBubble");
    expect(clientSource).toContain("CreateAssistantStatusBubble");
    expect(clientSource).toContain("deriveCreateStructureOverviewMetrics");
    expect(clientSource).toContain("embeddedWorkspace");
    expect(clientSource).toContain("experienceVariant=\"workspace_shell\"");
    expect(clientSource).toContain("renderWorkspaceThread");
    expect(clientSource).toContain("workspaceActiveStage");
    expect(clientSource).toContain("workspaceShellPhase");
    expect(clientSource).toContain("workspaceComposerStartLabel");
    expect(clientSource).toContain("workspaceComposerValue");
    expect(clientSource).toContain("workspaceComposerPlaceholder");
    expect(clientSource).toContain("workspaceComposerStartDisabled");
    expect(clientSource).toContain("data-create-shell-secondary-details");
    expect(clientSource).toContain("CreateDebattenstandSidecar");
    expect(clientSource).toContain("CreateDebattenstandStatusBar");
    expect(clientSource).toContain("deriveCreateDebattenstandModel");
    expect(clientSource).toContain("renderSidecar");
    expect(clientSource).toContain("renderMobileSidecarSummary");
    expect(clientSource).toContain("showSceneRail={false}");
    expect(clientSource).not.toContain("data-create-thread-prompt-chip");
    expect(clientSource).toContain("voxyCopy.greeting");
    expect(clientSource).toContain("voxyCopy.intro");
    expect(clientSource).not.toContain("largeAvatar");
    expect(clientSource).toContain("selectedPrimaryTopic");
    expect(clientSource).toContain("workspaceActionMode");
    expect(clientSource).not.toContain("startLabel={productModeConfig.ctaLabel}");
    expect(clientSource).toContain("create-public-shell create-dialog-workspace mx-auto w-full max-w-none overflow-visible");
    expect(clientSource).toContain("data-create-workspace-host=\"wide-screen\"");
    expect(clientSource).not.toContain("create-start-chat-preview");
    expect(clientSource).not.toContain("experienceVariant=\"create_minimal\"");
    expect(clientSource).not.toContain("<CreateInlineAnalysisScene");
    expect(clientSource).not.toContain("showPostInputModules && !showIntelligentFollowup");
    expect(clientSource).not.toContain("showFollowupQuestionCard && !showLinkClarification");
    expect(clientSource).not.toContain("showPostInputModules && pickerEnabled");
    expect(clientSource).not.toContain("showPostInputModules && workingState");
    expect(followupSource).toContain("create-chat-workspace");
    expect(followupSource).toContain("CreateStructureOverviewCard");
    expect(followupSource).toContain("CreateStructureOverview");
    expect(followupSource).toContain("UserContributionBubble");
    expect(followupSource).toContain("AssistantUnderstandingBubble");
    expect(followupSource).toContain("DialogResultsHandoffPanel");
    expect(followupSource).toContain("ExistingTopicMatchesPanel");
    expect(followupSource).toContain("runDialogIntelligenceRuntime");
    expect(followupSource).toContain("resolveExistingTopicMatchesFromRuntime");
    expect(followupSource).toContain("setExistingTopicMatchesRuntimeResult");
    expect(followupSource).toContain("CreateHandoffDraftSummary");
    expect(followupSource).toContain("OpenQuestionCards");
    expect(followupSource).toContain("SourceHintsAndNextStepsGrid");
    expect(followupSource).toContain("PlaceClarificationPanel");
    expect(followupSource).toContain("StructureProposalPanel");
    expect(followupSource).toContain("NextStepPanel");
    expect(followupSource).not.toContain("WorkspaceStageRail");
    expect(followupSource).not.toContain("WorkspaceMetricRail");
    expect(followupSource).toContain("TopicBranchPreviewGrid");
    expect(followupSource).toContain("ManualTopicChooser");
    expect(followupSource).toContain("WorkspaceActionThreadNote");
    expect(followupSource).toContain("StructuredWorkstateBlock");
    expect(followupSource).toContain("data-create-chat-thread");
    expect(followupSource).toContain("data-create-structure-rail");
    expect(followupSource).toContain("embedInWorkspaceShell");
    expect(followupSource).toContain("data-create-embedded-followup");
    expect(followupSource).toContain("Deine Struktur auf einen Blick");
    expect(followupSource).toContain("data-structure-overview-grid");
    expect(followupSource).not.toContain("data-create-pipeline-rail");
    expect(followupSource).not.toContain("data-create-workspace-kpis");
    expect(followupSource).toContain("data-create-topic-branches");
    expect(followupSource).toContain("data-create-topic-branch-card");
    expect(followupSource).toContain("data-mobile-inline-create-actions");
    expect(readFileSync(resolve(process.cwd(), "src/features/create/CreateWorkspaceShell.tsx"), "utf8")).not.toContain(
      "data-create-shell-pipeline",
    );
    expect(readFileSync(resolve(process.cwd(), "src/features/create/CreateWorkspaceShell.tsx"), "utf8")).toContain(
      "data-create-shell-layout=\"wide\"",
    );
    expect(readFileSync(resolve(process.cwd(), "src/features/create/CreateWorkspaceShell.tsx"), "utf8")).toContain(
      "data-create-thread-phase={phase}",
    );
    expect(readFileSync(resolve(process.cwd(), "src/features/create/CreateWorkspaceShell.tsx"), "utf8")).toContain(
      "data-create-shell-sidecar",
    );
    expect(readFileSync(resolve(process.cwd(), "src/features/create/CreateWorkspaceShell.tsx"), "utf8")).toContain(
      "data-create-debattenstand-sheet",
    );
    expect(linkClarificationSource).toContain("Ich habe einen Quellenhinweis erkannt. Was soll ich daraus vorbereiten?");
    expect(linkClarificationSource).toContain("create-chat-message");
    expect(linkClarificationSource).toContain("eDebatte");
    expect(linkIntakeSource).toContain("Als Quelle vormerken");
  });

  it("renders dialog roles and keeps primary action explicit", () => {
    const followupSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateVisualFollowup.tsx"),
      "utf8",
    );
    const linkClarificationSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateLinkIntakeClarification.tsx"),
      "utf8",
    );

    expect(followupSource).toContain("Du");
    expect(followupSource).toContain("Voxy");
    expect(followupSource).toContain("Ich sehe einen gemeinsamen Kern.");
    expect(followupSource).not.toContain("Dein KI-Assistent");
    expect(followupSource).toContain("Details & Transparenz");
    expect(followupSource).toContain("Themenstruktur bestätigen");
    expect(followupSource).toContain("Themen ändern");
    expect(followupSource).toContain("Aussage schärfen");
    expect(followupSource).toContain("Frage vormerken");
    expect(followupSource).toContain("Thema vormerken");
    expect(followupSource).toContain("Quelle vormerken");
    expect(followupSource).toContain("Für Community vorbereiten");
    expect(followupSource).toContain("Später weiterarbeiten");
    expect(followupSource).toContain("Ich sehe mehrere mögliche Themenstränge.");
    expect(followupSource).toContain("Thema parken");
    expect(followupSource).toContain("Geparkt");
    expect(followupSource).toContain("Dialog Intelligence");
    expect(followupSource).toContain("queuePreparedHandoffDraftForReview");
    expect(followupSource).toContain("reviewQueueRuntimeState");
    expect(followupSource).toContain("submitCreateHandoffReviewQueueItemToRuntime");
    expect(followupSource).toContain("Keine automatische Stimme");
    expect(followupSource).toContain("keine automatische Veröffentlichung");
    expect(followupSource).toContain("keine automatische Kostenbuchung");
    expect(followupSource).toContain("setPreparedHandoffDraft");
    expect(readFileSync(resolve(process.cwd(), "src/features/create/CreateDebattenstandSidecar.tsx"), "utf8")).toContain(
      "Debattenstand",
    );
    expect(readFileSync(resolve(process.cwd(), "src/features/create/CreateDebattenstandSidecar.tsx"), "utf8")).toContain(
      "data-create-debattenstand-statusbar",
    );
    expect(followupSource).not.toContain("Dossier-Kontext");
    expect(followupSource).not.toContain("Mögliche Claims");
    expect(followupSource).not.toContain("Arbeitsstand speichern");
    expect(followupSource).not.toContain("Dossiers & Abstimmungen ansehen");
    expect(followupSource).not.toContain("Nicht passend");
    expect(linkClarificationSource).toContain("YouTube-Link erkannt.");
    expect(linkClarificationSource).toContain("Ich bereite diesen nächsten Schritt vor. Der Inhalt wurde noch nicht automatisch ausgewertet.");
  });

  it("keeps details progressively disclosed after the core workstate", () => {
    const followupSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateVisualFollowup.tsx"),
      "utf8",
    );
    const html = renderToStaticMarkup(
      <CreateVisualFollowup
        result={FOLLOWUP_RESULT}
        onConfirm={() => {}}
        onEdit={() => {}}
        onPrepareSubmission={() => {}}
        onPrepareAnlassraum={() => {}}
        onOpenDossierAppend={() => {}}
        onOpenDossierCreate={() => {}}
        onPrepareVote={() => {}}
        onRequestEditorialReview={() => {}}
        onStartOptionalService={() => {}}
        onSaveOnly={() => {}}
        continuationValue=""
        onContinuationChange={() => {}}
        onContinueConversation={() => {}}
      />,
    );

    const coreIndex = followupSource.indexOf("Ich sehe einen gemeinsamen Kern.");
    const confirmIndex = followupSource.indexOf("Themenstruktur bestätigen");
    const detailsToggleIndex = followupSource.indexOf("Details & Transparenz");
    const continueIndex = followupSource.indexOf("<ContinueWritingComposer");
    const detailsIndex = followupSource.indexOf("<StructuredWorkstateBlock");

    expect(coreIndex).toBeGreaterThan(-1);
    expect(confirmIndex).toBeGreaterThan(-1);
    expect(detailsToggleIndex).toBeGreaterThan(-1);
    expect(continueIndex).toBeGreaterThan(-1);
    expect(detailsIndex).toBeGreaterThan(-1);
    expect(coreIndex).toBeLessThan(confirmIndex);
    expect(detailsToggleIndex).toBeGreaterThan(confirmIndex);
    expect(detailsIndex).toBeGreaterThan(detailsToggleIndex);
    expect(html).toContain("Details &amp; Transparenz");
    expect(html).toContain("Erkannte Themen");
    expect(html).toContain("aus deinem Beitrag erkannt");
    expect(html).not.toContain("Einordnung erneut versuchen");
    expect(html).not.toContain("Erkannte Themenzweige");
    expect(html).not.toContain("Du/eDebatte-Protokoll");
    expect(html).not.toContain("Original oben anzeigen");
    expect(followupSource).toContain("aria-expanded={detailsOpen}");
    expect(followupSource).toContain("{detailsOpen ? (");
  });

  it("keeps the heavy structure explorer behind the explicit details toggle", () => {
    const followupSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateVisualFollowup.tsx"),
      "utf8",
    );
    const clientSource = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );
    const contractSource = readFileSync(
      resolve(process.cwd(), "src/features/create/intelligentFollowupContract.ts"),
      "utf8",
    );

    expect(followupSource).toContain("buildCreateStructureBranches");
    expect(contractSource).toContain("part06CategoryKeys");
    expect(contractSource).toContain("part06CategoryLabels");
    expect(contractSource).toContain("topicTags");
    expect(contractSource).not.toContain("Wohnen und Genehmigungen");
    expect(contractSource).not.toContain("Verkehr, Klima und Alltagstauglichkeit");
    expect(contractSource).not.toContain("Bildung, Integration und Sicherheit");
    expect(contractSource).toContain("resolveSectionThemeLabel");
    expect(followupSource).toContain("<StructuredWorkstateBlock");
    expect(followupSource).toContain("Dialog Intelligence");
    expect(followupSource).not.toContain("result.clarifications");
    expect(followupSource).not.toContain("qualityGate");
    expect(followupSource).not.toContain("editorial_review_required");
    expect(followupSource).not.toContain("editorial_review_requested");
    expect(clientSource).not.toContain("qualityGate");
    expect(clientSource).not.toContain("editorial_review_requested");
    expect(clientSource).not.toContain("result.clarifications");
    expect(contractSource).not.toContain("CreateInputSafetyClarification");
    expect(contractSource).not.toContain("CreateInputSafetyQualityGate");
    expect(followupSource).not.toContain("Dossier ansehen");
    expect(followupSource).not.toContain("Dossier ansehen pro Thema");
  });

  it("uses one workspace shell instead of separate top composer and lower followup blocks", () => {
    const clientSource = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );
    const composerSource = readFileSync(
      resolve(process.cwd(), "src/features/create/SharedCreateComposer.tsx"),
      "utf8",
    );

    expect(clientSource).toContain("CreateWorkspaceShell");
    expect(clientSource).toContain("chatThread={renderWorkspaceThread()}");
    expect(clientSource).toContain("phase={workspaceShellPhase}");
    expect(clientSource).toContain("composer={");
    expect(clientSource).toContain("footer={");
    expect(clientSource).toContain("data-create-shell-secondary-details");
    expect(clientSource).toContain("max-w-none");
    expect(clientSource).toContain("data-create-workspace-host=\"wide-screen\"");
    expect(clientSource).not.toContain("create-start-chat-preview");
    expect(clientSource).not.toContain("public-dialog-area");
    expect(composerSource).not.toContain(">Composer<");
    expect(composerSource).toContain("resize-y");
    expect(composerSource).toContain('data-create-input-methods="shared-intake"');
  });

  it("keeps tab controls aligned with persistent tabpanels", () => {
    const followupSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateVisualFollowup.tsx"),
      "utf8",
    );

    expect(followupSource).toContain("aria-controls={`create-branch-panel-${branch.id}`}");
    expect(followupSource).toContain("id={`create-branch-panel-${branch.id}`}");
    expect(followupSource).toContain("hidden={!isActive}");
    expect(followupSource).toContain("aria-controls={`create-overview-panel-${card.id}`}");
    expect(followupSource).toContain("id={`create-overview-panel-${focusArea}`}");
    expect(followupSource).toContain("{FOCUS_AREA_ORDER.map((focusArea) => {");
  });
});
