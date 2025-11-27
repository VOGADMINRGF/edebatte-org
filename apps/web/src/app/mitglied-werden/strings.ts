"use client";

import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleString = Record<"de", string> & Partial<Record<SupportedLocale, string>>;
type LocaleStringArray = Record<"de", string[]> & Partial<Record<SupportedLocale, string[]>>;

const STRINGS = {
  heroTitle: { de: "Mitglied werden – Teil der Bewegung" } as LocaleString,
  heroIntro: {
    de: "VoiceOpenGov ist eine weltweite Initiative, die länderübergreifend wachsen will – unabhängig von Stiftungen, Großvermögen oder staatlichen/EU-Förderprogrammen. Deine Mitgliedschaft finanziert Moderation, Faktenaufbereitung und öffentliche Audit-Trails, nicht Werbung oder Paywalls.",
  } as LocaleString,
  transparencyTitle: { de: "Wichtiger Hinweis zur Transparenz" } as LocaleString,
  transparencyBody: {
    de: "Diese Mitgliedschaft betrifft ausschließlich die VoiceOpenGov-Bewegung – nicht das Nutzungsmodell der eDebatte-App. Wir stellen keine Spendenquittungen aus, erhalten keine staatlichen/EU-Förderungen und versteuern Einnahmen regulär. Wir finanzieren uns über viele Mitglieder, nicht über wenige Großzahler:innen. Abstimmungen folgen immer dem Prinzip „eine Person, eine Stimme“. Das eDebatte-Pricing findest du separat unter unserem Nutzungsmodell.",
  } as LocaleString,
  enableTitle: { de: "Was du mit deiner Mitgliedschaft ermöglichst" } as LocaleString,
  enableList: {
    de: [
      "Früher Zugang zu Reports & Voting-Ergebnissen – nicht exklusiv, sondern frühzeitig.",
      "Einblick in Plattform-Entwicklung und Roadmap über öffentliche Sessions.",
      "Community-Formate für Mitglieder: Online-Debatten, Beteiligungswerkstätten, Q&A.",
      "Stabiler Betrieb der Infrastruktur: Server, Moderation, Fact-Checking, Bildungsformate für Schulen & Kommunen.",
    ],
  } as LocaleStringArray,
  tiersTitle: { de: "Orientierung für Mitgliedsstufen" } as LocaleString,
  tiersIntro: {
    de: "Du kannst jeden anderen Betrag wählen – diese Stufen dienen nur als Orientierung, was dein Beitrag ungefähr ermöglicht:",
  } as LocaleString,
  tiersList: {
    de: [
      "<strong>5,63 €</strong> – Basis: demokratische Grundversorgung mittragen, orientiert am Regelsatz (ALG II / Bürgergeld).",
      "<strong>10 €</strong> – Aktiv: mehr Moderationszeit, bessere Begleitung von Abstimmungen und Auswertungen.",
      "<strong>25 €</strong> – Engagement: Testphasen in neuen Regionen (Kommunen, Schulen, Initiativen) ermöglichen.",
      "<strong>50 €+</strong> – Solidarisch: niedrigere Beiträge für andere querfinanzieren, etwa für Menschen mit geringem Einkommen.",
    ],
  } as LocaleStringArray,
  calculatorTitle: { de: "Beitrag berechnen – VoiceOpenGov" } as LocaleString,
  calculatorIntro: {
    de: "Empfehlung: 1 % vom frei verfügbaren Haushaltseinkommen (Netto minus Warmmiete), mindestens 5,63 € pro Person ab 16 Jahren. Dieser Betrag entspricht dem sozial verträglichen Minimum, an dem wir uns orientieren.",
  } as LocaleString,
  householdNetLabel: { de: "Haushaltsnetto (€/Monat)" } as LocaleString,
  householdNetPlaceholder: { de: "z. B. 2400" } as LocaleString,
  warmRentLabel: { de: "Warmmiete (€/Monat)" } as LocaleString,
  warmRentPlaceholder: { de: "z. B. 900" } as LocaleString,
  suggestionTitle: { de: "Vorschlag pro Person" } as LocaleString,
  suggestionNote: {
    de: "basierend auf deinen Angaben und mindestens dem orientierenden Basisbeitrag",
  } as LocaleString,
  suggestionButton: { de: "Vorschlag übernehmen" } as LocaleString,
  perPersonLabel: { de: "Beitrag pro Person / Mitglied" } as LocaleString,
  perPersonCustomSuffix: { de: "€/Monat" } as LocaleString,
  householdSizeLabel: { de: "Haushaltsgröße (≥ 16 Jahre)" } as LocaleString,
  rhythmLabel: { de: "Rhythmus" } as LocaleString,
  rhythmMonthly: { de: "monatlich" } as LocaleString,
  rhythmOnce: { de: "einmalig" } as LocaleString,
  skillsLabel: { de: "Fähigkeiten (optional)" } as LocaleString,
  skillsPlaceholder: { de: "z. B. Moderation, Design, Tech …" } as LocaleString,
  summaryTitle: { de: "Zusammenfassung" } as LocaleString,
  summaryPerPerson: { de: "Beitrag pro Person" } as LocaleString,
  summaryCount: { de: "Anzahl Personen (≥ 16 Jahre)" } as LocaleString,
  summarySkills: { de: "Fähigkeiten" } as LocaleString,
  summaryBoxLabel: { de: "Beitrag gesamt" } as LocaleString,
  summaryBoxNote: {
    de: "Der Rechner soll dir ein Gefühl für einen fairen Beitrag geben. Du kannst deinen Betrag jederzeit anpassen – nach oben oder unten.",
  } as LocaleString,
  summaryButton: { de: "Weiter zum Antrag" } as LocaleString,
  finalTitle: { de: "Mehr als ein Beitrag – wie du noch mitmachen kannst" } as LocaleString,
  finalIntro: {
    de: "Ohne Mitglieder, Unterstützer:innen und Partner funktioniert das alles nicht. Wenn dich die Idee überzeugt, kannst du auf drei Arten einsteigen – als Bürger:in, als politische Vertretung oder als Redaktion/Creator:",
  } as LocaleString,
  finalList: {
    de: [
      {
        label: "Für Bürger:innen:",
        body: "Mitglied werden, Anliegen einbringen, an Abstimmungen teilnehmen und andere mit ins Boot holen.",
      },
      {
        label: "Für Politik & Verbände:",
        body: "Dossiers und Meinungsbilder nutzen, Verfahren gemeinsam testen und auf weitere Regionen übertragen – ohne Einfluss auf Regeln oder Ergebnisse zu kaufen.",
      },
      {
        label: "Für Journalist:innen & Presse:",
        body: "aktuelle Themen, Fragenschablonen und Daten für Beiträge, Podcasts, Streams oder Social-Media-Formate – mit offener Methodik und klarer Trennung von Faktenlage und Kommentar.",
      },
    ],
  } as Record<"de", { label: string; body: string }[]> & Partial<Record<SupportedLocale, { label: string; body: string }[]>>,
  creatorBox: {
    de: "Wenn du zusätzlich zu deiner Mitgliedschaft als VOG-Creator bzw. VOG-Repräsentant:in, als Institution oder Redaktion enger zusammenarbeiten möchtest, kannst du dich direkt über unsere Team-Seite melden. Gemeinsam klären wir, welches Setup für dich passt.",
  } as LocaleString,
  creatorButtons: {
    de: [
      { label: "VOG-Creator / VOG-Repräsentant:in bewerben", href: "/team?focus=creator", variant: "primary" },
      { label: "Für Politik & Verbände", href: "/team?focus=politik", variant: "secondary" },
      { label: "Für Journalist:innen & Presse", href: "/team?focus=medien", variant: "secondary" },
    ],
  } as Record<"de", { label: string; href: string; variant: "primary" | "secondary" }[]> &
    Partial<Record<SupportedLocale, { label: string; href: string; variant: "primary" | "secondary" }[]>>,
  membershipAppTitle: {
    de: "Mitgliedschaft + eDebatte-App",
  } as LocaleString,
  membershipAppBody: {
    de: "VOG-Mitglieder erhalten einen festen Nachlass auf eDebatte-App-Pakete und künftig auf den Merchandise-Shop. Die Mitgliedschaft bleibt ideell – App-Pakete werden separat fakturiert und später technisch verknüpft.",
  } as LocaleString,
  merchNote: {
    de: "Sobald unser Merchandise-Shop startet, gilt derselbe Nachlass automatisch auch dort für Mitglieder.",
  } as LocaleString,
} as const;

function pick<T>(entry: Record<"de", T> & Partial<Record<SupportedLocale, T>>, locale: SupportedLocale | string): T {
  const normalized = (locale || DEFAULT_LOCALE) as SupportedLocale;
  return entry[normalized] ?? entry.de;
}

export function getMembershipStrings(locale: SupportedLocale | string) {
  return {
    heroTitle: pick(STRINGS.heroTitle, locale),
    heroIntro: pick(STRINGS.heroIntro, locale),
    transparencyTitle: pick(STRINGS.transparencyTitle, locale),
    transparencyBody: pick(STRINGS.transparencyBody, locale),
    enableTitle: pick(STRINGS.enableTitle, locale),
    enableList: pick(STRINGS.enableList, locale),
    tiersTitle: pick(STRINGS.tiersTitle, locale),
    tiersIntro: pick(STRINGS.tiersIntro, locale),
    tiersList: pick(STRINGS.tiersList, locale),
    calculatorTitle: pick(STRINGS.calculatorTitle, locale),
    calculatorIntro: pick(STRINGS.calculatorIntro, locale),
    householdNetLabel: pick(STRINGS.householdNetLabel, locale),
    householdNetPlaceholder: pick(STRINGS.householdNetPlaceholder, locale),
    warmRentLabel: pick(STRINGS.warmRentLabel, locale),
    warmRentPlaceholder: pick(STRINGS.warmRentPlaceholder, locale),
    suggestionTitle: pick(STRINGS.suggestionTitle, locale),
    suggestionNote: pick(STRINGS.suggestionNote, locale),
    suggestionButton: pick(STRINGS.suggestionButton, locale),
    perPersonLabel: pick(STRINGS.perPersonLabel, locale),
    perPersonCustomSuffix: pick(STRINGS.perPersonCustomSuffix, locale),
    householdSizeLabel: pick(STRINGS.householdSizeLabel, locale),
    rhythmLabel: pick(STRINGS.rhythmLabel, locale),
    rhythmMonthly: pick(STRINGS.rhythmMonthly, locale),
    rhythmOnce: pick(STRINGS.rhythmOnce, locale),
    skillsLabel: pick(STRINGS.skillsLabel, locale),
    skillsPlaceholder: pick(STRINGS.skillsPlaceholder, locale),
    summaryTitle: pick(STRINGS.summaryTitle, locale),
    summaryPerPerson: pick(STRINGS.summaryPerPerson, locale),
    summaryCount: pick(STRINGS.summaryCount, locale),
    summarySkills: pick(STRINGS.summarySkills, locale),
    summaryBoxLabel: pick(STRINGS.summaryBoxLabel, locale),
    summaryBoxNote: pick(STRINGS.summaryBoxNote, locale),
    summaryButton: pick(STRINGS.summaryButton, locale),
    finalTitle: pick(STRINGS.finalTitle, locale),
    finalIntro: pick(STRINGS.finalIntro, locale),
    finalList: pick(STRINGS.finalList, locale),
    creatorBox: pick(STRINGS.creatorBox, locale),
    creatorButtons: pick(STRINGS.creatorButtons, locale),
    membershipAppTitle: pick(STRINGS.membershipAppTitle, locale),
    membershipAppBody: pick(STRINGS.membershipAppBody, locale),
    merchNote: pick(STRINGS.merchNote, locale),
  };
}
