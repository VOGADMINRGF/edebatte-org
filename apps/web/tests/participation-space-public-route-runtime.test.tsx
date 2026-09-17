import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  listParticipationSpacePublishRecords: vi.fn(),
}));

vi.mock("@/features/create/participationSpaceRuntimeServer", () => ({
  listParticipationSpacePublishRecords: (...args: unknown[]) =>
    mocks.listParticipationSpacePublishRecords(...args),
}));

import PublicParticipationSpaceIndexPage from "@/app/beteiligung/page";
import {
  getPublishedParticipationSpaceBySlugOrId,
  isPublicParticipationSpace,
  listPublishedParticipationSpaces,
} from "@/features/participation/publicParticipationSpaceRuntime";
import type {
  ParticipationSpacePublishAuditEntry,
  ParticipationSpacePublishRecord,
} from "@/features/create/participationSpacePublishWorkflow";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";

const QUESTION = "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?";

function audit(
  action: ParticipationSpacePublishAuditEntry["action"],
  status: ParticipationSpacePublishRecord["status"],
  at: string,
): ParticipationSpacePublishAuditEntry {
  return {
    id: `audit:${action}:${at}`,
    sourceHandoffId: "handoff-1",
    participationSpaceId: "participation-space-1",
    at,
    action,
    actorUserId: "admin-1",
    note: "Durable public release evidence.",
    blockers: [],
    status,
  };
}

function buildRecord(
  overrides: Partial<ParticipationSpacePublishRecord> = {},
): ParticipationSpacePublishRecord {
  return {
    version: 4,
    id: "participation-space-publish:handoff-1",
    sourceHandoffId: "handoff-1",
    sourceReviewItemId: "create_handoff:persisted:handoff-1",
    statementId: "create-handoff:handoff-1",
    participationSpaceId: "participation-space-1",
    participationSpaceSlug: "sichere-schulwege",
    runtimeStatus: "created",
    runtimeVisibility: "public",
    spaceStatus: "public_feedback_live",
    spaceVisibility: "public_read_only",
    title: "Beteiligungsraum Sichere Schulwege",
    workingTitle: "Beteiligungsraum Sichere Schulwege",
    description: "Öffentliche Runtime-Beschreibung für sichere Schulwege.",
    participationQuestion: QUESTION,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: QUESTION,
      candidatePublicQuestion: QUESTION,
      actorContexts: [],
      actorExtraction: {
        status: "complete",
        source: "human_review",
        independentFromCandidateProvider: true,
        evidenceRefs: ["human-review:sichere-schulwege:1"],
        humanReviewFinding: "no_named_actors",
      },
    }),
    publicHeadline: "Sichere Schulwege im Blick",
    publicSummary:
      "Der Beteiligungsraum bündelt veröffentlichte Hinweise und Einordnungen.",
    moderationPolicy:
      "Review-first Veröffentlichung mit expliziter Freigabe, Audit und manueller Moderation.",
    publicFeedbackAvailable: true,
    relatedAnlassraumId: "65a111111111111111111110",
    relatedDossierId: "dossier-sichere-schulwege",
    recognizedStandpoints: ["Kinder brauchen sichere Wege."],
    argumentLines: ["Querungen priorisieren."],
    openQuestions: ["Welche Schulen sind besonders betroffen?"],
    sourceStatus: "source_reviewed",
    communitySignals: [],
    graphReferences: ["topic-graph-1"],
    topicReferences: ["Sichere Schulwege"],
    moderationPending: false,
    unresolvedAbuseSignal: false,
    unresolvedTrustQualityBlocker: false,
    graphContextPending: false,
    dossierContextPending: false,
    anlassraumContextPending: false,
    creationAudited: true,
    status: "published",
    visibility: "public",
    blockers: [],
    auditContext: {
      actorUserId: "admin-1",
      reason: "Explizit veröffentlicht.",
      origin: "admin_review",
      approvedAt: "2026-06-30T09:50:00.000Z",
    },
    guardrails: {
      createdNotPublic: true,
      approvedForCreationNotPublic: true,
      activeInternalNotPublic: true,
      readyForPublicationReviewNotPublic: true,
      approvedForActivationNotPublic: true,
      approvedForPublicationNotPublicUntilPublish: true,
      noAutoPublishFromCreation: true,
      noAutoActivationFromCreation: true,
      noPublicVisibilitySideEffect: true,
      noVerifiedFactsByDefault: true,
      noVerifiedSourcesByDefault: true,
      noCommunityHintsAsTruth: true,
      noTrustOrSourceQualityAsVerification: true,
      noGraphEdgeAsProof: true,
      noDossierContextAsProof: true,
      noAnlassraumContextAsProof: true,
      noMajorityAsTruth: true,
      noAutoGraphWrite: true,
      noAutoMerge: true,
      auditContextRequired: true,
    },
    createdAt: "2026-06-30T08:00:00.000Z",
    updatedAt: "2026-06-30T09:50:00.000Z",
    auditTrail: [
      audit(
        "activation_approved",
        "approved_for_activation",
        "2026-06-30T09:20:00.000Z",
      ),
      audit("activated_internal", "activated", "2026-06-30T09:30:00.000Z"),
      audit(
        "publication_approved",
        "approved_for_publication",
        "2026-06-30T09:40:00.000Z",
      ),
      audit("published_public", "published", "2026-06-30T09:50:00.000Z"),
    ],
    approvedForActivationAt: "2026-06-30T09:20:00.000Z",
    approvedForActivationBy: "admin-1",
    approvedForPublicationAt: "2026-06-30T09:40:00.000Z",
    approvedForPublicationBy: "admin-1",
    rejectedAt: null,
    rejectedBy: null,
    ...overrides,
  };
}

describe("participation space public route runtime", () => {
  it("fails closed for missing, blocked, review-required or stale guards", async () => {
    const legacyWithoutGuard = buildRecord({ questionGuard: undefined as never });
    const reviewRequired = buildRecord({
      questionGuard: evaluatePublicQuestionGeneralization({
        originalInput: QUESTION,
        actorContexts: [],
      }),
    });
    const blocked = buildRecord({
      questionGuard: evaluatePublicQuestionGeneralization({
        originalInput: "Sollen wir diese Gruppe verprügeln?",
        candidatePublicQuestion: "Welche Maßnahmen sollten Konflikte friedlich lösen?",
        actorContexts: [],
        actorExtraction: {
          status: "complete",
          source: "human_review",
          independentFromCandidateProvider: true,
          evidenceRefs: ["human-review:safety:1"],
          humanReviewFinding: "no_named_actors",
        },
      }),
    });
    const stale = buildRecord({
      participationQuestion: "Welche andere Maßnahme soll jetzt umgesetzt werden?",
    });

    for (const record of [legacyWithoutGuard, reviewRequired, blocked, stale]) {
      expect(isPublicParticipationSpace(record)).toBe(false);
    }

    mocks.listParticipationSpacePublishRecords.mockResolvedValue([
      legacyWithoutGuard,
      reviewRequired,
      blocked,
      stale,
    ]);
    await expect(
      listPublishedParticipationSpaces({ allowFixtureFallback: false }),
    ).resolves.toMatchObject({ items: [], status: { source: "empty" } });
    await expect(
      getPublishedParticipationSpaceBySlugOrId("sichere-schulwege", {
        allowFixtureFallback: false,
      }),
    ).resolves.toMatchObject({ detail: null });
  });

  it("requires fresh approvals and all durable release audits", () => {
    expect(isPublicParticipationSpace(buildRecord())).toBe(true);
    expect(
      isPublicParticipationSpace(
        buildRecord({ approvedForPublicationAt: null, approvedForPublicationBy: null }),
      ),
    ).toBe(false);
    expect(
      isPublicParticipationSpace(
        buildRecord({
          auditTrail: buildRecord().auditTrail.filter(
            (entry) => entry.action !== "published_public",
          ),
        }),
      ),
    ).toBe(false);
  });

  it("lists only public runtime records and strips internal evidence", async () => {
    mocks.listParticipationSpacePublishRecords.mockResolvedValue([
      buildRecord(),
      buildRecord({
        id: "internal",
        participationSpaceId: "participation-space-2",
        participationSpaceSlug: "intern",
        status: "activated",
        visibility: "active_internal",
      }),
    ]);

    const result = await listPublishedParticipationSpaces({
      allowFixtureFallback: false,
    });
    expect(result.status.source).toBe("runtime");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      slug: "sichere-schulwege",
      source: "runtime",
    });
    expect(JSON.stringify(result.items[0])).not.toContain("auditTrail");
    expect(JSON.stringify(result.items[0])).not.toContain("graphReferences");
  });

  it("renders the public index from released runtime data only", async () => {
    mocks.listParticipationSpacePublishRecords.mockResolvedValue([buildRecord()]);
    const html = renderToStaticMarkup(await PublicParticipationSpaceIndexPage());

    expect(html).toContain("Öffentlich freigegebene Beteiligungsräume");
    expect(html).toContain("Beteiligungsraum Sichere Schulwege");
    expect(html).not.toContain("auditTrail");
    expect(html).not.toContain("admin-1");
  });

  it("uses fixture fallback only after a successful empty runtime read", async () => {
    mocks.listParticipationSpacePublishRecords.mockResolvedValue([]);

    const result = await listPublishedParticipationSpaces();
    expect(result.status.source).toBe("fixture_fallback");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.status.message).toContain("klar gekennzeichnete Vorschau");
  });

  it("does not mask a runtime read failure with fixture fallback", async () => {
    mocks.listParticipationSpacePublishRecords.mockRejectedValue(
      new Error("simulated_runtime_read_failure"),
    );

    await expect(listPublishedParticipationSpaces()).resolves.toMatchObject({
      items: [],
      status: { source: "error", fallbackActive: false },
    });
    await expect(
      getPublishedParticipationSpaceBySlugOrId("sichere-schulwege"),
    ).resolves.toMatchObject({
      detail: null,
      status: { source: "error", fallbackActive: false },
    });
  });
});
