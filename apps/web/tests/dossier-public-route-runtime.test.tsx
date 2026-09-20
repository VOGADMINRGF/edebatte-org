import { describe, expect, it } from "vitest";
import {
  mapDossierToPublicDossier,
} from "@/features/dossier/publicRuntime";
import { buildDossierWorkspaceModel } from "@/components/dossier/workspaceModel";
import type { DossierPublicationRecord } from "@/features/create/dossierPublishWorkflow";
import type {
  DossierClaimDoc,
  DossierDoc,
  DossierFindingDoc,
  DossierSourceDoc,
  OpenQuestionDoc,
} from "@features/dossier";

function buildPublicationRecord(
  overrides: Partial<DossierPublicationRecord> = {},
): DossierPublicationRecord {
  return {
    id: "dossier-publication:handoff-1",
    sourceHandoffId: "handoff-1",
    sourceReviewItemId: "create_handoff:persisted:handoff-1",
    statementId: "create-handoff:handoff-1",
    dossierId: "dossier-sichere-schulwege",
    runtimeStatus: "created",
    runtimeVisibility: "published",
    title: "Dossier Sichere Schulwege",
    workingTitle: "Dossier Sichere Schulwege",
    summary: "Sichere Schulwege werden als veröffentlichter Arbeitsstand erklärt.",
    originQuestion: "Welche Kreuzungen sind zuerst kritisch?",
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
    creationAudited: true,
    status: "published",
    visibility: "public",
    publicAccessMode: "public_read_only",
    blockers: [],
    auditContext: {
      actorUserId: "admin-1",
      reason: "Veröffentlicht.",
      origin: "dossier_publish_workflow",
      approvedAt: "2026-06-30T09:40:00.000Z",
    },
    guardrails: {
      creationApprovalIsNotPublicationApproval: true,
      publicationApprovalIsNotFactVerification: true,
      publishedIsNotAbsoluteTruth: true,
      sourceReferencesAreNotAutomaticVerification: true,
      trustSignalsAreReviewContextOnly: true,
      noAutoPublish: true,
      noAutoActivation: true,
      noAutoGraphWrite: true,
      noAutoMerge: true,
      noAutoFactcheck: true,
      noAutoAnlassraumCreation: true,
      noAutoParticipationSpaceCreation: true,
      noDeepSearch: true,
      noHiddenCostPath: true,
      noInternalFieldLeak: true,
      auditContextRequired: true,
    },
    createdAt: "2026-06-30T08:00:00.000Z",
    updatedAt: "2026-06-30T09:40:00.000Z",
    auditTrail: [],
    approvedForPublicationAt: "2026-06-30T09:30:00.000Z",
    approvedForPublicationBy: "admin-1",
    rejectedAt: null,
    rejectedBy: null,
    unpublishedAt: null,
    unpublishedBy: null,
    archivedAt: null,
    archivedBy: null,
    ...overrides,
  };
}

describe("dossier public route runtime", () => {
  it("maps only published/public/public_read_only dossiers to a public-safe dossier payload", () => {
    const dossier = mapDossierToPublicDossier({
      publication: buildPublicationRecord(),
      dossierDoc: {
        dossierId: "dossier-sichere-schulwege",
        statementId: "create-handoff:handoff-1",
        title: "Dossier Sichere Schulwege",
        status: "active",
        counts: {
          claims: 1,
          sources: 1,
          findings: 1,
          edges: 0,
          openQuestions: 1,
        },
        createdAt: new Date("2026-06-30T08:00:00.000Z"),
        updatedAt: new Date("2026-06-30T09:40:00.000Z"),
      } satisfies DossierDoc,
      claims: [
        {
          claimId: "claim-1",
          dossierId: "dossier-sichere-schulwege",
          text: "Vor Schulen fehlen sichere Querungen.",
          kind: "fact",
          status: "open",
          createdByRole: "admin",
        } satisfies DossierClaimDoc,
      ],
      sources: [
        {
          sourceId: "source-1",
          dossierId: "dossier-sichere-schulwege",
          canonicalUrlHash: "hash-1",
          url: "https://example.org/verkehr",
          title: "Verkehrszählung",
          publisher: "Bezirk",
          type: "official",
        } satisfies DossierSourceDoc,
      ],
      findings: [
        {
          findingId: "finding-1",
          dossierId: "dossier-sichere-schulwege",
          claimId: "claim-1",
          verdict: "supports",
          rationale: ["Quelle stützt den Claim."],
          citations: [{ sourceId: "source-1" }],
          producedBy: "editor",
        } satisfies DossierFindingDoc,
      ],
      openQuestions: [
        {
          questionId: "question-1",
          dossierId: "dossier-sichere-schulwege",
          text: "Welche Schulen sind besonders betroffen?",
          status: "open",
        } satisfies OpenQuestionDoc,
      ],
    });

    expect(dossier.meta.status).toBe("published");
    expect(dossier.meta.title).toBe("Dossier Sichere Schulwege");
    expect(dossier.meta.jurisdiction).toBe("unknown");
    expect(dossier.analyze.language).toBe("und");
    expect(dossier.analyze.report.facts.local).toEqual([]);
    expect(dossier.analyze.report.facts.international).toEqual([]);
    expect(dossier.analyze.claims[0]?.text).toContain("Querungen");
    expect(dossier.analyze.claims.some((claim) => claim.stance === "pro")).toBe(true);
    expect(dossier.analyze.questions[0]?.text).toContain("Schulen");
    expect(dossier.analyze.evidenceGraph?.summary.linkedClaimCount).toBe(1);
    expect(dossier.analyze.evidenceGraph?.nodes.some((node) => node.id === "source-1")).toBe(true);
    expect(dossier.analyze.notes.map((entry) => entry.text).join(" ")).toContain(
      "nicht Wahrheitszertifikat",
    );
    expect(JSON.stringify(dossier)).not.toContain("auditTrail");
    expect(JSON.stringify(dossier)).not.toContain("admin-1");
    expect(JSON.stringify(dossier)).not.toContain("trust");
    expect(JSON.stringify(dossier)).not.toContain("moderation");
  });

  it("does not infer federal/state/EU jurisdiction from title text", () => {
    const dossier = mapDossierToPublicDossier({
      publication: buildPublicationRecord({ title: "Bund Land EU: offene Zuständigkeit" }),
      dossierDoc: {
        dossierId: "dossier-sichere-schulwege",
        statementId: "create-handoff:handoff-1",
        title: "Bund Land EU Kommune",
        status: "active",
        counts: { claims: 0, sources: 0, findings: 0, edges: 0, openQuestions: 0 },
        createdAt: new Date("2026-06-30T08:00:00.000Z"),
      } satisfies DossierDoc,
      claims: [],
      sources: [],
      findings: [],
      openQuestions: [],
    });

    expect(dossier.meta.jurisdiction).toBe("unknown");
    expect(dossier.analyze.language).toBe("und");
    expect(dossier.analyze.report.facts.local).toEqual([]);
  });

  it("fans one finding out to every unique citation and keeps question relations concrete", () => {
    const sources = ["source-1", "source-2"].map(
      (sourceId, index) =>
        ({
          sourceId,
          dossierId: "dossier-sichere-schulwege",
          canonicalUrlHash: `citation-hash-${index + 1}`,
          url: `https://example.org/quelle-${index + 1}`,
          title: `Quelle ${index + 1}`,
          publisher: "Bezirk",
          type: "official",
        }) satisfies DossierSourceDoc,
    );
    const dossier = mapDossierToPublicDossier({
      publication: buildPublicationRecord(),
      dossierDoc: null,
      claims: [
        {
          claimId: "claim-1",
          dossierId: "dossier-sichere-schulwege",
          text: "Vor Schulen fehlen sichere Querungen.",
          kind: "fact",
          status: "open",
          createdByRole: "admin",
        } satisfies DossierClaimDoc,
      ],
      sources,
      findings: [
        {
          findingId: "finding-multiple-citations",
          dossierId: "dossier-sichere-schulwege",
          claimId: "claim-1",
          verdict: "supports",
          rationale: ["Beide Quellen stützen den Claim."],
          citations: [
            { sourceId: "source-1", locator: "S. 1" },
            { sourceId: "source-2", locator: "S. 2" },
            { sourceId: "source-1", locator: "S. 3" },
          ],
          producedBy: "editor",
        } satisfies DossierFindingDoc,
      ],
      openQuestions: [
        {
          questionId: "question-1",
          dossierId: "dossier-sichere-schulwege",
          text: "Welche Schulen sind besonders betroffen?",
          status: "open",
          links: {
            sourceIds: ["source-1"],
            claimIds: ["claim-1"],
            findingIds: ["finding-multiple-citations"],
          },
        } satisfies OpenQuestionDoc,
      ],
    });

    expect(
      dossier.analyze.evidenceGraph?.edges.map((edge) => ({
        from: edge.from,
        to: edge.to,
        kind: edge.kind,
      })),
    ).toEqual([
      { from: "claim-1", to: "source-1", kind: "supports" },
      { from: "claim-1", to: "source-2", kind: "supports" },
    ]);
    expect(dossier.analyze.findings.map((finding) => finding.sourceId)).toEqual([
      "source-1",
      "source-2",
    ]);

    const workspace = buildDossierWorkspaceModel(dossier);
    const question = workspace.questions.find((item) => item.id === "question-1");
    expect(question?.sourceLinks).toEqual([
      expect.objectContaining({ sourceId: "source-1", relation: "supports" }),
      expect.objectContaining({ sourceId: "source-2", relation: "supports" }),
    ]);
    expect(
      question?.sourceLinks.some((link) => link.relation === "unclear"),
    ).toBe(false);
    expect(
      workspace.claims
        .find((claim) => claim.id === "claim-1")
        ?.sourceLinks.map((link) => link.sourceId),
    ).toEqual(["source-1", "source-2"]);
  });
});
