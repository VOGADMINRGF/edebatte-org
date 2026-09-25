import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  CONSENT_COOKIE_NAME,
  PRIVACY_NOTICE_VERSION,
  buildDefaultConsent,
  serializeConsent,
} from "@/lib/privacy/consent";

const mocks = vi.hoisted(() => {
  let cookieValues: Record<string, string> = {};

  return {
    reset() {
      cookieValues = {};
    },
    setCookie(name: string, value: string) {
      cookieValues[name] = value;
    },
    cookies: vi.fn(async () => ({
      get(name: string) {
        const value = cookieValues[name];
        return value ? { value } : undefined;
      },
    })),
    recordSwipeVote: vi.fn(async () => undefined),
    removeSwipeVotesForStatement: vi.fn(async () => undefined),
    readSession: vi.fn(async () => ({ accessTier: "free" })),
    getFeaturesWithOverrides: vi.fn(async () => ({
      effectiveMatrix: {
        free: { canSwipe: true },
      },
    })),
  };
});

vi.mock("next/headers", () => ({
  cookies: () => mocks.cookies(),
}));

vi.mock("@/features/swipes/service", () => ({
  recordSwipeVote: (...args: unknown[]) => mocks.recordSwipeVote(...args),
  removeSwipeVotesForStatement: (...args: unknown[]) => mocks.removeSwipeVotesForStatement(...args),
}));

vi.mock("@/utils/session", () => ({
  readSession: () => mocks.readSession(),
}));

vi.mock("@/config/accessTiers", () => ({
  normalizeAccessTier: () => "free",
}));

vi.mock("@/lib/server/access/featureOverrides", () => ({
  getFeaturesWithOverrides: () => mocks.getFeaturesWithOverrides(),
}));

import { POST } from "@/app/api/swipes/vote/route";

function voteRequest() {
  return new NextRequest("http://localhost/api/swipes/vote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ statementId: "statement-1", decision: "agree" }),
  });
}

function currentAcknowledgement() {
  return serializeConsent(
    buildDefaultConsent({
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      requiredNoticeAcknowledged: true,
      timestamp: "2026-09-20T17:30:00.000Z",
      source: "test",
    }),
  );
}

describe("/api/swipes/vote privacy boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reset();
  });

  it("fails closed before persisting an anonymous vote without current privacy acknowledgement", async () => {
    const res = await POST(voteRequest());

    expect(res.status).toBe(428);
    await expect(res.json()).resolves.toEqual({ error: "PRIVACY_ACK_REQUIRED" });
    expect(mocks.recordSwipeVote).not.toHaveBeenCalled();
  });

  it("rejects an acknowledgement for an outdated notice version", async () => {
    mocks.setCookie(
      CONSENT_COOKIE_NAME,
      serializeConsent(
        buildDefaultConsent({
          privacyNoticeVersion: "outdated-notice",
          requiredNoticeAcknowledged: true,
          timestamp: "2026-09-20T17:30:00.000Z",
          source: "test",
        }),
      ),
    );

    const res = await POST(voteRequest());

    expect(res.status).toBe(428);
    expect(mocks.recordSwipeVote).not.toHaveBeenCalled();
  });

  it("persists an anonymous vote only after the current notice was acknowledged", async () => {
    mocks.setCookie(CONSENT_COOKIE_NAME, currentAcknowledgement());

    const res = await POST(voteRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(mocks.recordSwipeVote).toHaveBeenCalledTimes(1);
    expect(mocks.recordSwipeVote).toHaveBeenCalledWith(
      expect.objectContaining({
        statementId: "statement-1",
        decision: "agree",
        source: "swipes",
      }),
    );
  });

  it("does not let an authenticated session bypass the privacy acknowledgement", async () => {
    mocks.setCookie("u_id", "user-1");

    const res = await POST(voteRequest());

    expect(res.status).toBe(428);
    expect(mocks.recordSwipeVote).not.toHaveBeenCalled();
  });
});
