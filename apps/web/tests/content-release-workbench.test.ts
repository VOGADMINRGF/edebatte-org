import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createManualAnlassraum: vi.fn(),
  dossiers: new Map<string, any>(),
  sources: new Map<string, any>(),
  mutateDossierWithRevision: vi.fn(),
  updateDossierCounts: vi.fn(),
  seedDossierFromAnalysis: vi.fn(),
  session: { id: "content-release-test-session" },
  dossierInsertSessions: [] as unknown[],
  sourceInsertSessions: [] as unknown[],
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
    insertOne: async (doc: any, options?: any) => {
      mocks.dossierInsertSessions.push(options?.session);
      mocks.dossiers.set(doc.dossierId, doc);
      return { insertedId: doc.dossierId };
    },
  }),
  dossierSourcesCol: async () => ({
    findOne: async (filter: any) => {
      const key = `${filter?.dossierId}:${filter?.canonicalUrlHash}`;
      return mocks.sources.get(key) ?? null;
    },
    insertOne: async (doc: any, options?: any) => {
      mocks.sourceInsertSessions.push(options?.session);
      const key = `${doc.dossierId}:${doc.canonicalUrlHash}`;
      mocks.sources.set(key, doc);
      return { insertedId: doc.sourceId };
    },
  }),
  updateDossierCounts: (...args: unknown[]) => mocks.updateDossierCounts(...args),
}));

vi.mock("@features/dossier/revisions", () => ({
  mutateDossierWithRevision: (...args: unknown[]) => mocks.mutateDossierWithRevision(...args),
}));

vi.mock("@features/dossier/seed", () => ({
  seedDossierFromAnalysis: (...args: unknown[]) => mocks.seedDossierFromAnalysis(...args),
}));

import {
  archiveVisibleContent,
  buildContentReleaseWorkbenchTargets,
  buildContentReleaseWorkbenchTargetsForCreateHandoff,
  createInMemoryContentReleaseWorkbenchRepo,
  getContentReleasePersistenceState,
  getPublicContentLink,
  listContentReleaseAuditEvents,
  listContentReleaseAuditEventsForRecords,
  makeContentVisible,
  prepareContentReleaseTargetFromSourceResult,
  preparePublishPreview,
  revokeVisibility,
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
  organizationId: "org-reinickendorf-1",
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
  possibleClaims: [
    {
      text: "Schulsanierung in Reinickendorf ist ein priorisiertes Thema.",
      confidence: 0.74,
      basisLabel: "Titel",
      excerpt: "Das Bezirksamt informiert über Schulwegsicherheit.",
      reviewRequired: true,
    },
  ],
  topicClusters: [
    {
      clusterKey: "bildung-schule",
      label: "Schule Reinickendorf",
      signalSeedIds: [],
      openQuestions: [],
      confidence: 0.68,
      suggestedAction: "ask_clarifying_question",
      reviewStatus: "needs_review",
    },
  ],
  dossierSuggestions: [
    {
      title: "Berlin Reinickendorf: Schule",
      signalSeedIds: [],
      openQuestions: [],
      confidence: 0.68,
      reviewStatus: "needs_review",
    },
  ],
  anlassraumSuggestions: [
    {
      title: "Schule Berlin Reinickendorf",
      signalSeedIds: [],
      openQuestions: [],
      confidence: 0.68,
      reviewStatus: "needs_review",
    },
  ],
  evidenceReferences: [
    {
      label: "Seitenauszug · Schulsanierung in Reinickendorf",
      url: "https://reinickendorf.example/aktuelles",
      excerpt: "Das Bezirksamt informiert über Schulwegsicherheit.",
    },
  ],
  openQuestions: ["Welche Standorte haben Priorität?"],
  affectedScope: {
    regionName: "Berlin Reinickendorf",
    detectedPlaces: ["Berlin Reinickendorf"],
    ortsteilHints: [],
    fachbereichHints: ["Schule/Bildung"],
  },
  reviewSuggestions: [],
  reviewTaskSummary: {
    claimCount: 1,
    topicClusterCount: 1,
    dossierSuggestionCount: 1,
    anlassraumSuggestionCount: 1,
    openQuestionCount: 1,
    evidenceCount: 1,
    label: "Review",
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
  canonicalDraftId: null,
  source: "create",
  sourceText: "Die Schulsanierung im Bezirk braucht einen belastbaren Überblick.",
  plannerResult: {
    shortSummary: "Die Schulsanierung im Bezirk braucht einen belastbaren Überblick.",
    plannerTopic: "Schulsanierung im Bezirk",
    topicCandidates: ["Schulsanierung"],
  },
  graphMatches: {
    matches: [],
    matchedDossiers: [],
    matchedAnlassraeume: [],
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
  canonicalSourceEvidenceRefs: [],
  topicSeed: {
    topicKey: "schulsanierung-im-bezirk",
    topicLabel: "Schulsanierung im Bezirk",
    jurisdiction: "kommune",
    themenradarSourceType: "create_intake",
  },
  reviewState: "ready_for_confirmation",
  visibilityState: "internal_review",
  requiresConfirmation: true,
  reviewRequired: true,
  noAutoPublish: true,
  noPublicOfficial: true,
  noAutomaticOfficialResponse: true,
  noAutoFinalization: true,
  createdByUserId: "user-1",
  regionId: "bezirk-berlin-reinickendorf",
  organizationId: "org-reinickendorf-1",
  dossierId: null,
  anlassraumId: null,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T08:00:00.000Z",
} as any;

describe("content release workbench", () => {
  beforeEach(() => {
    process.env.VITEST = "1";
    mocks.dossiers.clear();
    mocks.sources.clear();
    mocks.dossierInsertSessions.length = 0;
    mocks.sourceInsertSessions.length = 0;
    mocks.mutateDossierWithRevision.mockReset();
    mocks.mutateDossierWithRevision.mockImplementation(async (input: any) => {
      const mutation = await input.mutate(mocks.session as any);
      return { result: mutation.result, revision: mutation.revision };
    });
    mocks.updateDossierCounts.mockReset();
    mocks.updateDossierCounts.mockResolvedValue({ claims: 1, sources: 1, findings: 0, edges: 0, openQuestions: 1 });
    mocks.seedDossierFromAnalysis.mockReset();
    setContentReleaseWorkbenchRepoForTests(createInMemoryContentReleaseWorkbenchRepo());
    setRegionSourceConnectionRuntimeRepoForTests(
      createInMemoryRegionSourceConnectionRuntimeRepo({ results: [sourceResult as any] }),
    );
    setPersistedCreateHandoffRepoForTests(
      createInMemoryPersistedCreateHandoffRepo({ records: [persistedCreateHandoff] }),
    );
    setDossierStudioWorkspaceRepoForTests(createInMemoryDossierStudioWorkspaceRepo());
    mocks.createManualAnlassraum.mockResolvedValue({
      anlassraumId: { toHexString: () => "anlassraum-release-1" },
    });
  });

  it("prepares a source-result dossier and source through the canonical revision boundary", async () => {
    const record = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
      organizationId: "org-reinickendorf-1",
    });

    expect(record).toMatchObject({
      targetType: "dossier",
      title: "Berlin Reinickendorf: Schule",
      visibilityState: "internal_review",
    });
    expect(mocks.dossiers.size).toBe(1);
    expect(mocks.sources.size).toBe(1);
    expect(mocks.mutateDossierWithRevision).toHaveBeenCalledTimes(2);
    expect(mocks.dossierInsertSessions).toEqual([mocks.session]);
    expect(mocks.sourceInsertSessions).toEqual([mocks.session]);
    expect(mocks.seedDossierFromAnalysis).toHaveBeenCalledTimes(1);
    expect(mocks.updateDossierCounts).toHaveBeenCalledTimes(1);
  });

  it("keeps persisted create-handoff dossier and source intake on the same revision boundary", async () => {
    const record = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "create_handoff",
      sourceResultId: persistedCreateHandoff.id,
      targetType: "dossier",
      requestedBy: "admin-1",
      organizationId: "org-reinickendorf-1",
    });

    expect(record).toMatchObject({
      sourceKind: "create_handoff",
      title: "Schulsanierung im Bezirk",
      visibilityState: "internal_review",
    });
    expect(mocks.dossiers.size).toBe(1);
    expect(mocks.sources.size).toBe(1);
    expect(mocks.mutateDossierWithRevision).toHaveBeenCalledTimes(2);
    expect(mocks.dossierInsertSessions).toEqual([mocks.session]);
    expect(mocks.sourceInsertSessions).toEqual([mocks.session]);
  });

  it("does not create duplicate dossier or source mutations when intake is already present", async () => {
    await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    const firstCallCount = mocks.mutateDossierWithRevision.mock.calls.length;

    const same = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });

    expect(same.targetType).toBe("dossier");
    expect(mocks.mutateDossierWithRevision).toHaveBeenCalledTimes(firstCallCount);
    expect(mocks.dossiers.size).toBe(1);
    expect(mocks.sources.size).toBe(1);
  });

  it("prepares anlassraum and topic-page targets without automatic publication", async () => {
    const anlassraum = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "anlassraum",
      requestedBy: "admin-1",
    });
    const topicPage = await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "topic_page",
      requestedBy: "admin-1",
    });

    expect(anlassraum.publicHref).toBe("/anlassraum?anlassraumId=anlassraum-release-1");
    expect(topicPage.targetId).toContain("schule-reinickendorf");
    expect(topicPage.topicPageData).toMatchObject({
      title: "Schule Reinickendorf",
      reviewStatus: "review_required",
    });
    expect(anlassraum.visibilityState).toBe("internal_review");
    expect(topicPage.visibilityState).toBe("internal_review");
  });

  it("creates publish preview metadata and requires conscious visibility progression", async () => {
    const preview = await preparePublishPreview({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    expect(preview.publishStatus).toBe("internal_review");
    expect(preview.publicLink).toBeNull();

    const visible = await makeContentVisible({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    expect(visible.visibilityState).toBe("public_unverified");

    const reviewed = await updateContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      action: "prepare_publication",
      requestedBy: "admin-1",
    });
    expect(reviewed.visibilityState).toBe("public_reviewed");
    expect(reviewed.visibilityState).not.toBe("public_official");

    const events = await listContentReleaseAuditEvents(reviewed.id);
    expect(events.map((event) => event.action)).toEqual(
      expect.arrayContaining(["prepared", "visibility_made_public", "publication_prepared"]),
    );
  });

  it("offers QR only after visibility and removes public links after revoke/archive", async () => {
    await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    await makeContentVisible({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
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
      canCreateQrLink: true,
    });

    const revoked = await revokeVisibility({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    expect(revoked.visibilityState).toBe("internal_review");
    expect(
      await getPublicContentLink({
        sourceKind: "region_source_result",
        sourceResultId: sourceResult.id,
        targetType: "dossier",
      }),
    ).toBeNull();

    const archived = await archiveVisibleContent({
      sourceKind: "region_source_result",
      sourceResultId: sourceResult.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });
    expect(archived.visibilityState).toBe("archived");
  });

  it("reuses the workbench projection for persisted create handoffs", async () => {
    await prepareContentReleaseTargetFromSourceResult({
      sourceKind: "create_handoff",
      sourceResultId: persistedCreateHandoff.id,
      targetType: "dossier",
      requestedBy: "admin-1",
    });

    const targets = await buildContentReleaseWorkbenchTargetsForCreateHandoff({
      sourceKind: "create_handoff",
      record: persistedCreateHandoff,
      canPrepare: true,
      canPreparePublication: true,
    });
    expect(targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetType: "dossier", prepared: true }),
        expect.objectContaining({ targetType: "anlassraum", prepared: false }),
        expect.objectContaining({ targetType: "topic_page", prepared: false }),
      ]),
    );
  });

  it("keeps audit events reconstructable through the repository", async () => {
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

    const grouped = await listContentReleaseAuditEventsForRecords([dossier.id, topicPage.id]);
    expect(grouped[dossier.id]).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "visibility_made_public" })]),
    );
    expect(grouped[topicPage.id]).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "archived" })]),
    );
    expect(getContentReleasePersistenceState()).toMatchObject({
      mode: "in_memory_fallback",
      productionTruth: false,
    });
  });
});
