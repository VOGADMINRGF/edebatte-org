import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleValue<T> = Record<"de", T> & Partial<Record<SupportedLocale, T>>;

const HERO_CHIPS = ["Direktdemokratisch", "Lokal", "National", "Global"];
const HERO_LINES = ["Weniger reden.", "Mehr entscheiden."];
const HERO_ACCENT = "Dein Anliegen";
const HERO_SUFFIX = "– unsere Struktur.";
const HERO_INTRO =
  "VoiceOpenGov verbindet Bürger:innen, Verwaltung und Journalist:innen. KI-orchestriert bündeln wir Quellen, Gegenquellen und Unsicherheiten in einem Evidenz-Graphen, stimmen fair ab und begleiten die Umsetzung öffentlich nachvollziehbar.";
const HERO_BULLETS = [
  "<strong>Transparente Verfahren:</strong> Jede Quelle und jeder Schritt sind einsehbar.",
  "<strong>Faire Debatten:</strong> Pro & Contra werden symmetrisch moderiert; Dominanz einzelner Stimmen wird verhindert.",
  "<strong>Regionale Legitimität:</strong> Entscheidungen lassen sich auf Gemeinden, Kreise oder Länder begrenzen.",
];
const HERO_CTAS = {
  primary: "Thema einreichen",
  secondary: "Jetzt abstimmen",
  tertiary: "Mitglied werden",
};
const HERO_CARDS = [
  {
    title: "Für Bürger:innen",
    body: "Faire Pro/Contra-Darstellung, geheime Stimmabgabe, klare Regeln & Quoren.",
  },
  {
    title: "Für Journalist:innen",
    body: "Dossiers, Embeds & Exporte (CSV/JSON) – lokal, regional, investigativ.",
  },
  {
    title: "Für Verwaltungen",
    body: "Ergebnisse mit Mandat, Meilensteinen, Risiken & Wirkung transparent tracken.",
  },
  {
    title: "Für Politik & Repräsentanten",
    body: "Direktdemokratische Umfragen nach dem Mehrheitsprinzip, nachvollziehbar moderiert.",
  },
];
const MEMBERSHIP_HIGHLIGHT = {
  title: "Deine Mitgliedschaft hält VoiceOpenGov unabhängig",
  body: "Schon ab 5,63 € pro Monat finanzierst du Moderation, Faktenrecherche und Audit-Trails.",
  button: "Mehr erfahren",
};
const HERO_VIDEO_NOTE = "Direkte Demokratie in 90 Sekunden.";
const HERO_VIDEO_LINK = "Mehr erfahren →";
const USP_ITEMS = [
  {
    title: "Anliegen rein, Ergebnis raus.",
    body: "In 60 Sekunden einreichen – danach startet das direktdemokratische Verfahren in klaren Schritten bis zum Ergebnis.",
  },
  {
    title: "Mehr als Pro & Contra.",
    body: "Positionen, Szenarien und Folgen transparent gemacht. Minderheiten sichtbar, Mehrheiten erkennbar.",
  },
  {
    title: "Faktenbasiert & KI-gestützt.",
    body: "International geprüft, redaktionell kuratiert, wissenschaftlich belegt. Entscheidungen auf belastbaren Fakten.",
  },
  {
    title: "Im Auftrag des Volkes.",
    body: "Wir moderieren die Verfahren, dokumentieren Audit-Trails und begleiten die Umsetzung öffentlich.",
  },
];
const QUALITY_SECTION = {
  title: "Unser Qualitätsstandard",
  body: "Reproduzierbarkeit, offene Methoden, strenge Quellenarbeit, Fehlerkultur und öffentliche Audit-Trails – nicht als Versprechen, sondern als Betriebsprinzip. Öffentliche Impact-Dashboards und graphbasierte Vertrauensmaße machen jeden Schritt nachvollziehbar.",
  ctaReports: "Reports ansehen",
  ctaMembers: "Mitglied werden",
};

const HOME_STRINGS = {
  heroChips: {
    de: HERO_CHIPS,
    en: HERO_CHIPS,
  } satisfies LocaleValue<string[]>,
  heroHeadline: {
    lines: {
      de: HERO_LINES,
      en: HERO_LINES,
    },
    accent: {
      de: HERO_ACCENT,
      en: HERO_ACCENT,
    },
    suffix: {
      de: HERO_SUFFIX,
      en: HERO_SUFFIX,
    },
  },
  heroIntro: {
    de: HERO_INTRO,
    en: HERO_INTRO,
  },
  heroBullets: {
    de: HERO_BULLETS,
    en: HERO_BULLETS,
  } satisfies LocaleValue<string[]>,
  heroCtas: {
    de: HERO_CTAS,
    en: HERO_CTAS,
  },
  heroCards: {
    de: HERO_CARDS,
    en: HERO_CARDS,
  },
  membershipHighlight: {
    title: {
      de: MEMBERSHIP_HIGHLIGHT.title,
      en: MEMBERSHIP_HIGHLIGHT.title,
    },
    body: {
      de: MEMBERSHIP_HIGHLIGHT.body,
      en: MEMBERSHIP_HIGHLIGHT.body,
    },
    button: {
      de: MEMBERSHIP_HIGHLIGHT.button,
      en: MEMBERSHIP_HIGHLIGHT.button,
    },
  },
  heroVideoNote: {
    de: HERO_VIDEO_NOTE,
    en: HERO_VIDEO_NOTE,
  },
  heroVideoLink: {
    de: HERO_VIDEO_LINK,
    en: HERO_VIDEO_LINK,
  },
  uspItems: {
    de: USP_ITEMS,
    en: USP_ITEMS,
  },
  qualitySection: {
    title: {
      de: QUALITY_SECTION.title,
      en: QUALITY_SECTION.title,
    },
    body: {
      de: QUALITY_SECTION.body,
      en: QUALITY_SECTION.body,
    },
    ctaReports: {
      de: QUALITY_SECTION.ctaReports,
      en: QUALITY_SECTION.ctaReports,
    },
    ctaMembers: {
      de: QUALITY_SECTION.ctaMembers,
      en: QUALITY_SECTION.ctaMembers,
    },
  },
} as const;

export function getHomeStrings(locale: SupportedLocale | string) {
  const pick = <T>(entry: LocaleValue<T>): T => {
    const normalized = (locale ?? DEFAULT_LOCALE) as SupportedLocale;
    return entry[normalized] ?? entry.de;
  };

  return {
    heroChips: pick(HOME_STRINGS.heroChips),
    heroHeadline: {
      lines: pick(HOME_STRINGS.heroHeadline.lines),
      accent: pick(HOME_STRINGS.heroHeadline.accent),
      suffix: pick(HOME_STRINGS.heroHeadline.suffix),
    },
    heroIntro: pick(HOME_STRINGS.heroIntro),
    heroBullets: pick(HOME_STRINGS.heroBullets),
    heroCtas: pick(HOME_STRINGS.heroCtas),
    heroCards: pick(HOME_STRINGS.heroCards),
    membershipHighlight: {
      title: pick(HOME_STRINGS.membershipHighlight.title),
      body: pick(HOME_STRINGS.membershipHighlight.body),
      button: pick(HOME_STRINGS.membershipHighlight.button),
    },
    heroVideoNote: pick(HOME_STRINGS.heroVideoNote),
    heroVideoLink: pick(HOME_STRINGS.heroVideoLink),
    uspItems: pick(HOME_STRINGS.uspItems),
    qualitySection: {
      title: pick(HOME_STRINGS.qualitySection.title),
      body: pick(HOME_STRINGS.qualitySection.body),
      ctaReports: pick(HOME_STRINGS.qualitySection.ctaReports),
      ctaMembers: pick(HOME_STRINGS.qualitySection.ctaMembers),
    },
  };
}
