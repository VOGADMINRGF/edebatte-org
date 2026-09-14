import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  verifySession: vi.fn(),
  enforceSecurity: vi.fn(),
  resume: vi.fn(),
}));

vi.mock("@/lib/server/auth/sessionUser", () => ({
  getSessionUser: (...args: unknown[]) => mocks.getSessionUser(...args),
}));
vi.mock("@/features/create/createAnonymousSession", () => ({
  CREATE_ANON_SESSION_COOKIE: "edebatte_create_session",
  verifyAnonymousSession: (...args: unknown[]) => mocks.verifySession(...args),
}));
vi.mock("@/features/create/createRouteSecurity", () => ({
  enforceCreateMutationSecurity: (...args: unknown[]) => mocks.enforceSecurity(...args),
}));
vi.mock("@/features/create/createGuestAdoptionPreparation", () => ({
  resumeGuestAdoptionDraftForAuthenticatedAccount: (...args: unknown[]) => mocks.resume(...args),
}));

import { POST } from "@/app/api/create/adoption-resume/route";

const verifiedSession = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  issuedAtMs: 1_000,
  expiresAtMs: 1_000_000,
};

function request(body?: BodyInit, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/create/adoption-resume", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "edebatte_create_session=valid",
      ...headers,
    },
    ...(body === undefined ? {} : { body }),
  });
}

describe("authenticated guest adoption resume route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({
      _id: { toHexString: () => "account-a" },
      sessionValid: true,
    });
    mocks.verifySession.mockReturnValue(verifiedSession);
    mocks.enforceSecurity.mockResolvedValue(null);
    mocks.resume.mockResolvedValue({ ok: true, state: "resumed", draftId: "draft-c4b" });
  });

  it("accepts exactly an empty object and returns only the authoritative draft result", async () => {
    const response = await POST(request("{}"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, state: "resumed", draftId: "draft-c4b" });
    expect(mocks.resume).toHaveBeenCalledWith({ session: verifiedSession, userId: "account-a" });
  });

  it("replays a completed authoritative adoption without exposing recovery material", async () => {
    mocks.resume.mockResolvedValueOnce({ ok: true, state: "completed", draftId: "draft-c4b" });
    const response = await POST(request("{}"));
    await expect(response.json()).resolves.toEqual({ ok: true, state: "completed", draftId: "draft-c4b" });
  });

  it("fails closed for unauthenticated and missing, invalid, or expired C3A sessions", async () => {
    mocks.getSessionUser.mockResolvedValueOnce(null);
    expect((await POST(request("{}"))).status).toBe(401);
    mocks.verifySession.mockReturnValueOnce(null);
    expect((await POST(request("{}"))).status).toBe(403);
    mocks.verifySession.mockReturnValueOnce(null);
    expect((await POST(request("{}"))).status).toBe(403);
    mocks.verifySession.mockReturnValueOnce(null);
    expect((await POST(request("{}"))).status).toBe(403);
    expect(mocks.resume).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, "missing body"],
    ["{", "malformed JSON"],
    ["null", "null"],
    ["[]", "array"],
    ["\"value\"", "scalar"],
    ["{\"preparationId\":\"x\"}", "preparation ID"],
    ["{\"adoptionId\":\"x\"}", "adoption ID"],
    ["{\"draftId\":\"x\"}", "draft ID"],
    ["{\"claim\":\"x\"}", "claim"],
    ["{\"recoveryToken\":\"x\",\"draftIdempotencyKey\":\"x\"}", "recovery metadata"],
  ])("rejects %s without invoking the core", async (body, _label) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(mocks.resume).not.toHaveBeenCalled();
  });

  it("returns the shared security failure and a safe generic core failure", async () => {
    const securityFailure = new Response(JSON.stringify({ ok: false, errorCode: "CREATE_REQUEST_REJECTED" }), { status: 403 });
    mocks.enforceSecurity.mockResolvedValueOnce(securityFailure);
    expect(await POST(request("{}"))).toBe(securityFailure);
    mocks.resume.mockResolvedValueOnce({ ok: false });
    const response = await POST(request("{}"));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errorCode: "CREATE_ADOPTION_RESUME_UNAVAILABLE",
      message: "Die Anfrage konnte nicht verarbeitet werden.",
    });
  });
});
