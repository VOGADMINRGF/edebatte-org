import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleValue<T> = Record<"de", T> & Partial<Record<SupportedLocale, T>>;

export type PrivacyDataPoint = {
  label: string;
  description: string;
};

const STRINGS = {
  title: {
    de: "Datenschutz",
    en: "Privacy Policy",
  } as LocaleValue<string>,

  intro: {
    de: "VoiceOpenGov ist eine Initiative – keine Partei, kein Verein und keine Stiftung. Wir verarbeiten personenbezogene Daten so sparsam wie möglich und passen diese Hinweise an, sobald sich Funktionen oder rechtliche Rahmenbedingungen ändern. Diese Hinweise sollen einen Überblick nach Art. 12 ff. DSGVO geben und ersetzen keine individuelle Rechtsberatung.",
    en: "VoiceOpenGov is an initiative – not a party, association or foundation. We process personal data as sparingly as possible and update this notice whenever features or legal requirements change. This notice is intended to provide an overview under Arts. 12 et seq. GDPR and does not constitute individual legal advice.",
  } as LocaleValue<string>,

  controllerTitle: {
    de: "Verantwortliche Stelle",
    en: "Controller",
  } as LocaleValue<string>,

  controllerBody: {
    de: [
      "Verantwortlich für die Verarbeitung personenbezogener Daten im Rahmen dieser Website und der angebundenen Dienste ist:",
      "",
      "VoiceOpenGov UG (haftungsbeschränkt) i.G.",
      "Ricky G. Fleischer",
      "Kolonnenstraße 8",
      "10827 Berlin",
      "Deutschland",
      "",
      "E-Mail: privacy@voiceopengov.org",
    ].join("\n"),
    en: [
      "The controller responsible for processing personal data in connection with this website and related services is:",
      "",
     "VoiceOpenGov UG (haftungsbeschränkt) i.G.",
      "Ricky G. Fleischer",
      "Kolonnenstraße 8",
      "10827 Berlin",
      "Germany",
      "",
      "E-mail: privacy@voiceopengov.org",
    ].join("\n"),
  } as LocaleValue<string>,

  dataTitle: {
    de: "Welche Daten wir verarbeiten",
    en: "Which data we process",
  } as LocaleValue<string>,

  dataPoints: {
    de: [
      {
        label: "Account",
        description:
          "Basisdaten wie E-Mail-Adresse, Zugangsdaten, optionale Profilangaben und Einstellungen, die du in deinem Konto hinterlegst.",
      },
      {
        label: "Nutzung & Telemetrie",
        description:
          "Protokoll- und Telemetriedaten, um Stabilität, Sicherheit, Missbrauchserkennung und Fehleranalyse zu ermöglichen (z. B. Zeitstempel, technische Requests, ggf. IP-Adresse in gekürzter Form).",
      },
      {
        label: "Beteiligung & Abstimmungen",
        description:
          "Inhalte, die du beisteuerst (Beiträge, Kommentare, Kontextkarten, Bewertungen) sowie deine Stimmen und Beteiligungsaktionen, soweit sie im System gespeichert werden. Öffentliche Inhalte sind für andere Nutzer:innen sichtbar.",
      },
      {
        label: "Mitgliedschaften & Beiträge",
        description:
          "Daten zu Unterstützungs- oder Mitgliedschaftsmodellen, z. B. gewähltes Paket, Laufzeit, Zahlungsinformationen und Zahlungsstatus. Bei Zahlungen über Zahlungsdienstleister (z. B. Bank, PayPal) gelten zusätzlich deren Datenschutzbestimmungen.",
      },
      {
        label: "Kommunikation",
        description:
          "Inhalte aus Kontaktanfragen, Support-Nachrichten oder Feedback sowie die von dir angegebenen Kontaktdaten.",
      },
    ],
    en: [
      {
        label: "Account",
        description:
          "Basic account data such as e-mail address, login credentials, optional profile information and settings you store in your account.",
      },
      {
        label: "Usage & telemetry",
        description:
          "Log and telemetry data to ensure stability, security, abuse detection and debugging (e.g. timestamps, technical requests, possibly IP address in truncated form).",
      },
      {
        label: "Participation & votes",
        description:
          "Content you contribute (posts, comments, context cards, ratings) as well as your votes and participation actions to the extent they are stored in the system. Public content is visible to other users.",
      },
      {
        label: "Memberships & contributions",
        description:
          "Data relating to support or membership models, e.g. chosen package, term, payment information and payment status. For payments via payment service providers (e.g. bank, PayPal), their privacy policies also apply.",
      },
      {
        label: "Communication",
        description:
          "Content of contact requests, support messages or feedback and the contact details you provide.",
      },
    ],
  } as LocaleValue<PrivacyDataPoint[]>,

  cookiesTitle: {
    de: "Cookies, lokaler Speicher und Einwilligungen",
    en: "Cookies, local storage and consent",
  } as LocaleValue<string>,

  cookiesBody: {
    de: [
      "Für den Betrieb der Website verwenden wir technisch notwendige Cookies und vergleichbare Technologien (§ 25 Abs. 2 TDDDG), etwa um Logins, Sicherheitsfunktionen (z. B. CSRF-Schutz) und Lastverteilung zu ermöglichen.",
      "",
      "Optionale Cookies bzw. Speichertechnologien – etwa für Komfortfunktionen oder einfache Reichweitenmessung – setzen wir nur ein, wenn du im Cookie-Banner ausdrücklich eingewilligt hast (§ 25 Abs. 1 TDDDG i. V. m. Art. 6 Abs. 1 lit. a DSGVO). Du kannst deine Einwilligung über die Einstellungen im Banner jederzeit mit Wirkung für die Zukunft widerrufen.",
      "",
      "Wir verzichten aktuell auf Tracking-Cookies für Werbenetzwerke. Details zu den jeweils eingesetzten Diensten und Speicherdauern ergänzen wir, sobald neue Funktionen produktiv gehen.",
    ].join("\n"),
    en: [
      "We use technically necessary cookies and similar technologies (§ 25 (2) TDDDG) to operate this website, for example to enable logins, security features (such as CSRF protection) and load balancing.",
      "",
      "Optional cookies or storage technologies – for comfort features or simple reach measurement – are only used if you have explicitly consented via the cookie banner (§ 25 (1) TDDDG in conjunction with Art. 6 (1) (a) GDPR). You can withdraw your consent at any time with effect for the future via the banner settings.",
      "",
      "We currently do not use tracking cookies for advertising networks. Details on specific services and storage periods will be added as new features go live.",
    ].join("\n"),
  } as LocaleValue<string>,

  aiTitle: {
    de: "KI- und API-Nutzung",
    en: "Use of AI and APIs",
  } as LocaleValue<string>,

  aiBody: {
    de: [
      "Wir setzen ausgewählte KI- und API-Dienste ein, um Inhalte zu analysieren, zu strukturieren oder zu übersetzen (z. B. für Textanalyse, Moderation, Strukturierung von Beiträgen). Die Verarbeitung erfolgt dabei möglichst datensparsam; wo möglich, werden Inhalte pseudonymisiert oder gekürzt übertragen.",
      "",
      "Näheres zu den jeweils eingesetzten Anbietern, Datenkategorien, Rechtsgrundlagen und Schutzmechanismen findest du unter /ki-nutzung. KI trifft bei VoiceOpenGov keine Entscheidungen allein: Ergebnisse werden durch Regeln, Logs und – wo nötig – menschliche Prüfungen abgesichert.",
    ].join("\n"),
    en: [
      "We use selected AI and API services to analyse, structure or translate content (e.g. text analysis, moderation, structuring of contributions). We aim to minimise data and, where possible, use pseudonymisation or truncation before sending data to providers.",
      "",
      "Further details on the providers used, categories of data, legal bases and safeguards can be found at /ki-nutzung. AI does not make decisions on its own at VoiceOpenGov: results are constrained by rules, logs and – where necessary – human review.",
    ].join("\n"),
  } as LocaleValue<string>,

  rightsTitle: {
    de: "Deine Rechte",
    en: "Your rights",
  } as LocaleValue<string>,

  rightsIntro: {
    de: "Du hast im Rahmen der DSGVO insbesondere die folgenden Rechte gegenüber der verantwortlichen Stelle:",
    en: "Under the GDPR you have, in particular, the following rights vis-à-vis the controller:",
  } as LocaleValue<string>,

  rightsPoints: {
    de: [
      "Recht auf Auskunft (Art. 15 DSGVO) über die zu dir gespeicherten Daten.",
      "Recht auf Berichtigung (Art. 16 DSGVO), wenn Daten unrichtig oder unvollständig sind.",
      "Recht auf Löschung (Art. 17 DSGVO), soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.",
      "Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO).",
      "Recht auf Datenübertragbarkeit (Art. 20 DSGVO).",
      "Recht auf Widerspruch (Art. 21 DSGVO) gegen Verarbeitungen, die auf Art. 6 Abs. 1 lit. e oder f DSGVO beruhen.",
      "Recht, eine einmal erteilte Einwilligung jederzeit mit Wirkung für die Zukunft zu widerrufen (Art. 7 Abs. 3 DSGVO).",
    ],
    en: [
      "Right of access (Art. 15 GDPR) to the personal data we hold about you.",
      "Right to rectification (Art. 16 GDPR) if data is inaccurate or incomplete.",
      "Right to erasure (Art. 17 GDPR) where no legal retention obligations apply.",
      "Right to restriction of processing (Art. 18 GDPR).",
      "Right to data portability (Art. 20 GDPR).",
      "Right to object (Art. 21 GDPR) to processing based on Art. 6 (1) (e) or (f) GDPR.",
      "Right to withdraw consent at any time with effect for the future (Art. 7 (3) GDPR).",
    ],
  } as LocaleValue<string[]>,

  rightsComplaintHint: {
    de: [
      "Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren, wenn du der Ansicht bist, dass die Verarbeitung der dich betreffenden personenbezogenen Daten gegen die DSGVO verstößt. Zuständig ist z. B. die Aufsichtsbehörde an deinem Wohnort oder der Berliner Beauftragte für Datenschutz und Informationsfreiheit.",
    ].join("\n"),
    en: [
      "You also have the right to lodge a complaint with a data protection supervisory authority if you believe that the processing of personal data relating to you infringes the GDPR. You may contact, for example, the authority at your place of residence or the Berlin Commissioner for Data Protection and Freedom of Information.",
    ].join("\n"),
  } as LocaleValue<string>,

  contactTitle: {
    de: "Kontakt für Datenschutzanfragen",
    en: "Contact for privacy requests",
  } as LocaleValue<string>,

  contactBody: {
    de: [
      "Wenn du eines deiner Rechte wahrnehmen oder allgemein Fragen zur Datenverarbeitung bei VoiceOpenGov stellen möchtest, wende dich bitte an:",
      "",
      "VoiceOpenGov UG (haftungsbeschränkt) i.G.",
      "Ricky G. Fleischer",
      "Kolonnenstraße 8",
      "10827 Berlin",
      "Deutschland",
    ].join("\n"),
    en: [
      "If you wish to exercise any of your rights or have general questions about data processing at VoiceOpenGov, please contact:",
      "",
      "VoiceOpenGov UG (haftungsbeschränkt) i.G.",
      "Ricky G. Fleischer",
      "Kolonnenstraße 8",
      "10827 Berlin",
      "Deutschland",
    ].join("\n"),
  } as LocaleValue<string>,

  contactEmail: {
    de: "privacy@voiceopengov.org",
    en: "privacy@voiceopengov.org",
  } as LocaleValue<string>,
} as const;

function pick<T>(entry: LocaleValue<T>, locale: SupportedLocale | string): T {
  const normalized = (locale || DEFAULT_LOCALE) as SupportedLocale;
  return entry[normalized] ?? entry.de;
}

export function getPrivacyStrings(locale: SupportedLocale | string) {
  return {
    title: pick(STRINGS.title, locale),
    intro: pick(STRINGS.intro, locale),
    controllerTitle: pick(STRINGS.controllerTitle, locale),
    controllerBody: pick(STRINGS.controllerBody, locale),
    dataTitle: pick(STRINGS.dataTitle, locale),
    dataPoints: pick(STRINGS.dataPoints, locale),
    cookiesTitle: pick(STRINGS.cookiesTitle, locale),
    cookiesBody: pick(STRINGS.cookiesBody, locale),
    aiTitle: pick(STRINGS.aiTitle, locale),
    aiBody: pick(STRINGS.aiBody, locale),
    rightsTitle: pick(STRINGS.rightsTitle, locale),
    rightsIntro: pick(STRINGS.rightsIntro, locale),
    rightsPoints: pick(STRINGS.rightsPoints, locale),
    rightsComplaintHint: pick(STRINGS.rightsComplaintHint, locale),
    contactTitle: pick(STRINGS.contactTitle, locale),
    contactBody: pick(STRINGS.contactBody, locale),
    contactEmail: pick(STRINGS.contactEmail, locale),
  };
}
