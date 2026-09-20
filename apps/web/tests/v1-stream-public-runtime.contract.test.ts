import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sessionFindOne: vi.fn(),
  roomNext: vi.fn(),
  inputToArray: vi.fn(),
  findDossierByAnyId: vi.fn(),
  buildDossierUpdateReadModel: vi.fn(),
  loadSocialDistributionQueueReadModel: vi.fn(),
}));

vi.mock("@features/stream/db", () => ({
  streamSessionsCol: async () => ({
    findOne: (...args: unknown[]) => mocks.sessionFindOne(...args),
    find: () => ({
      sort: () => ({
        limit: () => ({
          toArray: async () => [],
        }),
      }),
    }),
  }),
  streamPublicInputsCol: async () => ({
    find: () => ({
      sort: () => ({
        limit: () => ({
          toArray: (...args: unknown[]) => mocks.inputToArray(...args),
        }),
      }),
    }),
  }),
}));

vi.mock("@features/anlassraum/db", () => ({
  anlassraumCol: async () => ({
    find: () => ({
      sort: () => ({
        limit: () => ({
          next: (...args: unknown[]) => mocks.roomNext(...args),
        }),
      }),
    }),
  }),
}));

vi.mock("@features/dossier/lookup", () => ({
  findDossierByAnyId: (...args: unknown[]) => mocks.findDossierByAnyId(...args),
}));

vi.mock("@features/dossier/updateReadModel", () => ({
  buildDossierUpdateReadModel: (...args: unknown[]) => mocks.buildDossierUpdateReadModel(...args),
}));

vi.mock("@features/outputEngine/socialDistributionQueueReadModel", () => ({
  loadSocialDistributionQueueReadModel: (...args: unknown[]) =>
    mocks.loadSocialDistributionQueueReadModel(...args),
}));

import { buildStreamPublicRuntime, buildStreamShareContext } from "@features/stream/publicRuntime";

describe("v1 stream public runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionFindOne.mockResolvedValue({
      _id: { toHexString: () => "65f000000000000000000901" },
      slug: "stadtwerke-live-berlin",
      creatorId: "user-1",
      title: "Livestream Stadtwerke Berlin",
      description: "Öffentliche Energierunde",
      topicKey: "energie-berlin",
      regionCode: "berlin",
      startsAt: new Date("2026-05-25T18:00:00.000Z"),
      status: "live",
      isLive: true,
      visibility: "public",
      createdAt: new Date("2026-05-25T10:00:00.000Z"),
      updatedAt: new Date("2026-05-25T18:15:00.000Z"),
    });
    mocks.roomNext.mockResolvedValue({
      _id: { toHexString: () => "65f000000000000000000401" },
      title: "Anlassraum Energie Berlin",
      summary: "Öffentliche Folgefläche",
      dossierId: { toHexString: () => "65f000000000000000000777" },
      status: "active",
      isPublic: true,
    });
    mocks.inputToArray.mockResolvedValue([
      {
        inputId: "stream-public-input-unreviewed",
        kind: "question",
        text: "Diese Frage ist noch nicht geprüft und darf öffentlich nicht erscheinen.",
        sourceUrl: null,
        reviewState: "needs_review",
        visibilityState: "public_unverified",
        riskHint: "Bleibt in Prüfung.",
        createdAt: new Date("2026-05-25T19:05:00.000Z"),
      },
      {
        inputId: "stream-public-input-accepted",
        kind: "source_hint",
        text: "Dieser geprüfte Hinweis darf im öffentlichen Readmodel erscheinen.",
        sourceUrl: "https://example.org/report",
        reviewState: "accepted",
        visibilityState: "public_reviewed",
        riskHint: "Quelle wurde geprüft.",
        createdAt: new Date("2026-05-25T19:00:00.000Z"),
      },
    ]);
    mocks.findDossierByAnyId.mockResolvedValue({
      meta: { title: "Dossier Energie Berlin" },
    });
    mocks.buildDossierUpdateReadModel.mockResolvedValue({
      summary: {
        reviewRequired: 1,
        published: 0,
      },
    });
    mocks.loadSocialDistributionQueueReadModel.mockResolvedValue({
      items: [],
    });
  });

  it("builds a public runtime that keeps event, Anlassraum and Dossier in one review-first path", async () => {
    const runtime = await buildStreamPublicRuntime("stadtwerke-live-berlin");
    const share = runtime ? buildStreamShareContext(runtime) : null;

    expect(runtime?.session.resolvedStatus).toBe("live");
    expect(runtime?.context.anlassraumHref).toBe("/runden?anlassraumId=65f000000000000000000401");
    expect(runtime?.context.dossierHref).toBe("/dossier/65f000000000000000000777");
    expect(runtime?.context.swipesHref).toContain("/swipes");
    expect(runtime?.participation.pendingCount).toBe(1);
    expect(runtime?.participation.visibleCount).toBe(1);
    expect(runtime?.participation.questionCount).toBe(0);
    expect(runtime?.participation.sourceHintCount).toBe(1);
    expect(runtime?.participation.items).toHaveLength(1);
    expect(runtime?.participation.items[0]?.id).toBe("stream-public-input-accepted");
    expect(runtime?.participation.items[0]?.text).not.toContain("noch nicht geprüft");
    expect(runtime?.guardrails.reviewFirstInput).toBe(true);
    expect(share).toMatchObject({
      contextKind: "event",
      canonicalTarget: "/stream/stadtwerke-live-berlin",
      needsReviewBeforeOfficialSocial: true,
    });
  });

  it("fails closed for a draft session even if it is addressable by slug", async () => {
    mocks.sessionFindOne.mockResolvedValueOnce({
      _id: { toHexString: () => "65f000000000000000000902" },
      slug: "draft-event",
      creatorId: "user-1",
      title: "Draft Event",
      status: "draft",
      isLive: false,
      visibility: "public",
      createdAt: new Date("2026-05-25T10:00:00.000Z"),
      updatedAt: new Date("2026-05-25T10:00:00.000Z"),
    });

    await expect(buildStreamPublicRuntime("draft-event")).resolves.toBeNull();
  });
});
