import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { AnlassraumActivationRecord } from "@/features/create/anlassraumActivationWorkflow";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

import AdminAnlassraumActivationSection from "@/app/admin/review/AdminAnlassraumActivationSection";
import AnlassraumActivationActions from "@/app/admin/review/AnlassraumActivationActions";

function buildRecord(
  overrides: Partial<AnlassraumActivationRecord> = {},
): AnlassraumActivationRecord {
  const trigger = "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?";
  return {
    id: "anlassraum-activation:handoff-1",
    sourceHandoffId: "handoff-1",
    sourceReviewItemId: "create_handoff:persisted:handoff-1",
    statementId: "create-handoff:handoff-1",
    anlassraumId: "65a111111111111111111110",
    anlassraumSlug: "sichere-schulwege",
    runtimeStatus: "created",
    runtimeVisibility: "ready_for_activation_review",
    roomStatus: "approved",
    roomIsPublic: false,
    title: "Anlassraum Sichere Schulwege",
    workingTitle: "Anlassraum Sichere Schulwege",
    trigger,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: trigger,
      actorContexts: [],
      actorExtraction: {
        status: "complete",
        source: "human_review",
        independentFromCandidateProvider: true,
        evidenceRefs: ["human-review:anlassraum-activation-1"],
        humanReviewFinding: "no_named_actors",
      },
    }),
    description:
      "1 Aussage · 1 offene Frage. Sichere Schulwege sollen sichtbar, aber erst nach separater Freigabe öffentlich werden.",
    relatedDossierId: "dossier-sichere-schulwege",
    recognizedStandpoints: ["Pro: Kinder brauchen sichere Wege."],
    argumentLines: ["Querungen priorisieren."],
    openQuestions: ["Welche Schulen sind besonders betroffen?"],
    sourceStatus: "source_review_requested",
    communitySignals: [],
    graphReferences: ["Sichere Schulwege"],
    topicReferences: ["Sichere Schulwege"],
    moderationPending: false,
    unresolvedAbuseSignal: false,
    unresolvedTrustQualityBlocker: false,
    graphContextPending: false,
    dossierContextPending: false,
    creationAudited: true,
    status: "draft",
    visibility: "editorial_workspace",
    publicAccessMode: "none",
    blockers: ["activation_not_approved", "publication_not_approved"],
    auditContext: {
      actorUserId: "admin-1",
      reason: "Audit vorhanden.",
      origin: "admin_review",
      approvedAt: "2026-07-01T09:10:00.000Z",
    },
    guardrails: {
      createdNotPublic: true,
      approvedForCreationNotPublic: true,
      activeInternalNotPublic: true,
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
      noMajorityAsTruth: true,
      noAutoGraphWrite: true,
      noAutoMerge: true,
      noAutoFactcheck: true,
      noAutoDossierCreation: true,
      noAutoParticipationSpaceCreation: true,
      noDeepSearch: true,
      auditContextRequired: true,
    },
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T09:10:00.000Z",
    auditTrail: [
      {
        id: "audit-1",
        sourceHandoffId: "handoff-1",
        anlassraumId: "65a111111111111111111110",
        at: "2026-07-01T09:10:00.000Z",
        action: "activation_requested",
        actorUserId: "admin-1",
        note: "Workflow abgeleitet.",
        blockers: ["activation_not_approved", "publication_not_approved"],
        status: "draft",
      },
    ],
    approvedForActivationAt: null,
    approvedForActivationBy: null,
    approvedForPublicationAt: null,
    approvedForPublicationBy: null,
    rejectedAt: null,
    rejectedBy: null,
    ...overrides,
  };
}

describe("anlassraum activation admin ui", () => {
  it("renders the activation/publication section with guardrails, actions and audit", () => {
    const reviewOnly = buildRecord();
    const published = buildRecord({
      id: "anlassraum-activation:handoff-2",
      sourceHandoffId: "handoff-2",
      status: "published",
      visibility: "public",
      publicAccessMode: "public_read_only",
      roomStatus: "active",
      roomIsPublic: true,
      blockers: [],
      auditTrail: [
        {
          id: "audit-2",
          sourceHandoffId: "handoff-2",
          anlassraumId: "65a111111111111111111110",
          at: "2026-07-01T09:50:00.000Z",
          action: "published_public",
          actorUserId: "admin-1",
          note: "Explizit veröffentlicht.",
          blockers: [],
          status: "published",
        },
      ],
    });

    const markup = renderToStaticMarkup(
      <AdminAnlassraumActivationSection
        anlassraumActivationRecords={[reviewOnly, published]}
        anlassraumActivationAuditMap={new Map([
          [reviewOnly.sourceHandoffId, reviewOnly.auditTrail],
          [published.sourceHandoffId, published.auditTrail],
        ])}
        anlassraumActivationPersistence={{
          label: "Persistenter Anlassraum-Aktivierungs-/Publish-Workflow",
          summary: "Aktivierungs- und Veröffentlichungsfreigaben liegen dauerhaft vor.",
          productionTruth: true,
          publicRouteRuntime: "runtime_wired",
        }}
      />,
    );

    expect(markup).toContain("Anlassraum aktivieren/veröffentlichen prüfen");
    expect(markup).toContain("Aktivierung freigeben");
    expect(markup).toContain("Erstellung ist nicht Aktivierung");
    expect(markup).toContain("Keine öffentliche Freigabe");
    expect(markup).toContain("Audit Trail");
    expect(markup).toContain("runtime_wired");
  });

  it("enables publish only after explicit publication approval", () => {
    const reviewOnlyMarkup = renderToStaticMarkup(
      <AnlassraumActivationActions record={buildRecord()} />,
    );
    const approvedMarkup = renderToStaticMarkup(
      <AnlassraumActivationActions
        record={buildRecord({
          sourceHandoffId: "handoff-2",
          status: "approved_for_publication",
          visibility: "ready_for_publication_review",
          publicAccessMode: "internal_only",
          roomStatus: "active",
          blockers: [],
          approvedForActivationAt: "2026-07-01T09:20:00.000Z",
          approvedForActivationBy: "admin-1",
          approvedForPublicationAt: "2026-07-01T09:40:00.000Z",
          approvedForPublicationBy: "admin-1",
        })}
      />,
    );
    const reviewRequiredMarkup = renderToStaticMarkup(
      <AnlassraumActivationActions
        record={buildRecord({
          questionGuard: evaluatePublicQuestionGeneralization({
            originalInput:
              "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
            actorContexts: [],
          }),
        })}
      />,
    );

    expect(reviewOnlyMarkup).toContain(
      'data-testid="publish-anlassraum-handoff-1" disabled=""',
    );
    expect(approvedMarkup).toContain('data-testid="publish-anlassraum-handoff-2"');
    expect(approvedMarkup).not.toContain(
      'data-testid="publish-anlassraum-handoff-2" disabled=""',
    );
    expect(reviewRequiredMarkup).toContain(
      'data-testid="anlassraum-question-guard-evidence-handoff-1"',
    );
    expect(reviewRequiredMarkup).toContain(
      'data-testid="review-anlassraum-question-guard-handoff-1" disabled=""',
    );
    expect(reviewOnlyMarkup).not.toContain(
      "review-anlassraum-question-guard-handoff-1",
    );
  });
});
