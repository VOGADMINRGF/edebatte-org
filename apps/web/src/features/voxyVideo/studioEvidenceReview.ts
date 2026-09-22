import { stableHash } from "@core/utils/hash";
import type {
  DossierClaimDoc,
  DossierFindingDoc,
  DossierSourceDoc,
  OpenQuestionDoc,
} from "@features/dossier/schemas";
import type { ReviewQueueOperationRecord } from "@features/reviewQueueOperations";

export const VOXY_STUDIO_EVIDENCE_REVIEW_VERSION =
  "voxy-studio-evidence-review-v1" as const;

export type VoxyStudioEvidenceSnapshot = {
  version: typeof VOXY_STUDIO_EVIDENCE_REVIEW_VERSION;
  dossierId: string;
  fingerprint: string;
  reviewItemId: string;
  sources: Array<{
    sourceId: string;
    canonicalUrlHash: string;
    url: string;
    title: string;
    publisher: string;
    type: DossierSourceDoc["type"];
    language: string | null;
    snippet: string | null;
    publishedAt: string | null;
    retrievedAt: string | null;
  }>;
  claims: Array<{
    claimId: string;
    text: string;
    kind: DossierClaimDoc["kind"];
    status: DossierClaimDoc["status"];
    uncertaintyNotes: string[];
  }>;
  findings: Array<{
    findingId: string;
    claimId: string;
    verdict: DossierFindingDoc["verdict"];
    producedBy: DossierFindingDoc["producedBy"];
    rationale: string[];
    citations: Array<{
      sourceId: string;
      quote: string | null;
      locator: string | null;
    }>;
  }>;
  openQuestions: Array<{
    questionId: string;
    text: string;
    status: OpenQuestionDoc["status"];
    sourceIds: string[];
    claimIds: string[];
    findingIds: string[];
  }>;
};

type SnapshotInput = {
  dossierId: string;
  sources: DossierSourceDoc[];
  claims: DossierClaimDoc[];
  findings: DossierFindingDoc[];
  openQuestions: OpenQuestionDoc[];
};

function normalized(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function iso(value: Date | undefined): string | null {
  return value instanceof Date ? value.toISOString() : null;
}

function sortedUnique(values: readonly string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map(normalized).filter(Boolean))).sort();
}

export function buildVoxyStudioEvidenceReviewItemId(input: {
  dossierId: string;
  fingerprint: string;
}): string {
  return `voxy-studio-evidence:${normalized(input.dossierId)}:${normalized(input.fingerprint).slice(0, 40)}`;
}

export function buildVoxyStudioEvidenceSnapshot(
  input: SnapshotInput,
): VoxyStudioEvidenceSnapshot {
  const dossierId = normalized(input.dossierId);
  if (!dossierId) throw new Error("voxy_studio_evidence_dossier_id_missing");

  const sources = input.sources
    .map((source) => ({
      sourceId: normalized(source.sourceId),
      canonicalUrlHash: normalized(source.canonicalUrlHash),
      url: normalized(source.url),
      title: normalized(source.title),
      publisher: normalized(source.publisher),
      type: source.type,
      language: normalized(source.language) || null,
      snippet: normalized(source.snippet) || null,
      publishedAt: iso(source.publishedAt),
      retrievedAt: iso(source.retrievedAt),
    }))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const claims = input.claims
    .map((claim) => ({
      claimId: normalized(claim.claimId),
      text: normalized(claim.text),
      kind: claim.kind,
      status: claim.status,
      uncertaintyNotes: (claim.uncertaintyNotes ?? []).map(normalized).filter(Boolean),
    }))
    .sort((a, b) => a.claimId.localeCompare(b.claimId));
  const findings = input.findings
    .map((finding) => ({
      findingId: normalized(finding.findingId),
      claimId: normalized(finding.claimId),
      verdict: finding.verdict,
      producedBy: finding.producedBy,
      rationale: finding.rationale.map(normalized).filter(Boolean),
      citations: finding.citations
        .map((citation) => ({
          sourceId: normalized(citation.sourceId),
          quote: normalized(citation.quote) || null,
          locator: normalized(citation.locator) || null,
        }))
        .sort((a, b) =>
          `${a.sourceId}:${a.locator ?? ""}:${a.quote ?? ""}`.localeCompare(
            `${b.sourceId}:${b.locator ?? ""}:${b.quote ?? ""}`,
          ),
        ),
    }))
    .sort((a, b) => a.findingId.localeCompare(b.findingId));
  const openQuestions = input.openQuestions
    .map((question) => ({
      questionId: normalized(question.questionId),
      text: normalized(question.text),
      status: question.status,
      sourceIds: sortedUnique(question.links?.sourceIds),
      claimIds: sortedUnique(question.links?.claimIds),
      findingIds: sortedUnique(question.links?.findingIds),
    }))
    .sort((a, b) => a.questionId.localeCompare(b.questionId));

  const fingerprint = stableHash({
    version: VOXY_STUDIO_EVIDENCE_REVIEW_VERSION,
    dossierId,
    sources,
    claims,
    findings,
    openQuestions,
  });
  return {
    version: VOXY_STUDIO_EVIDENCE_REVIEW_VERSION,
    dossierId,
    fingerprint,
    reviewItemId: buildVoxyStudioEvidenceReviewItemId({ dossierId, fingerprint }),
    sources,
    claims,
    findings,
    openQuestions,
  };
}

export function isVoxyStudioEvidenceSnapshotApproved(input: {
  snapshot: VoxyStudioEvidenceSnapshot;
  reviewRecord: ReviewQueueOperationRecord | null;
  persistenceMode: "persistent_primary" | "in_memory_fallback";
}): boolean {
  const record = input.reviewRecord;
  return Boolean(
    input.snapshot.sources.length > 0 &&
      input.persistenceMode === "persistent_primary" &&
      record &&
      record.itemId === input.snapshot.reviewItemId &&
      record.operationalStatus === "ready" &&
      record.latestAction === "mark_ready" &&
      record.latestActionByUserId &&
      record.latestActionAt,
  );
}
