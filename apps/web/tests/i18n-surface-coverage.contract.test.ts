import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CORE_LOCALES, SUPPORTED_LOCALES } from "@/config/locales";
import { AUTO_TRANSLATE_LOCALES } from "@/lib/i18n/autoTranslate";
import { UI_LANGS } from "@features/i18n/languages";

type I18nSurfaceCoverageAudit = {
  bundleLocales: string[];
  bundleDrift: {
    missingFromBundles: string[];
    unknownBundleFiles: string[];
  };
  activeHeaderUiLocales: string[];
  contentLanguageSelectLocales: string[];
  dormantLocaleSwitcherLocales: string[];
  publicAutoTranslateLocales: string[];
  coverageStatus: "partial" | "bundle_complete";
};

function listBundleLocales(): string[] {
  return readdirSync(resolve(process.cwd(), "src/app/messages"))
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.replace(/\.json$/u, ""))
    .sort();
}

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function buildAudit(): I18nSurfaceCoverageAudit {
  const bundleLocales = listBundleLocales();
  const missingFromBundles = [...SUPPORTED_LOCALES]
    .filter((locale) => !bundleLocales.includes(locale))
    .sort();
  const unknownBundleFiles = bundleLocales
    .filter((locale) => !SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number]))
    .sort();

  return {
    bundleLocales,
    bundleDrift: {
      missingFromBundles,
      unknownBundleFiles,
    },
    activeHeaderUiLocales: [...CORE_LOCALES],
    contentLanguageSelectLocales: UI_LANGS.map((entry) => entry.code),
    dormantLocaleSwitcherLocales: [...SUPPORTED_LOCALES],
    publicAutoTranslateLocales: [...AUTO_TRANSLATE_LOCALES],
    coverageStatus: missingFromBundles.length > 0 ? "partial" : "bundle_complete",
  };
}

describe("i18n surface coverage contract", () => {
  it("keeps message bundle filenames aligned with known locales and preserves the baseline bundles", () => {
    const audit = buildAudit();

    expect(audit.bundleDrift.unknownBundleFiles).toEqual([]);
    expect(audit.bundleLocales).toEqual([
      "ar",
      "cs",
      "de",
      "el",
      "en",
      "es",
      "fi",
      "fr",
      "hi",
      "it",
      "nl",
      "no",
      "pl",
      "pt",
      "ro",
      "ru",
      "sv",
      "tr",
      "uk",
    ]);
    expect(audit.bundleLocales).toContain("de");
    expect(audit.bundleLocales).toContain("en");
    expect(audit.bundleLocales).toContain("ar");
    expect(audit.bundleDrift.missingFromBundles).toEqual([
      "bg",
      "da",
      "et",
      "ga",
      "hr",
      "hu",
      "lt",
      "lv",
      "mt",
      "sk",
      "sl",
      "zh",
    ]);
  });

  it("keeps the current switcher and reader-language drift explicit instead of silently claiming full UI parity", () => {
    const audit = buildAudit();
    const headerSource = readSource("src/app/(components)/SiteHeader.tsx");
    const contentLanguageSource = readSource("src/components/ContentLanguageSelect.tsx");
    const localeSwitcherSource = readSource("src/components/LocaleSwitcher.tsx");
    const autoTranslateSource = readSource("src/lib/i18n/autoTranslate.ts");

    expect(headerSource).toContain("UI_LANGS.filter((lang) => isCoreLocale(lang.code))");
    expect(contentLanguageSource).toContain("UI_LANGS.map((l) => (");
    expect(localeSwitcherSource).toContain("SUPPORTED_LOCALES.map((code: SupportedLocale) => {");
    expect(autoTranslateSource).toContain(
      'const PRIVATE_PREFIXES = [\n  "/admin",\n  "/dashboard",\n  "/account",\n  "/settings",\n  "/auth",\n  "/login",\n  "/register",\n  "/reset",\n  "/verify",\n];',
    );

    expect(audit.activeHeaderUiLocales).toEqual(["de", "en"]);
    expect(audit.contentLanguageSelectLocales).toEqual([
      "de",
      "en",
      "es",
      "it",
      "pl",
      "fr",
      "tr",
      "ru",
      "zh",
      "ar",
      "nl",
      "pt",
      "fi",
      "sv",
      "no",
      "cs",
      "hi",
      "ro",
      "el",
      "uk",
      "bg",
      "da",
      "et",
      "ga",
      "hr",
      "hu",
      "lv",
      "lt",
      "mt",
      "sk",
      "sl",
    ]);
    expect(new Set(audit.contentLanguageSelectLocales)).toEqual(new Set(SUPPORTED_LOCALES));
    expect(audit.dormantLocaleSwitcherLocales).toEqual([
      "de",
      "en",
      "fr",
      "pl",
      "es",
      "it",
      "tr",
      "ar",
      "ru",
      "zh",
      "nl",
      "pt",
      "fi",
      "sv",
      "no",
      "cs",
      "hi",
      "ro",
      "el",
      "uk",
      "bg",
      "da",
      "et",
      "ga",
      "hr",
      "hu",
      "lv",
      "lt",
      "mt",
      "sk",
      "sl",
    ]);
    expect(audit.publicAutoTranslateLocales).toEqual(["it", "ru", "zh", "fr", "es", "pl"]);
    expect(audit.coverageStatus).toBe("partial");
  });

  it("keeps the complete public inventory, index truth, and task state explicit", () => {
    const matrix = readFileSync(
      resolve(
        process.cwd(),
        "../../docs/E150/V3_I18N_SURFACE_COVERAGE_MATRIX_2026-07-23.md",
      ),
      "utf8",
    );
    const openTasks = readFileSync(
      resolve(process.cwd(), "../../docs/E150/OpenTasks.md"),
      "utf8",
    );

    for (const route of [
      "/faq",
      "/kontakt",
      "/ueber-uns",
      "/transparenzbericht",
      "/verhaltenskodex",
      "/mitglied-werden",
      "/howtoworks/*",
    ]) {
      expect(matrix).toContain(`\`${route}\``);
    }

    expect(matrix).toContain("| Login | `/login`");
    expect(matrix).toContain("indexierbar (keine robots-Meta)");
    expect(matrix).toContain("| Live-Root | `/live`");
    expect(matrix).toContain(
      "| Live-Campaign-Entry | `/live/[campaignId]`",
    );

    const i18nTaskRow = openTasks
      .split("\n")
      .find((line) => line.startsWith("| I18N-SURFACE-COVERAGE-02 |"));
    const preferenceTaskRow = openTasks
      .split("\n")
      .find((line) => line.startsWith("| I18N-PREFERENCE-SEPARATION-03 |"));
    const liveTaskRow = openTasks
      .split("\n")
      .find((line) => line.startsWith("| LIVE-PRODUCT-CONTRACT-01 |"));

    expect(i18nTaskRow).toContain("| done |");
    expect(preferenceTaskRow).toContain("| codex_ready |");
    expect(liveTaskRow).toContain("| done |");
    expect(openTasks).toContain(
      "I18N-SURFACE-COVERAGE-02 evidence: PR #420",
    );
    expect(openTasks).toContain(
      "LIVE-PRODUCT-CONTRACT-01 evidence: PR #419 gemergt",
    );
  });
});
