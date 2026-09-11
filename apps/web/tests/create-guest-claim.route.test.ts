import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  enforceCreateMutationSecurity: vi.fn(),
  getVerifiedGuestClaimSubject: vi.fn(),
  runGuestClaimSingleFlight: vi.fn(),
}));

vi.mock("@/features/create/createRouteSecurity", () => ({
  enforceCreateMutationSecurity: (...args: unknown[]) => mocks.enforceCreateMutationSecurity(...args),
  getVerifiedGuestClaimSubject: (...args: unknown[]) => mocks.getVerifiedGuestClaimSubject(...args),
}));
vi.mock("@/features/create/createOrchestrationSingleFlight", () => ({
  runGuestClaimSingleFlight: (...args: unknown[]) => mocks.runGuestClaimSingleFlight(...args),
}));

import { POST } from "@/app/api/create/intake/route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/create/intake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const result = {
  version: 1 as const,
  status: "accepted" as const,
  operationId: "550e8400-e29b-41d4-a716-446655440000",
  createdAt: "2026-09-11T12:00:00.000Z",
};

describe("guest claim intake route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedGuestClaimSubject.mockReturnValue("550e8400-e29b-41d4-a716-446655440000");
    mocks.enforceCreateMutationSecurity.mockResolvedValue(null);
    mocks.runGuestClaimSingleFlight.mockResolvedValue({ kind: "completed", result, reused: false, recovered: false });
  });

  it("returns exactly the public success allowlist and never exposes persisted fields", async () => {
    const response = await POST(request({ claim: { topic: "Sichere Schulwege" } }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true, operationId: result.operationId, status: "accepted" });
    expect(mocks.runGuestClaimSingleFlight).toHaveBeenCalledWith(expect.objectContaining({
      subjectDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      inputDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(JSON.stringify(mocks.runGuestClaimSingleFlight.mock.calls)).not.toContain("Sichere Schulwege");
  });

  it("rejects client correlation and unsafe nested payloads without invoking orchestration", async () => {
    const correlation = await POST(request({ claim: {}, correlationId: "client-controls-nothing" }));
    expect(correlation.status).toBe(400);
    const pii = await POST(request({ claim: { nested: { email: "person@example.org" } } }));
    expect(pii.status).toBe(403);
    expect(mocks.runGuestClaimSingleFlight).not.toHaveBeenCalled();
    for (const response of [correlation, pii]) {
      const body = await response.json();
      expect(Object.keys(body).sort()).toEqual(["errorCode", "message", "ok"]);
      expect(JSON.stringify(body)).not.toContain("person@example.org");
    }
  });

  it.each([
    ["active", "CREATE_GUEST_CLAIM_IN_PROGRESS", 409],
    ["unavailable", "CREATE_GUEST_CLAIM_UNAVAILABLE", 503],
    ["unsafe", "CREATE_GUEST_UNSAFE_RESPONSE", 500],
  ])("maps %s orchestration state to a fixed safe failure", async (kind, errorCode, status) => {
    mocks.runGuestClaimSingleFlight.mockResolvedValue({ kind });
    const response = await POST(request({ claim: { topic: "Sichere Schulwege" } }));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ ok: false, errorCode, message: "Die Anfrage konnte nicht verarbeitet werden." });
  });

  it("fails closed for no verified guest session", async () => {
    mocks.getVerifiedGuestClaimSubject.mockReturnValue(null);
    const response = await POST(request({ claim: { topic: "Sichere Schulwege" } }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, errorCode: "CREATE_REQUEST_REJECTED", message: "Die Anfrage konnte nicht verarbeitet werden." });
    expect(mocks.enforceCreateMutationSecurity).not.toHaveBeenCalled();
  });
});
