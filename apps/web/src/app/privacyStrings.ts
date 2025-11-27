// E200: Zentrale Texte für VOG-Cookie-/Datenschutzbanner & KI-Hinweis
import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleValue<T> = Record<"de", T> & Partial<Record<SupportedLocale, T>>;

const BANNER_TITLE = {
  de: "Cookies & Datenschutz bei VoiceOpenGov",
};

const BANNER_LEAD = {
  de: "Wir nutzen nur, was wir wirklich brauchen: essenzielle Cookies für Betrieb und Sicherheit, optional anonyme Statistiken – keine Werbe-Tracker.",
};

const ESSENTIAL_TITLE = {
  de: "Essentielle Funktionen",
};

const ESSENTIAL_BODY = {
  de: "Diese Cookies und lokalen Speicher-Einträge sind nötig, damit VoiceOpenGov technisch funktioniert – zum Beispiel für Sicherheit, Spracheinstellungen, Login-Sitzungen und deinen Consent-Status. Ohne sie können wir die Plattform nicht zuverlässig bereitstellen.",
};

const ANALYTICS_TITLE = {
  de: "Optionale Statistiken",
};

const ANALYTICS_BODY = {
  de: "Wir möchten verstehen, wie das VOG-System genutzt wird – datensparsam und ohne Werbenetzwerke. Wenn du zustimmst, helfen uns anonyme Nutzungsstatistiken dabei, Inhalte und Abläufe zu verbessern. Du kannst diese Option jederzeit wieder deaktivieren.",
};

const BUTTON_ACCEPT_ALL = {
  de: "Alle erlauben",
};

const BUTTON_ONLY_ESSENTIAL = {
  de: "Nur notwendige verwenden",
};

const BUTTON_SETTINGS = {
  de: "Einstellungen anpassen",
};

const LINK_PRIVACY = {
  de: "Datenschutzerklärung",
};

const LINK_IMPRINT = {
  de: "Impressum",
};

const LINK_AI_USAGE = {
  de: "Wie wir KI einsetzen",
};

const AI_USAGE_TITLE = {
  de: "Einsatz von KI- und API-Diensten",
};

const AI_USAGE_BODY = {
  de: "Für Analyse- und Auswertefunktionen setzen wir externe KI-Dienste wie OpenAI, Anthropic (Claude), Mistral oder Google Gemini ein. Diese Systeme werden ausschließlich serverseitig über unsere eigenen API-Schlüssel angesprochen. Auf deiner Seite setzen wir dafür keine eigenen Drittanbieter-Cookies. Welche Daten wir an diese Dienste übergeben und nach welchen Regeln wir sie einsetzen, beschreiben wir ausführlich in unserer Datenschutzerklärung.",
};

const DIALOG_TITLE = {
  de: "Datenschutz-Einstellungen für VoiceOpenGov",
};

const DIALOG_INTRO = {
  de: "Hier kannst du festlegen, welche Arten von Cookies und lokalen Speicher-Einträgen wir setzen dürfen. Du kannst deine Entscheidung jederzeit ändern. Wir setzen keine Werbe-Tracker ein und verkaufen keine Nutzerdaten.",
};

const PRIVACY_STRINGS = {
  banner: {
    title: BANNER_TITLE,
    lead: BANNER_LEAD,
    essentialTitle: ESSENTIAL_TITLE,
    essentialBody: ESSENTIAL_BODY,
    analyticsTitle: ANALYTICS_TITLE,
    analyticsBody: ANALYTICS_BODY,
    buttons: {
      acceptAll: BUTTON_ACCEPT_ALL,
      onlyEssential: BUTTON_ONLY_ESSENTIAL,
      settings: BUTTON_SETTINGS,
    },
    links: {
      privacy: LINK_PRIVACY,
      imprint: LINK_IMPRINT,
      aiUsage: LINK_AI_USAGE,
    },
  },
  dialog: {
    title: DIALOG_TITLE,
    intro: DIALOG_INTRO,
    aiUsageTitle: AI_USAGE_TITLE,
    aiUsageBody: AI_USAGE_BODY,
  },
} as const satisfies {
  banner: {
    title: LocaleValue<string>;
    lead: LocaleValue<string>;
    essentialTitle: LocaleValue<string>;
    essentialBody: LocaleValue<string>;
    analyticsTitle: LocaleValue<string>;
    analyticsBody: LocaleValue<string>;
    buttons: {
      acceptAll: LocaleValue<string>;
      onlyEssential: LocaleValue<string>;
      settings: LocaleValue<string>;
    };
    links: {
      privacy: LocaleValue<string>;
      imprint: LocaleValue<string>;
      aiUsage: LocaleValue<string>;
    };
  };
  dialog: {
    title: LocaleValue<string>;
    intro: LocaleValue<string>;
    aiUsageTitle: LocaleValue<string>;
    aiUsageBody: LocaleValue<string>;
  };
};

export function getPrivacyStrings(locale: SupportedLocale | string) {
  const pick = <T,>(entry: LocaleValue<T>): T => {
    const normalized = (locale ?? DEFAULT_LOCALE) as SupportedLocale;
    return entry[normalized] ?? entry.de;
  };

  return {
    banner: {
      title: pick(PRIVACY_STRINGS.banner.title),
      lead: pick(PRIVACY_STRINGS.banner.lead),
      essentialTitle: pick(PRIVACY_STRINGS.banner.essentialTitle),
      essentialBody: pick(PRIVACY_STRINGS.banner.essentialBody),
      analyticsTitle: pick(PRIVACY_STRINGS.banner.analyticsTitle),
      analyticsBody: pick(PRIVACY_STRINGS.banner.analyticsBody),
      buttons: {
        acceptAll: pick(PRIVACY_STRINGS.banner.buttons.acceptAll),
        onlyEssential: pick(PRIVACY_STRINGS.banner.buttons.onlyEssential),
        settings: pick(PRIVACY_STRINGS.banner.buttons.settings),
      },
      links: {
        privacy: pick(PRIVACY_STRINGS.banner.links.privacy),
        imprint: pick(PRIVACY_STRINGS.banner.links.imprint),
        aiUsage: pick(PRIVACY_STRINGS.banner.links.aiUsage),
      },
    },
    dialog: {
      title: pick(PRIVACY_STRINGS.dialog.title),
      intro: pick(PRIVACY_STRINGS.dialog.intro),
      aiUsageTitle: pick(PRIVACY_STRINGS.dialog.aiUsageTitle),
      aiUsageBody: pick(PRIVACY_STRINGS.dialog.aiUsageBody),
    },
  };
}

export type PrivacyStrings = ReturnType<typeof getPrivacyStrings>;
