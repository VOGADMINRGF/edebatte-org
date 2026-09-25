// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLoginFlow } from "@/hooks/useLoginFlow";

function jsonResponse(body: Record<string, unknown>, ok = true) {
  return {
    ok,
    json: vi.fn(async () => body),
  } as unknown as Response;
}

describe("2FA login flow idempotency", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts target navigation immediately after the successful auth response", async () => {
    vi.useFakeTimers();
    const apiLatencyMs = 150;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(
            () =>
              resolve(
                jsonResponse({
                  ok: true,
                  redirectUrl: "/account",
                }),
              ),
            apiLatencyMs,
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const navigate = vi.fn();

    const { result } = renderHook(() => useLoginFlow({ navigate }));
    let submit!: Promise<void>;
    act(() => {
      submit = result.current.submitCredentials("nachbar@example.org", "secret");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(apiLatencyMs - 1);
    });
    expect(navigate).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await submit;
    });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/account");
  });

  it("allows exactly one verify request and stays terminal while redirecting", async () => {
    let resolveRequest!: (response: Response) => void;
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn(() => request);
    vi.stubGlobal("fetch", fetchMock);
    const navigate = vi.fn();

    const { result } = renderHook(() =>
      useLoginFlow({
        initialStep: "twofactor",
        initialMethod: "otp",
        redirectTo: "/admin/marketing",
        navigate,
      }),
    );

    let firstSubmit!: Promise<void>;
    let duplicateSubmit!: Promise<void>;
    act(() => {
      firstSubmit = result.current.submitTwoFactor("123456");
      duplicateSubmit = result.current.submitTwoFactor("123456");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.verificationState).toBe("submitting");
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveRequest(
        jsonResponse({
          ok: true,
          redirectUrl: "/admin/marketing",
        }),
      );
      await Promise.all([firstSubmit, duplicateSubmit]);
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/admin/marketing");
    expect(result.current.verificationState).toBe("redirecting");
    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.reset();
      void result.current.submitTwoFactor("123456");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.verificationState).toBe("redirecting");
    expect(result.current.loading).toBe(true);
  });

  it("releases the synchronous guard after a real verification error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "invalid_code" }, false))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          redirectUrl: "/account",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const navigate = vi.fn();

    const { result } = renderHook(() =>
      useLoginFlow({
        initialStep: "twofactor",
        initialMethod: "email",
        redirectTo: "/account",
        navigate,
      }),
    );

    await act(async () => {
      await result.current.submitTwoFactor("111111");
    });

    expect(result.current.verificationState).toBe("idle");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain("ungültig oder abgelaufen");

    await act(async () => {
      await result.current.submitTwoFactor("222222");
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith("/account");
    expect(result.current.verificationState).toBe("redirecting");
    expect(result.current.loading).toBe(true);
  });
});
