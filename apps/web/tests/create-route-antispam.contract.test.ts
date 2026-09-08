import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const originalJwtSecret = process.env.JWT_SECRET;
const originalCreateSecret = process.env.CREATE_ANON_SESSION_SECRET;
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

import { createAnonymousSession } from "@/features/create/createAnonymousSession";
import { enforceCreateMutationSecurity } from "@/features/create/createRouteSecurity";

function okLimit() {
  return {
    ok: true,
    remaining: 10,
    limit: 12,
    resetAt: Date.now() + 60_000,
    retryIn: 0,
  };
}

function request(input: {
  text?: string;
  headers?: Record<string, string>;
  cookie?: string;
} = {}) {
  return new NextRequest("http://localhost/api/create/intelligent-followup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "x-edebatte-create-csrf": "create-mutation-v1",
      ...(input.cookie ? { cookie: input.cookie } : {}),
      ...(input.headers ?? {}),
    },
    body: JSON.stringify({
      draftId: "draft-1",
      text: input.text ?? "Ein normales öffentliches Anliegen",
    }),
  });
}

describe("create layered anti-spam route security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-create-security-secret-123456789";
    delete process.env.CREATE_ANON_SESSION_SECRET;
    mocks.consumePersistentRateLimit.mockResolvedValue(okLimit());
  });

  afterEach(() => {
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    if (originalCreateSecret === undefined) delete process.env.CREATE_ANON_SESSION_SECRET;
    else process.env.CREATE_ANON_SESSION_SECRET = originalCreateSecret;
  });

  it("blocks a filled invisible honeypot before rate-limit storage or AI work", async () => {
    const response = await enforceCreateMutationSecurity({
      req: request({
        headers: { "x-edebatte-create-meta": "bot-filled" },
      }),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });

    expect(response?.status).toBe(403);
    expect(mocks.consumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it("adds signed anonymous-session and browser-session dimensions without replacing user/IP limits", async () => {
    const created = createAnonymousSession();
    expect(created).not.toBeNull();
    if (!created) return;

    const response = await enforceCreateMutationSecurity({
      req: request({
        cookie: `edebatte_create_session=${created.value}`,
        headers: { "x-edebatte-create-client": "client-session-12345678" },
      }),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });

    expect(response).toBeNull();
    const namespaces = mocks.consumePersistentRateLimit.mock.calls.map(
      ([input]) => (input as { namespace: string }).namespace,
    );
    expect(namespaces).toContain("create:create_intelligent_followup:actor");
    expect(namespaces).toContain("create:create_intelligent_followup:ip");
    expect(namespaces).toContain("create:create_intelligent_followup:anonymous");
    expect(namespaces).not.toContain("create:create_intelligent_followup:anonymous-ip");
    expect(namespaces).toContain("create:create_intelligent_followup:client");
    expect(namespaces).toContain("create:create_intelligent_followup:duplicate:actor");
    expect(namespaces).toContain("create:create_intelligent_followup:duplicate:ip");
  });

  it("keeps anonymous intake at twelve provider-eligible requests per IP despite session rotation", async () => {
    const counters = new Map<string, number>();
    mocks.consumePersistentRateLimit.mockImplementation(
      async (input: { namespace: string; subjectHash: string; limit: number; windowMs: number }) => {
        const key = `${input.namespace}:${input.subjectHash}`;
        const count = (counters.get(key) ?? 0) + 1;
        counters.set(key, count);
        return {
          ok: count <= input.limit,
          remaining: Math.max(0, input.limit - count),
          limit: input.limit,
          resetAt: Date.now() + input.windowMs,
          retryIn: count <= input.limit ? 0 : input.windowMs,
        };
      },
    );

    for (let requestIndex = 0; requestIndex < 13; requestIndex += 1) {
      const created = createAnonymousSession(Date.now() + requestIndex);
      expect(created).not.toBeNull();
      if (!created) return;
      const response = await enforceCreateMutationSecurity({
        req: request({
          text: `Legitimes Anliegen Nummer ${requestIndex}`,
          cookie: `edebatte_create_session=${created.value}`,
          headers: { "x-edebatte-create-client": `rotated-client-${requestIndex}` },
        }),
        scope: "create_intelligent_followup",
        actorKey: `anonymous:${created.session.id}`,
      });

      if (requestIndex < 12) expect(response).toBeNull();
      else expect(response?.status).toBe(429);
    }

    const anonymousIpCalls = mocks.consumePersistentRateLimit.mock.calls
      .map(([input]) => input as { namespace: string; limit: number; windowMs: number })
      .filter((input) => input.namespace === "create:create_intelligent_followup:anonymous-ip");
    expect(anonymousIpCalls).toHaveLength(13);
    expect(anonymousIpCalls.every((input) => input.limit === 12)).toBe(true);
    expect(anonymousIpCalls.every((input) => input.windowMs === 10 * 60 * 1000)).toBe(true);
  });

  it("rate-limits repeated identical inputs before another provider call", async () => {
    mocks.consumePersistentRateLimit.mockImplementation(async (input: { namespace: string }) => {
      if (input.namespace.endsWith(":duplicate:actor")) {
        return {
          ok: false,
          remaining: 0,
          limit: 4,
          resetAt: Date.now() + 20_000,
          retryIn: 20_000,
        };
      }
      return okLimit();
    });

    const response = await enforceCreateMutationSecurity({
      req: request({ text: "Dasselbe Anliegen wird wiederholt eingereicht." }),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });

    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("20");
    await expect(response?.json()).resolves.toMatchObject({
      errorCode: "CREATE_RATE_LIMITED",
    });
  });

  it("uses progressive friction for suspicious repetition instead of political content moderation", async () => {
    mocks.consumePersistentRateLimit.mockImplementation(async (input: { namespace: string }) => {
      if (input.namespace.endsWith(":suspicious-repeat")) {
        return {
          ok: false,
          remaining: 0,
          limit: 1,
          resetAt: Date.now() + 15_000,
          retryIn: 15_000,
        };
      }
      return okLimit();
    });

    const response = await enforceCreateMutationSecurity({
      req: request({
        text: "Bitte prüfen https://e.example/a https://e.example/a https://e.example/a https://e.example/a https://e.example/b",
      }),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });

    expect(response?.status).toBe(429);
    await expect(response?.json()).resolves.toMatchObject({
      errorCode: "CREATE_RATE_LIMITED",
      message: expect.stringContaining("sehr viele Anfragen"),
    });
  });

  it("allows controversial civic language when there are no mechanical abuse signals", async () => {
    const response = await enforceCreateMutationSecurity({
      req: request({
        text: "Ich bin für Mindestlohn in Behindertenwerkstätten, mehr Integration in die Wirtschaft und stärkere Kontrolle der Vorstände.",
      }),
      scope: "create_intelligent_followup",
      actorKey: "user:user-1",
    });

    expect(response).toBeNull();
  });
});
