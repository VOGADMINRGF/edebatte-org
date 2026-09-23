import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDir, isSupportedLocale } from "@/config/locales";
import { LocalizedContentDisplay } from "@/components/i18n/LocalizedContentDisplay";

const ARABIC_ORIGINAL = "هذا نص عربي لاختبار عرض المصدر الأصلي.";
const GERMAN_TRANSLATION = "Dies ist ein arabischer Text zum Test der Originalquelle.";
const ADDED_EU_LOCALES = [
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
] as const;

describe("locale direction and Arabic language bridge contract", () => {
  it("keeps Arabic RTL while all newly added EU locales remain LTR", () => {
    expect(isSupportedLocale("ar")).toBe(true);
    expect(getDir("ar")).toBe("rtl");
    expect(getDir("de")).toBe("ltr");
    expect(getDir("en")).toBe("ltr");

    for (const locale of ADDED_EU_LOCALES) {
      expect(isSupportedLocale(locale)).toBe(true);
      expect(getDir(locale)).toBe("ltr");
    }
  });

  it("promotes a supported URL locale before the root layout chooses the SSR direction", () => {
    const proxySource = readFileSync(resolve(process.cwd(), "src/proxy.ts"), "utf8");
    const layoutSource = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");

    expect(proxySource).toContain('req.nextUrl.searchParams.get("lang")');
    expect(proxySource).toContain("isSupportedLocale(requestedLocale)");
    expect(proxySource).toContain('requestHeaders.set(REQUEST_LOCALE_HEADER, requestedLocale)');
    expect(proxySource).toContain('response.cookies.set("lang", requestedLocale');
    expect(proxySource).toContain('has: [{ type: "query", key: "lang" }]');
    expect(layoutSource).toContain('headerStore.get("x-edebatte-locale")');
    expect(layoutSource.indexOf('headerStore.get("x-edebatte-locale")')).toBeLessThan(
      layoutSource.indexOf('cookieStore.get("lang")'),
    );
  });

  it("keeps Arabic base messages Arabic instead of English placeholders", () => {
    const raw = readFileSync(resolve(process.cwd(), "src/app/messages/ar.json"), "utf8");
    const messages = JSON.parse(raw) as Record<string, Record<string, string>>;
    const values = Object.values(messages).flatMap((group) => Object.values(group));

    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => /[\u0600-\u06FF]/u.test(value))).toBe(true);
    expect(raw).not.toContain('"Join now"');
    expect(raw).not.toContain('"Contribute"');
    expect(raw).not.toContain('"Privacy"');
  });

  it("renders the reading translation and Arabic original with independent language directions", () => {
    const html = renderToStaticMarkup(
      <LocalizedContentDisplay
        preferredLocale="de"
        showLanguageBridgeMeta
        content={{
          originalLanguage: "ar",
          originalText: ARABIC_ORIGINAL,
          translations: { de: GERMAN_TRANSLATION },
          translationStatus: "translated",
          translationProvider: "contract-test",
          translationModel: "contract-test",
        }}
      />,
    );

    expect(html).toContain('lang="de"');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain(GERMAN_TRANSLATION);
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(ARABIC_ORIGINAL);
  });
});
