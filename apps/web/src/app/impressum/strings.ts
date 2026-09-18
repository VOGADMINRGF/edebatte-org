import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleValue<T> = Record<"de", T> & Partial<Record<SupportedLocale, T>>;

const STRINGS: {
  title: LocaleValue<string>;
  intro: LocaleValue<string>;
  responsibleTitle: LocaleValue<string>;
  responsibleBody: LocaleValue<string>;
  legalTitle: LocaleValue<string>;
  legalBody: LocaleValue<string>;
  disclaimerTitle: LocaleValue<string>;
  disclaimerBody: LocaleValue<string>;
  emailLabel: LocaleValue<string>;
} = {
  title: {
    de: "Impressum",
    en: "Legal Notice",
  },

  intro: {
    de: [
      "Anbieterkennzeichnung für die digitalen Angebote von eDebatte.",
      "eDebatte ist ein Angebot der Initiative VoiceOpenGov.",
      "Zentrale Anbieterinformationen und Kontakt: voiceopengov.org (Impressum/Datenschutz).",
      "Rechtsgrundlagen u. a. § 5 Digitale-Dienste-Gesetz (DDG) und § 18 Medienstaatsvertrag (MStV).",
    ].join(" "),
    en: [
      "Provider identification for eDebatte’s digital services.",
      "eDebatte is a service of the VoiceOpenGov initiative.",
      "Central provider info and contact: voiceopengov.org (legal notice/privacy).",
      "Legal basis includes Section 5 DDG and Section 18 MStV.",
    ].join(" "),
  },

  responsibleTitle: {
    de: "Anbieter / Diensteanbieter (gem. § 5 DDG):",
    en: "Provider / Service provider (Section 5 DDG):",
  },

  responsibleBody: {
    de: [
      "eDebatte – Digitale Entscheidungs- & Beteiligungsplattform",
      "(ein Angebot von VoiceOpenGov)",
      "",
      "Anbieter / Diensteanbieter:",
      "Ricky G. Fleischer",
      "(natürliche Person; VoiceOpenGov ist eine Initiative von Ricky G. Fleischer)",
      "Clara-Müller-Jahnke-Str. 41",
      "12589 Berlin",
      "Deutschland",
      "",
      "Kontakt (zentral):",
      "E-Mail: impressum@voiceopengov.org",
      "Weitere Infos: voiceopengov.org",
      "",
      "Hinweis zum Status",
      "eDebatte wird aktuell ohne eigene Gesellschaft als Angebot innerhalb der Initiative VoiceOpenGov von Ricky G. Fleischer als natürlicher Person betrieben.",
      "Eine eDebatte.org GmbH, VOG Holding oder ein sonstiger separater Rechtsträger ist derzeit nicht Anbieter oder Vertragspartner.",
      "Wenn künftig ein eigener Rechtsträger einzelne Angebote übernimmt, werden Anbieter-, Vertrags- und Zahlungsangaben zum wirksamen Umstellungszeitpunkt aktualisiert.",
      "",
      "Gerichtsstand",
      "Soweit gesetzlich zulässig, ist Berlin Gerichtsstand.",
    ].join("\n"),

    en: [
      "eDebatte – Digital decision & participation platform",
      "(a service of VoiceOpenGov)",
      "",
      "Provider / service provider:",
      "Ricky G. Fleischer",
      "(natural person; VoiceOpenGov is an initiative by Ricky G. Fleischer)",
      "Clara-Müller-Jahnke-Str. 41",
      "12589 Berlin",
      "Germany",
      "",
      "Contact (central):",
      "E-mail: impressum@voiceopengov.org",
      "More info: voiceopengov.org",
      "",
      "Status note",
      "eDebatte is currently operated without a separate company as a service within the VoiceOpenGov initiative by Ricky G. Fleischer as a natural person.",
      "No eDebatte.org GmbH, VOG Holding or other separate legal entity is currently the provider or contractual partner.",
      "If a separate legal entity takes over individual services in the future, provider, contract and payment details will be updated as of the effective transition date.",
      "",
      "Place of jurisdiction",
      "To the extent permitted by law, the place of jurisdiction is Berlin.",
    ].join("\n"),
  },

  legalTitle: {
    de: "Verantwortlich i.S.d. § 18 Abs. 2 MStV (journalistisch-redaktionelle Inhalte):",
    en: "Responsible for editorial content (Section 18 (2) MStV):",
  },

  legalBody: {
    de: [
      "Ricky G. Fleischer",
      "Clara-Müller-Jahnke-Str. 41",
      "12589 Berlin",
      "Deutschland",
    ].join("\n"),

    en: [
      "Ricky G. Fleischer",
      "Clara-Müller-Jahnke-Str. 41",
      "12589 Berlin",
      "Germany",
    ].join("\n"),
  },

  disclaimerTitle: {
    de: "Rechtliche Hinweise, Haftung, Urheberrecht, Mitgliedschaften und Datenschutz:",
    en: "Legal information, liability, copyright, memberships and data protection:",
  },

  disclaimerBody: {
    de: [
      "Haftung für eigene Inhalte",
      "Als Diensteanbieter sind wir nach den allgemeinen Gesetzen für eigene Inhalte dieser digitalen Dienste verantwortlich.",
      "Wir übernehmen keine Gewähr für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Informationen.",
      "Als Beta- oder Prototyp-Funktionen gekennzeichnete Bereiche können sich jederzeit ändern oder vorübergehend abgeschaltet werden.",
      "",
      "Haftung für Links",
      "Unser Angebot kann Links zu externen Websites Dritter enthalten, auf deren Inhalte wir keinen Einfluss haben.",
      "Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.",
      "Zum Zeitpunkt der Verlinkung waren keine rechtswidrigen Inhalte erkennbar.",
      "Bei Bekanntwerden von Rechtsverletzungen werden derartige Links unverzüglich entfernt.",
      "",
      "Nutzer:innen-Inhalte / Plattformcharakter",
      "Ein Teil der Inhalte auf eDebatte wird von Nutzer:innen erstellt (z. B. Beiträge, Kommentare, Abstimmungen).",
      "Diese Inhalte spiegeln nicht zwingend die Position von VoiceOpenGov oder von Ricky G. Fleischer wider.",
      "Nutzer:innen sind für ihre eigenen Inhalte selbst verantwortlich.",
      "Rechtswidrige Inhalte können über die vorgesehenen Meldewege gemeldet werden; sie werden nach Prüfung im Rahmen der gesetzlichen Vorgaben entfernt oder gesperrt.",
      "",
      "Urheberrecht",
      "Die auf diesen Seiten veröffentlichten Inhalte und Werke (insbesondere Texte, Grafiken, Code-Snippets, Audio- und Video-Inhalte)",
      "unterliegen dem deutschen Urheberrecht, sofern nicht ausdrücklich anders gekennzeichnet.",
      "Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der gesetzlichen Schranken des Urheberrechts",
      "bedürfen der vorherigen schriftlichen Zustimmung von Ricky G. Fleischer.",
      "Downloads und Kopien sind nur für den privaten, nicht kommerziellen Gebrauch zulässig, soweit keine andere Lizenz (z. B. Creative Commons) angegeben ist.",
      "",
      "Mitgliedschaft, kostenpflichtige Leistungen und freiwillige Unterstützung",
      "Die Mitgliedschaft bei VoiceOpenGov ist derzeit kostenfrei.",
      "Freiwillige Unterstützung von VoiceOpenGov und kostenpflichtige eDebatte-Pakete sind getrennte Vorgänge und verleihen keine zusätzlichen Stimm- oder Beteiligungsrechte.",
      "Vertragspartner und Zahlungsempfänger für derzeit über diese Angebote abgewickelte Zahlungen ist bis zur wirksamen Umstellung auf einen separaten Rechtsträger Ricky G. Fleischer als natürliche Person.",
      "Derzeit werden keine Spendenquittungen oder Zuwendungsbestätigungen ausgestellt; VoiceOpenGov-Unterstützungen werden nicht als steuerbegünstigte Spenden angeboten.",
      "Umsatzsteuer wird auf Rechnungen nur ausgewiesen, soweit sie nach dem für den jeweiligen Leistungsvorgang geltenden Steuerstatus geschuldet wird.",
      "",
      "Hinweis nach § 36 Verbraucherstreitbeilegungsgesetz (VSBG)",
      "Ricky G. Fleischer / VoiceOpenGov ist weder verpflichtet noch bereit, an Streitbeilegungsverfahren",
      "vor einer Verbraucherschlichtungsstelle teilzunehmen.",
      "",
      "Geltungsbereich / Verweis auf voiceopengov.org",
      "Dieses Impressum gilt ergänzend für eDebatte als Angebot von VoiceOpenGov.",
      "Zentrale Anbieterinformationen und rechtliche Seiten (Impressum/Datenschutz) werden unter voiceopengov.org vorgehalten.",
      "",
      "Datenschutz, Cookies und Telemetrie",
      "Informationen zur Verarbeitung personenbezogener Daten sowie zur Nutzung von Cookies und vergleichbaren Technologien",
      "finden Sie in der Datenschutzerklärung unter voiceopengov.org/datenschutz.",
      "",
      "Sprachfassungen",
      "Rechtlich maßgeblich ist ausschließlich die deutsche Fassung; die englische Übersetzung dient lediglich der besseren Verständlichkeit.",
    ].join("\n"),

    en: [
      "Liability for own content",
      "In accordance with general law we are responsible for our own content on these digital services.",
      "We do not assume any guarantee for the accuracy, completeness or up-to-dateness of the information provided.",
      "Areas marked as beta or prototype features may change at any time or be temporarily unavailable.",
      "",
      "Liability for links",
      "Our services may contain links to external third-party websites. We have no influence on their content.",
      "The respective provider or operator of the pages is always responsible for the content of the linked pages.",
      "At the time of linking, no illegal content was recognisable.",
      "If we become aware of legal violations, such links will be removed without delay.",
      "",
      "User-generated content / platform character",
      "Some content on eDebatte is created by users (e.g. posts, comments, votes).",
      "Such content does not necessarily reflect the position of VoiceOpenGov or of Ricky G. Fleischer.",
      "Users are responsible for their own content.",
      "Unlawful content can be reported via the designated channels; such content will be removed or blocked after review in accordance with legal requirements.",
      "",
      "Copyright",
      "The content and works published on these pages (in particular texts, graphics, code snippets, audio and video content)",
      "are subject to German copyright law unless expressly stated otherwise.",
      "Any reproduction, processing, distribution or other utilisation outside the limits of copyright law",
      "requires prior written consent by Ricky G. Fleischer.",
      "Downloads and copies are permitted only for private, non-commercial use, unless another licence (e.g. Creative Commons) is indicated.",
      "",
      "Membership, paid services and voluntary support",
      "VoiceOpenGov membership is currently free of charge.",
      "Voluntary VoiceOpenGov support and paid eDebatte packages are separate transactions and do not grant additional voting or participation rights.",
      "Until an effective transition to a separate legal entity, Ricky G. Fleischer as a natural person is the contractual partner and payment recipient for payments currently processed through these services.",
      "No donation receipts or charitable contribution certificates are currently issued; VoiceOpenGov support is not offered as a tax-privileged charitable donation.",
      "VAT is shown on invoices only where it is legally due under the tax status applicable to the respective transaction.",
      "",
      "Consumer dispute resolution (Section 36 VSBG)",
      "Ricky G. Fleischer / VoiceOpenGov is neither obliged nor willing to participate in dispute resolution",
      "proceedings before a consumer arbitration board.",
      "",
      "Scope / reference to voiceopengov.org",
      "This legal notice also applies to eDebatte as a service of VoiceOpenGov.",
      "Central legal pages (legal notice/privacy) are maintained at voiceopengov.org.",
      "",
      "Data protection, cookies and telemetry",
      "Information on the processing of personal data and the use of cookies and similar technologies",
      "can be found in the privacy policy at voiceopengov.org/datenschutz.",
      "",
      "Language versions",
      "Only the German version is legally binding. The English translation is provided for convenience only.",
    ].join("\n"),
  },

  emailLabel: {
    de: "impressum@voiceopengov.org",
    en: "impressum@voiceopengov.org",
  },
};

function pick<T>(entry: LocaleValue<T>, locale: SupportedLocale | string): T {
  const normalized = (locale || DEFAULT_LOCALE) as SupportedLocale;
  return (entry[normalized] ?? entry.en ?? entry.de) as T;
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
