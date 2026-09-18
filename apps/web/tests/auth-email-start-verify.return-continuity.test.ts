import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  user: null as Record<string, any> | null,
  createEmailVerificationToken: vi.fn(),
  recordEmailVerificationDelivery: vi.fn(),
  logIdentityEvent: vi.fn(),
  sendMail: vi.fn(),
  buildVerificationMail: vi.fn(),
  beginPublicAuthMailControl: vi.fn(),
  finishPublicAuthMailControl: vi.fn(),
}));

vi.mock("@core/db/triMongo", async () => {
  const { ObjectId } = await import("mongodb");
  return {
    ObjectId,
    getCol: vi.fn(async () => ({
      findOne: vi.fn(async () => mocks.user),
    })),
  };
});

vi.mock("@core/auth/emailVerificationService", () => ({
  createEmailVerificationToken: (...args: unknown[]) =>
    mocks.createEmailVerificationToken(...args),
  recordEmailVerificationDelivery: (...args: unknown[]) =>
    mocks.recordEmailVerificationDelivery(...args),
}));

vi.mock("@core/telemetry/identityEvents", () => ({
  logIdentityEvent: (...args: unknown[]) => mocks.logIdentityEvent(...args),
}));

vi.mock("@/utils/mailer", () => ({
  sendMail: (...args: unknown[]) => mocks.sendMail(...args),
}));

vi.mock("@/utils/publicOrigin", () => ({
  publicOrigin: () => "https://edebatte.org",
}));

vi.mock("@/utils/emailTemplates", () => ({
  buildVerificationMail: (...args: unknown[]) => mocks.buildVerificationMail(...args),
}));

vi.mock("@/utils/mailRenderer", () => ({
  mailLocaleFromUser: () => "de",
}));

vi.mock("@/utils/publicAuthMailControl", () => ({
  beginPublicAuthMailControl: (...args: unknown[]) =>
    mocks.beginPublicAuthMailControl(...args),
  finishPublicAuthMailControl: (...args: unknown[]) =>
    mocks.finishPublicAuthMailControl(...args),
}));

import { POST } from "@/app/api/auth/email/start-verify/route";

function request(next?: string) {
  return new NextRequest("http://localhost/api/auth/email/start-verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "citizen@example.org",
      ...(next === undefined ? {} : { next }),
    }),
  });
}

describe("email start-verify return continuity", () => {
  beforeEach(async () => {
    const { ObjectId } = await import("mongodb");
    vi.clearAllMocks();
    mocks.user = {
      _id: new ObjectId("66b0bca9f1b1444b8f635201"),
      email: "citizen@example.org",
      name: "Citizen",
      profile: {},
      settings: {},
    };
    mocks.beginPublicAuthMailControl.mockResolvedValue({ allowed: true });
    mocks.finishPublicAuthMailControl.mockResolvedValue(undefined);
    mocks.createEmailVerificationToken.mockResolvedValue({
      rawToken: "verify-token",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    mocks.logIdentityEvent.mockResolvedValue(undefined);
    mocks.buildVerificationMail.mockReturnValue({
      subject: "Verify",
      html: "<p>Verify</p>",
      text: "Verify",
    });
    mocks.sendMail.mockResolvedValue({ ok: true, status: "delivered" });
    mocks.recordEmailVerificationDelivery.mockResolvedValue(undefined);
  });

  it("preserves a canonical safe continuation target on resend", async () => {
    const response = await POST(request("/create?nextAction=guest-adoption-resume"));

    expect(response.status).toBe(200);
    expect(mocks.createEmailVerificationToken).toHaveBeenCalledWith(
      expect.anything(),
      "citizen@example.org",
      "/create?nextAction=guest-adoption-resume",
    );
  });

  it("clears continuation intent when resend has no target", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.createEmailVerificationToken).toHaveBeenCalledWith(
      expect.anything(),
      "citizen@example.org",
      null,
    );
  });

  it("fails closed instead of persisting an unsafe resend target", async () => {
    const response = await POST(request("//evil.example/steal"));

    expect(response.status).toBe(200);
    expect(mocks.createEmailVerificationToken).toHaveBeenCalledWith(
      expect.anything(),
      "citizen@example.org",
      null,
    );
  });
});
