import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/create/session/route";
import {
  CREATE_ANON_SESSION_COOKIE,
  CREATE_ANON_SESSION_MAX_AGE_SECONDS,
  createAnonymousSession,
  createAnonymousSessionCookieOptions,
  verifyAnonymousSession,
} from "@/features/create/createAnonymousSession";
import { consumePersistentRateLimit } from "@/utils/persistentRateLimit";

vi.mock("@/utils/persistentRateLimit", () => ({
  consumePersistentRateLimit: vi.fn(),
}));

const signingSecret = "test-create-session-secret-with-at-least-32-bytes";
const mockedConsumePersistentRateLimit = vi.mocked(consumePersistentRateLimit);

function request(input: { cookie?: string; headers?: Record<string, string> } = {}) {
  const headers = new Headers({
    origin: "http://localhost",
    "sec-fetch-site": "same-origin",
    "x-edebatte-create-csrf": "create-mutation-v1",
    ...input.headers,
  });
  if (input.cookie !== undefined) {
    headers.set("cookie", `${CREATE_ANON_SESSION_COOKIE}=${input.cookie}`);
  }
  return new NextRequest("http://localhost/api/create/session", {
    method: "POST",
    headers,
  });
}

describe("create anonymous session route", () => {
  beforeEach(() => {
    vi.stubEnv("CREATE_ANON_SESSION_SECRET", signingSecret);
    mockedConsumePersistentRateLimit.mockResolvedValue({
      ok: true,
      remaining: 11,
      limit: 12,
      resetAt: Date.now() + 600_000,
      retryIn: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("issues an opaque signed HttpOnly session with bounded host-only scope", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });

    const cookie = response.cookies.get(CREATE_ANON_SESSION_COOKIE);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/api/create");
    expect(cookie?.maxAge).toBe(CREATE_ANON_SESSION_MAX_AGE_SECONDS);
    expect(cookie?.domain).toBeUndefined();

    const session = verifyAnonymousSession(cookie?.value);
    expect(session).not.toBeNull();
    expect(JSON.stringify(await POST(request({ cookie: cookie!.value })).then((r) => r.json()))).not.toContain(
      session!.id,
    );
  });

  it("reuses a valid session without consuming issuance capacity or rewriting the cookie", async () => {
    const created = createAnonymousSession();
    expect(created).not.toBeNull();

    const response = await POST(request({ cookie: created!.value }));
    expect(response.status).toBe(200);
    expect(response.cookies.get(CREATE_ANON_SESSION_COOKIE)).toBeUndefined();
    expect(mockedConsumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it("fails closed and clears a malformed or tampered cookie", async () => {
    const created = createAnonymousSession();
    expect(created).not.toBeNull();
    const tampered = `${created!.value.slice(0, -1)}x`;

    const response = await POST(request({ cookie: tampered }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      errorCode: "CREATE_SESSION_INVALID",
    });
    expect(response.cookies.get(CREATE_ANON_SESSION_COOKIE)?.maxAge).toBe(0);
    expect(mockedConsumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it("rejects an expired token", () => {
    const issuedAt = Date.now() - (CREATE_ANON_SESSION_MAX_AGE_SECONDS + 1) * 1000;
    const created = createAnonymousSession(issuedAt);
    expect(created).not.toBeNull();
    expect(verifyAnonymousSession(created!.value)).toBeNull();
  });

  it("sets Secure in production without broadening the host-only cookie", () => {
    vi.stubEnv("NODE_ENV", "production");
    const options = createAnonymousSessionCookieOptions();
    expect(options.secure).toBe(true);
    expect(options.path).toBe("/api/create");
    expect("domain" in options).toBe(false);
  });

  it("rejects cross-site priming", async () => {
    const response = await POST(
      request({
        headers: {
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    );
    expect(response.status).toBe(403);
    expect(response.cookies.get(CREATE_ANON_SESSION_COOKIE)).toBeUndefined();
    expect(mockedConsumePersistentRateLimit).not.toHaveBeenCalled();
  });

  it("fails closed when persistent issuance limiting is unavailable", async () => {
    mockedConsumePersistentRateLimit.mockRejectedValueOnce(new Error("db unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(response.cookies.get(CREATE_ANON_SESSION_COOKIE)).toBeUndefined();
  });

  it("returns a bounded retry response without creating a session", async () => {
    mockedConsumePersistentRateLimit.mockResolvedValueOnce({
      ok: false,
      remaining: 0,
      limit: 12,
      resetAt: Date.now() + 30_000,
      retryIn: 30_000,
    });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.cookies.get(CREATE_ANON_SESSION_COOKIE)).toBeUndefined();
  });

  it("does not fall back to an unrelated signing secret", async () => {
    vi.stubEnv("CREATE_ANON_SESSION_SECRET", "");
    vi.stubEnv("JWT_SECRET", signingSecret);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(response.cookies.get(CREATE_ANON_SESSION_COOKIE)).toBeUndefined();
  });

  it("rejects a dedicated signing secret shorter than 32 bytes", async () => {
    vi.stubEnv("CREATE_ANON_SESSION_SECRET", "too-short");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(response.cookies.get(CREATE_ANON_SESSION_COOKIE)).toBeUndefined();
  });
});
