import {
  bindResearchTaskToDossier,
  type BindResearchTaskDossierResult,
} from "@core/research/store";
import type { ResearchTaskDossierBinding } from "@core/research/types";
import { dossiersCol } from "@features/dossier/db";

const REVISION_HASH_RE = /^[a-f0-9]{64}$/i;

type DossierHeadLike = {
  dossierId?: unknown;
  revisionSeq?: unknown;
  lastRevisionHash?: unknown;
};

export type BindResearchTaskToCurrentDossierResult =
  | BindResearchTaskDossierResult
  | {
      ok: false;
      reason: "invalid_dossier_id" | "dossier_not_found" | "invalid_dossier_head";
    };

function isValidBindingSnapshot(value: unknown): value is ResearchTaskDossierBinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const binding = value as Partial<ResearchTaskDossierBinding>;
  return (
    typeof binding.dossierId === "string" &&
    binding.dossierId.length > 0 &&
    binding.dossierId === binding.dossierId.trim() &&
    typeof binding.dossierRevisionSeq === "number" &&
    Number.isInteger(binding.dossierRevisionSeq) &&
    binding.dossierRevisionSeq > 0 &&
    typeof binding.dossierRevisionHash === "string" &&
    REVISION_HASH_RE.test(binding.dossierRevisionHash)
  );
}

function bindingFromDossierHead(head: DossierHeadLike): ResearchTaskDossierBinding | null {
  if (
    typeof head.dossierId !== "string" ||
    head.dossierId.length === 0 ||
    head.dossierId !== head.dossierId.trim() ||
    typeof head.revisionSeq !== "number" ||
    !Number.isInteger(head.revisionSeq) ||
    head.revisionSeq <= 0 ||
    typeof head.lastRevisionHash !== "string" ||
    !REVISION_HASH_RE.test(head.lastRevisionHash)
  ) {
    return null;
  }

  return {
    dossierId: head.dossierId,
    dossierRevisionSeq: head.revisionSeq,
    dossierRevisionHash: head.lastRevisionHash,
  };
}

export function isResearchTaskDossierBindingStale(
  binding: unknown,
  currentHead: DossierHeadLike | null | undefined,
): boolean {
  if (!isValidBindingSnapshot(binding) || !currentHead) return true;
  const current = bindingFromDossierHead(currentHead);
  if (!current) return true;
  return (
    binding.dossierId !== current.dossierId ||
    binding.dossierRevisionSeq !== current.dossierRevisionSeq ||
    binding.dossierRevisionHash !== current.dossierRevisionHash
  );
}

export async function bindResearchTaskToCurrentDossier(
  taskId: string,
  dossierId: string,
): Promise<BindResearchTaskToCurrentDossierResult> {
  const normalizedDossierId = dossierId.trim();
  if (!normalizedDossierId || normalizedDossierId !== dossierId) {
    return { ok: false, reason: "invalid_dossier_id" };
  }

  const col = await dossiersCol();
  const dossier = await col.findOne(
    { dossierId: normalizedDossierId },
    { projection: { dossierId: 1, revisionSeq: 1, lastRevisionHash: 1 } },
  );
  if (!dossier) return { ok: false, reason: "dossier_not_found" };

  const binding = bindingFromDossierHead(dossier);
  if (!binding) return { ok: false, reason: "invalid_dossier_head" };

  return bindResearchTaskToDossier(taskId, binding);
}
