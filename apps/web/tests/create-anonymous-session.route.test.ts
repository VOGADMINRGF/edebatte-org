import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/create/session/route";
import {
  CREATE_ANON_SESSION_COOKIE,
  verifyAnonymousSession,
} from "@/features/create/createAnonymousSession";

const originalJwtSecret = process.env.JWT_SECRET;
const originalCreateSecret = process.env.CREATE_ANON_SESSION_SECRET;

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/create/session", {
    method: "POST",
    headers: {
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "x-edebatte-create-csrf": "create-mutation-v1",
      "content-type": "application/json",
      ...headers,
    },
    body: "{}",
  });
}

describe("create anonymous session route", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-create-security-secret-123456789";
    delete process.env.CREATE_ANON_SESSION_SECRET;
  });

  afterEach(() => {
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    if (originalCreateSecret === undefined) delete process.env.CREATE_ANON_SESSION_SECRET;
    else process.env.CREATE_ANON_SESSION_SECRET = originalCreateSecret;
  });

  it("issues a signed HttpOnly SameSite create session without user-visible interaction", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const cookie = response.cookies.get(CREATE_ANON_SESSION_COOKIE);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    const session = verifyAnonymousSession(cookie?.value);
    expect(session).not.toBeNull();
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      storageContext: {
        namespace: expect.stringMatching(/^g1_[A-Za-z0-9_-]+$/),
        expiresAt: new Date(session!.expiresAtMs).toISOString(),
      },
    });
    expect(body.storageContext.namespace).not.toContain(session!.id);
    expect(JSON.stringify(body)).not.toContain(cookie!.value);
  });

  it("rejects cross-site priming", async () => {
    const response = await POST(
      request({
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      }),
    );
    expect(response.status).toBe(403);
    expect(response.cookies.get(CREATE_ANON_SESSION_COOKIE)).toBeUndefined();
  });
});
