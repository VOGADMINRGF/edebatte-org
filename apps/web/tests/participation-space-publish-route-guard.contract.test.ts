import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_REF } from "@/features/create/safety/questionGuardReviewPersistence";

const mocks = vi.hoisted(() => ({
  requireAdminOrResponse: vi.fn(),
  getParticipationSpacePublishRecord: vi.fn(),
  approveParticipationSpaceActivation: vi.fn(),
  rejectParticipationSpaceActivation: vi.fn(),
  activateApprovedParticipationSpace: vi.fn(),
  approveParticipationSpacePublication: vi.fn(),
  rejectParticipationSpacePublication: vi.fn(),
  publishApprovedParticipationSpace: vi.fn(),
  reviewParticipationSpaceQuestionGuard: vi.fn(),
}));

vi.mock("@/lib/server/auth/admin", () => ({
  requireAdminOrResponse: (...args: unknown[]) =>
    mocks.requireAdminOrResponse(...args),
}));

vi.mock("@/features/create/participationSpaceRuntimeServer", () => ({
  getParticipationSpacePublishRecord: (...args: unknown[]) =>
    mocks.getParticipationSpacePublishRecord(...args),
  approveParticipationSpaceActivation: (...args: unknown[]) =>
    mocks.approveParticipationSpaceActivation(...args),
  rejectParticipationSpaceActivation: (...args: unknown[]) =>
    mocks.rejectParticipationSpaceActivation(...args),
  activateApprovedParticipationSpace: (...args: unknown[]) =>
    mocks.activateApprovedParticipationSpace(...args),
  approveParticipationSpacePublication: (...args: unknown[]) =>
    mocks.approveParticipationSpacePublication(...args),
  rejectParticipationSpacePublication: (...args: unknown[]) =>
    mocks.rejectParticipationSpacePublication(...args),
  publishApprovedParticipationSpace: (...args: unknown[]) =>
    mocks.publishApprovedParticipationSpace(...args),
  reviewParticipationSpaceQuestionGuard: (...args: unknown[]) =>
    mocks.reviewParticipationSpaceQuestionGuard(...args),
}));

import { POST } from "@/app/api/admin/participation-space-publish/[sourceHandoffId]/route";

const SOURCE_HANDOFF_ID = "handoff-g2-route";
const CURRENT_QUESTION = "Welche Maßnahme soll zuerst umgesetzt werden?";

function requestFor(body: Record<string, unknown>) {
  return new NextRequest(
    `http://localhost/api/admin/participation-space-publish/${SOURCE_HANDOFF_ID}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function context() {
  return { params: Promise.resolve({ sourceHandoffId: SOURCE_HANDOFF_ID }) };
}

function currentRecord(
  candidatePublicQuestion = CURRENT_QUESTION,
  evidenceRefs = [PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_REF],
) {
  return {
    sourceHandoffId: SOURCE_HANDOFF_ID,
    participationQuestion: CURRENT_QUESTION,
    questionGuard: {
      candidatePublicQuestion,
      releaseState: "draft_allowed",
      evidenceRefs,
    },
  };
}

describe("G2 participation publish route guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminOrResponse.mockResolvedValue({
      _id: { toHexString: () => "admin-1" },
    });
    mocks.getParticipationSpacePublishRecord.mockResolvedValue(currentRecord());
    for (const fn of [
      mocks.approveParticipationSpaceActivation,
      mocks.rejectParticipationSpaceActivation,
      mocks.activateApprovedParticipationSpace,
      mocks.approveParticipationSpacePublication,
      mocks.rejectParticipationSpacePublication,
      mocks.publishApprovedParticipationSpace,
      mocks.reviewParticipationSpaceQuestionGuard,
    ]) {
      fn.mockResolvedValue({ sourceHandoffId: SOURCE_HANDOFF_ID });
    }
  });

  it("fails closed before an activation approval when the G1 candidate is stale", async () => {
    mocks.getParticipationSpacePublishRecord.mockResolvedValue(
      currentRecord("Welche alte Maßnahme soll zuerst umgesetzt werden?"),
    );

    const response = await POST(
      requestFor({ action: "approveParticipationSpaceActivation" }),
      context(),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "participation_space_question_guard_stale",
    });
    expect(mocks.approveParticipationSpaceActivation).not.toHaveBeenCalled();
  });

  it("fails closed when the question matches but G1 contract evidence is missing", async () => {
    mocks.getParticipationSpacePublishRecord.mockResolvedValue(
      currentRecord(CURRENT_QUESTION, []),
    );

    const response = await POST(
      requestFor({ action: "approveParticipationSpaceActivation" }),
      context(),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "participation_space_question_guard_stale",
    });
    expect(mocks.approveParticipationSpaceActivation).not.toHaveBeenCalled();
  });

  it("fails closed before public publish when the guarded candidate is stale", async () => {
    mocks.getParticipationSpacePublishRecord.mockResolvedValue(
      currentRecord("Welche alte Maßnahme soll zuerst umgesetzt werden?"),
    );

    const response = await POST(
      requestFor({ action: "publishApprovedParticipationSpace" }),
      context(),
    );

    expect(response.status).toBe(409);
    expect(mocks.publishApprovedParticipationSpace).not.toHaveBeenCalled();
  });

  it("allows a current guard to proceed to the existing server-authoritative action", async () => {
    const response = await POST(
      requestFor({ action: "approveParticipationSpaceActivation" }),
      context(),
    );

    expect(response.status).toBe(200);
    expect(mocks.getParticipationSpacePublishRecord).toHaveBeenCalledWith(
      SOURCE_HANDOFF_ID,
    );
    expect(mocks.approveParticipationSpaceActivation).toHaveBeenCalledWith({
      sourceHandoffId: SOURCE_HANDOFF_ID,
      actorUserId: "admin-1",
    });
  });

  it("keeps guard re-review available so stale state can be repaired with new evidence", async () => {
    mocks.getParticipationSpacePublishRecord.mockResolvedValue(
      currentRecord("Welche alte Maßnahme soll zuerst umgesetzt werden?"),
    );

    const response = await POST(
      requestFor({
        action: "reviewParticipationSpaceQuestionGuard",
        actorExtractionSource: "human_review",
        evidenceRefs: ["human-review:g2-route-recheck"],
        noNamedActorsConfirmed: true,
      }),
      context(),
    );

    expect(response.status).toBe(200);
    expect(mocks.getParticipationSpacePublishRecord).not.toHaveBeenCalled();
    expect(mocks.reviewParticipationSpaceQuestionGuard).toHaveBeenCalledWith({
      sourceHandoffId: SOURCE_HANDOFF_ID,
      actorUserId: "admin-1",
      actorExtractionSource: "human_review",
      evidenceRefs: ["human-review:g2-route-recheck"],
      actorContexts: undefined,
      noNamedActorsConfirmed: true,
    });
  });

  it("keeps explicit rejection available even when the guard is stale", async () => {
    mocks.getParticipationSpacePublishRecord.mockResolvedValue(
      currentRecord("Welche alte Maßnahme soll zuerst umgesetzt werden?"),
    );

    const response = await POST(
      requestFor({ action: "rejectParticipationSpacePublication" }),
      context(),
    );

    expect(response.status).toBe(200);
    expect(mocks.getParticipationSpacePublishRecord).not.toHaveBeenCalled();
    expect(mocks.rejectParticipationSpacePublication).toHaveBeenCalledWith({
      sourceHandoffId: SOURCE_HANDOFF_ID,
      actorUserId: "admin-1",
    });
  });
});
