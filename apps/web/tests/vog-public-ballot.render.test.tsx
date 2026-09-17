import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VogPublicBallotClient } from "@/app/vog/fragen/[code]/[questionId]/VogPublicBallotClient";
import type { VogPublicBallotReadModel } from "@/features/vog/publicBallotReadModel";

function ballot(overrides: Partial<VogPublicBallotReadModel> = {}): VogPublicBallotReadModel {
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
    title: "Soll diese Option priorisiert werden?",
    context: "Kurzer belegter Kontext zur konkreten VOG-Frage.",
    options: [
      { optionId: "yes", label: "Ja" },
      { optionId: "no", label: "Nein" },
      { optionId: "open", label: "Noch offen" },
    ],
    sources: [{ id: "source-1", label: "Primärquelle", href: "https://example.org/source" }],
    counterPositions: [
      { id: "counter-1", label: "Belegte Gegenposition", href: "https://example.org/counter" },
    ],
    accessMode: "public_guest",
    attributionMode: "hidden",
    legitimacyClass: "open_public_consultation",
    ownSelection: null,
    ownSelectionLabel: null,
    results: null,
    ...overrides,
  };
}

const metadata = {
  source: "vote4gov" as const,
  origin: "voiceopengov" as const,
  originId: "vog-question-01",
  originalLocale: "de",
  readingLocale: "de",
  uiLocale: "de" as const,
  outputLocale: "de",
};

const localeLinks = ["de", "en", "fr", "es", "tr", "ar"].map((locale) => ({
  locale,
  href: `/vog/fragen/VOGSET01/question-1?reading_locale=${locale}&ui_locale=${locale}&output_locale=${locale}`,
}));

describe("VOG public ballot render contract", () => {
  it("puts the question, stable options and participation class before any login", () => {
    const html = renderToStaticMarkup(
      <VogPublicBallotClient
        initialBallot={ballot()}
        originMetadata={metadata}
        localeLinks={localeLinks}
      />,
    );

    expect(html).toContain("Soll diese Option priorisiert werden?");
    expect(html).toContain("Offene öffentliche Beteiligung");
    expect(html).toContain('value="yes"');
    expect(html).toContain('value="no"');
    expect(html).toContain('value="open"');
    expect(html).toContain('type="radio"');
    expect(html).toContain("Stimme abgeben");
    expect(html).toContain("Primärquelle");
    expect(html).toContain('href="#vog-evidence"');
    expect(html).not.toContain('href="/login"');
  });

  it("renders all six language links with names, codes and accessible semantics", () => {
    const html = renderToStaticMarkup(
      <VogPublicBallotClient
        initialBallot={ballot()}
        originMetadata={metadata}
        localeLinks={localeLinks}
      />,
    );
    for (const locale of ["de", "en", "fr", "es", "tr", "ar"]) {
      expect(html).toContain(`hrefLang="${locale}"`);
      expect(html).toContain(`lang="${locale}"`);
    }
    for (const label of [
      "Deutsch · DE",
      "English · EN",
      "Français · FR",
      "Español · ES",
      "Türkçe · TR",
      "العربية · AR",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-label="Sprache"');
    expect(html).toContain("flex-wrap");
    expect(html).toContain("min-h-11");
    expect(html).toContain("focus-visible:outline");
    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("min-h-12 w-full");
  });

  it("renders Arabic content and interface with RTL direction", () => {
    const html = renderToStaticMarkup(
      <VogPublicBallotClient
        initialBallot={ballot({
          readingLocale: "ar",
          uiLocale: "ar",
          outputLocale: "ar",
          direction: "rtl",
          title: "هل ينبغي إعطاء الأولوية لهذا الخيار؟",
          context: "سياق موجز وموثق.",
          options: [
            { optionId: "yes", label: "نعم" },
            { optionId: "no", label: "لا" },
            { optionId: "open", label: "مفتوح" },
          ],
        })}
        originMetadata={{ ...metadata, readingLocale: "ar", uiLocale: "ar", outputLocale: "ar" }}
        localeLinks={localeLinks}
      />,
    );
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("مشاركة عامة مفتوحة");
    expect(html).toContain("إرسال التصويت");
  });

  it("announces a missing translation honestly without claiming automatic translation", () => {
    const html = renderToStaticMarkup(
      <VogPublicBallotClient
        initialBallot={ballot({
          readingLocale: "de",
          uiLocale: "fr",
          outputLocale: "de",
          requestedReadingLocale: "fr",
          readingTranslationStatus: "missing_fallback",
          availableLocales: ["de", "en"],
        })}
        originMetadata={{ ...metadata, uiLocale: "fr" }}
        localeLinks={localeLinks.slice(0, 2)}
      />,
    );
    expect(html).toContain('data-testid="vog-translation-fallback"');
    expect(html).toContain('role="status"');
    expect(html).toContain("aucune traduction automatique n’a été générée");
    expect(html).toContain("Soll diese Option priorisiert werden?");
  });

  it("renders one result aggregation and the preserved own selection", () => {
    const html = renderToStaticMarkup(
      <VogPublicBallotClient
        initialBallot={ballot({
          ownSelection: "yes",
          ownSelectionLabel: "Ja",
          results: {
            totalVotes: 14,
            openGuestVotes: 11,
            verifiedMemberVotes: 3,
            optionCounts: [
              { optionId: "yes", label: "Ja", count: 8 },
              { optionId: "no", label: "Nein", count: 4 },
              { optionId: "open", label: "Noch offen", count: 2 },
            ],
            distributionChannels: [{ source: "vote4gov", count: 14 }],
            startsAt: "2026-08-01T00:00:00.000Z",
            closesAt: "2026-09-01T00:00:00.000Z",
            resultStatus: "public_consultation",
          },
        })}
        originMetadata={metadata}
        localeLinks={localeLinks}
      />,
    );
    expect(html).toContain("Beteiligungspass");
    expect(html).toContain("Offene Gaststimmen");
    expect(html).toContain("Verifizierte VOG-Mitgliedsstimmen");
    expect(html).toContain("Ihre Auswahl");
    expect(html).toContain('href="/login"');
  });
});
