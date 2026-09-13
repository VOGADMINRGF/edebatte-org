import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  listParticipationSpacePublishRecords: vi.fn(),
}));

vi.mock("@/features/create/participationSpaceRuntimeServer", () => ({
  listParticipationSpacePublishRecords: (...args: unknown[]) =>
    mocks.listParticipationSpacePublishRecords(...args),
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  };
});

import PublicParticipationSpacePage from "@/app/beteiligung/[slug]/page";
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
    spaceStatus: "feedback_prepared",
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
    publicFeedbackAvailable: false,
    relatedAnlassraumId: "65a111111111111111111110",
    relatedDossierId: "dossier-sichere-schulwege",
    recognizedStandpoints: ["Pro: Kinder brauchen sichere Wege."],
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

async function renderDetail(slug: string) {
  return renderToStaticMarkup(
    await PublicParticipationSpacePage({
      params: Promise.resolve({ slug }),
    }),
  );
}

describe("participation space public detail runtime", () => {
  it("renders a published public detail and keeps the route read-only", async () => {
    mocks.listParticipationSpacePublishRecords.mockResolvedValue([buildRecord()]);

    const html = await renderDetail("sichere-schulwege");

    expect(html).toContain("Beteiligungsraum Sichere Schulwege");
    expect(html).toContain("Veröffentlicht");
    expect(html).toContain("Dieser Raum wurde redaktionell öffentlich freigegeben.");
    expect(html).toContain(
      "Quellen- und Kontextangaben dienen der Einordnung, nicht als automatische Wahrheitsbestätigung.",
    );
    expect(html).toContain("Hinweise zu diesem Raum einreichen");
    expect(html).toContain("Hinweis einreichen");
    expect(html).toContain("Review-first Hinweis");
    expect(html).not.toContain("communitySignals");
    expect(html).not.toContain("graphReferences");
    expect(html).not.toContain("auditTrail");
    expect(html).not.toContain("Auto-Graph");
    expect(html).not.toContain("Auto-Merge");
    expect(html).not.toContain("Runtime-basiert");
    expect(html).not.toContain("Fixture-basiert");
  });

  it("returns notFound for a non-public detail", async () => {
    mocks.listParticipationSpacePublishRecords.mockResolvedValue([
      buildRecord({
        status: "approved_for_publication",
        visibility: "ready_for_publication_review",
        participationSpaceSlug: "noch-nicht-oeffentlich",
      }),
    ]);

    await expect(renderDetail("noch-nicht-oeffentlich")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});
