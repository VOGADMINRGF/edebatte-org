// E200: Centralized marketing copy for the public landing page.
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
  primary: "Mitglied werden",
  secondary: "Jetzt abstimmen",
  tertiary: "Thema einreichen",
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
  overline: "Bau mit uns eine neue Entscheidungsstruktur auf",
};
const HERO_VIDEO_NOTE = "Direkte Demokratie in 90 Sekunden.";
const HERO_VIDEO_LINK = "Mehr erfahren →";
const AUDIENCE_TITLE = "Für wen VoiceOpenGov gedacht ist";
const AUDIENCE_LEAD = "Vier Rollen, ein gemeinsamer Auftrag: bessere Entscheidungen durch nachvollziehbare Verfahren.";
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
const PROCESS_SECTION_TITLE = "Vom Anliegen zur Entscheidung – in klaren Schritten.";
const QUALITY_SECTION = {
  title: "Unser Qualitätsstandard",
  body: "Reproduzierbarkeit, offene Methoden, strenge Quellenarbeit, Fehlerkultur und öffentliche Audit-Trails – nicht als Versprechen, sondern als Betriebsprinzip. Öffentliche Impact-Dashboards und graphbasierte Vertrauensmaße machen jeden Schritt nachvollziehbar.",
  ctaReports: "Reports ansehen",
  ctaMembers: "Mitglied werden",
};
const MAJORITY_SECTION = {
  title: "Mehrheit entscheidet – informiert, fair und nachvollziehbar",
  lead: "VoiceOpenGov strukturiert Debatten so, dass Entscheidungen nicht vom lautesten Publikum, sondern von belastbaren Mehrheiten getragen werden.",
  bullets: [
    "Symmetrische Darstellung von Pro, Contra und Risiken – keine einseitigen Debatten.",
    "Quoren und Ablaufpläne, die auf Gemeinde-, Kreis- oder Landesebene angepasst werden können.",
    "Öffentliche Dokumentation jedes Schritts, damit Mandate und Legitimität überprüfbar bleiben.",
  ],
  closing: "Mehrheiten entstehen aus nachvollziehbaren Verfahren – nicht aus Stimmungen. Dafür sorgt das VOG-System.",
};
const CLOSING_SECTION = {
  title: "Du willst, dass Entscheidungen besser werden? Fang hier an.",
  body: "Schließ dich der Bewegung an, stimme mit und bring Themen ein, die wirklich gelöst werden sollen.",
  primaryCta: "Mitglied werden",
  secondaryCta: "Aktuelle Abstimmungen",
  tertiaryCta: "Thema einreichen",
};
const UPDATES_FORM = {
  title: "Updates aus dem System",
  body: "Kurze E-Mails zu neuen Abstimmungen, Qualitätsreports und offenen Themen – kein Tracking, kein Spam.",
  emailLabel: "E-Mail (optional anonymisiert)",
  interestsLabel: "Was interessiert dich besonders? (optional)",
  submit: "Updates erhalten",
  success: "Danke! Wir senden dir Updates, sobald es neue Entscheidungen gibt.",
  error: "Etwas hat nicht geklappt. Bitte später erneut versuchen.",
  invalid: "Bitte bestätige kurz, dass du ein Mensch bist.",
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
    overline: {
      de: MEMBERSHIP_HIGHLIGHT.overline,
      en: MEMBERSHIP_HIGHLIGHT.overline,
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
  audienceTitle: {
    de: AUDIENCE_TITLE,
    en: AUDIENCE_TITLE,
  },
  audienceLead: {
    de: AUDIENCE_LEAD,
    en: AUDIENCE_LEAD,
  },
  uspItems: {
    de: USP_ITEMS,
    en: USP_ITEMS,
  },
  processTitle: {
    de: PROCESS_SECTION_TITLE,
    en: PROCESS_SECTION_TITLE,
  },
  majoritySection: {
    title: {
      de: MAJORITY_SECTION.title,
      en: MAJORITY_SECTION.title,
    },
    lead: {
      de: MAJORITY_SECTION.lead,
      en: MAJORITY_SECTION.lead,
    },
    bullets: {
      de: MAJORITY_SECTION.bullets,
      en: MAJORITY_SECTION.bullets,
    },
    closing: {
      de: MAJORITY_SECTION.closing,
      en: MAJORITY_SECTION.closing,
    },
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
  closingSection: {
    title: {
      de: CLOSING_SECTION.title,
      en: CLOSING_SECTION.title,
    },
    body: {
      de: CLOSING_SECTION.body,
      en: CLOSING_SECTION.body,
    },
    primaryCta: {
      de: CLOSING_SECTION.primaryCta,
      en: CLOSING_SECTION.primaryCta,
    },
    secondaryCta: {
      de: CLOSING_SECTION.secondaryCta,
      en: CLOSING_SECTION.secondaryCta,
    },
    tertiaryCta: {
      de: CLOSING_SECTION.tertiaryCta,
      en: CLOSING_SECTION.tertiaryCta,
    },
  },
  updatesForm: {
    title: {
      de: UPDATES_FORM.title,
      en: UPDATES_FORM.title,
    },
    body: {
      de: UPDATES_FORM.body,
      en: UPDATES_FORM.body,
    },
    emailLabel: {
      de: UPDATES_FORM.emailLabel,
      en: UPDATES_FORM.emailLabel,
    },
    interestsLabel: {
      de: UPDATES_FORM.interestsLabel,
      en: UPDATES_FORM.interestsLabel,
    },
    submit: {
      de: UPDATES_FORM.submit,
      en: UPDATES_FORM.submit,
    },
    success: {
      de: UPDATES_FORM.success,
      en: UPDATES_FORM.success,
    },
    error: {
      de: UPDATES_FORM.error,
      en: UPDATES_FORM.error,
    },
    invalid: {
      de: UPDATES_FORM.invalid,
      en: UPDATES_FORM.invalid,
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
      overline: pick(HOME_STRINGS.membershipHighlight.overline),
    },
    heroVideoNote: pick(HOME_STRINGS.heroVideoNote),
    heroVideoLink: pick(HOME_STRINGS.heroVideoLink),
    audienceTitle: pick(HOME_STRINGS.audienceTitle),
    audienceLead: pick(HOME_STRINGS.audienceLead),
    uspItems: pick(HOME_STRINGS.uspItems),
    processTitle: pick(HOME_STRINGS.processTitle),
    majoritySection: {
      title: pick(HOME_STRINGS.majoritySection.title),
      lead: pick(HOME_STRINGS.majoritySection.lead),
      bullets: pick(HOME_STRINGS.majoritySection.bullets),
      closing: pick(HOME_STRINGS.majoritySection.closing),
    },
    qualitySection: {
      title: pick(HOME_STRINGS.qualitySection.title),
      body: pick(HOME_STRINGS.qualitySection.body),
      ctaReports: pick(HOME_STRINGS.qualitySection.ctaReports),
      ctaMembers: pick(HOME_STRINGS.qualitySection.ctaMembers),
    },
    closingSection: {
      title: pick(HOME_STRINGS.closingSection.title),
      body: pick(HOME_STRINGS.closingSection.body),
      primaryCta: pick(HOME_STRINGS.closingSection.primaryCta),
      secondaryCta: pick(HOME_STRINGS.closingSection.secondaryCta),
      tertiaryCta: pick(HOME_STRINGS.closingSection.tertiaryCta),
    },
    updatesForm: {
      title: pick(HOME_STRINGS.updatesForm.title),
      body: pick(HOME_STRINGS.updatesForm.body),
      emailLabel: pick(HOME_STRINGS.updatesForm.emailLabel),
      interestsLabel: pick(HOME_STRINGS.updatesForm.interestsLabel),
      submit: pick(HOME_STRINGS.updatesForm.submit),
      success: pick(HOME_STRINGS.updatesForm.success),
      error: pick(HOME_STRINGS.updatesForm.error),
      invalid: pick(HOME_STRINGS.updatesForm.invalid),
    },
  };
}
