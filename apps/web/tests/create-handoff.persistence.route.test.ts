import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import {
  createInMemoryPersistedCreateHandoffRepo,
  getPersistedCreateHandoffRecord,
  setPersistedCreateHandoffRepoForTests,
} from "@/features/create/persistedHandoffReviewQueue";
import {
  createInMemoryDossierRuntimeRepository,
  getDossierRuntimeRecord,
  setDossierRuntimeRepositoryForTests,
} from "@/features/create/dossierRuntimeServer";
import {
  createInMemoryDossierStudioWorkspaceRepo,
  setDossierStudioWorkspaceRepoForTests,
} from "@features/dossier/server/studioPersistence";
import {
  createInMemoryRegionEntitlementRuntimeRepo,
  createInMemoryRegionOrganizationRuntimeRepo,
  setRegionEntitlementRuntimeRepoForTests,
  setRegionOrganizationRuntimeRepoForTests,
} from "@features/region";
import { setPricingOrderContractsRuntimeRepoForTests } from "@features/pricing/orderContractsRuntime";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
}));

const jurisdictionMocks = vi.hoisted(() => ({
  validateConfirmation: vi.fn(),
}));

vi.mock("@/lib/server/auth/sessionUser", () => ({
  getSessionUser: (...args: unknown[]) => mocks.getSessionUser(...args),
}));

vi.mock("@/features/create/createCitizenIntakeContextServer", () => ({
  validateCreateJurisdictionConfirmation: (...args: unknown[]) =>
    jurisdictionMocks.validateConfirmation(...args),
}));

import { GET } from "@/app/api/create/handoffs/[handoffId]/route";
import { POST as persistRoute } from "@/app/api/create/handoffs/route";

const draftPayload = {
  id: "create-handoff-route-1",
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
      id: "source-text",
      label: "Ausgangstext",
      status: "source_text",
      detail: "Die Schulsanierung im Bezirk braucht einen belastbaren Überblick.",
    },
  ],
  topicSeed: {
    topicKey: "schulsanierung-im-bezirk",
    topicLabel: "Schulsanierung im Bezirk",
    jurisdiction: "kommune",
    themenradarSourceType: "create_intake",
  },
  resumeHref: "/create?resume=create_handoff&handoffId=create-handoff-route-1",
  reviewState: "ready_for_confirmation",
  visibilityState: "internal_review",
  requiresConfirmation: true,
  createdAt: "2026-05-19T09:00:00.000Z",
} as const;

const activeEntitlement = {
  id: "entitlement-create-handoff-1",
  organizationId: "org-reinickendorf-1",
  organizationName: "Bezirksamt Reinickendorf",
  organizationType: "district_office",
  regionId: "bezirk-berlin-reinickendorf",
  unitId: "unit-1",
  planId: "kommune-aktivierung",
  planLabel: "Kommune Aktivierung",
  status: "active",
  scope: "organization_unit",
  validFrom: "2026-05-23T08:00:00.000Z",
  validUntil: null,
  limits: {
    maxRegions: 1,
    maxDossiers: 10,
    maxAnlassraeume: 10,
    maxSignalsPerMonth: 100,
    maxDraftsPerMonth: 25,
    maxUsers: 10,
    factcheckCredits: 0,
  },
  usage: {
    regionsUsed: 0,
    dossiersUsed: 0,
    anlassraeumeUsed: 0,
    signalsThisMonth: 0,
    draftsThisMonth: 0,
    usersUsed: 1,
    factcheckCreditsUsed: 0,
  },
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T08:00:00.000Z",
  createdBy: "admin-1",
  source: "manual_contract",
  noAutoBilling: true,
  noAutoCharge: true,
} as const;

const activeContractRecord = {
  id: "pricing-order-create-handoff-1",
  orderId: "EDE-20260523-CREATE-1",
  packageId: "kommune-aktivierung",
  planLabel: "Kommune Aktivierung",
  organizationId: "org-reinickendorf-1",
  organizationName: "Bezirksamt Reinickendorf",
  status: "active",
  contractStatus: "active",
  billingStatus: "operator_verified_contract",
  billingSource: "operator_verified_contract",
  planAssignment: {
    planId: "kommune-aktivierung",
    planLabel: "Kommune Aktivierung",
    scopes: [
      "organization_dashboard",
      "review_queue",
      "content_release",
      "dossier_studio",
    ],
  },
  accessProvisioningDecision: "activate",
  auditEvents: [
    {
      id: "contract-audit-create-handoff-1",
      eventType: "activate",
      organizationId: "org-reinickendorf-1",
      orderId: "EDE-20260523-CREATE-1",
      previousContractStatus: "accepted",
      nextContractStatus: "active",
      previousBillingStatus: "operator_verified_contract",
      nextBillingStatus: "operator_verified_contract",
      source: "operator_verified_contract",
      planAssignment: {
        planId: "kommune-aktivierung",
        planLabel: "Kommune Aktivierung",
        scopes: [
          "organization_dashboard",
          "review_queue",
          "content_release",
          "dossier_studio",
        ],
      },
      note: "Betreiber-verifizierter Vertragsprozess.",
      createdAt: "2026-05-23T08:00:00.000Z",
      createdBy: "admin-1",
    },
  ],
  source: "pricing_order",
  createdAt: "2026-05-23T08:00:00.000Z",
  updatedAt: "2026-05-23T08:00:00.000Z",
} as const;

describe("/api/create/handoffs", () => {
  beforeEach(async () => {
    jurisdictionMocks.validateConfirmation.mockReset();
    jurisdictionMocks.validateConfirmation.mockReturnValue(null);
    mocks.getSessionUser.mockResolvedValue({
      _id: { toHexString: () => "user-1" },
      roles: ["organization_member"],
      sessionValid: true,
    });
    setPersistedCreateHandoffRepoForTests(createInMemoryPersistedCreateHandoffRepo());
    setDossierRuntimeRepositoryForTests(createInMemoryDossierRuntimeRepository());
    setRegionOrganizationRuntimeRepoForTests(
      createInMemoryRegionOrganizationRuntimeRepo({
        organizations: [
          {
            id: "org-reinickendorf-1",
            name: "Bezirksamt Reinickendorf",
            type: "district_office",
            countryCode: "DE",
            primaryRegionId: "bezirk-berlin-reinickendorf",
            website: "https://reinickendorf.example",
            verificationStatus: "organization_verified",
            createdByUserId: "admin-1",
          },
        ],
        memberships: [
          {
            id: "membership-1",
            userId: "user-1",
            organizationId: "org-reinickendorf-1",
            organizationName: "Bezirksamt Reinickendorf",
            organizationType: "district_office",
            regionId: "bezirk-berlin-reinickendorf",
            unitId: "unit-1",
            unitName: "Beteiligung",
            optionalLocation: null,
            roleLabel: "Beteiligung",
            roleType: "participation_officer",
            verificationStatus: "unit_verified",
            allowedActions: ["read_region_dashboard", "create_dossier_draft", "submit_for_review"],
            createdAt: "2026-05-19T08:00:00.000Z",
            updatedAt: "2026-05-19T08:00:00.000Z",
            verifiedBy: "admin-1",
            verifiedAt: "2026-05-19T08:00:00.000Z",
            expiresAt: null,
            revokedAt: null,
            noAutoAuthority: true,
          },
        ],
      }),
    );
    setRegionEntitlementRuntimeRepoForTests(
      createInMemoryRegionEntitlementRuntimeRepo({
        entitlements: [activeEntitlement as any],
      }),
    );
    setPricingOrderContractsRuntimeRepoForTests({
      async listPricingOrdersForOrganization() {
        return [activeContractRecord as any];
      },
    });
    const workspaceRepo = createInMemoryDossierStudioWorkspaceRepo();
    await workspaceRepo.createOrGetDossierStudioWorkspace({
      dossierId: "dossier-1",
      regionId: "bezirk-berlin-reinickendorf",
      organizationId: "org-reinickendorf-1",
      source: "manual_editor",
      title: "Schulsanierung Studio",
      createdBy: "user-1",
      updatedBy: "user-1",
    });
    setDossierStudioWorkspaceRepoForTests(workspaceRepo);
  });

  it("persists a create handoff as a reviewpflichtiger working state", async () => {
    const req = new NextRequest("http://localhost/api/create/handoffs", {
      method: "POST",
      body: JSON.stringify({
        draft: draftPayload,
        dossierId: "dossier-1",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await persistRoute(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.record).toMatchObject({
      id: "create-handoff-route-1",
      regionId: "bezirk-berlin-reinickendorf",
      organizationId: "org-reinickendorf-1",
      dossierId: "dossier-1",
    });
    expect(body.dossierRuntime).toMatchObject({
      sourceReviewItemId: "create-handoff-route-1",
      dossierRuntimeId: "dossier-runtime:create-handoff-route-1",
      runtimeStatus: "queued_for_review",
      dossierRuntimeState: "dossier_review_draft",
      dossierTargetState: "dossier_review_draft",
      persistenceState: "persisted_dossier_runtime_record",
      reviewState: "review_required",
      publishState: "not_published",
      graphTargetState: "planned_not_active",
    });
    expect(body.requestScope).toMatchObject({
      organizationId: "org-reinickendorf-1",
      membershipStatus: "verified",
      organizationRole: "reviewer",
      isOperatorMode: false,
    });
    expect(body.accessDecision).toMatchObject({
      status: "allowed",
      reason: "allowed",
    });

    const stored = await getPersistedCreateHandoffRecord("create-handoff-route-1");
    expect(stored).toMatchObject({
      reviewRequired: true,
      noAutoPublish: true,
      noPublicOfficial: true,
      selectedAction: "create_dossier",
      intakeClassification: "claim",
    });
    await expect(getDossierRuntimeRecord("create-handoff-route-1")).resolves.toMatchObject({
      id: "dossier-runtime:create-handoff-route-1",
      sourceHandoffId: "create-handoff-route-1",
      sourceReviewItemId: "create_handoff:persisted:create-handoff-route-1",
      status: "queued_for_review",
      visibility: "internal_review",
      createdDossierId: null,
    });
  });

  it("loads the persisted handoff again for later continuation", async () => {
    await persistRoute(
      new NextRequest("http://localhost/api/create/handoffs", {
        method: "POST",
        body: JSON.stringify({ draft: draftPayload, dossierId: "dossier-1" }),
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await GET(new Request("http://localhost/api/create/handoffs/create-handoff-route-1"), {
      params: Promise.resolve({ handoffId: "create-handoff-route-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.draft).toMatchObject({
      id: "create-handoff-route-1",
      sourceText: "Die Schulsanierung im Bezirk braucht einen belastbaren Überblick.",
      selectedAction: "create_dossier",
    });
    expect(body.dossierRuntime).toMatchObject({
      sourceReviewItemId: "create-handoff-route-1",
      dossierRuntimeId: "dossier-runtime:create-handoff-route-1",
      runtimeStatus: "queued_for_review",
      dossierRuntimeState: "dossier_review_draft",
      dossierTargetState: "dossier_review_draft",
      persistenceState: "persisted_dossier_runtime_record",
      reviewState: "review_required",
      publishState: "not_published",
      graphTargetState: "planned_not_active",
    });
    expect(body.dossierRuntime.missingRuntimeTruth).toEqual([]);
    expect(body.context).toMatchObject({
      regionId: "bezirk-berlin-reinickendorf",
      organizationId: "org-reinickendorf-1",
      dossierId: "dossier-1",
    });
  });

  it("backfills a persisted dossier runtime draft for an older create_dossier handoff on resume", async () => {
    await persistRoute(
      new NextRequest("http://localhost/api/create/handoffs", {
        method: "POST",
        body: JSON.stringify({ draft: draftPayload, dossierId: "dossier-1" }),
        headers: { "content-type": "application/json" },
      }),
    );

    setDossierRuntimeRepositoryForTests(createInMemoryDossierRuntimeRepository());

    const response = await GET(
      new Request("http://localhost/api/create/handoffs/create-handoff-route-1"),
      {
        params: Promise.resolve({ handoffId: "create-handoff-route-1" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dossierRuntime).toMatchObject({
      dossierRuntimeId: "dossier-runtime:create-handoff-route-1",
      dossierRuntimeState: "dossier_review_draft",
      persistenceState: "persisted_dossier_runtime_record",
    });
    await expect(getDossierRuntimeRecord("create-handoff-route-1")).resolves.toMatchObject({
      id: "dossier-runtime:create-handoff-route-1",
      status: "queued_for_review",
    });
  });

  it("falls back to the resolved organization and region scope when no target workspace is chosen yet", async () => {
    const response = await persistRoute(
      new NextRequest("http://localhost/api/create/handoffs", {
        method: "POST",
        body: JSON.stringify({ draft: draftPayload }),
        headers: { "content-type": "application/json" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.record).toMatchObject({
      id: "create-handoff-route-1",
      regionId: "bezirk-berlin-reinickendorf",
      organizationId: "org-reinickendorf-1",
      dossierId: null,
      anlassraumId: null,
    });
    expect(body.requestScope).toMatchObject({
      organizationId: "org-reinickendorf-1",
      primaryRegionId: "bezirk-berlin-reinickendorf",
      membershipStatus: "verified",
    });

    const stored = await getPersistedCreateHandoffRecord("create-handoff-route-1");
    expect(stored).toMatchObject({
      regionId: "bezirk-berlin-reinickendorf",
      organizationId: "org-reinickendorf-1",
      noAutoPublish: true,
      noPublicOfficial: true,
    });
  });

  it("rejects a manipulated C7 jurisdiction key before review persistence", async () => {
    const response = await persistRoute(
      new NextRequest("http://localhost/api/create/handoffs", {
        method: "POST",
        body: JSON.stringify({
          draft: {
            ...draftPayload,
            jurisdictionConfirmation: {
              candidateKey: "municipality:frei erfundene behörde",
              candidate: {
                level: "municipality",
                label: "Frei erfundene Behörde",
              },
              serverValidated: true,
            },
          },
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "invalid_jurisdiction_confirmation",
    });
    expect(
      await getPersistedCreateHandoffRecord("create-handoff-route-1"),
    ).toBeNull();
  });

  it("revalidates C7 jurisdiction before handoff persistence", async () => {
    const candidateKey =
      "district:kreis dithmarschen (wahrscheinlich)";
    jurisdictionMocks.validateConfirmation.mockReturnValueOnce({
      selectedRegionLabel: "Dithmarschen",
      jurisdictionCandidates: [{
        level: "district",
        label: "Kreis Dithmarschen (wahrscheinlich)",
        authorityName: "Heide",
        administrativeUnitType: "kreis",
        confidence: 0.68,
        reason: "server",
        needsReview: true,
      }],
      jurisdictionConfirmation: {
        status: "confirmed",
        candidateKey,
      },
      placeResolution: {
        selectedCandidate: {
          id: "region-official-01051",
          city: "Dithmarschen",
          registryId: "01051",
        },
      },
    });

    const response = await persistRoute(
      new NextRequest("http://localhost/api/create/handoffs", {
        method: "POST",
        body: JSON.stringify({
          draft: {
            ...draftPayload,
            sourceText: "In Dithmarschen muss der Busverkehr besser werden.",
            jurisdictionConfirmation: {
              candidateKey,
              candidate: {
                level: "municipality",
                label: "Client manipulation",
              },
              regionId: "client-region",
              serverValidated: true,
            },
          },
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(jurisdictionMocks.validateConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceText: "In Dithmarschen muss der Busverkehr besser werden.",
        candidateKey,
      }),
    );
    expect(response.status).toBe(200);
  });

  it("rejects persisting a handoff into a foreign organization workspace", async () => {
    const workspaceRepo = createInMemoryDossierStudioWorkspaceRepo();
    await workspaceRepo.createOrGetDossierStudioWorkspace({
      dossierId: "dossier-foreign",
      regionId: "bezirk-berlin-spandau",
      organizationId: "org-spandau-1",
      source: "manual_editor",
      title: "Spandau Studio",
      createdBy: "staff-2",
      updatedBy: "staff-2",
    });
    setDossierStudioWorkspaceRepoForTests(workspaceRepo);

    const response = await persistRoute(
      new NextRequest("http://localhost/api/create/handoffs", {
        method: "POST",
        body: JSON.stringify({
          draft: draftPayload,
          dossierId: "dossier-foreign",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "create_handoff_scope_forbidden",
    });
    expect(response.status).toBe(403);
  });

  it("blocks productive org handoffs when contract or billing is only pending", async () => {
    setPricingOrderContractsRuntimeRepoForTests({
      async listPricingOrdersForOrganization() {
        return [
          {
            ...activeContractRecord,
            status: "pending",
            contractStatus: "limited",
            billingStatus: "billing_pending",
            accessProvisioningDecision: "limit",
          } as any,
        ];
      },
    });

    const response = await persistRoute(
      new NextRequest("http://localhost/api/create/handoffs", {
        method: "POST",
        body: JSON.stringify({ draft: draftPayload }),
        headers: { "content-type": "application/json" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      error: "create_handoff_not_productively_available",
      accessDecision: {
        status: "limited",
      },
    });
  });

  it("blocks productive org handoffs when review queue or dossier scopes are not freigeschaltet", async () => {
    setPricingOrderContractsRuntimeRepoForTests({
      async listPricingOrdersForOrganization() {
        return [
          {
            ...activeContractRecord,
            planAssignment: {
              ...activeContractRecord.planAssignment,
              scopes: ["organization_dashboard"],
            },
          } as any,
        ];
      },
    });

    const response = await persistRoute(
      new NextRequest("http://localhost/api/create/handoffs", {
        method: "POST",
        body: JSON.stringify({ draft: draftPayload }),
        headers: { "content-type": "application/json" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      error: "create_handoff_not_productively_available",
      accessDecision: {
        status: "limited",
        reason: "entitlement_missing",
      },
    });
  });
});
