import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  VOG_RELEASE_CSRF_HEADER,
  VOG_RELEASE_CSRF_VALUE,
} from "@features/vog/publicBallotContract";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  findSet: vi.fn(),
  updateSet: vi.fn(),
}));

vi.mock("@/lib/server/auth/admin", () => ({
  requireAdminOrResponse: (...args: unknown[]) => mocks.requireAdmin(...args),
}));

vi.mock("@core/db/triMongo", () => ({
  coreCol: async () => ({
    findOne: (...args: unknown[]) => mocks.findSet(...args),
    updateOne: (...args: unknown[]) => mocks.updateSet(...args),
  }),
}));

import { PUT } from "@/app/api/admin/vog/public-ballots/[code]/[questionId]/route";

function release() {
  return {
    contractVersion: "vog-public-ballot-v1",
    publicRelease: true,
    publicVotingEnabled: true,
    accessMode: "public_guest",
    attributionMode: "hidden",
    legitimacyClass: "open_public_consultation",
    status: "open",
    originId: "vog-question-01",
    originalLocale: "de",
    resultsVisibility: "after_vote",
    startsAt: "2026-08-01T00:00:00.000Z",
    closesAt: "2026-09-01T00:00:00.000Z",
    translations: {
      de: { title: "Deutsche Frage", context: "Deutscher Kontext", options: { yes: "Ja", no: "Nein", open: "Offen" } },
      en: { title: "English question", context: "English context", options: { yes: "Yes", no: "No", open: "Open" } },
      fr: { title: "Question française", context: "Contexte français", options: { yes: "Oui", no: "Non", open: "Ouvert" } },
      es: { title: "Pregunta española", context: "Contexto español", options: { yes: "Sí", no: "No", open: "Abierto" } },
      tr: { title: "Türkçe soru", context: "Türkçe bağlam", options: { yes: "Evet", no: "Hayır", open: "Açık" } },
      ar: { title: "السؤال العربي", context: "السياق العربي", options: { yes: "نعم", no: "لا", open: "مفتوح" } },
    },
    sources: [
      {
        id: "source-1",
        labels: { de: "Quelle", en: "Source", fr: "Source", es: "Fuente", tr: "Kaynak", ar: "المصدر" },
        href: "https://example.org/source",
      },
    ],
    counterPositions: [
      {
        id: "counter-1",
        labels: { de: "Gegenposition", en: "Counterposition", fr: "Contre-position", es: "Contraposición", tr: "Karşı görüş", ar: "الموقف المقابل" },
        href: "https://example.org/counter",
      },
    ],
  };
}

function set(publicAttribution: "hidden" | "public" = "hidden") {
  return {
    code: "VOGSET01",
    status: "active",
    questions: [
      {
        id: "question-1",
        options: ["yes", "no", "open"],
        publicAttribution,
        allowAnonymousVoting: publicAttribution === "hidden",
      },
    ],
  };
}

function request(headers: Record<string, string> = {}) {
  return new NextRequest(
    "http://localhost/api/admin/vog/public-ballots/VOGSET01/question-1",
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
        "sec-fetch-site": "same-origin",
        [VOG_RELEASE_CSRF_HEADER]: VOG_RELEASE_CSRF_VALUE,
        ...headers,
      },
      body: JSON.stringify(release()),
    },
  );
}

const context = {
  params: Promise.resolve({ code: "VOGSET01", questionId: "question-1" }),
};

describe("VOG public ballot release route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ _id: "admin-1" });
    mocks.findSet.mockResolvedValueOnce(set()).mockResolvedValueOnce(null);
    mocks.updateSet.mockResolvedValue({ matchedCount: 1 });
  });

  it("requires same-origin intent before the existing admin and 2FA gate", async () => {
    const response = await PUT(
      request({
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      }),
      context,
    );

    expect(response.status).toBe(403);
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it("uses the existing admin gate and stores an explicit additive release contract", async () => {
    const response = await PUT(request(), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      release: {
        originId: "vog-question-01",
        status: "open",
        publicHref:
          "/vog/fragen/VOGSET01/question-1?source=vote4gov&origin=voiceopengov&origin_id=vog-question-01&reading_locale=de&ui_locale=de&output_locale=de",
      },
    });
    expect(mocks.requireAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.updateSet).toHaveBeenCalledWith(
      { code: "VOGSET01", "questions.id": "question-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          "questions.$.vogPublicBallot": expect.objectContaining({
            publicRelease: true,
            publicVotingEnabled: true,
            attributionMode: "hidden",
            legitimacyClass: "open_public_consultation",
          }),
        }),
      }),
    );
  });

  it("does not silently change existing publicAttribution or allowAnonymousVoting semantics", async () => {
    mocks.findSet.mockReset();
    mocks.findSet.mockResolvedValue(set("public"));

    const response = await PUT(request(), context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "question_not_public_guest_compatible",
    });
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it("fails closed when the existing admin gate denies access", async () => {
    mocks.requireAdmin.mockResolvedValue(
      NextResponse.json({ ok: false, error: "two_factor_required" }, { status: 403 }),
    );

    const response = await PUT(request(), context);
    expect(response.status).toBe(403);
    expect(mocks.findSet).not.toHaveBeenCalled();
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});
