import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  readSession: vi.fn(),
}));

vi.mock("@/utils/session", () => ({
  readSession: (...args: unknown[]) => mocks.readSession(...args),
}));

import { POST } from "@/app/api/create/workstates/route";
import {
  createInMemoryCreateSavedWorkstateRepo,
  listCreateSavedWorkstates,
  setCreateSavedWorkstateRepoForTests,
} from "@/features/create/createSavedWorkstateRepo";

describe("/api/create/workstates", () => {
  beforeEach(() => {
    setCreateSavedWorkstateRepoForTests(createInMemoryCreateSavedWorkstateRepo());
    mocks.readSession.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.readSession.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/create/workstates", {
        method: "POST",
        body: JSON.stringify({
          visibility: "private",
          type: "topic_candidate",
          status: "saved",
          title: "ÖPNV und Mobilität",
          content: "Themenstand",
          resumeHref: "/create",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("persists a saved workstate for the signed-in user", async () => {
    mocks.readSession.mockResolvedValue({ uid: "user-1" });

    const response = await POST(
      new NextRequest("http://localhost/api/create/workstates", {
        method: "POST",
        body: JSON.stringify({
          visibility: "community_candidate",
          type: "community_candidate",
          status: "needs_review",
          sourceUrl: "https://example.com/bus",
          sourceAnalysisId: "analysis-1",
          parentTopicId: "public-transit-mobility",
          title: "Community-Kandidat: ÖPNV und Mobilität",
          content: "Ich bereite daraus einen überprüfbaren Community-Beitrag vor.",
          metadata: {
            topicTitle: "ÖPNV und Mobilität",
            sourceLabel: "Bus-Beitrag",
            linkLoaded: false,
          },
          resumeHref: "/create",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      record: {
        visibility: "community_candidate",
        type: "community_candidate",
        status: "needs_review",
        title: "Community-Kandidat: ÖPNV und Mobilität",
      },
    });

    const records = await listCreateSavedWorkstates();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      ownerUserId: "user-1",
      visibility: "community_candidate",
      type: "community_candidate",
      status: "needs_review",
      sourceUrl: "https://example.com/bus",
      parentTopicId: "public-transit-mobility",
      title: "Community-Kandidat: ÖPNV und Mobilität",
      resumeHref: "/create",
    });
  });

  it("accepts null for optional source and topic references from the Create client", async () => {
    mocks.readSession.mockResolvedValue({ uid: "user-1" });

    const response = await POST(
      new NextRequest("http://localhost/api/create/workstates", {
        method: "POST",
        body: JSON.stringify({
          visibility: "private",
          type: "topic_candidate",
          status: "saved",
          sourceUrl: null,
          sourceAnalysisId: "2026-09-04T04:48:00.000Z",
          parentTopicId: null,
          title: "Gesundheitskioske",
          content: "Gesundheitskioske als möglicher Lösungsansatz für Versorgungslücken.",
          metadata: {
            topicId: null,
            topicTitle: "Gesundheitskioske",
            sourceLabel: "aktueller Beitrag",
            linkLoaded: false,
          },
          resumeHref: "/create",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });

    const records = await listCreateSavedWorkstates();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      ownerUserId: "user-1",
      sourceUrl: null,
      parentTopicId: null,
      title: "Gesundheitskioske",
    });
  });
});
