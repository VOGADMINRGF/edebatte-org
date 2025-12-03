"use client";

import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleString = Record<"de", string> & Partial<Record<SupportedLocale, string>>;
type LocaleStringArray = Record<"de", string[]> & Partial<Record<SupportedLocale, string[]>>;

const STRINGS = {
  heroTitle: { de: "Mitglied werden – Teil der Bewegung" } as LocaleString,
  heroIntro: {
    de: "VoiceOpenGov ist eine unabhängige, weltweit wachsende Initiative. Deine Mitgliedschaft finanziert Moderation, den Evidenz-Graphen, Infrastruktur und öffentliche Audit-Trails – nicht Werbung, Paywalls oder parteipolitische Kampagnen.",
  } as LocaleString,

  transparencyTitle: { de: "Wichtiger Hinweis zur Transparenz" } as LocaleString,
  transparencyBody: {
    de: "VoiceOpenGov befindet sich in der Gründungsphase – umso wichtiger ist deine Unterstützung, ob monatlich, einmalig oder als Vorbestellung der eDebatte. Bis zur Eintragung gehen Beiträge über PayPal oder – bevorzugt – per Überweisung an das Konto des Initiators und werden strikt projektbezogen verbucht; wir stellen derzeit keine Spendenquittungen aus, Beiträge sind in der Regel nicht steuerlich absetzbar. VoiceOpenGov soll dauerhaft von vielen Privatpersonen getragen werden – nach dem Prinzip „eine Person, eine Stimme“; die eDebatte-Pakete, inklusive eDebatte Basis (kostenfrei), sind unten beschrieben und frei wählbar und zubuchbar.",
  } as LocaleString,

  enableTitle: { de: "Was du mit deiner Mitgliedschaft ermöglichst" } as LocaleString,
  enableList: {
    de: [
      "Moderierte, nachvollziehbare Verfahren mit klaren Regeln, Pro/Contra-Darstellungen, Quellenarbeit und öffentlichen Audit-Trails.",
      "Einen offenen Evidenz-Graphen, der Quellen, Argumente, Annahmen und Wirkungen zu einem belastbaren Faktennetz verbindet.",
      "Unabhängigen Betrieb der Plattform sowie Bildungs- und Beteiligungsformate für Schulen, Kommunen und Initiativen – damit demokratische Praxis vor Ort gestärkt wird.",
    ],
  } as LocaleStringArray,

  tiersTitle: { de: "Orientierung für Mitgliedsstufen" } as LocaleString,
  tiersIntro: {
    de: "Du kannst jeden anderen Betrag wählen – diese Stufen dienen nur als Orientierung, was dein Beitrag ungefähr ermöglicht:",
  } as LocaleString,
  tiersList: {
    de: [
      "<strong>5,63 €</strong> – Basis: demokratische Grundversorgung mittragen, orientiert am sozial verträglichen Mindestbeitrag.",
      "<strong>10 €</strong> – Aktiv: mehr Moderationszeit, bessere Begleitung von Abstimmungen und Auswertungen.",
      "<strong>25 €</strong> – Engagement: Testphasen und Formate in neuen Regionen (Kommunen, Schulen, Initiativen) ermöglichen.",
      "<strong>50 €+</strong> – Solidarisch: niedrigere Beiträge für andere querfinanzieren, etwa für Menschen mit geringem Einkommen.",
    ],
  } as LocaleStringArray,

  calculatorTitle: { de: "Beitrag berechnen – VoiceOpenGov" } as LocaleString,
  calculatorIntro: {
    de: "Empfehlung: 1 % vom frei verfügbaren Haushaltsnettoeinkommen (Netto minus Warmmiete), mindestens 5,63 € pro Person ab 16 Jahren. Dieser Betrag entspricht dem sozial verträglichen Minimum, an dem wir uns orientieren.",
  } as LocaleString,

  householdNetLabel: { de: "Haushaltsnetto (€/Monat)" } as LocaleString,
  householdNetPlaceholder: { de: "z. B. 2400" } as LocaleString,
  warmRentLabel: { de: "Warmmiete (€/Monat)" } as LocaleString,
  warmRentPlaceholder: { de: "z. B. 900" } as LocaleString,

  suggestionTitle: { de: "Vorgeschlagener Beitrag pro Person" } as LocaleString,
  suggestionNote: {
    de: "basierend auf deinen Angaben und mindestens dem orientierenden Basisbeitrag von 5,63 €.",
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
  summaryMembershipHintMonthly: {
    de: "Du hast einen monatlichen Betrag eingetragen, aber die Mitgliedschaft ist deaktiviert. Aktuell würdest du nur ein eDebatte-Paket buchen. Wenn du die Bewegung mit einem Mitgliedsbeitrag unterstützen möchtest, aktiviere bitte oben die Mitgliedschaft.",
  } as LocaleString,
  summaryMembershipHintOnce: {
    de: "Du hast einen einmaligen Betrag eingetragen, ohne eine laufende Mitgliedschaft zu wählen. Danke für deine Unterstützung – wir würden uns freuen, dich später als Mitglied zu begrüßen.",
  } as LocaleString,
  summaryButton: { de: "Weiter zum Mitgliedsantrag" } as LocaleString,

  finalTitle: { de: "Mehr als ein Beitrag – wie du noch mitmachen kannst" } as LocaleString,
  finalIntro: {
    de: "Ohne Mitglieder, Unterstützer:innen und Partner funktioniert das alles nicht. Wenn dich die Idee überzeugt, kannst du auf unterschiedliche Weise einsteigen – als Bürger:in, als politische Vertretung oder als Redaktion/Creator:",
  } as LocaleString,
  finalList: {
    de: [
      {
        label: "Für Bürger:innen:",
        body: "Mitglied werden, Anliegen einbringen, an Abstimmungen teilnehmen und andere mit ins Boot holen – online wie offline.",
      },
      {
        label: "Für Politik & Verbände:",
        body: "Dossiers und Meinungsbilder nutzen, Verfahren gemeinsam testen und auf weitere Regionen übertragen – ohne Regeln oder Ergebnisse kaufen zu können.",
      },
      {
        label: "Für Journalist:innen & Presse:",
        body: "Aktuelle Themen, Fragenschablonen und Daten für Beiträge, Podcasts, Streams oder Social-Media-Formate – mit offener Methodik und klarer Trennung von Faktenlage und Kommentar.",
      },
    ],
  } as Record<"de", { label: string; body: string }[]> &
    Partial<Record<SupportedLocale, { label: string; body: string }[]>>,

  creatorBox: {
    de: "Wenn du zusätzlich zu deiner Mitgliedschaft als VOG-Creator bzw. VOG-Repräsentant:in, als Institution oder Redaktion enger zusammenarbeiten möchtest, kannst du dich direkt über unsere Team-Seite melden. Gemeinsam klären wir, welches Setup für dich passt.",
  } as LocaleString,
  creatorButtons: {
    de: [
      {
        label: "VOG-Creator / VOG-Repräsentant:in bewerben",
        href: "/team?focus=creator",
        variant: "primary",
      },
      {
        label: "Für Politik & Verbände",
        href: "/team?focus=politik",
        variant: "secondary",
      },
      {
        label: "Für Journalist:innen & Presse",
        href: "/team?focus=medien",
        variant: "secondary",
      },
    ],
  } as Record<
    "de",
    { label: string; href: string; variant: "primary" | "secondary" }[]
  > &
    Partial<
      Record<
        SupportedLocale,
        { label: string; href: string; variant: "primary" | "secondary" }[]
      >
    >,

  membershipAppTitle: {
    de: "Mitgliedschaft & eDebatte-App",
  } as LocaleString,
  membershipAppBody: {
    de: "Die eDebatte-App gibt es in mehreren Paketen – von eDebatte Basis (kostenfrei) bis zu intensiven Pro-Paketen für Redaktionen oder Kommunen. VOG-Mitglieder erhalten einen festen Nachlass auf kostenpflichtige eDebatte-Pakete. Die Mitgliedschaft bleibt dabei ideell – App-Pakete werden separat fakturiert und technisch nur verknüpft, nicht gebündelt verkauft.",
  } as LocaleString,
  merchNote: {
    de: "Sobald unser Merchandise-Shop startet, gilt derselbe Nachlass automatisch auch dort für Mitglieder.",
  } as LocaleString,
} as const;

function pick<T>(
  entry: Record<"de", T> & Partial<Record<SupportedLocale, T>>,
  locale: SupportedLocale | string,
): T {
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
    summaryMembershipHintMonthly: pick(
      STRINGS.summaryMembershipHintMonthly,
      locale,
    ),
    summaryMembershipHintOnce: pick(
      STRINGS.summaryMembershipHintOnce,
      locale,
    ),
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
