import "server-only";

import { buildCanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import {
  dossierClaimsCol,
  dossierFindingsCol,
  dossierSourcesCol,
  openQuestionsCol,
} from "@features/dossier/db";
import type { DossierSourceDoc } from "@features/dossier/schemas";
import type { VoxyEditorialEvidenceContext } from "./editorialStoryPlan";
import type { VoxyStudioEvidenceAuthority } from "./studioDraftService";

function mapSourceType(
  value: DossierSourceDoc["type"],
): "official" | "media" | "civil_society" | "academic" | "user_supplied" | "unknown" {
  if (value === "official" || value === "primary_doc") return "official";
  if (value === "quality_media") return "media";
  if (value === "research") return "academic";
  if (value === "stakeholder") return "civil_society";
  return "unknown";
}

function mapReliabilityHint(
  value: DossierSourceDoc["type"],
): "official" | "primary" | "secondary" | "contested" | "unknown" {
  if (value === "official") return "official";
  if (value === "primary_doc") return "primary";
  if (value === "research" || value === "quality_media") return "secondary";
  return "unknown";
}

function unboundEvidenceContext(bindingId: string): VoxyEditorialEvidenceContext {
  return {
    sourcePack: buildCanonicalSourcePack({
      sourcePackId: bindingId,
      sources: [],
      openGaps: ["canonical_source_pack_required_for_render_approval"],
      reviewState: "review_required",
    }),
    claims: [],
    findings: [],
    openQuestions: [],
  };
}

/**
 * Reads existing Dossier truth without promoting it to approved SourcePack truth.
 * A Dossier source proves existence/provenance, not canonical editorial approval.
 */
export async function loadFailClosedDossierStudioEvidenceContext(
  dossierId: string | null,
): Promise<VoxyEditorialEvidenceContext> {
  const normalizedDossierId = String(dossierId ?? "").trim();
  if (!normalizedDossierId) {
    return unboundEvidenceContext("voxy-studio-unbound");
  }

  const [sources, claims, findings, openQuestions] = await Promise.all([
    (await dossierSourcesCol())
      .find({ dossierId: normalizedDossierId })
      .sort({ publishedAt: -1, _id: 1 })
      .toArray(),
    (await dossierClaimsCol())
      .find({ dossierId: normalizedDossierId })
      .sort({ _id: 1 })
      .toArray(),
    (await dossierFindingsCol())
      .find({ dossierId: normalizedDossierId })
      .sort({ _id: 1 })
      .toArray(),
    (await openQuestionsCol())
      .find({ dossierId: normalizedDossierId })
      .sort({ _id: 1 })
      .toArray(),
  ]);

  return {
    sourcePack: buildCanonicalSourcePack({
      sourcePackId: `voxy-studio-dossier-readmodel:${normalizedDossierId}`,
      sources: sources.map((source) => ({
        sourceId: source.sourceId,
        title: source.title,
        url: source.url,
        sourceLocale: source.language ?? null,
        sourceType: mapSourceType(source.type),
        reliabilityHint: mapReliabilityHint(source.type),
        retrievedAt: source.retrievedAt?.toISOString(),
        originalSnippet: source.snippet ?? null,
        translatedSnippet: null,
        translationStatus: "not_needed",
        evidenceState: "source_needed",
        reviewState: "review_required",
      })),
      openGaps: ["canonical_source_pack_review_state_not_owned_by_dossier_store"],
      reviewState: "review_required",
    }),
    claims,
    findings,
    openQuestions,
  };
}

export function createFailClosedDossierStudioEvidenceAuthority(): VoxyStudioEvidenceAuthority {
  return {
    async resolveEvidenceContext(draft) {
      if (!draft.dossierId) {
        return unboundEvidenceContext(
          `voxy-studio-unbound:${draft.draftId}:r${draft.revision}`,
        );
      }
      return loadFailClosedDossierStudioEvidenceContext(draft.dossierId);
    },
  };
}
