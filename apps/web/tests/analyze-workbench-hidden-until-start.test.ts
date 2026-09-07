import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CREATE_INTELLIGENT_FOLLOWUP_SECTION_LABELS,
  buildCreateLightweightFollowupSnapshot,
  buildCreateGuestAdoptionPayload,
  buildCreateGuestPrimaryIntakeStorageKey,
  buildCreatePrimaryIntakeStorageKey,
  buildGuidedWorkspaceText,
  hasPrimaryIntakeText,
  parseCreatePrimaryIntakeSnapshot,
  resolveCreatePrimaryIntakeResumeSnapshot,
  retainCreateClientOnlyProgressEventsForResume,
  resolveCreatePostStartSectionOrder,
  resolveFollowupSurfaceOnStart,
  shouldShowCreateFollowupQuestionCard,
  shouldRenderCreateIntelligentFollowup,
  shouldRenderCreateAnalyzeWorkspace,
  shouldShowCreatePostInputModules,
  writeCreatePrimaryIntakeSnapshot,
} from "@/app/create/CreateClient";
import { CREATE_VISUAL_FOLLOWUP_COPY } from "@/features/create/CreateVisualFollowup";
import { detectCreateLinkIntake } from "@/features/create/linkIntake";
import { buildCreateInitialProgressEvents } from "@/features/create/createProgressEventContract";

describe("analyze workbench progressive disclosure", () => {
  it("keeps post-input modules hidden before explicit start", () => {
    expect(
      shouldShowCreatePostInputModules({
        hasStarted: false,
        intakeText: "Vollständiger Beitrag",
      }),
    ).toBe(false);
  });

  it("shows post-input modules only after start with non-empty text", () => {
    expect(
      shouldShowCreatePostInputModules({
        hasStarted: true,
        intakeText: "Vollständiger Beitrag",
      }),
    ).toBe(true);
    expect(hasPrimaryIntakeText(" https://youtu.be/demo123 ")).toBe(true);
  });

  it("keeps post-input modules visible for material-backed create runs even with minimal freetext", () => {
    expect(
      shouldShowCreatePostInputModules({
        hasStarted: true,
        intakeText: "",
        hasMaterialContext: true,
      }),
    ).toBe(true);
  });

  it("classifies link-only intake separately from link-plus-context input", () => {
    const linkOnly = detectCreateLinkIntake("https://youtu.be/demo123");
    expect(linkOnly.hasLink).toBe(true);
    expect(linkOnly.mostlyLinkOnly).toBe(true);

    const linkWithContext = detectCreateLinkIntake(
      "Bitte prüft diesen Artikel zur Schulwegsicherheit und die Aussage zur Finanzierung: https://example.com/artikel",
    );
    expect(linkWithContext.hasLink).toBe(true);
    expect(linkWithContext.mostlyLinkOnly).toBe(false);
  });

  it("keeps guided analyze workspace hidden until guided bridge is confirmed", () => {
    expect(
      shouldRenderCreateAnalyzeWorkspace({
        followupActivated: true,
        hasStarted: true,
        intakeText: "Vollständiger Beitrag",
        productMode: "guided",
        guidedBridgeConfirmed: false,
      }),
    ).toBe(false);
    expect(
      shouldRenderCreateAnalyzeWorkspace({
        followupActivated: true,
        hasStarted: true,
        intakeText: "Vollständiger Beitrag",
        productMode: "guided",
        guidedBridgeConfirmed: true,
      }),
    ).toBe(true);
  });

  it("builds guided workspace text with bridge answer only after confirmation", () => {
    expect(
      buildGuidedWorkspaceText({
        intakeText: "Ausgangstext",
        guidedBridgeAnswer: "",
      }),
    ).toBe("Ausgangstext");

    expect(
      buildGuidedWorkspaceText({
        intakeText: "Ausgangstext",
        guidedBridgeAnswer: "Kernkonflikt und Entscheidungspunkt.",
      }),
    ).toContain("Geführter Fokus");

    expect(
      buildGuidedWorkspaceText({
        intakeText: "Seed text",
        guidedBridgeAnswer: "Clarify the pending trade-off.",
        guidedWorkspacePrefix: "Guided focus",
      }),
    ).toContain("Guided focus");
  });

  it("separates account storage from opaque, expiring guest-session storage", () => {
    expect(buildCreatePrimaryIntakeStorageKey("user-1")).toBe(
      "vog_create_primary_intake_v1:account:user-1",
    );
    expect(buildCreatePrimaryIntakeStorageKey("")).toBeNull();
    expect(buildCreatePrimaryIntakeStorageKey(null)).toBeNull();
    expect(
      buildCreateGuestPrimaryIntakeStorageKey({
        namespace: "g1_opaque-session-scope-12345678901234567890",
        expiresAt: "2099-09-06T10:30:00.000Z",
      }),
    ).toBe(
      "vog_create_primary_intake_v1:guest:g1_opaque-session-scope-12345678901234567890",
    );
  });

  it("keeps in-flight guest progress on the guest resume key after login navigation", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "buildCreateProgressResumeStorageKey(`guest:${guestNamespace}`)",
    );
    expect(source).toContain("buildCreateProgressResumeStorageKey(`account:${overview.userId}`)");
    expect(source).not.toContain('overview?.userId ?? "guest"');
    expect(source).toContain(
      'const anonymousResume = resumeSnapshot.actorMode === "anonymous";',
    );
    expect(source).toContain("anonymous: anonymousResume");
  });

  it("reports primary guest workstate persistence failures without mutating memory state", () => {
    const snapshot = {
      intakeText: "Dieser Text bleibt im React-Arbeitsstand.",
      hasStarted: true,
      updatedAt: "2026-09-06T10:00:00.000Z",
    };
    const blockedStorage = {
      setItem: () => {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    };

    expect(
      writeCreatePrimaryIntakeSnapshot(blockedStorage, "guest-key", snapshot),
    ).toBe(false);
    expect(snapshot.intakeText).toBe("Dieser Text bleibt im React-Arbeitsstand.");
    expect(writeCreatePrimaryIntakeSnapshot(blockedStorage, null, snapshot)).toBe(false);
  });

  it("retains only the client-verified guest save event during server reconnect", () => {
    const operationId = "operation-guest-reconnect-12345678";
    const initial = buildCreateInitialProgressEvents({
      text: "Ein gespeicherter Gastbeitrag mit einer erkannten Struktur.",
      operationId,
      correlationId: operationId,
      locale: "de",
      persistence: "browser",
      createdAt: "2026-09-06T10:00:00.000Z",
    });
    const resumeSnapshot = {
      operationId,
      correlationId: operationId,
      actorMode: "anonymous" as const,
      draftId: "guest-browser",
      inputFingerprint: "create-deadbeef-50",
      locale: "de",
      anlassraumId: null,
      dossierId: null,
      intent: null,
      createdAt: "2026-09-06T10:00:00.000Z",
      expiresAt: "2026-09-06T10:14:00.000Z",
    };

    expect(
      retainCreateClientOnlyProgressEventsForResume(initial.events, resumeSnapshot).map(
        (event) => event.type,
      ),
    ).toEqual(["draft.saved"]);
    expect(
      retainCreateClientOnlyProgressEventsForResume(initial.events, {
        ...resumeSnapshot,
        actorMode: "authenticated",
      }),
    ).toEqual([]);
  });

  it("parses valid primary intake snapshots and ignores empty/no-op payloads", () => {
    const progressEvents = buildCreateInitialProgressEvents({
      text: "Beitrag bleibt erhalten",
      operationId: "guest-operation-12345678",
      correlationId: "guest-operation-12345678",
      locale: "de",
      persistence: "browser",
    }).events;
    const parsed = parseCreatePrimaryIntakeSnapshot(
      JSON.stringify({
        intakeText: "Beitrag bleibt erhalten",
        hasStarted: true,
        updatedAt: "2026-04-22T10:00:00.000Z",
        progressEvents: [
          ...progressEvents,
          { ...progressEvents[0], providerPayload: { raw: true } },
        ],
      }),
    );
    expect(parsed).toMatchObject({
      intakeText: "Beitrag bleibt erhalten",
      hasStarted: true,
      updatedAt: "2026-04-22T10:00:00.000Z",
    });
    expect(parsed?.progressEvents).toEqual(progressEvents);

    const ignored = parseCreatePrimaryIntakeSnapshot(
      JSON.stringify({
        intakeText: "   ",
        hasStarted: false,
      }),
    );
    expect(ignored).toBeNull();
  });

  it("resumes the guest AI workstate after login without requiring another planner run", () => {
    const guestRaw = JSON.stringify({
      intakeText: "Tempo 30 vor der Schule prüfen.",
      hasStarted: true,
      updatedAt: "2026-09-06T10:00:00.000Z",
      guestContextExpiresAt: "2026-09-06T10:30:00.000Z",
      productMode: "analyze",
      guestOperationId: "guest-operation-12345678",
      intelligentFollowup: {
        sourceText: "Tempo 30 vor der Schule prüfen.",
        generatedAt: "2026-09-06T10:00:00.000Z",
        understanding: {
          summary: "Sicherer Schulweg",
          categories: [],
          topics: [{ id: "topic-1", label: "Schulwegsicherheit", confidence: "high" }],
          aspects: ["Tempo 30", "Querung"],
          statements: [{
            id: "statement-1",
            text: "Tempo 30 vor der Schule prüfen.",
            kind: "demand",
            stance: "pro",
            confidence: "high",
          }],
          scopes: ["municipal"],
          openQuestion: null,
          confidence: "medium",
        },
        suggestions: [],
        meta: {
          planner: {
            source: "openai",
            plannerSource: "openai",
            plannerProvider: "openai",
            providerPlan: { plannerProvider: "openai" },
            providerCallSucceeded: true,
            providerAttemptCount: 1,
            providerAttempts: [{
              attempt: 1,
              provider: "openai",
              model: "test-model",
              status: "succeeded",
              resultCode: "ok",
              responseLength: 120,
              responseHash: null,
            }],
            plannerDebug: {
              attemptedProvider: "openai",
              usedProvider: "openai",
              attemptedModel: "test-model",
              usedModel: "test-model",
              attemptNumber: 1,
            },
            qualityStatus: "specific",
            plannerDegraded: false,
          },
          graphMatch: {},
          analysis: {
            state: "result_ready",
            validationStatus: "validated",
          },
          citizenContext: {
            regionStatus: "resolved",
            regionSource: "contribution_text",
            regionChipLabel: "Wuppertal · aus deinem Text",
          },
        },
      },
    });

    const resume = resolveCreatePrimaryIntakeResumeSnapshot({
      ownedRaw: JSON.stringify({
        intakeText: "Älterer Kontoentwurf",
        hasStarted: false,
        updatedAt: "2026-09-05T10:00:00.000Z",
      }),
      guestRaw,
      isAuthenticated: true,
      preferGuest: true,
      guestContextExpiresAt: "2026-09-06T10:30:00.000Z",
      nowMs: Date.parse("2026-09-06T10:05:00.000Z"),
    });

    expect(resume.source).toBe("guest");
    expect(resume.snapshot).toMatchObject({
      intakeText: "Tempo 30 vor der Schule prüfen.",
      hasStarted: true,
      productMode: "analyze",
      guestOperationId: "guest-operation-12345678",
      intelligentFollowup: {
        generatedAt: "2026-09-06T10:00:00.000Z",
        understanding: {
          aspects: ["Tempo 30", "Querung"],
          statements: [expect.objectContaining({ stance: "pro" })],
        },
        meta: {
          citizenContext: expect.objectContaining({
            regionSource: "contribution_text",
          }),
        },
      },
    });

    const payload = buildCreateGuestAdoptionPayload({
      snapshot: resume.snapshot!,
      locale: "de",
      createMode: "source",
    });
    expect(payload).toMatchObject({
      source: "create_guest_resume",
      analysis: {
        guestResume: {
          operationId: "guest-operation-12345678",
          noAutoPublish: true,
        },
      },
    });
    expect(payload).not.toHaveProperty("textPrepared");
    expect(payload?.analysis).not.toHaveProperty("intelligentFollowup");
  });

  it("does not expose a guest snapshot across sessions, expiry, or implicit login resume", () => {
    const guestRaw = JSON.stringify({
      intakeText: "Sessiongebundener Gast-Arbeitsstand",
      hasStarted: true,
      updatedAt: "2026-09-06T10:00:00.000Z",
      guestContextExpiresAt: "2026-09-06T10:30:00.000Z",
    });
    const ownedRaw = JSON.stringify({
      intakeText: "Konto-Arbeitsstand",
      hasStarted: true,
      updatedAt: "2026-09-06T09:00:00.000Z",
    });
    const base = {
      ownedRaw,
      guestRaw,
      nowMs: Date.parse("2026-09-06T10:05:00.000Z"),
    };

    expect(
      resolveCreatePrimaryIntakeResumeSnapshot({
        ...base,
        isAuthenticated: false,
        preferGuest: false,
        guestContextExpiresAt: "2026-09-06T10:30:00.000Z",
      }).source,
    ).toBe("guest");
    expect(
      resolveCreatePrimaryIntakeResumeSnapshot({
        ...base,
        isAuthenticated: false,
        preferGuest: false,
        guestContextExpiresAt: "2026-09-06T11:00:00.000Z",
      }).snapshot,
    ).toBeNull();
    expect(
      resolveCreatePrimaryIntakeResumeSnapshot({
        ...base,
        isAuthenticated: true,
        preferGuest: false,
        guestContextExpiresAt: "2026-09-06T10:30:00.000Z",
      }).source,
    ).toBe("owned");
    expect(
      resolveCreatePrimaryIntakeResumeSnapshot({
        ...base,
        isAuthenticated: true,
        preferGuest: true,
        guestContextExpiresAt: "2026-09-06T10:30:00.000Z",
        nowMs: Date.parse("2026-09-06T10:31:00.000Z"),
      }).source,
    ).toBe("owned");
  });

  it("keeps analyze workspace hidden until follow-up explicitly activates review", () => {
    expect(
      shouldRenderCreateAnalyzeWorkspace({
        followupActivated: false,
        hasStarted: true,
        intakeText: "Persistierter Beitrag",
        productMode: "analyze",
        guidedBridgeConfirmed: true,
      }),
    ).toBe(false);
    expect(
      shouldRenderCreateAnalyzeWorkspace({
        followupActivated: true,
        hasStarted: true,
        intakeText: "Persistierter Beitrag",
        productMode: "media",
        guidedBridgeConfirmed: true,
      }),
    ).toBe(true);
    expect(
      shouldRenderCreateAnalyzeWorkspace({
        followupActivated: true,
        hasStarted: true,
        intakeText: "",
        hasMaterialContext: true,
        productMode: "media",
        guidedBridgeConfirmed: true,
      }),
    ).toBe(true);
  });

  it("shows the loading thread immediately before waiting for intelligent follow-up", () => {
    const clientSource = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );

    expect(clientSource).toContain('data-create-loading-thread={isStarting ? "true" : undefined}');
    expect(clientSource).toContain("workspaceActiveStage");
    const startFlowSource = clientSource.slice(
      clientSource.indexOf("const startCreateFlow"),
      clientSource.indexOf("const handleStart"),
    );
    expect(startFlowSource.indexOf("setFollowupSnapshot(snapshot);")).toBeLessThan(
      startFlowSource.indexOf("await requestCreateProgressiveFollowup({"),
    );
  });

  it("maps mode-specific follow-up surfaces so Beitragen stays lightweight by default", () => {
    expect(resolveFollowupSurfaceOnStart("analyze")).toBe("lightweight");
    expect(resolveFollowupSurfaceOnStart("media")).toBe("analysis");
    expect(resolveFollowupSurfaceOnStart("guided")).toBe("none");

    expect(
      shouldRenderCreateAnalyzeWorkspace({
        followupActivated: resolveFollowupSurfaceOnStart("analyze") === "analysis",
        hasStarted: true,
        intakeText: "Beitragstext",
        productMode: "analyze",
        guidedBridgeConfirmed: true,
      }),
    ).toBe(false);
  });

  it("builds a lightweight follow-up snapshot with original text and understandable classification", () => {
    const snapshot = buildCreateLightweightFollowupSnapshot({
      intakeText: "  Neuer Radweg entlang der Schule  ",
      modeLabel: "Beitragen",
      contextAnchorLabel: "Offene Frage",
      surfaceTexts: {
        followupUnderstandingLine: (label) => `Eingeordnet als: ${label}`,
      },
    });

    expect(snapshot.originalText).toBe("Neuer Radweg entlang der Schule");
    expect(snapshot.understandingLine).toBe("Eingeordnet als: Offene Frage");
  });

  it("keeps intelligent follow-up hidden before start and shows it after start in Beitragen mode", () => {
    expect(
      shouldRenderCreateIntelligentFollowup({
        hasStarted: false,
        followup: null,
      }),
    ).toBe(false);

    expect(
      shouldRenderCreateIntelligentFollowup({
        hasStarted: true,
        followup: {
          understanding: {
            summary: "Kurzfassung",
            categories: [],
            topics: [],
            statements: [],
            scopes: ["unclear"],
            confidence: "low",
          },
          suggestions: [],
          sourceText: "Text",
          generatedAt: "2026-05-05T00:00:00.000Z",
        },
      }),
    ).toBe(true);
    expect(CREATE_INTELLIGENT_FOLLOWUP_SECTION_LABELS.understanding).toBe(
      "eDebatte hat deinen Beitrag strukturiert",
    );
    expect(CREATE_INTELLIGENT_FOLLOWUP_SECTION_LABELS.connections).toBe("Passende nächste Schritte");
    expect(CREATE_INTELLIGENT_FOLLOWUP_SECTION_LABELS.voteNotice).toContain(
      "nicht automatisch abgegeben",
    );
    expect(CREATE_VISUAL_FOLLOWUP_COPY.structureTitle).toBe("Vorläufig verstanden");
    expect(CREATE_VISUAL_FOLLOWUP_COPY.coreTitle).toBe("Kern erkannt");
    expect(CREATE_VISUAL_FOLLOWUP_COPY.graphTitle).toBe("So könnte der Arbeitsstand aussehen");
    expect(CREATE_VISUAL_FOLLOWUP_COPY.confirmTitle).toBe("Wie willst du damit weitergehen?");
    expect(CREATE_VISUAL_FOLLOWUP_COPY.guardrail).toContain("Keine automatische Veröffentlichung");
    expect(CREATE_VISUAL_FOLLOWUP_COPY.freeWriteHint).toContain("Schreib einfach weiter");
    expect(CREATE_VISUAL_FOLLOWUP_COPY.pendingPreparationHint).toContain("Nach deiner Bestätigung");
    expect(Object.values(CREATE_VISUAL_FOLLOWUP_COPY).join(" ")).not.toContain("Systemprüfung");
  });

  it("hides legacy follow-up question card in Beitragen mode after start", () => {
    expect(
      shouldShowCreateFollowupQuestionCard({
        showPostInputModules: true,
        productMode: "analyze",
      }),
    ).toBe(false);
    expect(
      shouldShowCreateFollowupQuestionCard({
        showPostInputModules: true,
        productMode: "media",
      }),
    ).toBe(true);
  });

  it("keeps intelligent response before legacy post-start modules in section order", () => {
    const order = resolveCreatePostStartSectionOrder({
      showIntelligentFollowup: true,
      showPostInputModules: true,
      showFollowupQuestionCard: false,
      pickerEnabled: true,
    });
    expect(order[0]).toBe("intelligent-followup");
    expect(order).not.toContain("followup-question");
  });

  it("keeps visual follow-up light/dark readable and sticky action wording", () => {
    const clientSource = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );
    const workspaceSource = readFileSync(
      resolve(process.cwd(), "src/components/analyze/AnalyzeWorkspace.tsx"),
      "utf8",
    );
    const linkIntakeSource = readFileSync(
      resolve(process.cwd(), "src/features/create/linkIntake.ts"),
      "utf8",
    );
    const source = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateVisualFollowup.tsx"),
      "utf8",
    );
    expect(clientSource).toContain("CreateLinkIntakeClarification");
    expect(clientSource).toContain("buildCreateLinkSourceNotice");
    expect(linkIntakeSource).toContain("Der Link bleibt vorerst ein Quellenhinweis. Der Inhalt wurde noch nicht automatisch ausgewertet.");
    expect(source).toContain("UserContributionBubble");
    expect(source).toContain("AssistantUnderstandingBubble");
    expect(source).toContain("StructuredWorkstateBlock");
    expect(source).toContain("StructureProposalPanel");
    expect(source).toContain("NextStepPanel");
    expect(source).toContain("create-chat-workspace");
    expect(source).toContain("create-chat-message");
    expect(source).toContain("Du");
    expect(source).toContain("Voxy");
    expect(source).toContain("Themenstruktur bestätigen");
    expect(source).toContain("Eigenes Hauptthema benennen");
    expect(source).toContain("Aussage schärfen");
    expect(source).toContain("Quellenmodus geöffnet");
    expect(source).toContain("Redaktionell prüfen lassen");
    expect(source).toContain("Deine Struktur auf einen Blick");
    expect(source).toContain("data-structure-overview-grid");
    expect(source).toContain("Fragen & Abstimmung");
    expect(source).toContain("Gelesene Sinnabschnitte");
    expect(source).toContain("Erkannte Themen");
    expect(source).not.toContain("Details zum Originaltext");
    expect(source).toContain("Gelesene Sinnabschnitte");
    expect(source).not.toContain("Was ich nach deiner Bestätigung vorbereiten kann");
    expect(source).toContain("Keine automatische Stimme.");
    expect(source).toContain("Keine automatische Veröffentlichung.");
    expect(source).toContain("Änderungsvorschläge werden zur Prüfung vorbereitet.");
    expect(source).toContain("Abstimmungsfrage bearbeiten");
    expect(source).toContain("Thema ändern");
    expect(source).toContain("Haltung ändern");
    expect(source).toContain("Ebene ändern");
    expect(source).toContain("welchen nächsten Schritt ich anpassen soll");
    expect(source).toContain("welche Quelle noch fehlt");
    expect(source).toContain("Schreib einfach weiter");
    expect(source).toContain("Antwort fortsetzen");
    expect(clientSource).toContain("setChatContinuationText");
    expect(clientSource).toContain("handleContinueConversation");
    expect(clientSource).not.toContain("CreateInlineAnalysisScene");
    expect(clientSource).toContain("CreateWorkspaceShell");
    expect(workspaceSource).toContain("shouldRenderCompactEmbeddedWorkspaceHeader");
    expect(workspaceSource).toContain("shouldUseInlineCreateActionBar");
    expect(workspaceSource).toContain("Im selben Arbeitsraum");
    expect(workspaceSource).toContain("lg:sticky lg:bottom-3");
    expect(clientSource).not.toContain("details className=\"rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4\">\n          <summary className=\"cursor-pointer text-sm font-semibold text-[rgb(var(--fg))]\">{text.quotasTitle}</summary>");
    const handoffSource = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateStartDraftHandoff.tsx"),
      "utf8",
    );
    const nextActionGateSource = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateDraftNextActionGate.tsx"),
      "utf8",
    );
    expect(clientSource).toContain("CreateStartDraftHandoff");
    expect(handoffSource).toContain('href: "/account"');
    expect(nextActionGateSource).toContain("data-testid=\"create-draft-next-action-gate\"");
    expect(source).not.toContain("Für später speichern");
    expect(source).not.toContain("Dossiers & Abstimmungen ansehen");
    expect(source).not.toContain("Zusatzservices (optional)");
    expect(source).not.toContain("Nicht passend");
    expect(source).toContain("dedupeCreateFollowupSections");
    expect(source).toContain("Redaktionell prüfen lassen");
    expect(source).toContain("disabled:cursor-not-allowed");
    expect(source).not.toContain("bg-cyan-50/80");
    expect(source).toContain("dark:bg-[rgb(var(--card))]");
    expect(source).toContain("border-cyan-500/35 bg-cyan-50 text-cyan-950");
    expect(source).toContain("dark:border-cyan-300/60 dark:bg-cyan-500/15 dark:text-cyan-50");
    expect(source).not.toContain("Dossier-Kontext / Oberthema");
    expect(source).not.toContain("Mögliche Claims");
    expect(source).not.toContain("topics.slice(0, 6)");
    expect(source).toContain("resultChangeKey");
    expect(source).toContain("setActiveFocusArea(initialFocusArea)");
    expect(source).toContain("resolveNextIndexFromKey");
    expect(source).toContain("role=\"tablist\"");
    expect(source).toContain("role=\"tabpanel\"");
    expect(source).toContain("color-mix(in_oklab,white_58%,rgb(var(--card))_42%)");
    expect(source).toContain("data-mobile-inline-create-actions");
    expect(source).not.toContain("data-mobile-sticky-create-actions");
    expect(source).not.toContain('className="text-cyan-50"');
    expect(source).not.toContain("bg-white/94");
    expect(source).not.toContain("Abschnitt 1");
    expect(source).not.toContain("Teil 1");
  });

  it("keeps create entry mode selection optional instead of dominant first view", () => {
    const clientSource = readFileSync(resolve(process.cwd(), "src/app/create/CreateClient.tsx"), "utf8");
    const composerSource = readFileSync(resolve(process.cwd(), "src/features/create/SharedCreateComposer.tsx"), "utf8");
    expect(clientSource).toContain("collapseModeSelector");
    expect(clientSource).toContain("create-dialog-workspace");
    expect(clientSource).toContain("embeddedWorkspace");
    expect(clientSource).toContain("CreateWorkspaceShell");
    expect(clientSource).toContain("data-create-loading-thread");
    expect(composerSource).toContain("alternateModeLabel");
    expect(composerSource).toContain("attachmentsDisclosureLabel");
  });

  it("makes review request and factcheck paths explicit in the create client", () => {
    const clientSource = readFileSync(resolve(process.cwd(), "src/app/create/CreateClient.tsx"), "utf8");
    expect(clientSource).toContain("/api/create/save");
    expect(clientSource).toContain("manualReviewRequested");
    expect(clientSource).toContain("Arbeitsstand zur Prüfung vorgemerkt. Keine automatische Veröffentlichung.");
    expect(clientSource).toContain("Quellenmodus aktiv.");
    expect(clientSource).toContain("setReviewRequestState(\"saving\")");
    expect(clientSource).toContain("setFactcheckMessage(");
  });
});
