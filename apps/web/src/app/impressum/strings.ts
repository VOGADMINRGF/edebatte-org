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
    de: "Anbieterkennzeichnung für die digitalen Angebote von VoiceOpenGov nach den gesetzlichen Vorschriften (u. a. § 5 Digitale-Dienste-Gesetz (DDG) und § 18 Medienstaatsvertrag (MStV)).",
    en: "Provider identification for VoiceOpenGov’s digital services under applicable German law (including Section 5 Digitale-Dienste-Gesetz (DDG) and Section 18 Medienstaatsvertrag (MStV)).",
  },

  responsibleTitle: {
    de: "Diensteanbieter / Verantwortlich für den Inhalt:",
    en: "Service provider / Responsible for content:",
  },

  responsibleBody: {
    de: [
      "VoiceOpenGov – Initiative für digitale Beteiligung",
      "",
      "Diensteanbieter nach § 5 Digitale-Dienste-Gesetz (DDG):",
      "VoiceOpenGov UG (haftungsbeschränkt) i.G.",
      "Ricky G. Fleischer",
      "Kolonnenstraße 8",
      "10827 Berlin",
      "Deutschland",
      "",
      "Projekt- und Gründungsstatus",
      "VoiceOpenGov wird derzeit als privates Vorgründungsprojekt von Ricky G. Fleischer betrieben.",
      "Die Gründung der VoiceOpenGov UG (haftungsbeschränkt) i.G. und ggf. weiterer Gesellschaften (z. B. Verein, Partei, Mediengesellschaft) ist in Vorbereitung.",
      "Nach Eintragung im Handelsregister werden Firma, Rechtsform, Registergericht, Registernummer, vertretungsberechtigte Personen",
      "sowie ggf. USt-IdNr. an dieser Stelle unverzüglich ergänzt.",
      "",
      "Rechtsträger / Organisationsformen",
      "Die digitalen Angebote von VoiceOpenGov können künftig ganz oder teilweise durch unterschiedliche Rechtsträger betrieben werden",
      "(z. B. UG (haftungsbeschränkt), eingetragener Verein, Partei, Mediengesellschaft).",
      "Werden einzelne Teilangebote durch andere Rechtsträger verantwortet, werden diese im jeweiligen Angebot oder in einer ergänzenden Anbieterkennzeichnung ausdrücklich benannt.",
      "",
      "Gerichtsstand",
      "Soweit gesetzlich zulässig, ist Berlin Gerichtsstand.",
    ].join("\n"),

    en: [
      "VoiceOpenGov – Initiative for Digital Participation",
      "",
      "Service provider pursuant to Section 5 German Digitale-Dienste-Gesetz (DDG):",
      "VoiceOpenGov UG (haftungsbeschränkt) i.G.",
      "Ricky G. Fleischer",
      "Kolonnenstraße 8",
      "10827 Berlin",
      "Germany",
      "",
      "Project and formation status",
      "VoiceOpenGov is currently operated as a private pre-incorporation project by Ricky G. Fleischer.",
      "The incorporation of VoiceOpenGov UG (haftungsbeschränkt) i.G. and potentially further entities (e.g. association, political party, media company) is being prepared.",
      "Once registered, the company details (legal form, register court, registration number, managing directors",
      "and VAT ID, where applicable) will be added here without delay.",
      "",
      "Legal entities / organisational forms",
      "VoiceOpenGov’s digital services may in future be operated in whole or in part by different legal entities",
      "(e.g. UG (haftungsbeschränkt), registered association, political party, media company).",
      "If certain services are operated by other entities, these will be explicitly identified in the respective service or in a supplementary provider identification.",
      "",
      "Place of jurisdiction",
      "To the extent permitted by law, the place of jurisdiction is Berlin.",
    ].join("\n"),
  },

  legalTitle: {
    de: "Verantwortlich im Sinne von § 18 Abs. 2 MStV und der einschlägigen Presseregelungen:",
    en: "Person responsible for editorial content pursuant to Section 18 (2) MStV and applicable press laws:",
  },

  legalBody: {
    de: [
      "VoiceOpenGov UG (haftungsbeschränkt) i.G.",
      "Ricky G. Fleischer",
      "Kolonnenstraße 8",
      "10827 Berlin",
      "Deutschland",
      "(Anschrift wie oben)",
    ].join("\n"),

    en: [
      "VoiceOpenGov UG (haftungsbeschränkt) i.G.",
      "Ricky G. Fleischer",
      "Kolonnenstraße 8",
      "10827 Berlin",
      "Germany",
      "(Address as above)",
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
      "Ein Teil der Inhalte auf VoiceOpenGov wird von Nutzer:innen erstellt (z. B. Beiträge, Kommentare, Abstimmungen, Streams).",
      "Diese Inhalte spiegeln nicht zwingend die Position von VoiceOpenGov oder von Ricky G. Fleischer wider.",
      "Nutzer:innen sind für ihre eigenen Inhalte selbst verantwortlich.",
      "Rechtswidrige Inhalte können über die vorgesehenen Meldewege gemeldet werden; sie werden nach Prüfung im Rahmen der gesetzlichen Vorgaben entfernt oder gesperrt.",
      "",
      "Urheberrecht",
      "Die auf diesen Seiten veröffentlichten Inhalte und Werke (insbesondere Texte, Grafiken, Code-Snippets, Audio- und Video-Inhalte)",
      "unterliegen dem deutschen Urheberrecht, sofern nicht ausdrücklich anders gekennzeichnet.",
      "Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der gesetzlichen Schranken des Urheberrechts",
      "bedürfen der vorherigen schriftlichen Zustimmung von Ricky G. Fleischer bzw. VoiceOpenGov.",
      "Downloads und Kopien sind nur für den privaten, nicht kommerziellen Gebrauch zulässig, soweit keine andere Lizenz (z. B. Creative Commons) angegeben ist.",
      "",
      "Mitgliedschaften, Beiträge und finanzielle Unterstützung",
      "Über VoiceOpenGov können derzeit Unterstützungs- bzw. Mitgliedschaftsmodelle angeboten werden.",
      "Vertragspartner ist – bis zur Eintragung einer eigenen Gesellschaft – Ricky G. Fleischer als natürliche Person.",
      "Die eingehenden Beiträge werden projektbezogen verwendet und getrennt von privaten Mitteln erfasst.",
      "Derzeit werden keine Spendenquittungen ausgestellt; Beiträge sind in der Regel nicht steuerlich absetzbar und gelten nicht als Spenden im steuerlichen Sinne.",
      "Konkrete Konditionen (z. B. Beitragshöhe, Laufzeit, Kündigungsfristen) ergeben sich aus den jeweils kommunizierten Angebots- und Vertragsbedingungen.",
      "",
      "Hinweis nach § 36 Verbraucherstreitbeilegungsgesetz (VSBG)",
      "Ricky G. Fleischer / VoiceOpenGov ist weder verpflichtet noch bereit, an Streitbeilegungsverfahren",
      "vor einer Verbraucherschlichtungsstelle teilzunehmen.",
      "",
      "Geltungsbereich / internationale Nutzung",
      "Dieses Impressum gilt für die digitalen Angebote von VoiceOpenGov unter der Domain voiceopengov.org",
      "(einschließlich Subdomains) sowie für etwaige mobile Apps und offizielle Auftritte auf Plattformen Dritter",
      "(z. B. TikTok, Instagram, YouTube, X/Twitter, LinkedIn), soweit dort auf dieses Impressum verwiesen wird.",
      "Es findet deutsches Recht Anwendung; zwingende Verbraucherschutzvorschriften des Staates,",
      "in dem Nutzer:innen ihren gewöhnlichen Aufenthalt haben, bleiben unberührt.",
      "",
      "Datenschutz, Cookies und Telemetrie",
      "Informationen zur Verarbeitung personenbezogener Daten, zur Nutzung von Cookies, vergleichbaren Technologien",
      "und zu Telemetrie- bzw. Tracking-Diensten nach DSGVO und TDDDG finden Sie in unserer Datenschutzerklärung unter /datenschutz.",
      "",
      "Sprachfassungen",
      "Dieses Impressum ist in deutscher und teilweise in englischer Sprache verfügbar.",
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
      "Some content on VoiceOpenGov is created by users (e.g. posts, comments, votes, streams).",
      "Such content does not necessarily reflect the position of VoiceOpenGov or of Ricky G. Fleischer.",
      "Users are responsible for their own content.",
      "Unlawful content can be reported via the designated channels; such content will be removed or blocked after review in accordance with legal requirements.",
      "",
      "Copyright",
      "The content and works published on these pages (in particular texts, graphics, code snippets, audio and video content)",
      "are subject to German copyright law unless expressly stated otherwise.",
      "Any reproduction, processing, distribution or other utilisation outside the limits of copyright law",
      "requires prior written consent by Ricky G. Fleischer or VoiceOpenGov.",
      "Downloads and copies are permitted only for private, non-commercial use, unless another licence (e.g. Creative Commons) is indicated.",
      "",
      "Memberships, contributions and financial support",
      "VoiceOpenGov currently offers support and membership models.",
      "Until a separate legal entity has been incorporated, the contractual partner is Ricky G. Fleischer as a natural person.",
      "Incoming contributions are used for the project and accounted for separately from private funds.",
      "No donation receipts are currently issued; contributions are generally not treated as tax-deductible charitable donations.",
      "Specific terms (such as contribution amounts, duration and termination) are defined in the respective offer and contract conditions.",
      "",
      "Consumer dispute resolution (Section 36 VSBG)",
      "Ricky G. Fleischer / VoiceOpenGov is neither obliged nor willing to participate in dispute resolution",
      "proceedings before a consumer arbitration board.",
      "",
      "Scope / international use",
      "This legal notice applies to VoiceOpenGov’s digital services under the domain voiceopengov.org",
      "(including subdomains) as well as to any mobile apps and official presences on third-party platforms",
      "(e.g. TikTok, Instagram, YouTube, X/Twitter, LinkedIn) where reference is made to this legal notice.",
      "German law shall apply; mandatory consumer protection provisions of the country in which users have their",
      "habitual residence remain unaffected.",
      "",
      "Data protection, cookies and telemetry",
      "Information on the processing of personal data and on the use of cookies, similar technologies and",
      "telemetry/tracking services under the GDPR and TDDDG can be found in our privacy policy at /datenschutz.",
      "",
      "Language versions",
      "This legal notice is available in German and partly in English.",
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
