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
import type { ParticipationSpacePublishRecord } from "@/features/create/participationSpacePublishWorkflow";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";

function buildRecord(
  overrides: Partial<ParticipationSpacePublishRecord> = {},
): ParticipationSpacePublishRecord {
  return {
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
    participationQuestion: "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
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
    publicSummary: "Der Beteiligungsraum bündelt veröffentlichte Hinweise und Einordnungen.",
    moderationPolicy:
      "Review-first Veröffentlichung mit expliziter Freigabe, Audit und manueller Moderation.",
    publicFeedbackAvailable: true,
    relatedAnlassraumId: "65a111111111111111111110",
    relatedDossierId: "dossier-sichere-schulwege",
    recognizedStandpoints: ["Pro: Kinder brauchen sichere Wege."],
    argumentLines: ["Querungen priorisieren."],
    openQuestions: ["Welche Schulen sind besonders betroffen?"],
    sourceStatus: "source_reviewed",
    communitySignals: [
      {
        contributionId: "contribution-1",
        title: "Interner Community-Hinweis",
        status: "accepted_as_hint",
        kind: "source_suggestion",
        summary: "Nicht öffentlich anzeigen",
        trustLevel: "medium",
        sourceQualityLevel: "medium",
        reviewPriority: "high",
        moderationStatus: "accepted",
        hasAbuseBlocker: false,
        hasTrustQualityBlocker: false,
        sourceReviewPending: false,
        moderationPending: false,
      },
    ],
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
      approvedAt: "2026-06-30T09:10:00.000Z",
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
    auditTrail: [],
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
  it("fails closed for legacy or currently blocked guards across public read and input lookup", async () => {
    const legacyWithoutGuard = buildRecord({ questionGuard: undefined as never });
    const reviewRequired = buildRecord({
      questionGuard: evaluatePublicQuestionGeneralization({
        originalInput: "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
        actorContexts: [],
        actorExtraction: {
          status: "unverified",
          source: "not_available",
          independentFromCandidateProvider: false,
          evidenceRefs: [],
        },
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

    expect(isPublicParticipationSpace(legacyWithoutGuard)).toBe(false);
    expect(reviewRequired.questionGuard.releaseState).toBe("review_required");
    expect(isPublicParticipationSpace(reviewRequired)).toBe(false);
    expect(blocked.questionGuard.releaseState).toBe("blocked");
    expect(isPublicParticipationSpace(blocked)).toBe(false);

    mocks.listParticipationSpacePublishRecords.mockResolvedValue([
      legacyWithoutGuard,
      reviewRequired,
      blocked,
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

  it("requires fresh explicit approvals in addition to a draft-allowed guard", () => {
    const reviewedButNotReapproved = buildRecord({
      status: "draft",
      visibility: "editorial_workspace",
      approvedForActivationAt: null,
      approvedForActivationBy: null,
      approvedForPublicationAt: null,
      approvedForPublicationBy: null,
    });

    expect(reviewedButNotReapproved.questionGuard.releaseState).toBe(
      "draft_allowed",
    );
    expect(isPublicParticipationSpace(reviewedButNotReapproved)).toBe(false);
    expect(isPublicParticipationSpace(buildRecord())).toBe(true);
  });

  it("lists only published public runtime participation spaces and strips internals", async () => {
    mocks.listParticipationSpacePublishRecords.mockResolvedValue([
      buildRecord(),
      buildRecord({
        id: "created-only",
        participationSpaceId: "participation-space-2",
        participationSpaceSlug: "intern-aktiv",
        status: "approved_for_publication",
        visibility: "ready_for_publication_review",
        title: "Intern aktiv",
        publicHeadline: "Nicht öffentlich",
      }),
      buildRecord({
        id: "rejected",
        participationSpaceId: "participation-space-3",
        participationSpaceSlug: "abgelehnt",
        status: "rejected",
        visibility: "active_internal",
        title: "Abgelehnt",
      }),
    ]);

    const result = await listPublishedParticipationSpaces({ allowFixtureFallback: false });

    expect(result.status.source).toBe("runtime");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      slug: "sichere-schulwege",
      title: "Beteiligungsraum Sichere Schulwege",
      source: "runtime",
    });
    expect(JSON.stringify(result.items[0])).not.toContain("communitySignals");
    expect(JSON.stringify(result.items[0])).not.toContain("auditTrail");
    expect(JSON.stringify(result.items[0])).not.toContain("trustLevel");
    expect(JSON.stringify(result.items[0])).not.toContain("graphReferences");
  });

  it("renders the index from runtime data without non-public entries", async () => {
    mocks.listParticipationSpacePublishRecords.mockResolvedValue([
      buildRecord(),
      buildRecord({
        id: "activated-only",
        participationSpaceId: "participation-space-4",
        participationSpaceSlug: "nur-intern",
        status: "activated",
        visibility: "active_internal",
        title: "Nur intern",
      }),
    ]);

    const html = renderToStaticMarkup(await PublicParticipationSpaceIndexPage());

    expect(html).toContain("Öffentlich freigegebene Beteiligungsräume");
    expect(html).toContain("Veröffentlicht");
    expect(html).toContain("Beteiligungsraum Sichere Schulwege");
    expect(html).not.toContain("Nur intern");
    expect(html).not.toContain("communitySignals");
    expect(html).not.toContain("auditTrail");
    expect(html).not.toContain("admin-1");
    expect(html).not.toContain("Runtime-basiert");
    expect(html).not.toContain("Fixture-basiert");
    expect(html).not.toContain("Runtime-Published");
  });

  it("keeps the existing fixture fallback clearly marked when no runtime publish exists", async () => {
    mocks.listParticipationSpacePublishRecords.mockResolvedValue([]);

    const result = await listPublishedParticipationSpaces();

    expect(result.status.source).toBe("fixture_fallback");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.status.message).toContain("klar gekennzeichnete Vorschau");
  });
});
