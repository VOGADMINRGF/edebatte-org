import { describe, expect, it } from "vitest";
import {
  buildVogPublicBallotHref,
  getVogPublicBallotLocaleDirection,
  normalizeVogOriginMetadata,
  resolveVogPublicBallotLifecycle,
  resolveVogPublicBallotLocales,
  validateVogPublicBallotQuestion,
  VogPublicBallotReleaseSchema,
  VOG_PUBLIC_BALLOT_INITIAL_UI_LOCALES,
} from "@features/vog/publicBallotContract";

const OPTION_IDS = ["yes", "no", "open"] as const;

const TRANSLATIONS = {
  de: {
    title: "Soll diese Option priorisiert werden?",
    context: "Kurzer belegter Kontext zur öffentlichen VOG-Frage.",
    options: { yes: "Ja", no: "Nein", open: "Noch offen" },
  },
  en: {
    title: "Should this option be prioritised?",
    context: "Brief evidenced context for the public VOG question.",
    options: { yes: "Yes", no: "No", open: "Still open" },
  },
  fr: {
    title: "Cette option doit-elle être prioritaire ?",
    context: "Bref contexte documenté pour la question VOG publique.",
    options: { yes: "Oui", no: "Non", open: "Encore ouvert" },
  },
  es: {
    title: "¿Debe priorizarse esta opción?",
    context: "Breve contexto documentado para la pregunta VOG pública.",
    options: { yes: "Sí", no: "No", open: "Aún abierto" },
  },
  tr: {
    title: "Bu seçeneğe öncelik verilmeli mi?",
    context: "Herkese açık VOG sorusu için kısa ve belgeli bağlam.",
    options: { yes: "Evet", no: "Hayır", open: "Henüz açık" },
  },
  ar: {
    title: "هل ينبغي إعطاء الأولوية لهذا الخيار؟",
    context: "سياق موجز وموثق لسؤال VOG العام.",
    options: { yes: "نعم", no: "لا", open: "ما زال مفتوحًا" },
  },
} as const;

const LABELS = {
  de: "Primärquelle",
  en: "Primary source",
  fr: "Source primaire",
  es: "Fuente primaria",
  tr: "Birincil kaynak",
  ar: "المصدر الأساسي",
};

function release(overrides: Record<string, unknown> = {}) {
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
    translations: TRANSLATIONS,
    sources: [
      {
        id: "source-1",
        labels: LABELS,
        href: "https://example.org/source",
      },
    ],
    counterPositions: [
      {
        id: "counter-1",
        labels: {
          de: "Gegenposition",
          en: "Counterposition",
          fr: "Contre-position",
          es: "Contraposición",
          tr: "Karşı görüş",
          ar: "الموقف المقابل",
        },
        href: "https://example.org/counter",
      },
    ],
    ...overrides,
  };
}

function question(overrides: Record<string, unknown> = {}) {
  return {
    id: "question-1",
    title: "Legacy title",
    options: [...OPTION_IDS],
    publicAttribution: "hidden",
    allowAnonymousVoting: true,
    vogPublicBallot: release(),
    ...overrides,
  };
}

function withoutLocale<T extends Record<string, unknown>>(map: T, locale: keyof T) {
  return Object.fromEntries(Object.entries(map).filter(([key]) => key !== locale));
}

describe("VOG public ballot contract", () => {
  it("requires a separate explicit release and stable language-independent option IDs", () => {
    expect(validateVogPublicBallotQuestion(question())).toMatchObject({
      id: "question-1",
      canonicalOptions: [...OPTION_IDS],
      release: { originId: "vog-question-01" },
    });
    expect(
      validateVogPublicBallotQuestion(question({ options: ["Yes please", "no"] })),
    ).toBeNull();
    expect(
      validateVogPublicBallotQuestion(question({ options: ["yes", "yes"] })),
    ).toBeNull();
    expect(
      validateVogPublicBallotQuestion(question({ id: "sprachliche frage" })),
    ).toBeNull();
    expect(
      validateVogPublicBallotQuestion(question({ vogPublicBallot: undefined })),
    ).toBeNull();
    expect(
      validateVogPublicBallotQuestion(question({ publicAttribution: "public" })),
    ).toBeNull();
    expect(
      validateVogPublicBallotQuestion(question({ allowAnonymousVoting: false })),
    ).toBeNull();
  });

  it("validates an open locale map for DE, EN, FR, ES, TR and AR", () => {
    const parsed = VogPublicBallotReleaseSchema.parse(release());
    expect(Object.keys(parsed.translations)).toEqual([
      "de",
      "en",
      "fr",
      "es",
      "tr",
      "ar",
    ]);
    expect(VOG_PUBLIC_BALLOT_INITIAL_UI_LOCALES).toEqual([
      "de",
      "en",
      "fr",
      "es",
      "tr",
      "ar",
    ]);
    for (const translation of Object.values(parsed.translations)) {
      expect(Object.keys(translation.options)).toEqual([...OPTION_IDS]);
    }
    expect(getVogPublicBallotLocaleDirection("ar")).toBe("rtl");
    expect(getVogPublicBallotLocaleDirection("fr")).toBe("ltr");
  });

  it("accepts additional canonical BCP-47 translations without a schema change", () => {
    const translations = {
      ...TRANSLATIONS,
      "pt-BR": {
        title: "Esta opção deve ser priorizada?",
        context: "Contexto documentado para a pergunta VOG pública.",
        options: { yes: "Sim", no: "Não", open: "Ainda em aberto" },
      },
    };
    const labels = { ...LABELS, "pt-BR": "Fonte primária" };
    const parsed = VogPublicBallotReleaseSchema.parse(
      release({
        translations,
        sources: [{ id: "source-1", labels, href: "https://example.org/source" }],
        counterPositions: [
          {
            id: "counter-1",
            labels: { ...labels, "pt-BR": "Contraposição" },
            href: "https://example.org/counter",
          },
        ],
      }),
    );
    expect(
      resolveVogPublicBallotLocales({ release: parsed, readingLocale: "pt-br" }),
    ).toMatchObject({
      originalLocale: "de",
      readingLocale: "pt-BR",
      outputLocale: "pt-BR",
      readingTranslationStatus: "translated",
    });
  });

  it("rejects mismatched option IDs, option counts, invalid locale keys and insecure evidence", () => {
    expect(
      VogPublicBallotReleaseSchema.safeParse(
        release({
          translations: {
            ...TRANSLATIONS,
            en: {
              ...TRANSLATIONS.en,
              options: { yes: "Yes", no: "No" },
            },
          },
        }),
      ).success,
    ).toBe(false);
    expect(
      VogPublicBallotReleaseSchema.safeParse(
        release({ translations: { ...TRANSLATIONS, "not_a_locale": TRANSLATIONS.en } }),
      ).success,
    ).toBe(false);
    expect(
      VogPublicBallotReleaseSchema.safeParse(
        release({
          translations: {
            ...TRANSLATIONS,
            de: { ...TRANSLATIONS.de, publicRelease: true },
          },
        }),
      ).success,
    ).toBe(false);
    expect(
      VogPublicBallotReleaseSchema.safeParse(
        release({
          sources: [{ id: "source-1", labels: LABELS, href: "http://example.org" }],
        }),
      ).success,
    ).toBe(false);
    expect(VogPublicBallotReleaseSchema.safeParse(release({ counterPositions: [] })).success).toBe(
      false,
    );
  });

  it("falls back visibly for a missing translation and fail-closed for invalid or unknown locales", () => {
    const translations = withoutLocale(TRANSLATIONS, "fr");
    const labels = withoutLocale(LABELS, "fr");
    const parsed = VogPublicBallotReleaseSchema.parse(
      release({
        translations,
        sources: [{ id: "source-1", labels, href: "https://example.org/source" }],
        counterPositions: [
          {
            id: "counter-1",
            labels,
            href: "https://example.org/counter",
          },
        ],
      }),
    );
    expect(resolveVogPublicBallotLocales({ release: parsed, readingLocale: "fr" })).toMatchObject({
      readingLocale: "de",
      uiLocale: "fr",
      requestedReadingLocale: "fr",
      readingTranslationStatus: "missing_fallback",
    });
    expect(
      resolveVogPublicBallotLocales({ release: parsed, readingLocale: "not_a_locale" }),
    ).toMatchObject({ readingLocale: "de", readingTranslationStatus: "invalid_fallback" });
    expect(resolveVogPublicBallotLocales({ release: parsed, readingLocale: "zz" })).toMatchObject({
      readingLocale: "de",
      requestedReadingLocale: "zz",
      readingTranslationStatus: "invalid_fallback",
    });
  });

  it("keeps original, reading, UI and output locales separate metadata only", () => {
    const parsed = VogPublicBallotReleaseSchema.parse(release());
    const locales = resolveVogPublicBallotLocales({
      release: parsed,
      readingLocale: "ar",
      uiLocale: "fr",
      outputLocale: "es",
    });
    const metadata = normalizeVogOriginMetadata(
      {
        source: "vote4gov",
        origin: "voiceopengov",
        origin_id: "attacker-controlled-release-id",
      },
      "vog-question-01",
      locales,
    );

    expect(metadata).toEqual({
      source: "vote4gov",
      origin: "voiceopengov",
      originId: "vog-question-01",
      originalLocale: "de",
      readingLocale: "ar",
      uiLocale: "fr",
      outputLocale: "es",
    });
  });

  it("resolves schedule and closure fail-closed", () => {
    const parsed = VogPublicBallotReleaseSchema.parse(release());
    expect(
      resolveVogPublicBallotLifecycle({
        setStatus: "active",
        release: parsed,
        now: new Date("2026-08-02T00:00:00.000Z"),
      }),
    ).toBe("open");
    expect(
      resolveVogPublicBallotLifecycle({
        setStatus: "draft",
        release: parsed,
        now: new Date("2026-08-02T00:00:00.000Z"),
      }),
    ).toBe("closed");
  });

  it("builds the canonical route with separated locale parameters", () => {
    expect(
      buildVogPublicBallotHref({
        code: "VOGSET01",
        questionId: "question-1",
        source: "vote4gov",
        origin: "voiceopengov",
        originId: "vog-question-01",
        readingLocale: "ar",
        uiLocale: "ar",
        outputLocale: "ar",
      }),
    ).toBe(
      "/vog/fragen/VOGSET01/question-1?source=vote4gov&origin=voiceopengov&origin_id=vog-question-01&reading_locale=ar&ui_locale=ar&output_locale=ar",
    );
  });
});
