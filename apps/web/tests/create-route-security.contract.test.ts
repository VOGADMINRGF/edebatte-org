import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const originalNextRuntime = process.env.NEXT_RUNTIME;
const originalCreateSecret = process.env.CREATE_ANON_SESSION_SECRET;
const signingSecret = "test-create-session-secret-with-at-least-32-bytes";
const mocks = vi.hoisted(() => ({
  consumePersistentRateLimit: vi.fn(),
  getCreateContributionDraftForResumeRecord: vi.fn(),
}));

vi.mock("@/utils/persistentRateLimit", () => ({
  consumePersistentRateLimit: (input: unknown) =>
    mocks.consumePersistentRateLimit(input),
}));

vi.mock("@/server/serverDrafts", () => ({
  getCreateContributionDraftForResumeRecord: (...args: unknown[]) =>
    mocks.getCreateContributionDraftForResumeRecord(...args),
}));

import {
  enforceCreateMutationSecurity,
  verifyCreateDraftBinding,
} from "@/features/create/createRouteSecurity";
import {
  CREATE_ANON_SESSION_COOKIE,
  createAnonymousSession,
} from "@/features/create/createAnonymousSession";

function request(
  headers: Record<string, string> = {},
  body: BodyInit = JSON.stringify({ draftId: "draft-1" }),
) {
  return new NextRequest("http://localhost/api/create/intelligent-followup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "x-edebatte-create-csrf": "create-mutation-v1",
      ...headers,
    },
    body,
  });
}

function ownDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: "draft-1",
    storage: "drafts",
    status: "draft",
    userId: "user-1",
    locale: "de",
    anlassraumId: null,
    text: "Eigener gespeicherter Beitrag",
    textOriginal: null,
    textPrepared: null,
    analysis: {
      draftWriteRuntime: {
        payloadHash: "payload-hash-1",
      },
    },
    updatedAt: new Date("2026-07-30T12:00:00.000Z"),
    ...overrides,
  };
}

function followupBody(text = "Ein normales öffentliches Anliegen") {
  return JSON.stringify({
    text,
    locale: "de",
    correlationId: "correlation-123",
    draftId: "draft-1",
  });
}

function jsonBodyWithByteLength(size: number) {
  const prefix = '{"analysis":"';
  const suffix = '"}';
  return `${prefix}${"a".repeat(size - prefix.length - suffix.length)}${suffix}`;
}

describe("authenticated create mutation security contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_RUNTIME;
    process.env.CREATE_ANON_SESSION_SECRET = signingSecret;
    mocks.consumePersistentRateLimit.mockResolvedValue({
      ok: true,
      remaining: 10,
      limit: 12,
      resetAt: Date.now() + 60_000,
      retryIn: 0,
    });
    mocks.getCreateContributionDraftForResumeRecord.mockResolvedValue(
      ownDraft(),
    );
  });

  afterEach(() => {
    if (originalNextRuntime === undefined) {
      delete process.env.NEXT_RUNTIME;
    } else {
      process.env.NEXT_RUNTIME = originalNextRuntime;
    }
    if (originalCreateSecret === undefined) {
      delete process.env.CREATE_ANON_SESSION_SECRET;
    } else {
      process.env.CREATE_ANON_SESSION_SECRET = originalCreateSecret;
    }
  });

  it.each([
    [{ origin: "https://attacker.example" }, "foreign origin"],
    [{ "sec-fetch-site": "cross-site" }, "cross-site fetch"],
    [{ "sec-fetch-site": "" }, "missing Sec-Fetch-Site"],
    [{ "x-edebatte-create-csrf": "" }, "missing CSRF intent"],
    [{ "x-edebatte-create-csrf": "wrong" }, "wrong CSRF intent"],
  ])("rejects %s before a create mutation", async (headers) => {
    const response = await enforceCreateMutationSecurity({
      req: request(headers),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({
      ok: false,
      errorCode: "CREATE_REQUEST_REJECTED",
    });
    expect(mocks.consumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it("applies shared persistent authenticated-user and IP limits with hashed subjects", async () => {
    const response = await enforceCreateMutationSecurity({
      req: request({ "x-forwarded-for": "203.0.113.42" }),
      scope: "create_link_analysis",
      actorKey: "user:user-1",
    });

    expect(response).toBeNull();
    expect(mocks.consumePersistentRateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.consumePersistentRateLimit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        namespace: "create:create_link_analysis:actor",
        subjectHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        limit: 12,
        windowMs: 600_000,
      }),
    );
    expect(mocks.consumePersistentRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        namespace: "create:create_link_analysis:ip",
        subjectHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        limit: 30,
        windowMs: 600_000,
      }),
    );
    expect(mocks.consumePersistentRateLimit.mock.calls[0]?.[0].subjectHash).not.toBe(
      mocks.consumePersistentRateLimit.mock.calls[1]?.[0].subjectHash,
    );
  });

  it("returns a controlled rate limit and fails closed if storage is unavailable", async () => {
    mocks.consumePersistentRateLimit
      .mockResolvedValueOnce({
        ok: false,
        remaining: 0,
        limit: 12,
        resetAt: Date.now() + 5_000,
        retryIn: 5_000,
      })
      .mockResolvedValueOnce({
        ok: true,
        remaining: 1,
        limit: 30,
        resetAt: Date.now() + 5_000,
        retryIn: 0,
      });
    const limited = await enforceCreateMutationSecurity({
      req: request(),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("retry-after")).toBe("5");

    mocks.consumePersistentRateLimit.mockReset();
    mocks.consumePersistentRateLimit.mockRejectedValue(
      new Error("limiter unavailable"),
    );
    const unavailable = await enforceCreateMutationSecurity({
      req: request(),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });
    expect(unavailable?.status).toBe(503);
    await expect(unavailable?.json()).resolves.toMatchObject({
      errorCode: "CREATE_RATE_LIMIT_UNAVAILABLE",
    });
  });

  it("fails closed when the persistent loader is unavailable in an unsupported runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    const response = await enforceCreateMutationSecurity({
      req: request(),
      scope: "create_save",
      actorKey: "user:user-1",
    });

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({
      errorCode: "CREATE_RATE_LIMIT_UNAVAILABLE",
    });
    expect(mocks.consumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it.each([
    [{ "content-type": "" }, "missing content type"],
    [{ "content-type": "text/plain" }, "unsupported content type"],
    [{ "content-type": "application/json; charset=iso-8859-1" }, "unsupported charset"],
  ])("rejects %s with one fixed parser-safe response", async (headers) => {
    const response = await enforceCreateMutationSecurity({
      req: request(headers, followupBody()),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });

    expect(response?.status).toBe(400);
    await expect(response?.json()).resolves.toEqual({
      ok: false,
      errorCode: "CREATE_INVALID_REQUEST",
      message: "Die Anfrage konnte nicht verarbeitet werden.",
    });
    expect(mocks.consumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it("accepts application/json with an explicit UTF-8 charset", async () => {
    const response = await enforceCreateMutationSecurity({
      req: request(
        { "content-type": "application/json; charset=UTF-8" },
        followupBody(),
      ),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });

    expect(response).toBeNull();
  });

  it("rejects a filled or oversized honeypot before body and limiter work", async () => {
    for (const trap of ["bot-filled", "x".repeat(161)]) {
      const response = await enforceCreateMutationSecurity({
        req: request({ "x-edebatte-create-meta": trap }, followupBody()),
        scope: "create_intelligent_followup",
        actorKey: "user:user-1",
      });
      expect(response?.status).toBe(403);
      await expect(response?.json()).resolves.toMatchObject({
        errorCode: "CREATE_REQUEST_REJECTED",
      });
    }
    expect(mocks.consumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it("enforces declared and measured 64 KiB body boundaries", async () => {
    const declared = await enforceCreateMutationSecurity({
      req: request({ "content-length": "65537" }, "{}"),
      scope: "create_save",
      actorKey: "user:user-1",
    });
    expect(declared?.status).toBe(413);

    const exact = await enforceCreateMutationSecurity({
      req: request({}, jsonBodyWithByteLength(64 * 1024)),
      scope: "create_save",
      actorKey: "user:user-1",
    });
    expect(exact).toBeNull();

    mocks.consumePersistentRateLimit.mockClear();
    const oversized = await enforceCreateMutationSecurity({
      req: request(
        { "content-length": "1" },
        jsonBodyWithByteLength(64 * 1024 + 1),
      ),
      scope: "create_save",
      actorKey: "user:user-1",
    });
    expect(oversized?.status).toBe(413);
    await expect(oversized?.json()).resolves.toMatchObject({
      errorCode: "CREATE_REQUEST_TOO_LARGE",
    });
    expect(mocks.consumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it.each([
    ["{", "malformed JSON"],
    ["[]", "array JSON"],
    ["null", "null JSON"],
    [JSON.stringify({ draftId: "draft-1", unknownSecurityField: true }), "unknown field"],
  ])("fails closed for %s without exposing parser internals", async (body) => {
    const response = await enforceCreateMutationSecurity({
      req: request({}, body),
      scope: "create_save",
      actorKey: "user:user-1",
    });

    expect(response?.status).toBe(400);
    await expect(response?.json()).resolves.toEqual({
      ok: false,
      errorCode: "CREATE_INVALID_REQUEST",
      message: "Die Anfrage konnte nicht verarbeitet werden.",
    });
    expect(mocks.consumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it("rejects malformed UTF-8 before JSON parsing", async () => {
    const response = await enforceCreateMutationSecurity({
      req: request({}, new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xc3, 0x28, 0x7d])),
      scope: "create_save",
      actorKey: "user:user-1",
    });

    expect(response?.status).toBe(400);
    await expect(response?.json()).resolves.toMatchObject({
      errorCode: "CREATE_INVALID_REQUEST",
    });
  });

  it("uses only verified session and bounded client-signal dimensions", async () => {
    const created = createAnonymousSession();
    expect(created).not.toBeNull();
    const clientSignal = "client_signal_01";
    const response = await enforceCreateMutationSecurity({
      req: request(
        {
          cookie: `${CREATE_ANON_SESSION_COOKIE}=${created!.value}`,
          "x-edebatte-create-client": clientSignal,
          "x-forwarded-for": "203.0.113.42",
        },
        followupBody(),
      ),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });

    expect(response).toBeNull();
    const calls = mocks.consumePersistentRateLimit.mock.calls.map(([value]) =>
      value as { namespace: string; subjectHash: string },
    );
    expect(calls.map((call) => call.namespace)).toEqual(expect.arrayContaining([
      "create:create_intelligent_followup:actor",
      "create:create_intelligent_followup:ip",
      "create:create_intelligent_followup:anonymous",
      "create:create_intelligent_followup:client",
      "create:create_intelligent_followup:duplicate:actor",
      "create:create_intelligent_followup:duplicate:ip",
    ]));
    for (const call of calls) {
      expect(call.subjectHash).toMatch(/^[a-f0-9]{64}$/);
      expect(call.subjectHash).not.toContain(clientSignal);
      expect(call.subjectHash).not.toContain("203.0.113.42");
      expect(call.subjectHash).not.toContain(created!.value);
    }
  });

  it("does not trust malformed client signals or tampered session tokens", async () => {
    const invalidClient = await enforceCreateMutationSecurity({
      req: request(
        { "x-edebatte-create-client": "contains personal@example.org" },
        followupBody(),
      ),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });
    expect(invalidClient?.status).toBe(403);

    mocks.consumePersistentRateLimit.mockClear();
    const created = createAnonymousSession();
    const tampered = `${created!.value.slice(0, -1)}x`;
    const response = await enforceCreateMutationSecurity({
      req: request(
        { cookie: `${CREATE_ANON_SESSION_COOKIE}=${tampered}` },
        followupBody(),
      ),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });
    expect(response).toBeNull();
    expect(mocks.consumePersistentRateLimit.mock.calls.some(
      ([value]) => (value as { namespace: string }).namespace.endsWith(":anonymous"),
    )).toBe(false);
  });

  it("enforces persistent duplicate and suspicious cooldown buckets", async () => {
    mocks.consumePersistentRateLimit.mockImplementation(async (value: { namespace: string }) => {
      if (value.namespace.endsWith(":duplicate:actor")) {
        return { ok: false, remaining: 0, limit: 4, resetAt: Date.now() + 20_000, retryIn: 20_000 };
      }
      return { ok: true, remaining: 10, limit: 12, resetAt: Date.now() + 60_000, retryIn: 0 };
    });
    const duplicate = await enforceCreateMutationSecurity({
      req: request({}, followupBody("Dasselbe Anliegen wird erneut eingereicht.")),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });
    expect(duplicate?.status).toBe(429);
    expect(duplicate?.headers.get("retry-after")).toBe("20");

    mocks.consumePersistentRateLimit.mockImplementation(async (value: { namespace: string }) => ({
      ok: !value.namespace.endsWith(":suspicious-repeat"),
      remaining: 0,
      limit: 1,
      resetAt: Date.now() + 15_000,
      retryIn: value.namespace.endsWith(":suspicious-repeat") ? 15_000 : 0,
    }));
    const cooldown = await enforceCreateMutationSecurity({
      req: request({}, followupBody(
        "Bitte prüfen https://e.example/a https://e.example/a https://e.example/a https://e.example/a https://e.example/b",
      )),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });
    expect(cooldown?.status).toBe(429);
    expect(mocks.consumePersistentRateLimit.mock.calls.some(
      ([value]) => (value as { namespace: string }).namespace.endsWith(":suspicious-repeat"),
    )).toBe(true);
  });

  it("blocks mechanical sentinels without reflecting sensitive input", async () => {
    const sensitive = "[object Object]";
    const response = await enforceCreateMutationSecurity({
      req: request(
        { cookie: "raw-sensitive-cookie", "x-forwarded-for": "203.0.113.99" },
        followupBody(sensitive),
      ),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });
    const publicBody = JSON.stringify(await response?.json());

    expect(response?.status).toBe(403);
    expect(publicBody).not.toContain(sensitive);
    expect(publicBody).not.toContain("raw-sensitive-cookie");
    expect(publicBody).not.toContain("203.0.113.99");
    expect(mocks.consumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it("accepts only an active canonical draft owned by the authenticated user", async () => {
    const binding = await verifyCreateDraftBinding({
      draftId: "draft-1",
      userId: "user-1",
      text: "Eigener gespeicherter Beitrag",
      locale: "de",
    });

    expect(binding).toMatchObject({
      draftId: "draft-1",
      userId: "user-1",
      payloadHash: "payload-hash-1",
      inputHash: expect.any(String),
    });
    expect(mocks.getCreateContributionDraftForResumeRecord).toHaveBeenCalledWith(
      "draft-1",
      "user-1",
    );
  });

  it.each([
    [null, "invented or deleted"],
    [ownDraft({ userId: "user-2" }), "foreign"],
    [ownDraft({ status: "finalized" }), "finalized"],
    [ownDraft({ storage: "contribution_drafts_legacy" }), "legacy"],
    [ownDraft({ text: "Different stored input" }), "payload input mismatch"],
    [ownDraft({ analysis: {} }), "missing stored payload hash"],
  ])("rejects a %s draft without returning draft details", async (draft) => {
    mocks.getCreateContributionDraftForResumeRecord.mockResolvedValue(draft);

    await expect(
      verifyCreateDraftBinding({
        draftId: "draft-1",
        userId: "user-1",
        text: "Eigener gespeicherter Beitrag",
        locale: "de",
      }),
    ).resolves.toBeNull();
  });
});
