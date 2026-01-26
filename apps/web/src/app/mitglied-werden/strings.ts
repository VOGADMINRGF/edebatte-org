"use client";

import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleString = Record<"de", string> & Partial<Record<SupportedLocale, string>>;
type LocaleStringArray = Record<"de", string[]> & Partial<Record<SupportedLocale, string[]>>;

const STRINGS = {
  heroTitle: { de: "VoiceOpenGov unterstützen & eDebatte nutzen" } as LocaleString,
  heroIntro: {
    de: "VoiceOpenGov ist die Initiative für moderne Bürgerbeteiligung, eDebatte ist das Werkzeug. Mit eDebatte digitalisieren wir Beteiligung – transparent, überprüfbar und für alle zugänglich. Deine Mitgliedschaft trägt die Initiative und schützt unsere Unabhängigkeit. Mehr zur Initiative: voiceopengov.org.",
  } as LocaleString,

  transparencyTitle: { de: "Wichtiger Hinweis zur Transparenz" } as LocaleString,
  transparencyBody: {
    de: "eDebatte befindet sich in der Gründungsphase. Deine Unterstützung hilft jetzt besonders – monatlich, einmalig oder als Vorbestellung der eDebatte. Bis zur Eintragung laufen Beiträge über PayPal oder bevorzugt per Überweisung an das Konto des Initiators und werden strikt projektbezogen verbucht. Wir stellen derzeit keine Spendenquittungen aus; Beiträge sind in der Regel nicht steuerlich absetzbar. Die Bewegung soll dauerhaft von vielen Menschen getragen werden – nach dem Prinzip „eine Person, eine Stimme“. Die eDebatte‑Pakete, inkl. eDebatte Basis (kostenfrei), sind unten beschrieben und frei kombinierbar.",
  } as LocaleString,

  enableTitle: { de: "Was du mit deiner Mitgliedschaft ermöglichst" } as LocaleString,
  enableList: {
    de: [
      "Du stärkst eine direktdemokratische Bewegung, die Mehrheiten transparent und fair organisiert.",
      "Dein Beitrag finanziert Moderation, Weiterentwicklung und Betrieb der Infrastruktur – damit eDebatte weltweit wachsen kann, getragen von vielen statt wenigen. Wie wir mit Mitteln umgehen, steht im Transparenzbericht.",
    ],
  } as LocaleStringArray,

  tiersTitle: {
    de: "Orientierung für Mitgliedsstufen",
  } as LocaleString,
  
  tiersIntro: {
    de: "Du entscheidest selbst, welchen Beitrag du geben möchtest. Wichtig: Jede Mitgliedschaft zählt gleich viel – die Stufen sind nur Richtwerte. Alle Mitglieder werden gleich behandelt, egal ob 5,63 € oder 25 € monatlich; es gibt keine finanziellen Vorteile, sondern gleiche Rechte und eine gemeinsame Stimme.",
  } as LocaleString,
  
  tiersList: {
    de: [
      "<strong>5,63 €</strong> – Basisbeitrag: Trägt Bewegung und Grundbetrieb.",
      "<strong>10 €</strong> – Unterstützer:in: Ermöglicht Weiterentwicklung und Qualität.",
      "<strong>25 €</strong> – Stabilisierer:in: Sichert Planung und Verlässlichkeit.",
      "<strong>50 €+</strong> – Solidarisch: Ermöglicht niedrigere Beiträge für andere und stärkt Team & Infrastruktur.",
      "Ganz gleich, welchen Betrag du wählst – <strong>wir freuen uns sehr, wenn du Teil der Bewegung wirst.</strong>",
    ],
  } as LocaleStringArray,
  

  calculatorTitle: { de: "Beitrag berechnen – eDebatte" } as LocaleString,
  calculatorIntro: {
    de: "Empfehlung: 1 % vom frei verfügbaren Haushaltsnettoeinkommen (Netto minus Warmmiete), mindestens 5,63 € pro Person ab 16 Jahren. Das ist unser sozial verträgliches Minimum, damit die Bewegung wachsen kann.",
  } as LocaleString,

  householdNetLabel: { de: "Haushaltsnetto (€/Monat)" } as LocaleString,
  householdNetPlaceholder: { de: "z. B. 2400" } as LocaleString,
  warmRentLabel: { de: "Warmmiete (€/Monat)" } as LocaleString,
  warmRentPlaceholder: { de: "z. B. 900" } as LocaleString,

  suggestionTitle: { de: "Vorgeschlagener Beitrag pro Person" } as LocaleString,
  suggestionNote: {
    de: "Basierend auf deinen Angaben – mindestens der Basisbeitrag von 5,63 €.",
  } as LocaleString,
  suggestionButton: { de: "Vorschlag übernehmen" } as LocaleString,

  perPersonLabel: { de: "Beitrag pro Person / Mitglied" } as LocaleString,
  perPersonCustomSuffix: { de: "€/Monat" } as LocaleString,
  householdSizeLabel: { de: "Haushaltsgröße (≥ 16 Jahre)" } as LocaleString,
  rhythmLabel: { de: "Rhythmus" } as LocaleString,
  rhythmMonthly: { de: "monatlich" } as LocaleString,
  rhythmOnce: { de: "einmalig" } as LocaleString,
  rhythmYearly: { de: "jährlich" } as LocaleString,

  skillsLabel: { de: "Fähigkeiten (optional)" } as LocaleString,
  skillsPlaceholder: { de: "z. B. Moderation, Design, Tech …" } as LocaleString,

  summaryTitle: { de: "Zusammenfassung" } as LocaleString,
  summaryPerPerson: { de: "Beitrag pro Person" } as LocaleString,
  summaryCount: { de: "Anzahl Personen (≥ 16 Jahre)" } as LocaleString,
  summarySkills: { de: "Fähigkeiten" } as LocaleString,
  summaryBoxLabel: { de: "Beitrag gesamt" } as LocaleString,
  summaryBoxNote: {
    de: "Der Rechner ist eine Orientierung. Du kannst deinen Betrag jederzeit anpassen – nach oben oder unten.",
  } as LocaleString,
  summaryMembershipHintMonthly: {
    de: "Du hast einen monatlichen Betrag eingetragen, aber die Mitgliedschaft ist deaktiviert. Aktuell würdest du nur ein eDebatte‑Paket buchen. Wenn du die Bewegung unterstützen möchtest, aktiviere bitte oben die Mitgliedschaft.",
  } as LocaleString,
  summaryMembershipHintOnce: {
    de: "Du hast einen einmaligen Betrag eingetragen, ohne eine laufende Mitgliedschaft zu wählen. Danke für deine Unterstützung – wir würden uns freuen, dich später als Mitglied zu begrüßen.",
  } as LocaleString,
  summaryButton: { de: "Weiter zum Antrag" } as LocaleString,
  summaryButtonPreorder: { de: "Vorbestellen" } as LocaleString,

  finalTitle: { de: "Mehr als ein Beitrag – wie du noch mitmachen kannst" } as LocaleString,
  finalIntro: {
    de: "Ohne Mitglieder, Unterstützer:innen und Partner funktioniert das alles nicht. Wenn dich die Idee überzeugt, kannst du auf verschiedenen Wegen einsteigen – als Bürger:in, als Verband/Verein oder als Redaktion/Creator:",
  } as LocaleString,
  finalList: {
    de: [
      {
        label: "Für Bürger:innen:",
        body: "Mitglied werden, Anliegen einbringen, an Abstimmungen teilnehmen – und als Creator Themen, Streams oder Regionen begleiten.",
      },
      {
        label: "Für Politik, Verbände & Vereine:",
        body: "Aufbereitete Entscheidungsgrundlagen nutzen, Verfahren gemeinsam testen und auf weitere Regionen übertragen – ohne Regeln oder Ergebnisse kaufen zu können.",
      },
      {
        label: "Für Journalist:innen & Presse:",
        body: "Redaktionell mitgestalten: Faktenchecks, Fragenschablonen und Daten für Beiträge, Podcasts, Streams oder Social-Media-Formate – mit offener Methodik und klarer Trennung von Faktenlage und Kommentar.",
      },
    ],
  } as Record<"de", { label: string; body: string }[]> &
    Partial<Record<SupportedLocale, { label: string; body: string }[]>>,

  creatorBox: {
    de: "Wenn du zusätzlich zur Mitgliedschaft als Creator:in oder Repräsentant:in, als Institution oder Redaktion enger zusammenarbeiten möchtest, melde dich direkt über unsere Team‑Seite. Gemeinsam klären wir, welches Setup für dich passt.",
  } as LocaleString,
  creatorButtons: {
    de: [
      {
        label: "Als Creator:in / Repräsentant:in bewerben",
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
    de: "eDebatte ist unser eigens entwickeltes Werkzeug. Die App gibt es in mehreren Paketen – von eDebatte Basis (kostenfrei) bis zu Pro‑Paketen für Redaktionen oder Kommunen. Die Mitgliedschaft bleibt ideell – App‑Pakete werden separat fakturiert und technisch nur verknüpft, nicht gebündelt verkauft.",
  } as LocaleString,
  merchNote: {
    de: "Sobald unser Merchandise-Shop startet, informieren wir Mitglieder zuerst.",
  } as LocaleString,
} as const;

function pick<T>(
  entry: Record<"de", T> & Partial<Record<SupportedLocale, T>>,
  locale: SupportedLocale | string,
): T {
  const normalized = (locale || DEFAULT_LOCALE) as SupportedLocale;
  return entry[normalized] ?? (normalized !== "de" ? entry.en : undefined) ?? entry.de;
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
    rhythmYearly: pick(STRINGS.rhythmYearly, locale),
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
    summaryButtonPreorder: pick(STRINGS.summaryButtonPreorder, locale),
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
