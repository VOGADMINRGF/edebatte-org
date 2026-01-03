// E200: Centralized marketing copy for the public landing page.
import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleValue<T> = Record<"de", T> & Partial<Record<SupportedLocale, T>>;

/**
 * HERO / INTRO
 */

const HERO_CHIPS = ["Demokratisch", "Transparent", "Faktenbasiert", "Inklusiv"];

const HERO_LINES = ["Weil die Sache zählt,"];
const HERO_ACCENT = "nicht die Schlagzeile";
const HERO_SUFFIX = "– lokal, national und global.";

const HERO_INTRO =
  "VoiceOpenGov ist die direktdemokratische Bewegung – offen für alle, die das Mehrheitsprinzip stärken und an eine gerechtere Welt glauben. Wir freuen uns über jedes Interesse und jedes Mitmachen. Mit eDebatte, unserem eigens entwickelten Werkzeug, unterstützen wir die Digitalisierung politischer Teilhabe und bauen eine neue, überprüfbare Infrastruktur auf. Entscheidungen folgen dem Grundsatz „eine Person, eine Stimme“. Du kannst Vorschläge einbringen, Varianten abwägen und jeden Schritt offen nachvollziehen – ohne Parteibuch, ohne Hinterzimmer.";

const HERO_BULLETS = [
  "<strong>Direkt beteiligt:</strong> Themen einreichen, Argumente prüfen und mitentscheiden – vom Handy oder Laptop, alleine oder gemeinsam mit deiner Community.",
  "<strong>Transparent statt intransparent:</strong> Von Quellen über Argumente bis zu Ergebnissen ist jeder Schritt einsehbar – auch für internationale Partner:innen und Medien.",
  "<strong>Inklusive & global gedacht:</strong> Verfahren können an Sprachen, Regionen und Quoren angepasst werden, damit vielfältige Perspektiven sichtbar bleiben und starke Mehrheiten entstehen.",
];

const HERO_CTAS = {
  primary: "Mitglied werden",
  secondary: "Abstimmungen ansehen",
  tertiary: "Thema einreichen",
};

const HERO_CTA_NOTE =
  "Keine Parteibindung, kein Datenverkauf. Mitgliedschaften sind monatlich kündbar – Abstimmungen bleiben kostenlos.";

/**
 * AUDIENCE / ROLLEN
 */

const HERO_CARDS = [
  {
    title: "Für Bürger:innen",
    body: "Mitentscheiden, Themen einbringen und als Creator Themen, Streams oder Regionen begleiten.",
    actions: ["Abstimmen", "Anliegen einreichen", "Thema/Region begleiten"],
    example:
      "Beispiel: Tempo 30 vor Schulen – Faktenlage, Gegenpositionen, Abstimmung.",
    href: "/howtoworks/edebatte#rolle-buerger",
    cta: "Beispiel ansehen",
  },
  {
    title: "Für Vereine, Verbände & Journalist:innen",
    body: "Mitglieder beteiligen, Dossiers kuratieren und Themen redaktionell einordnen.",
    actions: [
      "Mitglieder beteiligen",
      "Dossiers kuratieren",
      "Faktenchecks",
      "Redaktion & Streams",
    ],
    example:
      "Beispiel: Vereinsinitiative für sichere Radwege – Mitgliederfeedback, Dossier, Redaktion.",
    href: "/howtoworks/edebatte#rolle-vereine",
    cta: "Beispiel ansehen",
  },
  {
    title: "Für Verwaltung & Repräsentant:innen",
    body: "Entscheidungsgrundlagen aufbereiten, Mandate sichern und Umsetzung begleiten.",
    actions: ["Daten aufbereiten", "Umfragen einreichen", "Wirkung verfolgen"],
    example:
      "Beispiel: Energieeffizienz-Programm – Datenpaket, Mandat, Meilensteine.",
    href: "/howtoworks/edebatte#rolle-verwaltung",
    cta: "Beispiel ansehen",
  },
];

/**
 * MEMBERSHIP
 */

const MEMBERSHIP_HIGHLIGHT = {
  title: "VoiceOpenGov ist die direktdemokratische Bewegung.",
  body: "Ab 5,63 € im Monat finanzierst du die weltweite Bewegung für direkte Teilhabe. Eine Gemeinschaft, die sich jetzt findet und wächst. eDebatte ist unser eigenes Werkzeug, mit dem wir diese digitale Infrastruktur aufbauen.",
  button: "Mitglied werden ab 5,63 €",
  overline: "Jetzt Teil der Bewegung werden",
  asideTitle: "Teile die Bewegung",
  asideBody:
    "Wir freuen uns über jedes Interesse am Mehrheitsprinzip. Wenn du möchtest, hilf uns, sichtbarer zu werden.",
  shareLabel: "Teilen",
  shareCopyLabel: "Link kopieren",
  shareWhatsappLabel: "WhatsApp",
  shareEmailLabel: "E-Mail",
  shareSuccess: "Link kopiert.",
  shareError: "Teilen nicht verfügbar.",
  shareText:
    "VoiceOpenGov ist die direktdemokratische Bewegung. Unterstütze den Aufbau der eDebatte-Infrastruktur.",
};

/**
 * HERO-VIDEO / QUICK EXPLAINER
 */

const HERO_VIDEO_NOTE = "Direkte Demokratie in 90 Sekunden.";
const HERO_VIDEO_LINK = "Mehr erfahren →";

/**
 * AUDIENCE
 */

const AUDIENCE_TITLE = "Für wen VoiceOpenGov und eDebatte gedacht sind";
const AUDIENCE_LEAD =
  "Drei Rollen, ein gemeinsamer Auftrag: bessere Entscheidungen durch nachvollziehbare Verfahren und gut dokumentierte Mehrheiten.";
const AUDIENCE_NOTE =
  "Die Rollen lassen sich erweitern. Wähle eine Rolle und sieh Möglichkeiten und ein Fallbeispiel im Detail.";

/**
 * DEMO / SCREENSHOTS
 */

const DEMO_SECTION = {
  overline: "Einblicke in die Plattform",
  title: "So sieht die Infrastruktur von morgen aus.",
  lead: "Die drei Module der eDebatte-Logik: Dossier & Faktencheck, Abstimmen & Ergebnis, Mandat & Umsetzung.",
  note: "Mehr Details findest du auf den jeweiligen Detailseiten.",
  items: [
    {
      objectPosition: "85% 25%",
      title: "Dossier & Faktencheck",
      body: "Quellen, offene Fragen und Pro/Contra in klarer Struktur.",
      tag: "Schritt 1",
      image: "/vog_startpage/Dossier.png",
      alt: "Screenshot eines Dossiers mit Quellen",
      href: "/howtoworks/edebatte/dossier",
      cta: "Details ansehen",
    },
    {
      objectPosition: "50% 28%",
      title: "Abstimmen & Ergebnis",
      body: "Geheime Stimmabgabe, Quorum und Ergebnis-Transparenz in einer klaren Ansicht.",
      tag: "Schritt 2",
      image: "/vog_startpage/Abstimmen.png",
      alt: "Screenshot einer Abstimmungsansicht",
      href: "/howtoworks/edebatte/abstimmen",
      cta: "Details ansehen",
    },
    {
      objectPosition: "50% 20%",
      title: "Mandat & Umsetzung",
      body: "Meilensteine, Risiken und Wirkung öffentlich nachverfolgen.",
      tag: "Schritt 3",
      image: "/vog_startpage/Mandat.png",
      alt: "Screenshot eines Umsetzungs-Trackings",
      href: "/howtoworks/edebatte/mandat",
      cta: "Details ansehen",
    },
  ],
};

/**
 * USP / VERFAHREN / EVIDENZ-GRAPH
 */

const USP_ITEMS = [
  {
    title: "Anliegen rein, Verfahren klar.",
    body: "In 60 Sekunden einreichen – danach startet ein transparentes Verfahren mit definierten Prüfschritten bis zur Entscheidung.",
  },
  {
    title: "Argumente unter Prüflicht.",
    body: "Quellenpflicht, Gegenpositionen und Annahmen werden strukturiert offengelegt. Minderheiten bleiben sichtbar, Mehrheiten nachvollziehbar.",
  },
  {
    title: "Evidenz-Graph, überprüfbar.",
    body: "Unser Evidenz-Graph verknüpft Quellen, Argumente und Wirkungen zu einem offenen Faktennetz – wissenschaftlich anschlussfähig und für alle prüfbar.",
  },
  {
    title: "Qualität vor Parteilogik.",
    body: "Offene Prüfprotokolle, journalistische Standards und selbstkritische Qualitätschecks – Infrastruktur für direkte Demokratie, kein Parteiprogramm.",
  },
];

/**
 * PROCESS
 */

const PROCESS_SECTION_TITLE = "Vom Anliegen zur Entscheidung – in klaren Schritten.";

/**
 * QUALITY / STANDARD
 */

const QUALITY_SECTION = {
  title: "Unser Qualitätsstandard",
  body: "Unser Qualitätsstandard ist strikt, transparent und überprüfbar. Jede Entscheidung basiert auf nachvollziehbaren Quellen, dokumentierten Annahmen und offen einsehbaren Verfahren.",
  bullets: [
    "Quellenpflicht, Gegenbelege und dokumentierte Unsicherheiten – statt Meinungsrauschen.",
    "Evidenz-Graph, der Aussagen, Quellen, Risiken und Wirkungen transparent verknüpft.",
    "Offene Prüfprotokolle, Versionierung und klare Fehlerkultur für Korrekturen.",
    "Symmetrische Pro/Contra-Darstellung – Minderheitenperspektiven bleiben sichtbar.",
    "Qualitätsmetriken und Vertrauenswerte zur Prüfbarkeit und Belastbarkeit.",
    "Umsetzungstracking und Wirkungsübersichten über den gesamten Prozess.",
  ],
  ctaFaq: "FAQ ansehen",
};

/**
 * MAJORITY / LEGITIMITÄT
 */

const MAJORITY_SECTION = {
  title: "Mehrheit entscheidet – informiert, fair und nachvollziehbar",
  lead: "VoiceOpenGov strukturiert Debatten so, dass Entscheidungen nicht vom lautesten Publikum, sondern von nachvollziehbar informierten Mehrheiten getragen werden.",
  bullets: [
    "Symmetrische Darstellung von Pro, Contra und Risiken – keine einseitigen Debatten.",
    "Quoren und Ablaufpläne, die auf Gemeinde-, Kreis- oder Landesebene angepasst werden können – bis hin zu qualifizierten Mehrheiten wie zwei Dritteln.",
    "Öffentliche Dokumentation jedes Schritts, damit Mandate, Legitimität und Umsetzung überprüfbar bleiben.",
  ],
  closing:
    "Mehrheiten entstehen aus nachvollziehbaren Verfahren – nicht aus spontanen Stimmungen. VoiceOpenGov liefert dafür die Infrastruktur.",
};

/**
 * CLOSING / BEWEGUNG
 */

const CLOSING_SECTION = {
  title: "Du willst, dass Entscheidungen besser werden? Fang hier an.",
  body: "Schließ dich der direktdemokratischen Bewegung an, stimme mit und bring Themen ein, die wirklich gelöst werden sollen – für deine Region und für eine gerechtere Welt.",
  primaryCta: "Mitglied werden",
  secondaryCta: "Aktuelle Abstimmungen",
  tertiaryCta: "Thema einreichen",
};

/**
 * UPDATES / DOUBLE-OPT-IN
 */

const UPDATES_FORM = {
  title: "Updates aus dem System",
  body: "Kurze E-Mails zu neuen Abstimmungen, Qualitätsreports und offenen Themen – kein Tracking, kein Spam. Du bestätigst deine Anmeldung per Double-Opt-in und kannst sie jederzeit beenden.",
  emailLabel: "E-Mail (optional anonymisiert)",
  interestsLabel: "Was interessiert dich besonders? (optional)",
  submit: "Updates erhalten",
  success:
    "Danke! Bitte bestätige noch kurz deine E-Mail-Adresse – den Link dazu haben wir dir soeben geschickt.",
  error: "Etwas hat nicht geklappt. Bitte später erneut versuchen.",
  invalid: "Bitte bestätige kurz, dass du ein Mensch bist.",
};

/**
 * LOCALE-BUNDLE
 */

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
  heroCtaNote: {
    de: HERO_CTA_NOTE,
    en: HERO_CTA_NOTE,
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
    asideTitle: {
      de: MEMBERSHIP_HIGHLIGHT.asideTitle,
      en: MEMBERSHIP_HIGHLIGHT.asideTitle,
    },
    asideBody: {
      de: MEMBERSHIP_HIGHLIGHT.asideBody,
      en: MEMBERSHIP_HIGHLIGHT.asideBody,
    },
    shareLabel: {
      de: MEMBERSHIP_HIGHLIGHT.shareLabel,
      en: MEMBERSHIP_HIGHLIGHT.shareLabel,
    },
    shareCopyLabel: {
      de: MEMBERSHIP_HIGHLIGHT.shareCopyLabel,
      en: MEMBERSHIP_HIGHLIGHT.shareCopyLabel,
    },
    shareWhatsappLabel: {
      de: MEMBERSHIP_HIGHLIGHT.shareWhatsappLabel,
      en: MEMBERSHIP_HIGHLIGHT.shareWhatsappLabel,
    },
    shareEmailLabel: {
      de: MEMBERSHIP_HIGHLIGHT.shareEmailLabel,
      en: MEMBERSHIP_HIGHLIGHT.shareEmailLabel,
    },
    shareSuccess: {
      de: MEMBERSHIP_HIGHLIGHT.shareSuccess,
      en: MEMBERSHIP_HIGHLIGHT.shareSuccess,
    },
    shareError: {
      de: MEMBERSHIP_HIGHLIGHT.shareError,
      en: MEMBERSHIP_HIGHLIGHT.shareError,
    },
    shareText: {
      de: MEMBERSHIP_HIGHLIGHT.shareText,
      en: MEMBERSHIP_HIGHLIGHT.shareText,
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
  audienceNote: {
    de: AUDIENCE_NOTE,
    en: AUDIENCE_NOTE,
  },
  uspItems: {
    de: USP_ITEMS,
    en: USP_ITEMS,
  },
  demoSection: {
    overline: {
      de: DEMO_SECTION.overline,
      en: DEMO_SECTION.overline,
    },
    title: {
      de: DEMO_SECTION.title,
      en: DEMO_SECTION.title,
    },
    lead: {
      de: DEMO_SECTION.lead,
      en: DEMO_SECTION.lead,
    },
    note: {
      de: DEMO_SECTION.note,
      en: DEMO_SECTION.note,
    },
    items: {
      de: DEMO_SECTION.items,
      en: DEMO_SECTION.items,
    },
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
    bullets: {
      de: QUALITY_SECTION.bullets,
      en: QUALITY_SECTION.bullets,
    },
    ctaFaq: {
      de: QUALITY_SECTION.ctaFaq,
      en: QUALITY_SECTION.ctaFaq,
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
  const pick = <T,>(entry: LocaleValue<T>): T => {
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
    heroCtaNote: pick(HOME_STRINGS.heroCtaNote),
    heroCards: pick(HOME_STRINGS.heroCards),
    membershipHighlight: {
      title: pick(HOME_STRINGS.membershipHighlight.title),
      body: pick(HOME_STRINGS.membershipHighlight.body),
      button: pick(HOME_STRINGS.membershipHighlight.button),
      overline: pick(HOME_STRINGS.membershipHighlight.overline),
      asideTitle: pick(HOME_STRINGS.membershipHighlight.asideTitle),
      asideBody: pick(HOME_STRINGS.membershipHighlight.asideBody),
      shareLabel: pick(HOME_STRINGS.membershipHighlight.shareLabel),
      shareCopyLabel: pick(HOME_STRINGS.membershipHighlight.shareCopyLabel),
      shareWhatsappLabel: pick(HOME_STRINGS.membershipHighlight.shareWhatsappLabel),
      shareEmailLabel: pick(HOME_STRINGS.membershipHighlight.shareEmailLabel),
      shareSuccess: pick(HOME_STRINGS.membershipHighlight.shareSuccess),
      shareError: pick(HOME_STRINGS.membershipHighlight.shareError),
      shareText: pick(HOME_STRINGS.membershipHighlight.shareText),
    },
    heroVideoNote: pick(HOME_STRINGS.heroVideoNote),
    heroVideoLink: pick(HOME_STRINGS.heroVideoLink),
    audienceTitle: pick(HOME_STRINGS.audienceTitle),
    audienceLead: pick(HOME_STRINGS.audienceLead),
    audienceNote: pick(HOME_STRINGS.audienceNote),
    uspItems: pick(HOME_STRINGS.uspItems),
    demoSection: {
      overline: pick(HOME_STRINGS.demoSection.overline),
      title: pick(HOME_STRINGS.demoSection.title),
      lead: pick(HOME_STRINGS.demoSection.lead),
      note: pick(HOME_STRINGS.demoSection.note),
      items: pick(HOME_STRINGS.demoSection.items),
    },
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
      bullets: pick(HOME_STRINGS.qualitySection.bullets),
      ctaFaq: pick(HOME_STRINGS.qualitySection.ctaFaq),
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
