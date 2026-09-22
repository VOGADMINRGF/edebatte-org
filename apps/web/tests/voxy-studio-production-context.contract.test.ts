import { describe, expect, it } from "vitest";

import { buildVoxyStudioProductionContext } from "@/features/voxyVideo/studioProductionContext";
import type { DossierStudioWorkspace } from "@features/dossier/server/studioPersistence";

function workspace(): DossierStudioWorkspace {
  return {
    id: "workspace-1",
    dossierId: "dossier-1",
    regionId: "berlin-reinickendorf",
    organizationId: "org-1",
    unitId: "unit-1",
    source: "manual_admin",
    status: "needs_review",
    visibilityState: "public_official",
    title: "Dossier Studio",
    masterPostDraft: {
      id: "master-1",
      dossierId: "dossier-1",
      packageId: "package-1",
      title: "Masterpost",
      regionalContext: "in Berlin-Reinickendorf",
      topic: "Schulbau und Sanierung",
      overallPicture: "Überblick",
      sourceSituation: "Quellenlage",
      openQuestions: ["Was ist noch offen?"],
      options: ["Option A"],
      hook: "Hook",
      body: "Body",
      participationQuestion: "Frage?",
      cta: "CTA",
      backlinkTarget: "/dossier/dossier-1",
      qrTarget: "/dossier/dossier-1",
      suggestedHashtags: [
        { tag: "#Berlin", rationale: "Region" },
        { tag: "#Schule", rationale: "Thema" },
        { tag: "#Debatte", rationale: "Format" },
      ],
      suggestedPostingWindows: [
        { label: "Vormittag", window: "09:00-11:00", rationale: "Review" },
      ],
      channelFit: [
        { channel: "website", title: "Titel", excerpt: "Text", toneHint: "neutral" },
      ],
      motifHint: "Motiv",
      sourceState: {},
      reviewStatus: "approved",
      visibilityState: "public_official",
      publicationStatus: "ready_for_scheduling",
      canAutoPublish: false,
      canRealtimePublish: false,
      externalApisUsed: false,
      createdAt: "2026-09-22T10:00:00.000Z",
      reviewGuardrails: [],
    },
    audienceNotes: "Publikum",
    reviewNotes: "Review",
    createdBy: "admin-1",
    updatedBy: "admin-1",
    createdAt: "2026-09-22T09:00:00.000Z",
    updatedAt: "2026-09-22T10:30:00.000Z",
    officialApproval: {
      approvedByUserId: "publisher-1",
      approvedAt: "2026-09-22T11:00:00.000Z",
      authority: "publication_approved",
      note: "Freigegeben",
    },
    provenance: {},
    guardrails: {
      noAutoPublish: true,
      noSocialPublishing: true,
      noAutoMandate: true,
      noAutoVote: true,
      reviewRequired: true,
      localStorageIsNotProduction: true,
    },
  } as unknown as DossierStudioWorkspace;
}

describe("Voxy Studio dossier-bound production context", () => {
  it("projects topic, region and date from existing workspace truth", () => {
    expect(buildVoxyStudioProductionContext(workspace())).toEqual({
      source: "dossier_workspace",
      workspaceId: "workspace-1",
      dossierId: "dossier-1",
      topic: "Schulbau und Sanierung",
      region: "in Berlin-Reinickendorf",
      date: "2026-09-22T10:00:00.000Z",
      edition: null,
      editionStatus: "not_canonical",
      readOnly: true,
    });
  });

  it("falls back only to existing workspace provenance and never invents an edition", () => {
    const current = workspace();
    current.masterPostDraft = undefined;
    const context = buildVoxyStudioProductionContext(current);

    expect(context.topic).toBeNull();
    expect(context.region).toBe("berlin-reinickendorf");
    expect(context.date).toBe("2026-09-22T11:00:00.000Z");
    expect(context.edition).toBeNull();
    expect(context.editionStatus).toBe("not_canonical");
  });

  it("stays explicitly unavailable without dossier workspace truth", () => {
    expect(buildVoxyStudioProductionContext(null)).toMatchObject({
      source: "unavailable",
      topic: null,
      region: null,
      date: null,
      edition: null,
      editionStatus: "not_canonical",
      readOnly: true,
    });
  });
});
