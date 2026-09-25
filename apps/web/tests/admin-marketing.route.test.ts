import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdminOrResponse: vi.fn(),
}));

vi.mock("@/lib/server/auth/admin", () => ({
  requireAdminOrResponse: (...args: unknown[]) => mocks.requireAdminOrResponse(...args),
}));

import * as route from "@/app/api/admin/marketing/route";

function request() {
  return new NextRequest("http://localhost/api/admin/marketing", { method: "GET" });
}

describe("/api/admin/marketing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminOrResponse.mockResolvedValue({ _id: "admin-1" });
  });

  it("passes through 401 when the shared admin gate has no valid session", async () => {
    mocks.requireAdminOrResponse.mockResolvedValue(
      Response.json({ ok: false, error: "unauthorized" }, { status: 401 }),
    );

    const response = await route.GET(request());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "unauthorized" });
  });

  it("passes through 403 for non-admin roles", async () => {
    mocks.requireAdminOrResponse.mockResolvedValue(
      Response.json({ ok: false, error: "forbidden" }, { status: 403 }),
    );

    const response = await route.GET(request());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "forbidden" });
  });

  it("passes through the shared 2FA fail-closed response", async () => {
    mocks.requireAdminOrResponse.mockResolvedValue(
      Response.json({ ok: false, error: "two_factor_required" }, { status: 403 }),
    );

    const response = await route.GET(request());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "two_factor_required" });
  });

  it("returns the read-only registry for an admitted admin session", async () => {
    const response = await route.GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.readModel.mode).toBe("read_only");
    expect(body.readModel.opportunities.length).toBeGreaterThan(0);
    expect(body.readModel.campaigns.length).toBeGreaterThan(0);
    expect(body.readModel.brandProfiles.map((profile: { id: string }) => profile.id)).toEqual(
      expect.arrayContaining([
        "brand-edebatte-light",
        "brand-edebatte-dark",
        "brand-voiceopengov",
        "brand-vote4gov",
      ]),
    );
  });

  it("exposes no mutation handlers in this slice", () => {
    expect((route as Record<string, unknown>).POST).toBeUndefined();
    expect((route as Record<string, unknown>).PATCH).toBeUndefined();
    expect((route as Record<string, unknown>).PUT).toBeUndefined();
    expect((route as Record<string, unknown>).DELETE).toBeUndefined();
  });
});
