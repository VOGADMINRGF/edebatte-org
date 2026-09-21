import "server-only";

import { buildCanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import {
  dossierClaimsCol,
  dossierFindingsCol,
  dossierSourcesCol,
  openQuestionsCol,
} from "@features/dossier/db";
import type { DossierSourceDoc } from "@features/dossier/schemas";
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

/**
 * Reads existing Dossier truth without promoting it to approved SourcePack truth.
 *
 * A Dossier source proves that a source exists. It does not prove that the source
 * passed the CanonicalSourcePack review contract. Therefore every adapted source
 * remains review_required/source_needed until a separately reviewed canonical
 * source-pack binding is available. This is intentionally fail-closed.
 */
export function createFailClosedDossierStudioEvidenceAuthority(): VoxyStudioEvidenceAuthority {
  return {
    async resolveEvidenceContext(draft) {
      if (!draft.dossierId) {
        return {
          sourcePack: buildCanonicalSourcePack({
            sourcePackId: `voxy-studio-unbound:${draft.draftId}:r${draft.revision}`,
            sources: [],
            openGaps: ["canonical_source_pack_required_for_render_approval"],
            reviewState: "review_required",
          }),
          claims: [],
          findings: [],
          openQuestions: [],
        };
      }

      const dossierId = draft.dossierId;
      const [sources, claims, findings, openQuestions] = await Promise.all([
        (await dossierSourcesCol()).find({ dossierId }).sort({ publishedAt: -1, _id: 1 }).toArray(),
        (await dossierClaimsCol()).find({ dossierId }).sort({ _id: 1 }).toArray(),
        (await dossierFindingsCol()).find({ dossierId }).sort({ _id: 1 }).toArray(),
        (await openQuestionsCol()).find({ dossierId }).sort({ _id: 1 }).toArray(),
      ]);

      return {
        sourcePack: buildCanonicalSourcePack({
          sourcePackId: `voxy-studio-dossier-readmodel:${dossierId}`,
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
    },
  };
}
