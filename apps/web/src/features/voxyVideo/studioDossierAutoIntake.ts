import "server-only";

import { stableHash } from "@core/utils/hash";
import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/config/locales";
import { buildDossierWorkspaceV3ReviewContext } from "@/features/create/unifiedReviewQueueWiring";
import type { DossierStudioWorkspace } from "@features/dossier/server/studioPersistence";
import {
  createFailClosedDossierStudioEvidenceAuthority,
  loadFailClosedDossierStudioEvidenceContext,
} from "./studioDossierEvidenceAuthority";
import {
  createDefaultVoxyStudioServiceDependencies,
  createVoxyStudioDraft,
} from "./studioDraftService";
import { getVoxyStudioDraftRepository } from "./studioDraftStore";
import { buildVoxyStudioStoryPlanFromDossier } from "./studioStoryPlanBuilder";
import type { VoxyStudioDraft } from "./studioDraft";

export const VOXY_STUDIO_DOSSIER_AUTO_INTAKE_ACTOR =
  "system:voxy-dossier-intake" as const;

export type VoxyStudioDossierAutoIntakeSeed = {
  clientRequestId: string;
  dossierId: string;
  briefingId: string;
  title: string;
  locale: SupportedLocale;
  selectedFormat: "16:9";
  safeZoneProfile: "video";
  approvalActorUserId: string;
  approvalAt: string;
  autoRender: false;
  autoPublish: false;
};

function supportedLocale(value: string): SupportedLocale {
  const normalized = value.trim().toLowerCase();
  const locale = SUPPORTED_LOCALES.find((candidate) => candidate === normalized);
  if (!locale) {
    throw new Error(
      `voxy_studio_dossier_auto_intake_locale_unsupported:${normalized || "missing"}`,
    );
  }
  return locale;
}

/**
 * Reuses the existing Dossier Workspace -> V3 Review -> Voxy Briefing wiring.
 * This adapter intentionally derives no evidence/review truth of its own.
 */
export function buildVoxyStudioDossierAutoIntakeSeed(
  workspace: DossierStudioWorkspace,
): VoxyStudioDossierAutoIntakeSeed {
  const approval = workspace.officialApproval;
  if (!approval) {
    throw new Error("voxy_studio_dossier_auto_intake_official_approval_missing");
  }

  const reviewContext = buildDossierWorkspaceV3ReviewContext({ workspace });
  const briefing = reviewContext.voxyBriefing;
  if (
    !briefing ||
    briefing.sourceContextKind !== "dossier" ||
    briefing.sourceContextId !== workspace.dossierId
  ) {
    throw new Error("voxy_studio_dossier_auto_intake_briefing_binding_invalid");
  }

  const locale = supportedLocale(briefing.languageBridge.summary.language);
  const requestHash = stableHash(
    [workspace.id, workspace.dossierId, approval.approvedAt, briefing.briefingId].join(":"),
  ).slice(0, 32);

  return {
    clientRequestId: `auto-dossier-${requestHash}`,
    dossierId: workspace.dossierId,
    briefingId: briefing.briefingId,
    title: workspace.title.trim(),
    locale,
    selectedFormat: "16:9",
    safeZoneProfile: "video",
    approvalActorUserId: approval.approvedByUserId,
    approvalAt: approval.approvedAt,
    autoRender: false,
    autoPublish: false,
  };
}

/**
 * Creates only the persistent editable Studio draft. It does not submit,
 * approve, render, upload, schedule or publish anything.
 */
export async function createOrGetVoxyStudioDraftFromApprovedDossierWorkspace(
  workspace: DossierStudioWorkspace,
): Promise<{ seed: VoxyStudioDossierAutoIntakeSeed; draft: VoxyStudioDraft }> {
  const seed = buildVoxyStudioDossierAutoIntakeSeed(workspace);
  const repository = getVoxyStudioDraftRepository();
  const persistence = repository.getPersistenceState();
  if (persistence.mode !== "persistent_primary" || persistence.productionTruth !== true) {
    throw new Error("voxy_studio_dossier_auto_intake_persistent_primary_required");
  }

  const evidence = await loadFailClosedDossierStudioEvidenceContext(seed.dossierId);
  const storyPlan = buildVoxyStudioStoryPlanFromDossier({
    dossierId: seed.dossierId,
    briefingId: seed.briefingId,
    title: seed.title,
    locale: seed.locale,
    evidence,
  });
  const deps = createDefaultVoxyStudioServiceDependencies({
    evidenceAuthority: createFailClosedDossierStudioEvidenceAuthority(),
  });
  const draft = await createVoxyStudioDraft(
    {
      clientRequestId: seed.clientRequestId,
      sourceKind: "dossier",
      dossierId: seed.dossierId,
      briefingId: seed.briefingId,
      title: seed.title,
      storyPlan,
      selectedFormat: seed.selectedFormat,
      safeZoneProfile: seed.safeZoneProfile,
      createdByUserId: VOXY_STUDIO_DOSSIER_AUTO_INTAKE_ACTOR,
    },
    deps,
  );

  return { seed, draft };
}