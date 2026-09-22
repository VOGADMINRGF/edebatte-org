import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSet: vi.fn(),
  findVote: vi.fn(),
  aggregateVotes: vi.fn(),
}));

vi.mock("@core/db/triMongo", () => ({
  coreCol: async () => ({ findOne: (...args: unknown[]) => mocks.findSet(...args) }),
}));

vi.mock("@/models/votes/Vote", () => ({
  VoteModel: async () => ({
    findOne: (...args: unknown[]) => mocks.findVote(...args),
    aggregate: (...args: unknown[]) => ({ toArray: () => mocks.aggregateVotes(...args) }),
  }),
}));

import { getVogPublicBallotReadModel } from "@/features/vog/publicBallotReadModel";

const translations = {
  de: { title: "Deutsche Frage", context: "Deutscher Kontext", options: { yes: "Ja", no: "Nein", open: "Offen" } },
  en: { title: "English question", context: "English context", options: { yes: "Yes", no: "No", open: "Open" } },
  fr: { title: "Question française", context: "Contexte français", options: { yes: "Oui", no: "Non", open: "Ouvert" } },
  es: { title: "Pregunta española", context: "Contexto español", options: { yes: "Sí", no: "No", open: "Abierto" } },
  tr: { title: "Türkçe soru", context: "Türkçe bağlam", options: { yes: "Evet", no: "Hayır", open: "Açık" } },
  ar: { title: "السؤال العربي", context: "السياق العربي", options: { yes: "نعم", no: "لا", open: "مفتوح" } },
};

const labels = {
  de: "Quelle",
  en: "Source",
  fr: "Source",
  es: "Fuente",
  tr: "Kaynak",
  ar: "المصدر",
};

function releasedSet(overrides: Record<string, unknown> = {}) {
  return {
    code: "VOGSET01",
    status: "active",
    questions: [
      {
        id: "question-1",
        options: ["yes", "no", "open"],
        publicAttribution: "hidden",
        allowAnonymousVoting: true,
        vogPublicBallot: {
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
          startsAt: new Date("2026-08-01T00:00:00.000Z"),
          closesAt: new Date("2026-09-01T00:00:00.000Z"),
          translations,
          sources: [{ id: "source-1", labels, href: "https://example.org/source" }],
          counterPositions: [
            { id: "counter-1", labels, href: "https://example.org/counter" },
          ],
        },
      },
    ],
    ...overrides,
  };
}

describe("VOG public ballot readmodel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findSet.mockResolvedValue(releasedSet());
    mocks.findVote.mockResolvedValue(null);
    mocks.aggregateVotes.mockResolvedValue([]);
  });

  it("does not expose an ordinary anonymous QR question as a public VOG ballot", async () => {
    const set = releasedSet();
    delete (set.questions[0] as Record<string, unknown>).vogPublicBallot;
    mocks.findSet.mockResolvedValue(set);

    await expect(
      getVogPublicBallotReadModel({ code: "VOGSET01", questionId: "question-1" }),
    ).resolves.toBeNull();
    expect(mocks.findVote).not.toHaveBeenCalled();
  });

  it.each([
    ["de", "Deutsche Frage", "Ja", "ltr"],
    ["en", "English question", "Yes", "ltr"],
    ["fr", "Question française", "Oui", "ltr"],
    ["es", "Pregunta española", "Sí", "ltr"],
    ["tr", "Türkçe soru", "Evet", "ltr"],
    ["ar", "السؤال العربي", "نعم", "rtl"],
  ])("renders %s through stable option IDs", async (locale, title, yesLabel, direction) => {
    const ballot = await getVogPublicBallotReadModel({
      code: "VOGSET01",
      questionId: "question-1",
      readingLocale: locale,
      uiLocale: locale,
      outputLocale: locale,
      now: new Date("2026-08-02T00:00:00.000Z"),
    });

    expect(ballot).toMatchObject({
      originalLocale: "de",
      readingLocale: locale,
      uiLocale: locale,
      outputLocale: locale,
      direction,
      title,
      options: [
        { optionId: "yes", label: yesLabel },
        { optionId: "no" },
        { optionId: "open" },
      ],
      accessMode: "public_guest",
      legitimacyClass: "open_public_consultation",
    });
  });

  it("preserves the own selection across language changes", async () => {
    mocks.findVote.mockResolvedValue({ choice: "yes" });
    const selections = await Promise.all(
      ["de", "en", "fr", "es", "tr", "ar"].map((readingLocale) =>
        getVogPublicBallotReadModel({
          code: "VOGSET01",
          questionId: "question-1",
          readingLocale,
          guestTokenHash: "a".repeat(64),
          now: new Date("2026-08-02T00:00:00.000Z"),
        }),
      ),
    );
    expect(selections.map((ballot) => ballot?.ownSelection)).toEqual([
      "yes",
      "yes",
      "yes",
      "yes",
      "yes",
      "yes",
    ]);
    expect(selections.map((ballot) => ballot?.ownSelectionLabel)).toEqual([
      "Ja",
      "Yes",
      "Oui",
      "Sí",
      "Evet",
      "نعم",
    ]);
  });

  it("aggregates once by stable option ID and renders result labels in outputLocale", async () => {
    mocks.findVote.mockResolvedValue({ choice: "yes" });
    mocks.aggregateVotes.mockResolvedValue([
      { _id: { participationClass: "open_guest", choice: "yes", source: "vote4gov" }, count: 3 },
      { _id: { participationClass: "open_guest", choice: "no", source: "direct" }, count: 1 },
      { _id: { participationClass: "verified_vog_member", choice: "no", source: "voiceopengov" }, count: 2 },
    ]);

    const ballot = await getVogPublicBallotReadModel({
      code: "VOGSET01",
      questionId: "question-1",
      readingLocale: "fr",
      uiLocale: "tr",
      outputLocale: "es",
      guestTokenHash: "a".repeat(64),
      now: new Date("2026-08-02T00:00:00.000Z"),
    });

    expect(ballot).toMatchObject({
      readingLocale: "fr",
      uiLocale: "tr",
      outputLocale: "es",
      ownSelection: "yes",
      ownSelectionLabel: "Oui",
      results: {
        totalVotes: 6,
        openGuestVotes: 4,
        verifiedMemberVotes: 2,
        optionCounts: [
          { optionId: "yes", label: "Sí", count: 3 },
          { optionId: "no", label: "No", count: 3 },
          { optionId: "open", label: "Abierto", count: 0 },
        ],
      },
    });
    const aggregationPipeline = mocks.aggregateVotes.mock.calls[0][0];
    expect(JSON.stringify(aggregationPipeline)).not.toContain("locale");
  });

  it("returns an honest original-language fallback when a supported translation is missing", async () => {
    const set = releasedSet();
    const release = set.questions[0].vogPublicBallot;
    release.translations = Object.fromEntries(
      Object.entries(release.translations).filter(([locale]) => locale !== "fr"),
    ) as typeof release.translations;
    release.sources[0].labels = Object.fromEntries(
      Object.entries(release.sources[0].labels).filter(([locale]) => locale !== "fr"),
    ) as typeof release.sources[0]["labels"];
    release.counterPositions[0].labels = release.sources[0].labels;
    mocks.findSet.mockResolvedValue(set);

    const ballot = await getVogPublicBallotReadModel({
      code: "VOGSET01",
      questionId: "question-1",
      readingLocale: "fr",
      uiLocale: "fr",
    });
    expect(ballot).toMatchObject({
      originalLocale: "de",
      readingLocale: "de",
      uiLocale: "fr",
      requestedReadingLocale: "fr",
      readingTranslationStatus: "missing_fallback",
      title: "Deutsche Frage",
    });
  });

  it("shows scheduled and closed states without opening voting", async () => {
    const scheduled = await getVogPublicBallotReadModel({
      code: "VOGSET01",
      questionId: "question-1",
      now: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(scheduled?.lifecycle).toBe("scheduled");

    mocks.findSet.mockResolvedValue(releasedSet({ status: "closed" }));
    const closed = await getVogPublicBallotReadModel({
      code: "VOGSET01",
      questionId: "question-1",
      now: new Date("2026-08-02T00:00:00.000Z"),
    });
    expect(closed?.lifecycle).toBe("closed");
  });
});
