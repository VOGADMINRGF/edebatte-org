import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  VOG_BALLOT_CSRF_HEADER,
  VOG_BALLOT_CSRF_VALUE,
  VOG_GUEST_PARTICIPATION_COOKIE,
} from "@/features/vog/publicBallotSecurity";

const mocks = vi.hoisted(() => ({
  consumePersistentRateLimit: vi.fn(),
  loadRecord: vi.fn(),
  getReadModel: vi.fn(),
  createIndex: vi.fn(),
  updateVote: vi.fn(),
}));

vi.mock("@/utils/persistentRateLimit", () => ({
  consumePersistentRateLimit: (input: unknown) =>
    mocks.consumePersistentRateLimit(input),
}));

vi.mock("@/features/vog/publicBallotReadModel", () => ({
  loadVogPublicBallotRecord: (...args: unknown[]) => mocks.loadRecord(...args),
  getVogPublicBallotReadModel: (...args: unknown[]) =>
    mocks.getReadModel(...args),
}));

vi.mock("@/models/votes/Vote", () => ({
  VoteModel: async () => ({
    createIndex: (...args: unknown[]) => mocks.createIndex(...args),
    updateOne: (...args: unknown[]) => mocks.updateVote(...args),
  }),
}));

import { POST } from "@/app/api/vog/public-ballots/[code]/[questionId]/vote/route";

const GUEST_TOKEN = "A".repeat(43);

function record(lifecycle: "open" | "closed" | "scheduled" = "open") {
  return {
    code: "VOGSET01",
    questionId: "question-1",
    canonicalOptions: ["yes", "no", "open"],
    lifecycle,
    release: {
      originId: "vog-question-01",
      originalLocale: "de",
      translations: {
        de: { title: "Deutsche Frage", context: "Kontext", options: { yes: "Ja", no: "Nein", open: "Offen" } },
        en: { title: "English question", context: "Context", options: { yes: "Yes", no: "No", open: "Open" } },
        fr: { title: "Question française", context: "Contexte", options: { yes: "Oui", no: "Non", open: "Ouvert" } },
        es: { title: "Pregunta española", context: "Contexto", options: { yes: "Sí", no: "No", open: "Abierto" } },
        tr: { title: "Türkçe soru", context: "Bağlam", options: { yes: "Evet", no: "Hayır", open: "Açık" } },
        ar: { title: "السؤال العربي", context: "السياق", options: { yes: "نعم", no: "لا", open: "مفتوح" } },
      },
    },
  };
}

function ballot() {
  return {
    code: "VOGSET01",
    questionId: "question-1",
    originId: "vog-question-01",
    originalLocale: "de",
    readingLocale: "de",
    uiLocale: "de",
    outputLocale: "de",
    requestedReadingLocale: "de",
    requestedOutputLocale: "de",
    readingTranslationStatus: "original",
    outputTranslationStatus: "original",
    availableLocales: ["de", "en", "fr", "es", "tr", "ar"],
    direction: "ltr",
    lifecycle: "open",
    title: "Konkrete Frage",
    context: "Kontext",
    options: [],
    sources: [],
    counterPositions: [],
    accessMode: "public_guest",
    attributionMode: "hidden",
    legitimacyClass: "open_public_consultation",
    ownSelection: "yes",
    ownSelectionLabel: "Ja",
    results: {
      totalVotes: 1,
      openGuestVotes: 1,
      verifiedMemberVotes: 0,
      optionCounts: [],
      distributionChannels: [],
      startsAt: null,
      closesAt: null,
      resultStatus: "public_consultation",
    },
  };
}

function request(
  body: Record<string, unknown> = {
    choice: "yes",
    reading_locale: "de",
    ui_locale: "de",
    output_locale: "de",
  },
  options: { cookie?: boolean; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: "http://localhost",
    "sec-fetch-site": "same-origin",
    [VOG_BALLOT_CSRF_HEADER]: VOG_BALLOT_CSRF_VALUE,
    "x-forwarded-for": "203.0.113.42",
    "user-agent": "full-user-agent-must-not-be-stored",
    ...options.headers,
  };
  if (options.cookie) {
    headers.cookie = `${VOG_GUEST_PARTICIPATION_COOKIE}=${GUEST_TOKEN}`;
  }
  return new NextRequest(
    "http://localhost/api/vog/public-ballots/VOGSET01/question-1/vote",
    { method: "POST", headers, body: JSON.stringify(body) },
  );
}

const context = {
  params: Promise.resolve({ code: "VOGSET01", questionId: "question-1" }),
};

describe("VOG public ballot vote route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumePersistentRateLimit.mockResolvedValue({
      ok: true,
      remaining: 10,
      limit: 12,
      resetAt: Date.now() + 60_000,
      retryIn: 0,
    });
    mocks.loadRecord.mockResolvedValue(record());
    mocks.getReadModel.mockResolvedValue(ballot());
    mocks.createIndex.mockResolvedValue("vog_guest_vote_idempotency_unique");
    mocks.updateVote.mockResolvedValue({
      upsertedId: "new-vote-id",
      matchedCount: 0,
    });
  });

  it("creates a first-party guest token and stores only its hash", async () => {
    const response = await POST(
      request({
        choice: "yes",
        source: "vote4gov",
        origin: "voiceopengov",
        origin_id: "spoofed-origin-id",
        reading_locale: "ar",
        ui_locale: "fr",
        output_locale: "es",
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      `${VOG_GUEST_PARTICIPATION_COOKIE}=`,
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(mocks.updateVote).toHaveBeenCalledWith(
      expect.objectContaining({
        participationClass: "open_guest",
        sessionId: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      expect.objectContaining({
        $set: { choice: "yes", updatedAt: expect.any(Date) },
        $setOnInsert: expect.objectContaining({
          participationClass: "open_guest",
          attributionMode: "hidden",
          legitimacyClass: "open_public_consultation",
          originMetadata: {
            source: "vote4gov",
            origin: "voiceopengov",
            originId: "vog-question-01",
            originalLocale: "de",
            readingLocale: "ar",
            uiLocale: "fr",
            outputLocale: "es",
          },
        }),
      }),
      { upsert: true },
    );
    const writeCall = JSON.stringify(mocks.updateVote.mock.calls[0]);
    expect(writeCall).not.toContain("203.0.113.42");
    expect(writeCall).not.toContain("full-user-agent-must-not-be-stored");
    expect(writeCall).not.toContain("spoofed-origin-id");
    expect(writeCall).not.toContain("userHash");
  });

  it("uses the same idempotency filter and updates the choice instead of inserting a second vote", async () => {
    mocks.updateVote.mockResolvedValue({ matchedCount: 1 });

    const first = await POST(
      request({ choice: "yes", reading_locale: "de" }, { cookie: true }),
      context,
    );
    const second = await POST(
      request({ choice: "no", reading_locale: "en" }, { cookie: true }),
      context,
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const firstFilter = mocks.updateVote.mock.calls[0][0];
    const secondFilter = mocks.updateVote.mock.calls[1][0];
    expect(secondFilter).toEqual(firstFilter);
    expect(firstFilter).toMatchObject({
      qrSetId: "VOGSET01",
      qrQuestionId: "question-1",
      participationClass: "open_guest",
      sessionId: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(mocks.updateVote.mock.calls[0][1].$set.choice).toBe("yes");
    expect(mocks.updateVote.mock.calls[1][1].$set.choice).toBe("no");
    expect(second.headers.get("set-cookie")).toBeNull();
  });

  it("rejects cross-site requests before reading ballot data", async () => {
    const response = await POST(
      request(undefined, {
        headers: {
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
      }),
      context,
    );

    expect(response.status).toBe(403);
    expect(mocks.consumePersistentRateLimit).not.toHaveBeenCalled();
    expect(mocks.loadRecord).not.toHaveBeenCalled();
    expect(mocks.updateVote).not.toHaveBeenCalled();
  });

  it("rejects an oversized body even without trusting Content-Length", async () => {
    const response = await POST(
      request({ choice: "x".repeat(5_000), reading_locale: "de" }),
      context,
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: "request_too_large",
    });
    expect(mocks.loadRecord).not.toHaveBeenCalled();
    expect(mocks.updateVote).not.toHaveBeenCalled();
  });

  it("fails closed on rate-limit storage errors and returns a real 429", async () => {
    mocks.consumePersistentRateLimit
      .mockResolvedValueOnce({
        ok: false,
        remaining: 0,
        limit: 12,
        resetAt: Date.now() + 5_000,
        retryIn: 5_000,
      })
      .mockResolvedValueOnce({
        ok: true,
        remaining: 10,
        limit: 30,
        resetAt: Date.now() + 5_000,
        retryIn: 0,
      });
    const limited = await POST(request(), context);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("5");
    expect(mocks.loadRecord).not.toHaveBeenCalled();

    mocks.consumePersistentRateLimit.mockReset();
    mocks.consumePersistentRateLimit.mockRejectedValue(
      new Error("rate limit unavailable"),
    );
    const unavailable = await POST(request(), context);
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toMatchObject({
      error: "rate_limit_unavailable",
    });
  });

  it("does not let metadata open missing or closed ballots", async () => {
    mocks.loadRecord.mockResolvedValueOnce(null);
    const missing = await POST(
      request({
        choice: "yes",
        source: "vote4gov",
        origin: "voiceopengov",
        origin_id: "vog-question-01",
        reading_locale: "de",
      }),
      context,
    );
    expect(missing.status).toBe(404);

    mocks.loadRecord.mockResolvedValueOnce(record("closed"));
    const closed = await POST(request(), context);
    expect(closed.status).toBe(409);
    expect(mocks.updateVote).not.toHaveBeenCalled();
  });
});
