import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createManualAnlassraum: vi.fn(),
  dossiers: new Map<string, any>(),
  sources: new Map<string, any>(),
  logDossierRevision: vi.fn(),
  updateDossierCounts: vi.fn(),
  seedDossierFromAnalysis: vi.fn(),
}));

vi.mock("@features/anlassraum/service", () => ({
  createManualAnlassraum: (...args: unknown[]) => mocks.createManualAnlassraum(...args),
}));

vi.mock("@features/dossier/db", () => ({
  dossiersCol: async () => ({
    findOne: async (filter: any) => {
      const candidates = filter?.$or ?? [];
      for (const item of mocks.dossiers.values()) {
        if (
          candidates.some(
            (candidate: any) =>
              candidate?.dossierId === item.dossierId || candidate?.statementId === item.statementId,
          )
        ) {
          return item;
        }
      }
      return null;
    },
    insertOne: async (doc: any) => {
      mocks.dossiers.set(doc.dossierId, doc);
      return { insertedId: doc.dossierId };
    },
  }),
  dossierSourcesCol: async () => ({
    findOne: async (filter: any) => {
      const key = `${filter?.dossierId}:${filter?.canonicalUrlHash}`;
      return mocks.sources.get(key) ?? null;
    },
    insertOne: async (doc: any) => {
      const key = `${doc.dossierId}:${doc.canonicalUrlHash}`;
      mocks.sources.set(key, doc);
      return { insertedId: doc.sourceId };
    },
  }),
  updateDossierCounts: (...args: unknown[]) => mocks.updateDossierCounts(...args),
}));

vi.mock("@features/dossier/revisions", () => ({
  logDossierRevision: (...args: unknown[]) => mocks.logDossierRevision(...args),
}));

vi.mock("@features/dossier/seed", () => ({
  seedDossierFromAnalysis: (...args: unknown[]) => mocks.seedDossierFromAnalysis(...args),
}));

import {
  buildContentReleaseWorkbenchTargets,
  buildContentReleaseWorkbenchTargetsForCreateHandoff,
  createInMemoryContentReleaseWorkbenchRepo,
  getContentReleasePersistenceState,
  getPublicContentLink,
  listContentReleaseAuditEventsForRecords,
  makeContentVisible,
  listContentReleaseAuditEvents,
  preparePublishPreview,
  prepareContentReleaseTargetFromSourceResult,
  revokeVisibility,
  archiveVisibleContent,
  setContentReleaseWorkbenchRepoForTests,
  updateContentReleaseTargetFromSourceResult,
} from "@features/contentReleaseWorkbench";
import {
  createInMemoryPersistedCreateHandoffRepo,
  setPersistedCreateHandoffRepoForTests,
} from "@/features/create/persistedHandoffReviewQueue";
import {
  createInMemoryRegionSourceConnectionRuntimeRepo,
  setRegionSourceConnectionRuntimeRepoForTests,
} from "@features/region";
import {
  createInMemoryDossierStudioWorkspaceRepo,
  setDossierStudioWorkspaceRepoForTests,
} from "@features/dossier/server/studioPersistence";

const sourceResult = {
  id: "source-result-1",
  connectionId: "source-1",
  regionId: "bezirk-berlin-reinickendorf",
  connectionLabel: "Bezirksamt Reinickendorf News",
  sourceType: "municipal_news",
  adapterId: "productive_regional_source",
  resultMode: "dry_run",
  title: "Bezirksamt Reinickendorf News · Dry Run",
  summary: "Explizite URL vorbereitet und reviewpflichtig ausgewertet.",
  configuredUrl: "https://reinickendorf.example/aktuelles",
  detectedTopics: ["Schule", "Verkehr"],
  visibilityState: "internal_review",
  visibilityLabel: "reviewpflichtig",
  reviewStatus: "needs_review",
  confidence: 0.68,
  sourceSnapshotStatus: "fetched",
  sourceSnapshotTitle: "Schulsanierung in Reinickendorf",
  sourceSnapshotSummary:
    "Das Bezirksamt Reinickendorf informiert über Schulwegsicherheit und Sanierungsbedarf.",
  sourceSnapshotExcerpt:
    "Das Bezirksamt Reinickendorf informiert über Schulwegsicherheit an mehreren Standorten.",
  sourceSnapshotTemplate: {
    id: "region-source-snapshot-template-source-1",
    label: "Beispiel-Snapshot",
    mode: "template_plus_explicit_url",
    seedKind: "example_seed",
    seedKindLabel: "Beispiel-Seed",
    configuredUrl: "https://reinickendorf.example/aktuelles",
    isExampleSeed: true,
    reviewHint:
      "Explizite URL bleibt kontrolliert reviewpflichtig; hinterlegte Snapshot-Hinweise halten den Demo-/Pilotstand reproduzierbar, ohne Live-Crawler oder automatische Veröffentlichung.",
    noLiveCrawlerClaim: true,
    noScraping: true,
    noDeepSearchAutoCosts: true,
    noAutoPublish: true,
    noPublicOfficial: true,
    claimCandidates: [],
    topicCandidates: [],
    evidenceHints: [],
    openQuestions: ["Welche nächsten Prüfschritte ergeben sich aus Schule?"],
  },
  possibleClaims: [
    {
      text: "Schulsanierung in Reinickendorf ist ein priorisiertes Thema.",
      confidence: 0.74,
      basisLabel: "Titel",
      excerpt:
        "Das Bezirksamt Reinickendorf informiert über Schulwegsicherheit an mehreren Standorten.",
      reviewRequired: true,
    },
  ],
  topicClusters: [
    {
      clusterKey: "bildung-schule",
      label: "Schule Reinickendorf",
      signalSeedIds: ["region-source-feed-signal-source-1-1"],
      openQuestions: ["Welche nächsten Prüfschritte ergeben sich aus Schule?"],
      confidence: 0.68,
      suggestedAction: "ask_clarifying_question",
      reviewStatus: "needs_review",
    },
  ],
  dossierSuggestions: [
    {
      title: "Berlin Reinickendorf: Schule",
      signalSeedIds: ["region-source-feed-signal-source-1-1"],
      openQuestions: ["Welche nächsten Prüfschritte ergeben sich aus Schule?"],
      confidence: 0.68,
      reviewStatus: "needs_review",
    },
  ],
  anlassraumSuggestions: [
    {
      title: "Schule Berlin Reinickendorf",
      signalSeedIds: ["region-source-feed-signal-source-1-1"],
      openQuestions: ["Welche nächsten Prüfschritte ergeben sich aus Schule?"],
      confidence: 0.68,
      reviewStatus: "needs_review",
    },
  ],
  evidenceReferences: [
    {
      label: "Seitenauszug · Schulsanierung in Reinickendorf",
      url: "https://reinickendorf.example/aktuelles",
      excerpt:
        "Das Bezirksamt Reinickendorf informiert über Schulwegsicherheit an mehreren Standorten.",
    },
  ],
  openQuestions: ["Welche nächsten Prüfschritte ergeben sich aus Schule?"],
  affectedScope: {
    regionName: "Berlin Reinickendorf",
    detectedPlaces: ["Berlin Reinickendorf"],
    ortsteilHints: [],
    fachbereichHints: ["Schule/Bildung", "Schule", "Verkehr"],
  },
  reviewSuggestions: [],
  reviewTaskSummary: {
    claimCount: 1,
    topicClusterCount: 1,
    dossierSuggestionCount: 1,
    anlassraumSuggestionCount: 1,
    openQuestionCount: 1,
    evidenceCount: 1,
    label: "1 mögliche Aussagen · 1 Themencluster · 1 Dossier-Vorschläge · 1 Anlassraum-Vorschläge · 1 offene Fragen",
  },
  createdAt: "2026-05-18T08:00:00.000Z",
  updatedAt: "2026-05-18T08:00:00.000Z",
  testedBy: "admin-1",
  reviewRequired: true,
  noAutoPublish: true,
  noPublicOfficial: true,
} as const;

const persistedCreateHandoff = {
  schemaVersion: "create_handoff_review_item.v1",
  id: "create-handoff-1",
  source: "create",
  sourceText: "Die Schulsanierung im Bezirk braucht einen belastbaren Überblick.",
  plannerResult: {
    source: "heuristic_fallback",
    plannerSource: "heuristic_fallback",
    plannerProvider: "none",
    plannerRole: "planner_only",
    plannerTopic: "Schulsanierung im Bezirk",
    plannerCore: "Die Schulsanierung im Bezirk braucht einen belastbaren Überblick.",
    plannerScope: ["district"],
    plannerStance: "open",
    plannerClusters: ["Bildung"],
    plannerOpenQuestions: ["Welche Standorte haben Priorität?"],
    shortSummary: "Die Schulsanierung im Bezirk braucht einen belastbaren Überblick.",
    topicCandidates: ["Schulsanierung"],
    clusterCandidates: ["Bildung"],
    scopeCandidates: ["district"],
    stance: "open",
    openQuestions: ["Welche Standorte haben Priorität?"],
    graphSearchTerms: ["Schulsanierung Reinickendorf"],
    materialSignals: [],
    recommendedLane: "standard",
    providerPlan: {
      lane: "standard",
      plannerProvider: "none",
      plannerRole: "planner_only",
      structureProvider: "mistral",
      summaryProvider: "claude",
      researchUsed: "none",
      researchProvider: null,
      deepSearchUsed: false,
      graphMatch: "after_structure",
    },
    permissions: {
      nonMutative: true,
      canPublish: false,
      canSave: false,
      canMerge: false,
      canDeepSearch: false,
    },
    plannerDegraded: false,
    degradedReason: null,
    plannerDegradedReason: null,
    qualityStatus: "specific",
    qualityIssues: [],
    providerCallAttempted: false,
    providerCallSucceeded: false,
    plannerDebug: {
      attemptedProvider: null,
      usedProvider: "none",
      providerAvailable: false,
      rawPayloadValid: true,
      rawTextValid: true,
      normalizedPayloadValid: true,
      qualityGatePassed: true,
    },
  },
  graphMatches: {
    stage: "after_structure",
    prepared: true,
    requiresConfirmation: true,
    searchTerms: ["Schulsanierung Reinickendorf"],
    matches: [],
    matchedTopics: ["Schulsanierung"],
    matchedDossiers: [],
    matchedClaims: [],
    matchedAnlassraeume: [],
    matchedVotes: [],
    shouldCreateNewTopic: true,
  },
  selectedAction: "create_dossier",
  claims: [
    {
      id: "claim-1",
      text: "Die Schulsanierung im Bezirk braucht einen belastbaren Überblick.",
      kind: "factual_claim",
      factcheckEligible: true,
      sourceRefs: ["source-text"],
    },
  ],
  arguments: [],
  openQuestions: [
    {
      id: "question-1",
      question: "Welche Standorte haben Priorität?",
      requiredBeforePublish: true,
    },
  ],
  sourceGrounding: [
    {
      id: "source-link-1",
      label: "Link 1",
      status: "link_reference",
      detail: "https://reinickendorf.example/aktuelles",
    },
  ],
  topicSeed: {
    topicKey: "schulsanierung-im-bezirk",
    topicLabel: "Schulsanierung im Bezirk",
    jurisdiction: "kommune",
    themenradarSourceType: "create_intake",
  },
  resumeHref: "/create?resume=create_handoff&handoffId=create-handoff-1",
  reviewState: "ready_for_confirmation",
  visibilityState: "internal_review",
  requiresConfirmation: true,
  reviewRequired: true,
  noAutoPublish: true,
  noPublicOfficial: true,
  noAutomaticOfficialResponse: true,
  noAutoFinalization: true,
  intakeClassification: "free_text",
  createdByUserId: "user-1",
  regionId: "bezirk-berlin-reinickendorf",
  organizationId: "org-reinickendorf-1",
  dossierId: null,
  anlassraumId: null,
  requestScope: {
    organizationId: "org-reinickendorf-1",
    organizationLabel: "Bezirksamt Reinickendorf",
    membershipStatus: "verified",
    organizationRole: "reviewer",
    roleLabel: "Beteiligung",
    regionIds: ["bezirk-berlin-reinickendorf"],
    primaryRegionId: "bezirk-berlin-reinickendorf",
    isOperatorMode: false,
    operatorModeLabel: null,
    sourceOfTruth: "operator_verified_directory",
    confidence: "high",
  },
  accessDecision: {
    status: "allowed",
    reason: "allowed",
    title: "Produktiver Handoff ist freigeschaltet",
    body: "Membership, Vertrag, Billing-Status und Entitlements erlauben diesen review-first Organisations-Handoff.",
    requiredEntitlementScopes: ["review_queue", "content_release", "dossier_studio"],
    missingEntitlementScopes: [],
    requiredActions: ["create_dossier_draft", "submit_for_review"],
    missingActions: [],
    contractStatus: "active",
    billingStatus: "operator_verified_contract",
    entitlementStatus: "granted",
  },
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T08:00:00.000Z",
} as const;

describe("content release workbench", () => {
  beforeEach(() => {
    process.env.VITEST = "1";
    mocks.dossiers.clear();
    mocks.sources.clear();
    mocks.logDossierRevision.mockReset();
    mocks.updateDossierCounts.mockReset();
    mocks.seedDossierFromAnalysis.mockReset();
    setContentReleaseWorkbenchRepoForTests(createInMemoryContentReleaseWorkbenchRepo());
    setRegionSourceConnectionRuntimeRepoForTests(
      createInMemoryRegionSourceConnectionRuntimeRepo({
        results: [sourceResult as any],
      }),
    );
    setPersistedCreateHandoffRepoForTests(
      createInMemoryPersistedCreateHandoffRepo({
        records: [persistedCreateHandoff as any],
      }),
    );
    setDossierStudioWorkspaceRepoForTests(createInMemoryDossierStudioWorkspaceRepo());
    mocks.createManualAnlassraum.mockResolvedValue({
      anlassraumId: { toHexString: () => "anlassraum-release-1" },
    });
  });

  it("prepares a dossier draft from a review item without auto publication", async () => {
    const record = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
      organizationId: "org-reinickendorf-1",
    });

    expect(record.targetType).toBe("dossier");
    expect(record.title).toBe("Berlin Reinickendorf: Schule");
    expect(record.visibilityState).toBe("internal_review");
    expect(record.previewHref).toBe(`/dossier/${record.targetId}/studio`);
    expect(record.publicHref).toBe(`/dossier/${record.targetId}`);

    const targets = await buildContentReleaseWorkbenchTargets({
      sourceKind: "region_source_result",
      result: sourceResult as any,
      canPrepare: true,
      canPreparePublication: true,
    });
    const dossierTarget = targets.find((target) => target.targetType === "dossier");
    expect(dossierTarget).toMatchObject({
      prepared: true,
      statusLabel: "Arbeitsstand",
      publishStatus: "internal_review",
      visibilityState: "internal_review",
      qrHref: null,
      publicLink: null,
    });
  });

  it("prepares an anlassraum from a review item on the existing route family", async () => {
    const record = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "anlassraum",
      requestedBy: "admin-1",
    });

    expect(record.targetType).toBe("anlassraum");
    expect(record.targetId).toBe("anlassraum-release-1");
    expect(record.previewHref).toBe("/runden?view=active&anlassraumId=anlassraum-release-1");
    expect(record.publicHref).toBe("/anlassraum?anlassraumId=anlassraum-release-1");
  });

  it("prepares a public topic page target from the same review workbench", async () => {
    const record = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "topic_page",
      requestedBy: "admin-1",
      organizationId: "org-reinickendorf-1",
    });

    expect(record.targetType).toBe("topic_page");
    expect(record.targetId).toContain("schule-reinickendorf");
    expect(record.previewHref).toContain("/topic/");
    expect(record.previewHref).toContain("previewTopicPage=1");
    expect(record.publicHref).toContain(`/topic/${record.targetId}`);
    expect(record.topicPageData).toMatchObject({
      title: "Schule Reinickendorf",
      summary: sourceResult.sourceSnapshotSummary,
      reviewStatus: "review_required",
    });
  });

  it("creates a publish preview contract from the existing workbench layer", async () => {
    const preview = await preparePublishPreview({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    expect(preview.target).toMatchObject({
      targetType: "dossier",
      targetLabel: "Dossier-Entwurf",
    });
    expect(preview.publishStatus).toBe("internal_review");
    expect(preview.publishStatusLabel).toBe("Arbeitsstand");
    expect(preview.publicLink).toBeNull();
  });

  it("requires conscious visibility actions and never sets public_official automatically", async () => {
    const prepared = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    expect(prepared.visibilityState).toBe("internal_review");

    const visible = await makeContentVisible({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    expect(visible.visibilityState).toBe("public_unverified");

    const preparedForPublication = await updateContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      action: "prepare_publication",
      requestedBy: "admin-1",
    });
    expect(preparedForPublication.visibilityState).toBe("public_reviewed");
    expect(preparedForPublication.visibilityState).not.toBe("public_official");

    const auditEvents = await listContentReleaseAuditEvents(preparedForPublication.id);
    expect(auditEvents.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "prepared",
        "visibility_made_public",
        "publication_prepared",
      ]),
    );
  });

  it("offers QR only after a visible release state and shows the status correctly in preview metadata", async () => {
    await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });

    const beforeVisible = await buildContentReleaseWorkbenchTargets({
      sourceKind: "region_source_result",
      result: sourceResult as any,
      canPrepare: true,
      canPreparePublication: true,
    });
    expect(beforeVisible.find((target) => target.targetType === "dossier")?.qrHref).toBeNull();

    await updateContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      action: "make_visible",
      requestedBy: "admin-1",
    });

    const visibleTargets = await buildContentReleaseWorkbenchTargets({
      sourceKind: "region_source_result",
      result: sourceResult as any,
      canPrepare: true,
      canPreparePublication: true,
    });
    expect(visibleTargets.find((target) => target.targetType === "dossier")).toMatchObject({
      statusLabel: "sichtbar, aber nicht geprüft",
      publishStatus: "public_unverified",
      visibilityState: "public_unverified",
      canCreateQrLink: true,
    });
    expect(
      visibleTargets.find((target) => target.targetType === "dossier")?.qrHref,
    ).toContain("/qr-studio?caller=content_release_workbench&target=");
    expect(
      visibleTargets.find((target) => target.targetType === "dossier")?.publicLink,
    ).toMatchObject({
      href: expect.stringContaining("/dossier/"),
      shareHref: expect.stringContaining("/dossier/"),
      visibilityState: "public_unverified",
    });
    expect(getContentReleasePersistenceState()).toMatchObject({
      mode: "in_memory_fallback",
      productionTruth: false,
    });
  });

  it("retracts visibility without hard delete and archives consciously", async () => {
    await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "anlassraum",
      requestedBy: "admin-1",
    });
    await updateContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "anlassraum",
      action: "prepare_publication",
      requestedBy: "admin-1",
    });

    const revoked = await revokeVisibility({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "anlassraum",
      requestedBy: "admin-1",
    });
    expect(revoked.visibilityState).toBe("internal_review");

    const archived = await archiveVisibleContent({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "anlassraum",
      requestedBy: "admin-1",
    });
    expect(archived.visibilityState).toBe("archived");

    const link = await getPublicContentLink({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "anlassraum",
    });
    expect(link).toBeNull();

    const auditEvents = await listContentReleaseAuditEvents(archived.id);
    expect(auditEvents.map((event) => event.action)).toEqual(
      expect.arrayContaining(["visibility_retracted", "archived"]),
    );
  });

  it("reuses the same workbench for persisted create handoffs", async () => {
    const dossierRecord = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "create_handoff",
      sourceResultId: persistedCreateHandoff.id,
      targetType: "dossier",
      requestedBy: "admin-1",
      organizationId: "org-reinickendorf-1",
    });

    expect(dossierRecord.sourceKind).toBe("create_handoff");
    expect(dossierRecord.title).toBe("Schulsanierung im Bezirk");
    expect(dossierRecord.visibilityState).toBe("internal_review");

    const anlassraumRecord = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "create_handoff",
      sourceResultId: persistedCreateHandoff.id,
      targetType: "anlassraum",
      requestedBy: "admin-1",
    });

    expect(anlassraumRecord.sourceKind).toBe("create_handoff");
    expect(anlassraumRecord.publicHref).toBe("/anlassraum?anlassraumId=anlassraum-release-1");

    const targets = await buildContentReleaseWorkbenchTargetsForCreateHandoff({
      sourceKind: "create_handoff",
      record: persistedCreateHandoff as any,
      canPrepare: true,
      canPreparePublication: true,
    });
    expect(targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: "dossier",
          prepared: true,
          statusLabel: "Arbeitsstand",
        }),
            expect.objectContaining({
              targetType: "anlassraum",
              prepared: true,
              statusLabel: "Arbeitsstand",
            }),
            expect.objectContaining({
              targetType: "topic_page",
              prepared: false,
              statusLabel: "Arbeitsstand",
            }),
          ]),
    );
  });

  it("keeps visibility and archive audit events reconstructable through the repository", async () => {
    const dossier = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    const topicPage = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "topic_page",
      requestedBy: "admin-1",
    });

    await makeContentVisible({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    await archiveVisibleContent({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "topic_page",
      requestedBy: "admin-1",
    });

    const grouped = await listContentReleaseAuditEventsForRecords([
      dossier.id,
      topicPage.id,
    ]);

    expect(grouped[dossier.id]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "visibility_made_public" }),
      ]),
    );
    expect(grouped[topicPage.id]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "archived" }),
      ]),
    );
  });
});
