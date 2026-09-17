import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  consumeEmailVerificationToken: vi.fn(),
  getCol: vi.fn(),
  logIdentityEvent: vi.fn(),
  applySessionCookies: vi.fn(),
  sendMail: vi.fn(),
  buildAccountWelcomeMail: vi.fn(),
  publicOrigin: vi.fn(),
  mailLocaleFromUser: vi.fn(),
}));

class MockObjectId {
  value: string;

  constructor(value: string) {
    this.value = String(value);
  }

  toString() {
    return this.value;
  }
}

vi.mock("@core/db/triMongo", () => ({
  getCol: (...args: unknown[]) => mocks.getCol(...args),
  ObjectId: MockObjectId,
}));

vi.mock("@core/auth/emailVerificationService", () => ({
  consumeEmailVerificationToken: (...args: unknown[]) =>
    mocks.consumeEmailVerificationToken(...args),
}));

vi.mock("@core/telemetry/identityEvents", () => ({
  logIdentityEvent: (...args: unknown[]) => mocks.logIdentityEvent(...args),
}));

vi.mock("@/app/api/auth/sharedAuth", () => ({
  applySessionCookies: (...args: unknown[]) => mocks.applySessionCookies(...args),
  ensureVerificationDefaults: (value: unknown) =>
    value ?? { level: "email", methods: ["email_link"], lastVerifiedAt: null },
}));

vi.mock("@/utils/mailer", () => ({
  sendMail: (...args: unknown[]) => mocks.sendMail(...args),
}));

vi.mock("@/utils/emailTemplates", () => ({
  buildAccountWelcomeMail: (...args: unknown[]) => mocks.buildAccountWelcomeMail(...args),
}));

vi.mock("@/utils/publicOrigin", () => ({
  publicOrigin: (...args: unknown[]) => mocks.publicOrigin(...args),
}));

vi.mock("@/utils/mailRenderer", () => ({
  mailLocaleFromUser: (...args: unknown[]) => mocks.mailLocaleFromUser(...args),
}));

import { POST } from "@/app/api/auth/email/confirm/route";

function request() {
  return new NextRequest("http://localhost/api/auth/email/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "test-token-test-token" }),
  });
}

describe("email confirmation return continuity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCol.mockResolvedValue({
      findOne: vi.fn(async () => ({
        _id: new MockObjectId("507f1f77bcf86cd799439011"),
        role: "user",
        verification: { level: "email", methods: ["email_link"] },
        email: "citizen@example.org",
        name: "Citizen",
        profile: {},
        settings: {},
      })),
    });
    mocks.applySessionCookies.mockResolvedValue(undefined);
    mocks.logIdentityEvent.mockResolvedValue(undefined);
    mocks.publicOrigin.mockReturnValue("https://edebatte.org");
    mocks.mailLocaleFromUser.mockReturnValue("de");
    mocks.buildAccountWelcomeMail.mockReturnValue({
      subject: "Willkommen",
      html: "<p>Willkommen</p>",
      text: "Willkommen",
    });
    mocks.sendMail.mockResolvedValue({ ok: true });
  });

  it("returns identity with the persisted canonical Create target", async () => {
    mocks.consumeEmailVerificationToken.mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      email: "citizen@example.org",
      verification: { level: "email", methods: ["email_link"] },
      continuationTarget: "/create?nextAction=guest-adoption-resume",
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      next: "/register/identity?next=%2Fcreate%3FnextAction%3Dguest-adoption-resume",
    });
  });

  it("fails closed to identity when the persisted target is unsafe", async () => {
    mocks.consumeEmailVerificationToken.mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      email: "citizen@example.org",
      verification: { level: "email", methods: ["email_link"] },
      continuationTarget: "https://evil.example/escape",
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      next: "/register/identity",
    });
  });

  it("keeps legacy token consumption without continuation on the existing identity path", async () => {
    mocks.consumeEmailVerificationToken.mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      email: "citizen@example.org",
      verification: { level: "email", methods: ["email_link"] },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      next: "/register/identity",
    });
  });
});
