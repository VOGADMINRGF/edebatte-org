import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ParticipationSpacePublishRecord } from "@/features/create/participationSpacePublishWorkflow";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

import AdminParticipationSpacePublishSection from "@/app/admin/review/AdminParticipationSpacePublishSection";
import ParticipationSpacePublishActions from "@/app/admin/review/ParticipationSpacePublishActions";

function buildRecord(
  overrides: Partial<ParticipationSpacePublishRecord> = {},
): ParticipationSpacePublishRecord {
  const participationQuestion =
    "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?";
  return {
    id: "participation-space-publish:handoff-1",
    sourceHandoffId: "handoff-1",
    sourceReviewItemId: "create_handoff:persisted:handoff-1",
    statementId: "create-handoff:handoff-1",
    participationSpaceId: "participation-space-1",
    participationSpaceSlug: "sichere-schulwege",
    runtimeStatus: "created",
    runtimeVisibility: "active_internal",
    spaceStatus: "review_active",
    spaceVisibility: "review_only",
    title: "Beteiligungsraum Sichere Schulwege",
    workingTitle: "Beteiligungsraum Sichere Schulwege",
    description:
      "1 Aussage · 1 offene Frage. Sichere Schulwege sollen im Beteiligungsraum weitergeführt werden.",
    participationQuestion,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: participationQuestion,
      actorContexts: [],
      actorExtraction: {
        status: "complete",
        source: "human_review",
        independentFromCandidateProvider: true,
        evidenceRefs: ["human-review:participation-publish-1"],
        humanReviewFinding: "no_named_actors",
      },
    }),
    publicHeadline: "Sichere Schulwege im Blick",
    publicSummary:
      "Der Beteiligungsraum bündelt Hinweise zu Querungen und offenen Prüfpfaden.",
    moderationPolicy:
      "Review-first Veröffentlichung mit expliziter Freigabe, Audit und manueller Moderation.",
    publicFeedbackAvailable: false,
    relatedAnlassraumId: "65a111111111111111111110",
    relatedDossierId: "dossier-sichere-schulwege",
    recognizedStandpoints: ["Pro: Kinder brauchen sichere Wege."],
    argumentLines: ["Kinder brauchen sichere Wege."],
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
    anlassraumContextPending: false,
    creationAudited: true,
    status: "draft",
    visibility: "editorial_workspace",
    blockers: ["activation_not_approved", "publication_not_approved"],
    auditContext: {
      actorUserId: "admin-1",
      reason: "Audit vorhanden.",
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
    updatedAt: "2026-06-30T09:10:00.000Z",
    auditTrail: [
      {
        id: "audit-1",
        sourceHandoffId: "handoff-1",
        participationSpaceId: "participation-space-1",
        at: "2026-06-30T09:10:00.000Z",
        action: "activation_requested",
        actorUserId: "admin-1",
        note: "Aktivierungsworkflow abgeleitet.",
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

describe("participation space publish admin ui", () => {
  it("renders the publish section with status, visibility, blockers and audit", () => {
    const draft = buildRecord();
    const published = buildRecord({
      id: "participation-space-publish:handoff-2",
      sourceHandoffId: "handoff-2",
      status: "published",
      visibility: "public",
      spaceStatus: "feedback_prepared",
      spaceVisibility: "public_read_only",
      blockers: [],
      auditTrail: [
        {
          id: "audit-2",
          sourceHandoffId: "handoff-2",
          participationSpaceId: "participation-space-1",
          at: "2026-06-30T09:50:00.000Z",
          action: "published_public",
          actorUserId: "admin-1",
          note: "Explizit veröffentlicht.",
          blockers: [],
          status: "published",
        },
      ],
    });

    const markup = renderToStaticMarkup(
      <AdminParticipationSpacePublishSection
        participationSpacePublishRecords={[draft, published]}
        participationSpacePublishAuditMap={new Map([
          [draft.sourceHandoffId, draft.auditTrail],
          [published.sourceHandoffId, published.auditTrail],
        ])}
        participationSpacePublishPersistence={{
          label: "Persistenter Beteiligungsraum-Publish-/Activation-Workflow",
          summary:
            "Aktivierungs- und Veröffentlichungsfreigaben liegen dauerhaft vor.",
          productionTruth: true,
          publicRouteRuntime: "runtime_wired",
        }}
      />,
    );

    expect(markup).toContain(
      "Beteiligungsraum aktivieren/veröffentlichen prüfen",
    );
    expect(markup).toContain(
      "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
    );
    expect(markup).toContain("Aktivierung ist ein separater Freigabeschritt.");
    expect(markup).toContain(
      "Veröffentlichung ist nicht Teil der Erstellung.",
    );
    expect(markup).toContain(
      "Öffentliche Sichtbarkeit entsteht nur nach expliziter Freigabe",
    );
    expect(markup).toContain("Audit Trail");
    expect(markup).toContain(
      "Veröffentlichung braucht eine eigene explizite Freigabe.",
    );
    expect(markup).toContain("runtime-wired");
  });

  it("disables activation and publication actions until explicit approvals exist", () => {
    const draftMarkup = renderToStaticMarkup(
      <ParticipationSpacePublishActions record={buildRecord()} />,
    );
    const approvedPublicationMarkup = renderToStaticMarkup(
      <ParticipationSpacePublishActions
        record={buildRecord({
          sourceHandoffId: "handoff-2",
          status: "approved_for_publication",
          visibility: "ready_for_publication_review",
          spaceStatus: "feedback_prepared",
          blockers: [],
          approvedForActivationAt: "2026-06-30T09:20:00.000Z",
          approvedForActivationBy: "admin-1",
          approvedForPublicationAt: "2026-06-30T09:40:00.000Z",
          approvedForPublicationBy: "admin-1",
        })}
      />,
    );
    const reviewRequiredMarkup = renderToStaticMarkup(
      <ParticipationSpacePublishActions
        record={buildRecord({
          questionGuard: evaluatePublicQuestionGeneralization({
            originalInput:
              "Welche Maßnahmen sollten sichere Schulwege zuerst verbessern?",
            actorContexts: [],
          }),
        })}
      />,
    );

    expect(draftMarkup).toContain(
      'data-testid="activate-participation-space-handoff-1" disabled=""',
    );
    expect(draftMarkup).toContain(
      'data-testid="publish-participation-space-handoff-1" disabled=""',
    );
    expect(approvedPublicationMarkup).toContain(
      'data-testid="publish-participation-space-handoff-2"',
    );
    expect(approvedPublicationMarkup).not.toContain(
      'data-testid="publish-participation-space-handoff-2" disabled=""',
    );
    expect(approvedPublicationMarkup).toContain(
      "Öffentliche Sichtbarkeit entsteht nur nach expliziter Veröffentlichung.",
    );
    expect(reviewRequiredMarkup).toContain(
      'data-testid="participation-space-question-guard-evidence-handoff-1"',
    );
    expect(reviewRequiredMarkup).toContain(
      'data-testid="review-participation-space-question-guard-handoff-1" disabled=""',
    );
    expect(draftMarkup).not.toContain(
      "review-participation-space-question-guard-handoff-1",
    );
  });
});
