import { describe, expect, it } from "vitest";

import type { DossierStudioWorkspace } from "@features/dossier/server/studioPersistence";
import {
  VOXY_STUDIO_DOSSIER_AUTO_INTAKE_ACTOR,
  buildVoxyStudioDossierAutoIntakeSeed,
} from "@/features/voxyVideo/studioDossierAutoIntake";

function workspace(approved = true): DossierStudioWorkspace {
  return {
    id: "workspace-1",
    dossierId: "dossier-1",
    source: "manual_admin",
    status: "needs_review",
    visibilityState: "internal_review",
    title: "Dossier mit freigegebenem Workspace",
    reviewNotes: "Geprüfter Arbeitsstand für die offizielle Freigabe.",
    createdBy: "admin-1",
    updatedBy: "admin-2",
    createdAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-22T11:00:00.000Z",
    officialApproval: approved
      ? {
          approvedByUserId: "admin-2",
          approvedAt: "2026-09-22T11:00:00.000Z",
          authority: "publication_approved",
          note: "Dossier offiziell freigegeben.",
        }
      : null,
    provenance: {},
    guardrails: {
      noAutoPublish: true,
      noSocialPublishing: true,
      noAutoMandate: true,
      noAutoVote: true,
      reviewRequired: true,
      localStorageIsNotProduction: true,
    },
  };
}

describe("Voxy Studio approved-dossier auto intake", () => {
  it("reuses the canonical workspace Voxy briefing and keeps render/publish disabled", () => {
    const seed = buildVoxyStudioDossierAutoIntakeSeed(workspace());

    expect(seed).toMatchObject({
      dossierId: "dossier-1",
      briefingId: "workspace-voxy:workspace-1",
      title: "Dossier mit freigegebenem Workspace",
      locale: "de",
      selectedFormat: "16:9",
      safeZoneProfile: "video",
      approvalActorUserId: "admin-2",
      approvalAt: "2026-09-22T11:00:00.000Z",
      autoRender: false,
      autoPublish: false,
    });
    expect(seed.clientRequestId).toMatch(/^auto-dossier-[a-f0-9]{32}$/);
    expect(VOXY_STUDIO_DOSSIER_AUTO_INTAKE_ACTOR).toBe("system:voxy-dossier-intake");
  });

  it("is deterministic for the exact approval event", () => {
    expect(buildVoxyStudioDossierAutoIntakeSeed(workspace()).clientRequestId).toBe(
      buildVoxyStudioDossierAutoIntakeSeed(workspace()).clientRequestId,
    );
  });

  it("fails closed without official dossier-workspace approval", () => {
    expect(() => buildVoxyStudioDossierAutoIntakeSeed(workspace(false))).toThrow(
      "voxy_studio_dossier_auto_intake_official_approval_missing",
    );
  });
});