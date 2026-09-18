import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => {
  class MockObjectId {
    value: string;

    constructor(value: string) {
      this.value = value;
    }

    toString() {
      return this.value;
    }

    toHexString() {
      return this.value;
    }
  }

  return {
    MockObjectId,
    existingUser: null as any,
    humanCheck: { ok: true, payload: { formId: "register" } } as any,
  };
});

const mocks = vi.hoisted(() => ({
  assertStoreConfigured: vi.fn(),
  getCol: vi.fn(),
  piiCol: vi.fn(),
  createEmailVerificationToken: vi.fn(),
  hashPassword: vi.fn(),
  sendMail: vi.fn(),
  buildVerificationMail: vi.fn(),
  publicOrigin: vi.fn(),
  ensureBasicPiiProfile: vi.fn(),
  incrementRateLimit: vi.fn(),
  verifyHumanTokenDetailed: vi.fn(),
  ensureFounderWelcomeForUser: vi.fn(),
  logOnboardingEvent: vi.fn(),
  refreshUserPreferenceSnapshot: vi.fn(),
  runContentTranslationProduction: vi.fn(),
  upsertMembershipPaymentProfile: vi.fn(),
  logIdentityEvent: vi.fn(),
}));

vi.mock("@core/db/triMongo", () => ({
  assertStoreConfigured: (...args: unknown[]) => mocks.assertStoreConfigured(...args),
  getCol: (...args: unknown[]) => mocks.getCol(...args),
  ObjectId: state.MockObjectId,
}));

vi.mock("@core/db/db/triMongo", () => ({
  piiCol: (...args: unknown[]) => mocks.piiCol(...args),
}));

vi.mock("@core/auth/emailVerificationService", () => ({
  createEmailVerificationToken: (...args: unknown[]) =>
    mocks.createEmailVerificationToken(...args),
}));

vi.mock("@/utils/password", () => ({
  hashPassword: (...args: unknown[]) => mocks.hashPassword(...args),
}));

vi.mock("@core/telemetry/identityEvents", () => ({
  logIdentityEvent: (...args: unknown[]) => mocks.logIdentityEvent(...args),
}));

vi.mock("@/utils/mailer", () => ({
  sendMail: (...args: unknown[]) => mocks.sendMail(...args),
  mailFailureMetadata: (result: Record<string, unknown>) => ({
    status: result.status,
    category: result.category,
    retryable: result.retryable,
    attemptedCount: result.attemptedCount,
    deliveredCount: result.deliveredCount,
    failedCount: result.failedCount,
  }),
}));

vi.mock("@/utils/emailTemplates", () => ({
  buildVerificationMail: (...args: unknown[]) => mocks.buildVerificationMail(...args),
}));

vi.mock("@/utils/publicOrigin", () => ({
  publicOrigin: (...args: unknown[]) => mocks.publicOrigin(...args),
}));

vi.mock("@core/pii/userProfileService", () => ({
  ensureBasicPiiProfile: (...args: unknown[]) => mocks.ensureBasicPiiProfile(...args),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  incrementRateLimit: (...args: unknown[]) => mocks.incrementRateLimit(...args),
}));

vi.mock("@/lib/security/human-token", () => ({
  verifyHumanTokenDetailed: (...args: unknown[]) => mocks.verifyHumanTokenDetailed(...args),
}));

vi.mock("@/lib/onboarding/founderWelcome", () => ({
  ensureFounderWelcomeForUser: (...args: unknown[]) =>
    mocks.ensureFounderWelcomeForUser(...args),
}));

vi.mock("@/lib/onboarding/events", () => ({
  logOnboardingEvent: (...args: unknown[]) => mocks.logOnboardingEvent(...args),
}));

vi.mock("@/lib/onboarding/preferenceSnapshot", () => ({
  refreshUserPreferenceSnapshot: (...args: unknown[]) =>
    mocks.refreshUserPreferenceSnapshot(...args),
}));

vi.mock("@/features/i18n/contentTranslationProduction", () => ({
  runContentTranslationProduction: (...args: unknown[]) =>
    mocks.runContentTranslationProduction(...args),
}));

vi.mock("@core/db/pii/userPaymentProfiles", () => ({
  upsertMembershipPaymentProfile: (...args: unknown[]) =>
    mocks.upsertMembershipPaymentProfile(...args),
}));

vi.mock("@/app/api/auth/sharedAuth", () => ({
  CREDENTIAL_COLLECTION: "user_credentials",
}));

import { POST } from "@/app/api/auth/register/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "citizen@example.org",
      name: "Max Mustermann",
      firstName: "Max",
      lastName: "Mustermann",
      birthDate: "1990-01-01",
      address: {
        street: "Musterstraße",
        houseNumber: "12a",
        postalCode: "12345",
        city: "Berlin",
        country: "Deutschland",
      },
      bank: {
        accountHolder: "Max Mustermann",
        iban: "DE89370400440532013000",
        consent: true,
      },
      password: "SicheresPasswort!1",
      preferredLocale: "de",
      newsletterOptIn: true,
      humanToken: "human-token",
      formStartedAt: Date.now() - 6000,
      ...body,
    }),
  });
}

describe("/api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.existingUser = null;
    state.humanCheck = { ok: true, payload: { formId: "register" } };

    const usersCol = {
      findOne: vi.fn(async () => state.existingUser),
      insertOne: vi.fn(async () => ({
        insertedId: new state.MockObjectId("65a111111111111111111111"),
      })),
      updateOne: vi.fn(async () => ({ acknowledged: true })),
    };
    const noopCol = {
      findOne: vi.fn(async () => null),
      updateOne: vi.fn(async () => ({ acknowledged: true })),
      insertOne: vi.fn(async () => ({ acknowledged: true })),
    };

    mocks.getCol.mockImplementation(async (collection: string) => {
      if (collection === "users") return usersCol;
      return noopCol;
    });
    mocks.piiCol.mockResolvedValue({
      updateOne: vi.fn(async () => ({ acknowledged: true })),
    });
    mocks.incrementRateLimit.mockResolvedValue(1);
    mocks.verifyHumanTokenDetailed.mockImplementation(async () => state.humanCheck);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.createEmailVerificationToken.mockResolvedValue({
      rawToken: "verify-token",
    });
    mocks.buildVerificationMail.mockReturnValue({
      subject: "Bitte E-Mail bestätigen",
      html: "<p>mail</p>",
      text: "mail",
    });
    mocks.sendMail.mockResolvedValue({
      ok: true,
      status: "delivered",
      transport: "smtp",
      category: null,
      retryable: false,
      attemptedCount: 1,
      deliveredCount: 1,
      failedCount: 0,
      messageId: "registration-message",
    });
    mocks.publicOrigin.mockReturnValue("https://edebatte.org");
    mocks.ensureBasicPiiProfile.mockResolvedValue(undefined);
    mocks.upsertMembershipPaymentProfile.mockResolvedValue(undefined);
    mocks.ensureFounderWelcomeForUser.mockResolvedValue(null);
    mocks.refreshUserPreferenceSnapshot.mockResolvedValue({
      transitions: {
        interestsCompletedNow: false,
        locationCompletedNow: false,
        personalizedReadyNow: false,
      },
    });
    mocks.logIdentityEvent.mockResolvedValue(undefined);
    mocks.logOnboardingEvent.mockResolvedValue(undefined);
    mocks.runContentTranslationProduction.mockResolvedValue({
      content: null,
    });
  });

  it("does not block registration when captcha is correct and required fields are present", async () => {
    const res = await POST(makeRequest({ reg_guardian_reference: "" }));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      emailVerification: { status: "sent" },
    });
    expect(mocks.verifyHumanTokenDetailed).toHaveBeenCalledWith("human-token");
  });

  it("binds a canonical safe continuation target to the verification token", async () => {
    const res = await POST(
      makeRequest({
        next: "/create?nextAction=guest-adoption-resume",
      }),
    );

    expect(res.status).toBe(201);
    expect(mocks.createEmailVerificationToken).toHaveBeenCalledWith(
      expect.any(state.MockObjectId),
      "citizen@example.org",
      "/create?nextAction=guest-adoption-resume",
    );
  });

  it("fails closed instead of persisting an unsafe registration continuation target", async () => {
    const res = await POST(
      makeRequest({
        next: "https://evil.example/steal",
      }),
    );

    expect(res.status).toBe(201);
    expect(mocks.createEmailVerificationToken).toHaveBeenCalledWith(
      expect.any(state.MockObjectId),
      "citizen@example.org",
      null,
    );
  });

  it("does not block registration when the honeypot stays empty", async () => {
    const res = await POST(makeRequest({ reg_guardian_reference: "", hp_register: "" }));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
    });
  });

  it("blocks registration when the honeypot is filled", async () => {
    const res = await POST(makeRequest({ reg_guardian_reference: "bot-filled" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "invalid_input",
    });
  });

  it("reports a persisted account without false success when verification delivery fails", async () => {
    mocks.sendMail.mockResolvedValueOnce({
      ok: false,
      status: "failed",
      transport: "smtp",
      code: "mail_transport_error",
      category: "smtp_timeout",
      retryable: true,
      attemptedCount: 1,
      deliveredCount: 0,
      failedCount: 1,
      messageId: null,
    });

    const response = await POST(makeRequest({ reg_guardian_reference: "" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "mail_delivery_failed",
      partial: true,
      accountCreated: true,
      emailVerification: {
        status: "pending",
        reason: "mail_dispatch_failed",
        delivery: {
          status: "failed",
          category: "smtp_timeout",
          retryable: true,
          attemptedCount: 1,
          deliveredCount: 0,
          failedCount: 1,
        },
      },
    });
  });
});
