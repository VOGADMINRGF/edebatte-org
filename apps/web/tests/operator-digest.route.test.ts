import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  isBerlinDigestHour: vi.fn(),
  sendDailyOperatorDigest: vi.fn(),
}));

vi.mock("@/features/operator/operatorNotifications", () => ({
  isBerlinDigestHour: (...args: unknown[]) =>
    mocks.isBerlinDigestHour(...args),
  sendDailyOperatorDigest: (...args: unknown[]) =>
    mocks.sendDailyOperatorDigest(...args),
}));

import { GET } from "@/app/api/cron/operator-digest/route";

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;
const VALID_SECRET = "aaaaaaaaaaaaaaaa";

function request(token?: string) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new NextRequest("http://localhost/api/cron/operator-digest", {
    method: "GET",
    headers,
  });
}

async function body(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe("operator digest cron route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = VALID_SECRET;
    mocks.isBerlinDigestHour.mockReset();
    mocks.isBerlinDigestHour.mockReturnValue(false);
    mocks.sendDailyOperatorDigest.mockReset();
  });

  afterEach(() => {
    if (ORIGINAL_CRON_SECRET === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  });

  it("fails closed for missing, short and incorrect CRON_SECRET credentials", async () => {
    delete process.env.CRON_SECRET;
    let response = await GET(request());
    expect(response.status).toBe(401);
    expect(await body(response)).toEqual({ ok: false, error: "unauthorized" });

    process.env.CRON_SECRET = "too-short";
    response = await GET(request("too-short"));
    expect(response.status).toBe(401);
    expect(await body(response)).toEqual({ ok: false, error: "unauthorized" });

    process.env.CRON_SECRET = VALID_SECRET;
    response = await GET(request("bbbbbbbbbbbbbbbb"));
    expect(response.status).toBe(401);
    expect(await body(response)).toEqual({ ok: false, error: "unauthorized" });

    expect(mocks.isBerlinDigestHour).not.toHaveBeenCalled();
    expect(mocks.sendDailyOperatorDigest).not.toHaveBeenCalled();
  });

  it("truthfully skips an authorized call outside the Berlin 18:00 window", async () => {
    mocks.isBerlinDigestHour.mockReturnValue(false);

    const response = await GET(request(VALID_SECRET));

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({
      ok: true,
      skipped: "outside_berlin_18h_window",
    });
    expect(mocks.isBerlinDigestHour).toHaveBeenCalledTimes(1);
    expect(mocks.sendDailyOperatorDigest).not.toHaveBeenCalled();
  });

  it("runs the digest exactly after an authorized in-window call", async () => {
    mocks.isBerlinDigestHour.mockReturnValue(true);
    mocks.sendDailyOperatorDigest.mockResolvedValue({
      ok: true,
      berlinDate: "2026-09-19",
      eventCount: 3,
      category: null,
      recoveryDisposition: "confirmed_sent",
    });

    const response = await GET(request(VALID_SECRET));

    expect(response.status).toBe(200);
    expect(await body(response)).toMatchObject({
      ok: true,
      berlinDate: "2026-09-19",
      eventCount: 3,
      recoveryDisposition: "confirmed_sent",
    });
    expect(mocks.sendDailyOperatorDigest).toHaveBeenCalledTimes(1);
  });

  it("returns 503 and the truthful delivery result when digest mail fails", async () => {
    mocks.isBerlinDigestHour.mockReturnValue(true);
    mocks.sendDailyOperatorDigest.mockResolvedValue({
      ok: false,
      berlinDate: "2026-09-19",
      eventCount: 2,
      category: "smtp_timeout",
      recoveryDisposition: "ambiguous_attempted",
    });

    const response = await GET(request(VALID_SECRET));

    expect(response.status).toBe(503);
    expect(await body(response)).toMatchObject({
      ok: false,
      category: "smtp_timeout",
      recoveryDisposition: "ambiguous_attempted",
    });
    expect(mocks.sendDailyOperatorDigest).toHaveBeenCalledTimes(1);
  });
});
