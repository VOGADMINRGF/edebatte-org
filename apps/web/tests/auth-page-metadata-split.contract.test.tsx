// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigationState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  router: { replace: vi.fn() },
}));

const loginShellState = vi.hoisted(() => ({
  props: null as Record<string, unknown> | null,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigationState.searchParams,
  useRouter: () => navigationState.router,
}));

vi.mock("@/components/auth/LoginPageShell", () => ({
  LoginPageShell: (props: Record<string, unknown>) => {
    loginShellState.props = props;
    return <div data-testid="login-shell" />;
  },
}));

import LoginPageClient from "@/app/login/LoginPageClient";
import ResetPageClient from "@/app/reset/ResetPageClient";
import VerifyPageClient from "@/app/verify/VerifyPageClient";

describe("auth page metadata split contract", () => {
  beforeEach(() => {
    navigationState.searchParams = new URLSearchParams();
    navigationState.replace.mockReset();
    navigationState.router.replace = navigationState.replace;
    loginShellState.props = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps login query parameter handling and register redirect wiring intact", () => {
    navigationState.searchParams = new URLSearchParams(
      "next=%2Fcreate%3Fintent%3Dissue_signal&step=verify&method=email",
    );

    render(<LoginPageClient />);

    expect(loginShellState.props).toMatchObject({
      redirectTo: "/create?intent=issue_signal",
      registerHref: "/register?next=%2Fcreate%3Fintent%3Dissue_signal",
      initialStep: "twofactor",
      initialMethod: "email",
      forceTwoFactor: true,
    });
    expect(
      screen.getByRole("link", { name: "Jetzt registrieren" }).getAttribute("href"),
    ).toBe("/register?next=%2Fcreate%3Fintent%3Dissue_signal");
  });

  it("keeps reset token and invite values in the password reset submit payload", async () => {
    window.history.replaceState({}, "", "/reset?token=reset-token&invite=invite-42");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ResetPageClient />);

    fireEvent.change(screen.getByPlaceholderText("Neues Passwort"), {
      target: { value: "geheimes-passwort" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Setzen" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/reset",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          token: "reset-token",
          password: "geheimes-passwort",
          invite: "invite-42",
        }),
      }),
    );
  });

  it("keeps automatic verification, decoded redirect, and resend behavior intact", async () => {
    navigationState.searchParams = new URLSearchParams(
      "email=person%40example.org&token=verify-123&next=%2Faccount%3Fwelcome%3D1",
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<VerifyPageClient />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/auth/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "person@example.org", token: "verify-123" }),
      }),
    );
    expect(navigationState.replace).toHaveBeenCalledWith("/account?welcome=1");

    fireEvent.click(screen.getByRole("button", { name: "Code erneut senden" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/verify/resend",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "person@example.org" }),
      }),
    );
    expect(
      screen.getByText(
        "Wenn die Adresse bekannt ist, wurde ein neuer Verifizierungslink gesendet.",
      ),
    ).toBeTruthy();
  });
});
