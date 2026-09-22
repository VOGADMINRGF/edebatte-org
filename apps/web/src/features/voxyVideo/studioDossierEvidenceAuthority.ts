import "server-only";

import { buildCanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import {
  dossierClaimsCol,
  dossierFindingsCol,
  dossierSourcesCol,
  openQuestionsCol,
} from "@features/dossier/db";
import type { DossierSourceDoc } from "@features/dossier/schemas";
import { getReviewQueueOperationsRepository } from "@features/reviewQueueOperations";
import type { VoxyEditorialEvidenceContext } from "./editorialStoryPlan";
import {
  buildVoxyStudioEvidenceSnapshot,
  isVoxyStudioEvidenceSnapshotApproved,
  type VoxyStudioEvidenceSnapshot,
} from "./studioEvidenceReview";
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

async function loadDossierEvidenceDocs(dossierId: string) {
  const [sources, claims, findings, openQuestions] = await Promise.all([
    (await dossierSourcesCol())
      .find({ dossierId })
      .sort({ publishedAt: -1, _id: 1 })
      .toArray(),
    (await dossierClaimsCol())
      .find({ dossierId })
      .sort({ _id: 1 })
      .toArray(),
    (await dossierFindingsCol())
      .find({ dossierId })
      .sort({ _id: 1 })
      .toArray(),
    (await openQuestionsCol())
      .find({ dossierId })
      .sort({ _id: 1 })
      .toArray(),
  ]);
  return { sources, claims, findings, openQuestions };
}

export type VoxyStudioDossierEvidenceReviewState = {
  snapshot: VoxyStudioEvidenceSnapshot;
  approved: boolean;
  reviewRecord: Awaited<
    ReturnType<ReturnType<typeof getReviewQueueOperationsRepository>["getRecord"]>
  >;
  persistence: ReturnType<
    ReturnType<typeof getReviewQueueOperationsRepository>["getPersistenceState"]
  >;
};

export async function loadVoxyStudioDossierEvidenceReviewState(
  dossierId: string,
): Promise<VoxyStudioDossierEvidenceReviewState> {
  const normalizedDossierId = String(dossierId ?? "").trim();
  if (!normalizedDossierId) {
    throw new Error("voxy_studio_evidence_dossier_id_missing");
  }
  const docs = await loadDossierEvidenceDocs(normalizedDossierId);
  const snapshot = buildVoxyStudioEvidenceSnapshot({
    dossierId: normalizedDossierId,
    ...docs,
  });
  const reviewRepository = getReviewQueueOperationsRepository();
  const persistence = reviewRepository.getPersistenceState();
  const reviewRecord = await reviewRepository.getRecord(snapshot.reviewItemId);
  return {
    snapshot,
    reviewRecord,
    persistence,
    approved: isVoxyStudioEvidenceSnapshotApproved({
      snapshot,
      reviewRecord,
      persistenceMode: persistence.mode,
    }),
  };
}

/**
 * Reads existing Dossier truth and promotes it to approved SourcePack truth only
 * when a human review record exists for the exact current evidence fingerprint.
 * Any source/claim/finding/question change produces a new fingerprint and therefore
 * invalidates the old evidence approval without mutating the historical review record.
 */
export async function loadFailClosedDossierStudioEvidenceContext(
  dossierId: string | null,
): Promise<VoxyEditorialEvidenceContext> {
  const normalizedDossierId = String(dossierId ?? "").trim();
  if (!normalizedDossierId) {
    return unboundEvidenceContext("voxy-studio-unbound");
  }

  const docs = await loadDossierEvidenceDocs(normalizedDossierId);
  const snapshot = buildVoxyStudioEvidenceSnapshot({
    dossierId: normalizedDossierId,
    ...docs,
  });
  const reviewRepository = getReviewQueueOperationsRepository();
  const persistence = reviewRepository.getPersistenceState();
  const reviewRecord = await reviewRepository.getRecord(snapshot.reviewItemId);
  const approved = isVoxyStudioEvidenceSnapshotApproved({
    snapshot,
    reviewRecord,
    persistenceMode: persistence.mode,
  });

  return {
    sourcePack: buildCanonicalSourcePack({
      sourcePackId: `voxy-studio-dossier:${normalizedDossierId}:${snapshot.fingerprint.slice(0, 40)}`,
      sources: docs.sources.map((source) => ({
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
        evidenceState: approved ? "supported" : "source_needed",
        reviewState: approved ? "approved" : "review_required",
      })),
      openGaps: approved
        ? []
        : ["exact_dossier_evidence_snapshot_human_review_required"],
      reviewState: approved ? "approved" : "review_required",
    }),
    claims: docs.claims,
    findings: docs.findings,
    openQuestions: docs.openQuestions,
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
