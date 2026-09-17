import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  useLoginFlow: vi.fn(),
}));

vi.mock("@/hooks/useLoginFlow", () => ({
  useLoginFlow: (...args: unknown[]) => mocks.useLoginFlow(...args),
}));

import { LoginPageShell } from "@/components/auth/LoginPageShell";
import { HeaderLoginInline } from "@/components/auth/HeaderLoginInline";

function credentialsFlowState() {
  return {
    step: "credentials",
    method: null,
    availableMethods: [],
    expiresAt: null,
    loading: false,
    requestingEmail: false,
    switchingMethod: false,
    allowEmailFallback: false,
    error: null,
    verificationState: "idle",
    submitCredentials: vi.fn(),
    submitTwoFactor: vi.fn(),
    selectTwoFactorMethod: vi.fn().mockResolvedValue(true),
    requestEmailCode: vi.fn().mockResolvedValue(true),
    reset: vi.fn(),
  };
}

describe("login page shell", () => {
  it("preserves the supplied registration continuation in the nested credentials CTA", () => {
    mocks.useLoginFlow.mockReturnValue(credentialsFlowState());

    const html = renderToStaticMarkup(
      <LoginPageShell registerHref="/register?next=%2Fcreate%3FnextAction%3Dguest-adoption-resume" />,
    );

    expect(html).toContain(
      'href="/register?next=%2Fcreate%3FnextAction%3Dguest-adoption-resume"',
    );
  });

  it("keeps the ordinary registration fallback when no continuation is supplied", () => {
    mocks.useLoginFlow.mockReturnValue(credentialsFlowState());

    const html = renderToStaticMarkup(<LoginPageShell />);

    expect(html).toContain('href="/register"');
  });

  it("shows an explicit choice between authenticator app and email code", () => {
    mocks.useLoginFlow.mockReturnValue({
      step: "twofactor",
      method: "otp",
      availableMethods: ["otp", "email"],
      expiresAt: null,
      loading: false,
      requestingEmail: false,
      switchingMethod: false,
      allowEmailFallback: true,
      error: null,
      verificationState: "idle",
      submitCredentials: vi.fn(),
      submitTwoFactor: vi.fn(),
      selectTwoFactorMethod: vi.fn().mockResolvedValue(true),
      requestEmailCode: vi.fn().mockResolvedValue(true),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<LoginPageShell forceTwoFactor />);

    expect(html).toContain("Sicherheitscode erhalten über");
    expect(html).toContain("Sicherheitscode");
    expect(html).toContain("Authenticator-App");
    expect(html).toContain("Code per E-Mail");
    expect(html).toContain("Bestätigen");
    expect(html).toContain("Zurück");
    expect(html).not.toContain("OTP");
    expect(html).not.toContain("Authenticator token");
  });

  it("shows the same visible method choice in the header login flow", () => {
    mocks.useLoginFlow.mockReturnValue({
      step: "twofactor",
      method: "otp",
      availableMethods: ["otp", "email"],
      expiresAt: null,
      loading: false,
      requestingEmail: false,
      switchingMethod: false,
      allowEmailFallback: true,
      error: null,
      verificationState: "idle",
      submitCredentials: vi.fn(),
      submitTwoFactor: vi.fn(),
      selectTwoFactorMethod: vi.fn().mockResolvedValue(true),
      requestEmailCode: vi.fn().mockResolvedValue(true),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<HeaderLoginInline initialOpen />);

    expect(html).toContain("Sicherheitscode erhalten über");
    expect(html).toContain("Authenticator-App");
    expect(html).toContain("Code per E-Mail");
    expect(html).toContain("Ich habe keine Authenticator-App");
    expect(html).toContain("Bestätigen");
    expect(html).toContain("Zurück");
    expect(html).not.toContain("OTP");
    expect(html).not.toContain("Token");
    expect(html).not.toContain("Provider");
  });

  it("shows challenge expiry only for email codes, not authenticator TOTP", () => {
    const flowState = {
      step: "twofactor",
      method: "otp",
      availableMethods: ["otp", "email"],
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      loading: false,
      requestingEmail: false,
      switchingMethod: false,
      allowEmailFallback: true,
      error: null,
      verificationState: "idle",
      submitCredentials: vi.fn(),
      submitTwoFactor: vi.fn(),
      selectTwoFactorMethod: vi.fn().mockResolvedValue(true),
      requestEmailCode: vi.fn().mockResolvedValue(true),
      reset: vi.fn(),
    };
    mocks.useLoginFlow.mockReturnValue(flowState);

    const authenticatorHtml = renderToStaticMarkup(<LoginPageShell forceTwoFactor />);
    expect(authenticatorHtml).toContain("aktuellen 6-stelligen Code");
    expect(authenticatorHtml).not.toContain("gültig für ca.");

    mocks.useLoginFlow.mockReturnValue({
      ...flowState,
      method: "email",
    });
    const emailHtml = renderToStaticMarkup(<LoginPageShell forceTwoFactor />);
    expect(emailHtml).toContain("gültig für ca.");
  });

  it("keeps every 2FA control disabled after successful verification", () => {
    mocks.useLoginFlow.mockReturnValue({
      step: "twofactor",
      method: "otp",
      availableMethods: ["otp", "email"],
      expiresAt: null,
      loading: true,
      requestingEmail: false,
      switchingMethod: false,
      allowEmailFallback: true,
      error: null,
      verificationState: "redirecting",
      submitCredentials: vi.fn(),
      submitTwoFactor: vi.fn(),
      selectTwoFactorMethod: vi.fn().mockResolvedValue(true),
      requestEmailCode: vi.fn().mockResolvedValue(true),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<LoginPageShell forceTwoFactor />);
    expect(html).toContain("Anmeldung erfolgreich");
    expect(html).toContain("Weiterleitung …");
    expect(html).toContain('aria-busy="true"');
    expect((html.match(/disabled=""/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
