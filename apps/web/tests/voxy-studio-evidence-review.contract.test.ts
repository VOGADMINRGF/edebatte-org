import { describe, expect, it } from "vitest";

import {
  buildVoxyStudioEvidenceSnapshot,
  isVoxyStudioEvidenceSnapshotApproved,
} from "@/features/voxyVideo/studioEvidenceReview";
import type {
  DossierClaimDoc,
  DossierFindingDoc,
  DossierSourceDoc,
  OpenQuestionDoc,
} from "@features/dossier/schemas";
import type { ReviewQueueOperationRecord } from "@features/reviewQueueOperations";

const sources: DossierSourceDoc[] = [
  {
    sourceId: "source-1",
    dossierId: "dossier-1",
    canonicalUrlHash: "12345678hash",
    url: "https://example.com/source",
    title: "Primärquelle",
    publisher: "Beispiel",
    type: "official",
    language: "de",
    snippet: "Relevanter Auszug",
    retrievedAt: new Date("2026-09-21T12:00:00.000Z"),
  },
];
const claims: DossierClaimDoc[] = [
  {
    claimId: "claim-1",
    dossierId: "dossier-1",
    text: "Eine überprüfbare Aussage",
    kind: "fact",
    status: "supported",
    createdByRole: "editor",
  },
];
const findings: DossierFindingDoc[] = [
  {
    findingId: "finding-1",
    dossierId: "dossier-1",
    claimId: "claim-1",
    verdict: "supports",
    rationale: ["Quelle trägt die Aussage."],
    citations: [
      {
        sourceId: "source-1",
        quote: "Beleg",
        locator: "S. 1",
      },
    ],
    producedBy: "editor",
  },
];
const openQuestions: OpenQuestionDoc[] = [
  {
    questionId: "question-1",
    dossierId: "dossier-1",
    text: "Was ist noch offen?",
    status: "open",
    links: { sourceIds: ["source-1"], claimIds: ["claim-1"] },
  },
];

function snapshot(overrides?: Partial<{ sources: DossierSourceDoc[]; claims: DossierClaimDoc[]; findings: DossierFindingDoc[]; openQuestions: OpenQuestionDoc[] }>) {
  return buildVoxyStudioEvidenceSnapshot({
    dossierId: "dossier-1",
    sources: overrides?.sources ?? sources,
    claims: overrides?.claims ?? claims,
    findings: overrides?.findings ?? findings,
    openQuestions: overrides?.openQuestions ?? openQuestions,
  });
}

function readyRecord(itemId: string): ReviewQueueOperationRecord {
  return {
    itemId,
    operationalStatus: "ready",
    assignedToUserId: null,
    assignedByUserId: null,
    assignedAt: null,
    noteCount: 0,
    latestNote: null,
    latestNoteAt: null,
    latestAction: "mark_ready",
    latestActionAt: "2026-09-22T04:00:00.000Z",
    latestActionByUserId: "admin-1",
    createdAt: "2026-09-22T03:00:00.000Z",
    updatedAt: "2026-09-22T04:00:00.000Z",
  };
}

describe("Voxy Studio evidence snapshot review", () => {
  it("is deterministic across source ordering", () => {
    const first = snapshot();
    const second = snapshot({ sources: [...sources].reverse() });
    expect(second.fingerprint).toBe(first.fingerprint);
    expect(second.reviewItemId).toBe(first.reviewItemId);
  });

  it("changes the fingerprint when relevant evidence changes", () => {
    const first = snapshot();
    const changed = snapshot({
      findings: [
        {
          ...findings[0]!,
          citations: [{ ...findings[0]!.citations[0]!, locator: "S. 2" }],
        },
      ],
    });
    expect(changed.fingerprint).not.toBe(first.fingerprint);
    expect(changed.reviewItemId).not.toBe(first.reviewItemId);
  });

  it("requires exact persistent human-ready review truth", () => {
    const current = snapshot();
    expect(
      isVoxyStudioEvidenceSnapshotApproved({
        snapshot: current,
        reviewRecord: readyRecord(current.reviewItemId),
        persistenceMode: "persistent_primary",
      }),
    ).toBe(true);
    expect(
      isVoxyStudioEvidenceSnapshotApproved({
        snapshot: current,
        reviewRecord: readyRecord(current.reviewItemId),
        persistenceMode: "in_memory_fallback",
      }),
    ).toBe(false);
    expect(
      isVoxyStudioEvidenceSnapshotApproved({
        snapshot: current,
        reviewRecord: readyRecord(`${current.reviewItemId}-stale`),
        persistenceMode: "persistent_primary",
      }),
    ).toBe(false);
  });

  it("never approves an empty source snapshot", () => {
    const current = snapshot({ sources: [] });
    expect(
      isVoxyStudioEvidenceSnapshotApproved({
        snapshot: current,
        reviewRecord: readyRecord(current.reviewItemId),
        persistenceMode: "persistent_primary",
      }),
    ).toBe(false);
  });
});
