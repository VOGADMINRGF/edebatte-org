import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleValue<T> = Record<"de", T> & Partial<Record<SupportedLocale, T>>;

const STRINGS = {
  title: { de: "Was passiert mit meinen Daten?" } as LocaleValue<string>,
  intro: {
    de: "Wir legen großen Wert auf Datenschutz. Die Nutzung von VoiceOpenGov ist weitgehend anonym möglich – freiwillige Angaben kannst du jederzeit einsehen oder löschen.",
  } as LocaleValue<string>,
  list: {
    de: [
      "Keine dauerhafte Speicherung deiner IP-Adresse",
      "Kein Einsatz von Tracking-Cookies oder externem Profiling",
      "Alle Daten unterliegen der DSGVO (Serverstandort: Deutschland)",
      "Transparente Datenverwaltung – jederzeit einsehbar & löschbar",
    ],
  } as LocaleValue<string[]>,
  contactPrefix: {
    de: "Fragen? Schreib uns unter",
  } as LocaleValue<string>,
  contactEmail: { de: "datenschutz@voiceopengov.org" } as LocaleValue<string>,
  cta: { de: "Mehr zur Transparenz" } as LocaleValue<string>,
} as const;

function pick<T>(entry: LocaleValue<T>, locale: SupportedLocale | string): T {
  const normalized = (locale || DEFAULT_LOCALE) as SupportedLocale;
  return entry[normalized] ?? entry.de;
}

export function getDataStrings(locale: SupportedLocale | string) {
  return {
    title: pick(STRINGS.title, locale),
    intro: pick(STRINGS.intro, locale),
    list: pick(STRINGS.list, locale),
    contactPrefix: pick(STRINGS.contactPrefix, locale),
    contactEmail: pick(STRINGS.contactEmail, locale),
    cta: pick(STRINGS.cta, locale),
  };
}
