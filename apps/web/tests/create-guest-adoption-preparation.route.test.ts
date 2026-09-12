import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  enforce: vi.fn(),
  prepare: vi.fn(),
}));

vi.mock("@/features/create/createRouteSecurity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/create/createRouteSecurity")>()),
  enforceCreateMutationSecurity: (...args: unknown[]) => mocks.enforce(...args),
}));
vi.mock("@/features/create/createGuestAdoptionPreparation", () => ({
  prepareGuestAdoptionPreparation: (...args: unknown[]) => mocks.prepare(...args),
}));

import { POST } from "@/app/api/create/adoption-preparation/route";
import { CREATE_ANON_SESSION_COOKIE, createAnonymousSession } from "@/features/create/createAnonymousSession";

const secret = "test-create-session-secret-with-at-least-32-bytes";

function request(body: unknown, cookie?: string) {
  return new NextRequest("http://localhost/api/create/adoption-preparation", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "x-edebatte-create-csrf": "create-mutation-v1",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("guest adoption preparation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CREATE_ANON_SESSION_SECRET = secret;
    mocks.enforce.mockResolvedValue(null);
    mocks.prepare.mockResolvedValue({
      ok: true,
      preparationId: "123e4567-e89b-42d3-a456-426614174001",
      expiresAtMs: Date.now() + 60_000,
    });
  });

  it("returns the exact 202 response without a preparation browser carrier", async () => {
    const created = createAnonymousSession();
    const response = await POST(request({ claim: "Sichere Schulwege" }, `${CREATE_ANON_SESSION_COOKIE}=${created?.value}`));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true, status: "prepared" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects missing sessions and malformed boundary payloads without invoking preparation", async () => {
    expect((await POST(request({ claim: "Sicher" }))).status).toBe(403);
    const created = createAnonymousSession();
    const response = await POST(request({ claim: "Sicher", extra: true }, `${CREATE_ANON_SESSION_COOKIE}=${created?.value}`));
    expect(response.status).toBe(400);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it("does not mutate browser state after a committed-barrier failure", async () => {
    const created = createAnonymousSession();
    mocks.prepare.mockResolvedValue({ ok: false, afterBarrier: true, reason: "unavailable" });
    const response = await POST(request({ claim: "Sicher" }, `${CREATE_ANON_SESSION_COOKIE}=${created?.value}`));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, errorCode: "CREATE_PREPARATION_UNAVAILABLE", message: "Die Anfrage konnte nicht verarbeitet werden." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
