import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleValue<T> = Record<"de", T> & Partial<Record<SupportedLocale, T>>;

const STRINGS = {
  title: { de: "Impressum" } as LocaleValue<string>,
  intro: {
    de: "Angaben gemäß § 5 TMG und § 18 MStV für die Plattform VoiceOpenGov.",
  } as LocaleValue<string>,
  responsibleTitle: { de: "Verantwortlich für den Inhalt:" } as LocaleValue<string>,
  responsibleBody: {
    de: "VoiceOpenGov – Initiative für digitale Beteiligung\nRicky Gerd Fleischer\nUG (haftungsbeschränkt) in Gründung – ladungsfähige Anschrift ab Januar offiziell\nWohnsitz und Gerichtsstand: Berlin\nE-Mail: impressum@voiceopengov.org",
  } as LocaleValue<string>,
  legalTitle: { de: "Verantwortlich gemäß § 55 Abs. 2 RStV:" } as LocaleValue<string>,
  legalBody: {
    de: "Redaktionsteam VoiceOpenGov (ehrenamtlich, demokratisch legitimiert, kollektiv organisiert)",
  } as LocaleValue<string>,
  disclaimerTitle: { de: "Haftungshinweis:" } as LocaleValue<string>,
  disclaimerBody: {
    de: "Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.",
  } as LocaleValue<string>,
  emailLabel: { de: "impressum@voiceopengov.org" } as LocaleValue<string>,
} as const;

function pick<T>(entry: LocaleValue<T>, locale: SupportedLocale | string): T {
  const normalized = (locale || DEFAULT_LOCALE) as SupportedLocale;
  return entry[normalized] ?? entry.de;
}

export function getImpressumStrings(locale: SupportedLocale | string) {
  return {
    title: pick(STRINGS.title, locale),
    intro: pick(STRINGS.intro, locale),
    responsibleTitle: pick(STRINGS.responsibleTitle, locale),
    responsibleBody: pick(STRINGS.responsibleBody, locale),
    legalTitle: pick(STRINGS.legalTitle, locale),
    legalBody: pick(STRINGS.legalBody, locale),
    disclaimerTitle: pick(STRINGS.disclaimerTitle, locale),
    disclaimerBody: pick(STRINGS.disclaimerBody, locale),
    emailLabel: pick(STRINGS.emailLabel, locale),
  };
}
