import type { DossierStudioWorkspace } from "@features/dossier/server/studioPersistence";

export type VoxyStudioProductionContext = {
  source: "dossier_workspace" | "unavailable";
  workspaceId: string | null;
  dossierId: string | null;
  topic: string | null;
  region: string | null;
  date: string | null;
  edition: null;
  editionStatus: "not_canonical";
  readOnly: true;
};

function normalized(value: unknown): string | null {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || null;
}

export function buildVoxyStudioProductionContext(
  workspace: DossierStudioWorkspace | null,
): VoxyStudioProductionContext {
  if (!workspace) {
    return {
      source: "unavailable",
      workspaceId: null,
      dossierId: null,
      topic: null,
      region: null,
      date: null,
      edition: null,
      editionStatus: "not_canonical",
      readOnly: true,
    };
  }

  return {
    source: "dossier_workspace",
    workspaceId: normalized(workspace.id),
    dossierId: normalized(workspace.dossierId),
    topic: normalized(workspace.masterPostDraft?.topic),
    region:
      normalized(workspace.masterPostDraft?.regionalContext) ??
      normalized(workspace.regionId),
    date:
      normalized(workspace.masterPostDraft?.createdAt) ??
      normalized(workspace.officialApproval?.approvedAt) ??
      normalized(workspace.createdAt),
    edition: null,
    editionStatus: "not_canonical",
    readOnly: true,
  };
}
