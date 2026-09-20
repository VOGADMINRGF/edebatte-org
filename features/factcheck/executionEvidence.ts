import type { ResearchUsed } from "@features/ai/e150/verificationContract";

export const FACTCHECK_EVIDENCE_RELATIONS = ["supports", "contradicts", "context"] as const;
export type FactcheckEvidenceRelation = (typeof FACTCHECK_EVIDENCE_RELATIONS)[number];

export type FactcheckExecutionEvidence = {
  /** Timestamp of the actual retrieval/inspection run. A request timestamp is not sufficient. */
  observedAt: string;
  /** SourceRef ids whose content was actually retrieved or replayed during this execution. */
  retrievedSourceRefIds: string[];
  /** Explicit claim↔retrieved-source relations produced by the execution/review step. */
  claimSourceLinks: Array<{
    claimId: string;
    sourceRefId: string;
    relation: FactcheckEvidenceRelation;
  }>;
  /** Research mode that actually executed; never inferred from a requested action. */
  researchUsed?: ResearchUsed;
  /** Optional safe execution receipts. Provider names alone never imply grounding. */
  providerRuns?: Array<{
    provider: string;
    runId?: string | null;
  }>;
};

export type FactcheckExecutionGrounding = {
  executionObserved: boolean;
  complete: boolean;
  retrievedSourceRefIds: string[];
  groundedClaimIds: string[];
  documentGroundedClaimIds: string[];
  webGroundedClaimIds: string[];
  openClaimIds: string[];
};

type ClaimLike = { id?: string | null };
type SourceRefLike = {
  id?: string | null;
  sourceType?: string | null;
};

function nonEmpty(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function validObservedAt(value: unknown): boolean {
  const raw = nonEmpty(value);
  if (!raw) return false;
  return !Number.isNaN(new Date(raw).getTime());
}

function isDocumentSource(sourceType: string | null | undefined) {
  return sourceType === "document_url" || sourceType === "source_snapshot_reference";
}

/**
 * Derive grounding only from evidence of an executed retrieval/replay and explicit
 * claim↔source links. Merely declaring a URL/sourceRef never grounds a claim.
 */
export function deriveFactcheckExecutionGrounding(input: {
  claims: ClaimLike[];
  sourceRefs: SourceRefLike[];
  executionEvidence?: FactcheckExecutionEvidence | null;
}): FactcheckExecutionGrounding {
  const claimIds = input.claims
    .map((claim, index) => nonEmpty(claim.id) ?? `claim-${index + 1}`);
  const claimIdSet = new Set(claimIds);
  const sourceById = new Map(
    input.sourceRefs
      .map((source) => [nonEmpty(source.id), source] as const)
      .filter((entry): entry is [string, SourceRefLike] => Boolean(entry[0])),
  );

  const evidence = input.executionEvidence;
  const executionObserved = validObservedAt(evidence?.observedAt);
  if (!executionObserved || !evidence) {
    return {
      executionObserved: false,
      complete: false,
      retrievedSourceRefIds: [],
      groundedClaimIds: [],
      documentGroundedClaimIds: [],
      webGroundedClaimIds: [],
      openClaimIds: claimIds,
    };
  }

  const retrievedSourceRefIds = Array.from(
    new Set(
      (evidence.retrievedSourceRefIds ?? [])
        .map(nonEmpty)
        .filter((id): id is string => Boolean(id && sourceById.has(id))),
    ),
  );
  const retrieved = new Set(retrievedSourceRefIds);
  const documentGrounded = new Set<string>();
  const webGrounded = new Set<string>();

  for (const link of evidence.claimSourceLinks ?? []) {
    const claimId = nonEmpty(link?.claimId);
    const sourceRefId = nonEmpty(link?.sourceRefId);
    if (!claimId || !sourceRefId || !claimIdSet.has(claimId) || !retrieved.has(sourceRefId)) continue;
    const source = sourceById.get(sourceRefId);
    if (isDocumentSource(source?.sourceType)) documentGrounded.add(claimId);
    else webGrounded.add(claimId);
  }

  // A claim linked to both classes is counted once, preferring document grounding.
  for (const claimId of documentGrounded) webGrounded.delete(claimId);
  const groundedClaimIds = Array.from(new Set([...documentGrounded, ...webGrounded]));
  const grounded = new Set(groundedClaimIds);
  const openClaimIds = claimIds.filter((claimId) => !grounded.has(claimId));

  return {
    executionObserved: true,
    complete: claimIds.length > 0 && retrievedSourceRefIds.length > 0 && openClaimIds.length === 0,
    retrievedSourceRefIds,
    groundedClaimIds,
    documentGroundedClaimIds: Array.from(documentGrounded),
    webGroundedClaimIds: Array.from(webGrounded),
    openClaimIds,
  };
}
