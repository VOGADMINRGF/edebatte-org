import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  createInMemorySocialDistributionRepo,
  setSocialDistributionRepoForTests,
} from "@features/outputEngine/socialDistributionRuntime";

const mocks = vi.hoisted(() => ({
  requireAdminOrResponse: vi.fn(),
}));

vi.mock("@/lib/server/auth/admin", () => ({
  requireAdminOrResponse: (...args: unknown[]) => mocks.requireAdminOrResponse(...args),
}));

import { POST } from "@/app/api/admin/marketing/review/items/[contentId]/distribution/route";

const PLATFORM_MARKETING_QUEUE_SCOPE_ID = "platform-marketing-global";

function requestFor(contentId: string) {
  return new NextRequest(
    `http://localhost/api/admin/marketing/review/items/${encodeURIComponent(contentId)}/distribution`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
  );
}

describe("admin marketing review distribution route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSocialDistributionRepoForTests(createInMemorySocialDistributionRepo());
    mocks.requireAdminOrResponse.mockResolvedValue({
      _id: { toHexString: () => "admin-1" },
      requestScope: {
        organizationId: null,
        operatorModeLabel: "Betreiber-Modus",
      },
    });
  });

  afterEach(() => {
    setSocialDistributionRepoForTests(null);
  });

  it("moves reviewed marketing content into the existing review-first social queue", async () => {
    const response = await POST(requestFor("MCO-CONTENT-02-DE-01"), {
      params: Promise.resolve({ contentId: "MCO-CONTENT-02-DE-01" }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      contentId: "MCO-CONTENT-02-DE-01",
      post: {
        status: "needs_review",
        publicBrand: "edebatte",
        sourceContextType: "marketing_campaign",
        sourceContextId: "CAM-CONTENT-02",
        marketingCampaignId: "CAM-CONTENT-02",
        marketingContentId: "MCO-CONTENT-02-DE-01",
        channels: expect.arrayContaining(["instagram_asset", "linkedin_draft"]),
        noAutoPublish: true,
        externalPosting: false,
      },
      unsupportedChannels: expect.arrayContaining(["facebook"]),
      queueScope: {
        kind: "platform_operator",
        organizationId: PLATFORM_MARKETING_QUEUE_SCOPE_ID,
        operatorModeLabel: "Betreiber-Modus",
      },
    });
  });

  it("is idempotent at queue-record level when the operator repeats the handoff", async () => {
    const repo = createInMemorySocialDistributionRepo();
    setSocialDistributionRepoForTests(repo);

    const first = await POST(requestFor("MCO-CONTENT-02-DE-01"), {
      params: Promise.resolve({ contentId: "MCO-CONTENT-02-DE-01" }),
    });
    const second = await POST(requestFor("MCO-CONTENT-02-DE-01"), {
      params: Promise.resolve({ contentId: "MCO-CONTENT-02-DE-01" }),
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    await expect(repo.listAllPosts()).resolves.toHaveLength(1);
  });

  it("fails closed for unknown marketing content", async () => {
    const response = await POST(requestFor("MCO-NOT-FOUND"), {
      params: Promise.resolve({ contentId: "MCO-NOT-FOUND" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "marketing_content_not_found",
    });
  });

  it("propagates the admin gate instead of writing without authorization", async () => {
    mocks.requireAdminOrResponse.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await POST(requestFor("MCO-CONTENT-02-DE-01"), {
      params: Promise.resolve({ contentId: "MCO-CONTENT-02-DE-01" }),
    });

    expect(response.status).toBe(403);
  });
});
