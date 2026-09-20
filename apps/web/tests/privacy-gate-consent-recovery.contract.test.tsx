/** @vitest-environment jsdom */

import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrivacyGateProvider, usePrivacyGate } from "@/components/privacy/PrivacyGateProvider";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_LOCALSTORAGE_KEY,
  PRIVACY_NOTICE_VERSION,
  buildDefaultConsent,
  parseConsentCookie,
  serializeConsent,
} from "@/lib/privacy/consent";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/swipes",
}));

function Probe() {
  const privacyGate = usePrivacyGate();
  return <span>{privacyGate.hasRequiredAcknowledgement ? "acknowledged" : "not-acknowledged"}</span>;
}

function currentConsent() {
  return buildDefaultConsent({
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
    requiredNoticeAcknowledged: true,
    timestamp: "2026-09-20T17:45:00.000Z",
    source: "contract-test",
  });
}

describe("privacy gate browser consent recovery", () => {
  beforeEach(() => {
    document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) =>
          key === CONSENT_LOCALSTORAGE_KEY ? serializeConsent(currentConsent()) : null,
        ),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });
  });

  it("rehydrates a missing server-visible cookie from a valid local acknowledgement", async () => {
    render(
      <PrivacyGateProvider initialConsent={null}>
        <Probe />
      </PrivacyGateProvider>,
    );

    await waitFor(() => expect(screen.getByText("acknowledged")).toBeTruthy());
    await waitFor(() => expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=`));

    const raw = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))
      ?.split("=")[1];
    expect(parseConsentCookie(raw)?.privacyNoticeVersion).toBe(PRIVACY_NOTICE_VERSION);
    expect(parseConsentCookie(raw)?.requiredNoticeAcknowledged).toBe(true);
  });

  it("falls back to the valid local copy when the primary cookie is malformed", async () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=%7Bbroken; Path=/`;

    render(
      <PrivacyGateProvider initialConsent={null}>
        <Probe />
      </PrivacyGateProvider>,
    );

    await waitFor(() => expect(screen.getByText("acknowledged")).toBeTruthy());

    const raw = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))
      ?.split("=")[1];
    expect(parseConsentCookie(raw)?.requiredNoticeAcknowledged).toBe(true);
  });
});
