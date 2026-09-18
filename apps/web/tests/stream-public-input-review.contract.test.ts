import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  createInMemoryParticipationSignalReviewRuntimeRepo,
  getParticipationSignalReviewRuntimeRepo,
  setParticipationSignalReviewRuntimeRepoForTests,
} from "@features/region";

const mocks = vi.hoisted(() => ({
  buildRuntime: vi.fn(),
  insertOne: vi.fn(),
}));

vi.mock("@features/stream/publicRuntime", () => ({
  buildStreamPublicRuntime: (...args: unknown[]) => mocks.buildRuntime(...args),
}));

vi.mock("@features/stream/db", () => ({
  streamPublicInputsCol: async () => ({
    insertOne: (...args: unknown[]) => mocks.insertOne(...args),
  }),
}));

import { POST } from "@/app/api/stream/public-input/route";

function buildRequest(
  body: Record<string, unknown>,
  options: { authenticated?: boolean; verified?: boolean; contentType?: string } = {},
) {
  const authenticated = options.authenticated !== false;
  const cookies = authenticated
    ? [`u_id=test-user`, options.verified ? "u_verified=1" : "u_verified=0"].join("; ")
    : "";
  return new NextRequest("http://localhost/api/stream/public-input", {
    method: "POST",
    headers: {
      "content-type": options.contentType ?? "application/json",
      ...(cookies ? { cookie: cookies } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("stream public input route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setParticipationSignalReviewRuntimeRepoForTests(
      createInMemoryParticipationSignalReviewRuntimeRepo(),
    );
    mocks.insertOne.mockResolvedValue({ acknowledged: true });
    mocks.buildRuntime.mockResolvedValue({
      session: {
        id: "65f000000000000000000901",
        slugOrId: "stadtwerke-live-berlin",
        title: "Livestream Stadtwerke Berlin",
        description: "Öffentliche Energierunde",
        topicKey: "energie-berlin",
        regionCode: "berlin",
        resolvedStatus: "collecting_input",
        requireVerifiedParticipants: false,
      },
      context: {
        anlassraumId: "65f000000000000000000401",
        anlassraumTitle: "Anlassraum Energie Berlin",
        dossierId: "65f000000000000000000777",
      },
      participation: {
        openForInput: true,
      },
    });
  });

  it("stores authenticated stream-origin inputs as review-gated participation signals", async () => {
    const res = await POST(
      buildRequest({
        streamId: "65f000000000000000000901",
        kind: "question",
        text: "Welche Daten zur Preisstabilität werden nach dem Event veröffentlicht?",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      input: {
        kind: "question",
        reviewState: "needs_review",
        visibilityState: "public_unverified",
        visibilityLabel: "reviewpflichtig",
        noAutoPublish: true,
        noAutoDossierUpdate: true,
      },
    });

    expect(mocks.insertOne).toHaveBeenCalledTimes(1);
    const inserted = mocks.insertOne.mock.calls[0]?.[0];
    expect(inserted).toMatchObject({
      origin: "stream",
      streamTitle: "Livestream Stadtwerke Berlin",
      anlassraumId: "65f000000000000000000401",
      dossierId: "65f000000000000000000777",
      kind: "question",
      reviewState: "needs_review",
      visibilityState: "public_unverified",
    });

    const record = await getParticipationSignalReviewRuntimeRepo().getParticipationSignalRecordById(
      body.input.id,
    );
    expect(record).toMatchObject({
      relatedAnlassraumIds: ["65f000000000000000000401"],
      relatedDossierIds: ["65f000000000000000000777"],
      reviewStatus: "needs_review",
      visibilityState: "public_unverified",
      noAutoPublish: true,
    });
  });

  it("fails closed for anonymous public event input", async () => {
    const res = await POST(
      buildRequest(
        {
          streamId: "65f000000000000000000901",
          kind: "question",
          text: "Welche Daten werden veröffentlicht?",
        },
        { authenticated: false },
      ),
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: "login_required",
    });
    expect(mocks.buildRuntime).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("enforces verification when the released event requires it", async () => {
    mocks.buildRuntime.mockResolvedValueOnce({
      session: {
        id: "65f000000000000000000901",
        slugOrId: "stadtwerke-live-berlin",
        title: "Livestream Stadtwerke Berlin",
        description: "Öffentliche Energierunde",
        topicKey: "energie-berlin",
        regionCode: "berlin",
        requireVerifiedParticipants: true,
      },
      context: {
        anlassraumId: null,
        anlassraumTitle: null,
        dossierId: null,
      },
      participation: {
        openForInput: true,
      },
    });

    const res = await POST(
      buildRequest({
        streamId: "65f000000000000000000901",
        kind: "question",
        text: "Welche Daten werden veröffentlicht?",
      }),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: "verification_required",
    });
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("accepts verified input when verification is required", async () => {
    mocks.buildRuntime.mockResolvedValueOnce({
      session: {
        id: "65f000000000000000000901",
        slugOrId: "stadtwerke-live-berlin",
        title: "Livestream Stadtwerke Berlin",
        description: "Öffentliche Energierunde",
        topicKey: "energie-berlin",
        regionCode: "berlin",
        requireVerifiedParticipants: true,
      },
      context: {
        anlassraumId: null,
        anlassraumTitle: null,
        dossierId: null,
      },
      participation: {
        openForInput: true,
      },
    });

    const res = await POST(
      buildRequest(
        {
          streamId: "65f000000000000000000901",
          kind: "question",
          text: "Welche Daten werden veröffentlicht?",
        },
        { verified: true },
      ),
    );

    expect(res.status).toBe(201);
  });

  it("blocks input when the public stream path is not open", async () => {
    mocks.buildRuntime.mockResolvedValueOnce({
      session: {
        requireVerifiedParticipants: false,
      },
      participation: {
        openForInput: false,
      },
    });

    const res = await POST(
      buildRequest({
        streamId: "65f000000000000000000901",
        kind: "source_hint",
        text: "Hier ist die angekündigte Quelle.",
        sourceUrl: "https://example.org/source",
      }),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: "public_stream_not_open",
    });
  });

  it("rejects non-json event input before parsing", async () => {
    const res = await POST(
      buildRequest(
        {
          streamId: "65f000000000000000000901",
          kind: "question",
          text: "Welche Daten werden veröffentlicht?",
        },
        { contentType: "text/plain" },
      ),
    );

    expect(res.status).toBe(415);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: "unsupported_media_type",
    });
  });
});
