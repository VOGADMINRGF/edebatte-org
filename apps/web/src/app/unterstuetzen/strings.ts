import type { SupportedLocale } from "@/config/locales";

type Entry<T> = Record<"de", T> & Partial<Record<SupportedLocale, T>>;

const STRINGS = {
  heroTitle: {
    de: "Unterstützen",
    en: "Unterstützen",
  },
  heroIntro: {
    de: "eDebatte ist eine gemeinwohlorientierte Plattform – unabhängig, datensicher und demokratisch. Deine Unterstützung macht politische Teilhabe möglich.",
    en: "eDebatte ist eine gemeinwohlorientierte Plattform – unabhängig, datensicher und demokratisch. Deine Unterstützung macht politische Teilhabe möglich.",
  },
  whyTitle: {
    de: "Warum unterstützen?",
    en: "Warum unterstützen?",
  },
  whyList: {
    de: [
      "Barrierefreie Weiterentwicklung",
      "Redaktionelle Aufarbeitung & Moderation",
      "Unabhängige Infrastruktur (DSGVO-konform)",
    ],
    en: [
      "Barrierefreie Weiterentwicklung",
      "Redaktionelle Aufarbeitung & Moderation",
      "Unabhängige Infrastruktur (DSGVO-konform)",
    ],
  },
  membershipTitle: {
    de: "Mitgliedschaften",
    en: "Mitgliedschaften",
  },
  membershipList: {
    de: [
      "10 €/Monat – Zugang zu Reports & Beteiligungsformaten",
      "25 €/Monat – Engagiert, inkl. Community-Formate",
      "50 €/Monat – Fördermitgliedschaft",
    ],
    en: [
      "10 €/Monat – Zugang zu Reports & Beteiligungsformaten",
      "25 €/Monat – Engagiert, inkl. Community-Formate",
      "50 €/Monat – Fördermitgliedschaft",
    ],
  },
  bundlesNotePrefix: {
    de: "Für Plattform-Kontingente (Beiträge, Swipes, Bundles) siehe",
    en: "Für Plattform-Kontingente (Beiträge, Swipes, Bundles) siehe",
  },
  bundlesNoteSuffix: {
    de: ". Die VoG-Mitgliedschaft bleibt davon getrennt.",
    en: ". Die VoG-Mitgliedschaft bleibt davon getrennt.",
  },
  cta: {
    de: "Jetzt unterstützen",
    en: "Jetzt unterstützen",
  },
} as const satisfies Record<string, Entry<string | string[]>>;

export function tSupport<T>(entry: Entry<T>, locale: SupportedLocale | string): T {
  const normalized = locale as SupportedLocale;
  return entry[normalized] ?? (normalized !== "de" ? entry.en : undefined) ?? entry.de;
}

export const SUPPORT_STRINGS = STRINGS;
