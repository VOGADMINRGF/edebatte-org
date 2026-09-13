import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  createInMemoryParticipationSignalReviewRuntimeRepo,
  getParticipationSignalReviewRuntimeRepo,
  setParticipationSignalReviewRuntimeRepoForTests,
} from "@features/region";

const mocks = vi.hoisted(() => ({
  findRoom: vi.fn(),
  isAnlassraumPublicInputAllowed: vi.fn(),
}));

vi.mock("@features/anlassraum/db", () => ({
  anlassraumCol: async () => ({
    findOne: (...args: unknown[]) => mocks.findRoom(...args),
  }),
}));

vi.mock("@/features/create/anlassraumActivationWorkflowServer", () => ({
  isAnlassraumPublicInputAllowed: (...args: unknown[]) =>
    mocks.isAnlassraumPublicInputAllowed(...args),
}));

import { POST } from "@/app/api/runden/public-input/route";

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/runden/public-input", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("public Anlassraum input route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setParticipationSignalReviewRuntimeRepoForTests(
      createInMemoryParticipationSignalReviewRuntimeRepo(),
    );
    mocks.findRoom.mockResolvedValue({
      _id: { toHexString: () => "65f000000000000000000401" },
      title: "Schulwegsicherheit in Reinickendorf",
      summary: "Öffentlicher Anlassraum für lokale Hinweise und Fragen.",
      isPublic: true,
      status: "active",
      publishedAt: new Date("2026-07-01T09:40:00.000Z"),
      reviewedBy: "reviewer-legacy",
      approvedBy: "approver-legacy",
      regionKey: "berlin-reinickendorf",
    });
    mocks.isAnlassraumPublicInputAllowed.mockResolvedValue(true);
  });

  it("creates a direct public question as review-gated participation signal", async () => {
    const res = await POST(
      buildRequest({
        anlassraumId: "65f000000000000000000401",
        kind: "frage",
        text: "Wann wird der Schulweg an der Ollenhauerstraße sicherer?",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      signal: {
        sourceType: "public_question",
        visibilityState: "public_unverified",
        visibilityLabel: "sichtbar, aber nicht geprüft",
        noAutoPublish: true,
        noAutoCreateDossier: true,
        noAutoCreateAnlassraum: true,
        noRepresentativeClaim: true,
      },
    });

    const record = await getParticipationSignalReviewRuntimeRepo().getParticipationSignalRecordById(
      body.signal.id,
    );
    expect(record).toMatchObject({
      relatedAnlassraumIds: ["65f000000000000000000401"],
      reviewStatus: "needs_review",
      visibilityState: "public_unverified",
      noRepresentativeClaim: true,
    });
  });

  it("keeps options in internal review instead of auto-publishing or auto-official state", async () => {
    const res = await POST(
      buildRequest({
        anlassraumId: "65f000000000000000000401",
        kind: "option",
        text: "Option: Schulstraße morgens sperren und Elternhaltestellen verlagern.",
      }),
    );

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      signal: {
        sourceType: "public_claim",
        visibilityState: "internal_review",
        visibilityLabel: "reviewpflichtig",
      },
    });
  });

  it("rejects inputs for missing or non-public Anlassräume", async () => {
    mocks.findRoom.mockResolvedValueOnce(null);

    const res = await POST(
      buildRequest({
        anlassraumId: "65f000000000000000000401",
        kind: "hinweis",
        text: "Vor der Schule wird häufig in zweiter Reihe gehalten.",
      }),
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: "public_anlassraum_not_found",
    });
  });

  it("rejects a stale public flag while the canonical activation workflow is review-blocked", async () => {
    mocks.isAnlassraumPublicInputAllowed.mockResolvedValueOnce(false);

    const res = await POST(
      buildRequest({
        anlassraumId: "65f000000000000000000401",
        kind: "frage",
        text: "Welche Querung soll zuerst verbessert werden?",
      }),
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: "public_anlassraum_not_found",
    });
    expect(mocks.isAnlassraumPublicInputAllowed).toHaveBeenCalledWith({
      anlassraumId: "65f000000000000000000401",
      roomIsPublic: true,
      roomStatus: "active",
      roomPublishedAt: new Date("2026-07-01T09:40:00.000Z"),
      roomReviewedBy: "reviewer-legacy",
      roomApprovedBy: "approver-legacy",
      activationWorkflowSourceHandoffId: null,
    });
  });
});
