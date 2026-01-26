import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleValue<T> = Record<"de", T> & Partial<Record<SupportedLocale, T>>;

const STRINGS = {
  heroTitle: { de: "Nutzungsmodell eDbtt" } as LocaleValue<string>,
  heroIntro: {
    de: "Lesen und Swipen bleiben kostenlos. Beiträge sind unsere begrenzte Ressource – deshalb steuern wir sie über Kontingente, Bundles und Earned Credits. eDebatte-Pakete (Start, Pro) sind klar bepreist.",
  } as LocaleValue<string>,
  infoList: {
    de: [
      "Swipe: unbegrenzt und kostenlos – egal welches Tier.",
      "Pro Monat gibt es inkludierte Beiträge (Level 1 & 2) je nach Tier.",
      "Zusätzliche Beiträge kannst du durch Swipes freischalten oder via Bundles/Abo buchen.",
      "Mitgliedschaft und eDebatte-Pakete sind getrennt wählbar.",
    ],
  } as LocaleValue<string[]>,
  earnedTitle: { de: "Earned Credits" } as LocaleValue<string>,
  earnedIntro: {
    de: "Bei jedem Swipe trägst du zur Qualität bei. Dafür gibt es automatisch Credits:",
  } as LocaleValue<string>,
  earnedList: {
    de: ["100 Swipes → 1 zusätzlicher Level‑1-Beitrag", "500 Swipes → 1 zusätzlicher Level‑2-Beitrag"],
  } as LocaleValue<string[]>,
} as const;

function pick<T>(entry: LocaleValue<T>, locale: SupportedLocale | string): T {
  const normalized = (locale || DEFAULT_LOCALE) as SupportedLocale;
  return entry[normalized] ?? entry.de;
}

export function getNutzungsStrings(locale: SupportedLocale | string) {
  return {
    heroTitle: pick(STRINGS.heroTitle, locale),
    heroIntro: pick(STRINGS.heroIntro, locale),
    infoList: pick(STRINGS.infoList, locale),
    earnedTitle: pick(STRINGS.earnedTitle, locale),
    earnedIntro: pick(STRINGS.earnedIntro, locale),
    earnedList: pick(STRINGS.earnedList, locale),
  };
}
