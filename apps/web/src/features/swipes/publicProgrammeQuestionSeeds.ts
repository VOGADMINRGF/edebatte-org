import type { SwipeConsequence, SwipeItem } from "./types";

// Demo-Fragebank: 100 bewusst entparteilichte Fragen aus Themenfeldern,
// die in den öffentlichen Bundestagsprogrammen 2025 breit vorkommen.
// Keine Frage ist ein Parteizitat oder eine Parteizuordnung. Die Herkunft
// dient nur der Themenbreite. Kontext, Entscheidung und Zielkonflikt bleiben
// getrennt, damit Karten menschlich und scanbar bleiben, ohne suggestiv zu werden.

type SeedTheme = {
  id: string;
  subject: string;
  category: string;
  level: SwipeItem["level"];
  tags: string[];
  context: string;
  affected: string;
};

type DecisionVariant = 1 | 2 | 3 | 4 | 5;

const THEMES: SeedTheme[] = [
  { id: "wirtschaft", subject: "Investitionen, Innovation und Wettbewerbsfähigkeit", category: "Wirtschaft", level: "Bund", tags: ["Wirtschaft", "Innovation"], context: "Unternehmen müssen investieren, während Kosten, Fachkräftemangel und internationaler Wettbewerb gleichzeitig Druck machen", affected: "Beschäftigte, Unternehmen und Steuerzahlende" },
  { id: "arbeit", subject: "Weiterbildung, Arbeitsbedingungen und betriebliche Entwicklung", category: "Arbeit", level: "Bund", tags: ["Arbeit", "Weiterbildung"], context: "Weiterbildung scheitert im Arbeitsalltag oft an Zeit, Geld oder fehlenden Angeboten", affected: "Beschäftigte und Betriebe" },
  { id: "steuern", subject: "Steuerregeln und staatliche Entlastungen", category: "Steuern", level: "Bund", tags: ["Steuern", "Finanzen"], context: "Viele Menschen und Unternehmen erleben das Steuersystem als schwer verständlich und aufwendig", affected: "Haushalte, Unternehmen und öffentliche Haushalte" },
  { id: "wohnen", subject: "Wohnen, Bauen und bezahlbaren Wohnraum", category: "Wohnen", level: "Bund", tags: ["Wohnen", "Bauen"], context: "Mieten steigen und neuer Wohnraum entsteht vielerorts langsamer als der Bedarf", affected: "Mietende, Eigentümer, Bauwirtschaft und Kommunen" },
  { id: "gesundheit", subject: "Gesundheitsversorgung, Wartezeiten und Prävention", category: "Gesundheit", level: "Bund", tags: ["Gesundheit", "Versorgung"], context: "Wartezeiten, Personalmangel und regionale Versorgungslücken machen den Zugang zur Behandlung unterschiedlich schwer", affected: "Patientinnen und Patienten, Praxen, Kliniken und Kassen" },
  { id: "pflege", subject: "Pflege, Unterstützung und Versorgungsqualität", category: "Pflege", level: "Bund", tags: ["Pflege", "Versorgung"], context: "Pflegebedürftige und Angehörige müssen zwischen hohen Kosten, knappen Plätzen und Personalmangel abwägen", affected: "Pflegebedürftige, Angehörige und Pflegekräfte" },
  { id: "bildung", subject: "Schulen, Ausbildung und Bildungschancen", category: "Bildung", level: "Land", tags: ["Bildung", "Schule"], context: "Bildungschancen können noch stark davon abhängen, wo Kinder wohnen und wie ihre Schule ausgestattet ist", affected: "Kinder, Eltern, Lehrkräfte und Schulträger" },
  { id: "familie", subject: "Kinderbetreuung und Familienleistungen", category: "Familie", level: "Bund", tags: ["Familie", "Kinder"], context: "Familien bekommen Alltag, Arbeit und Betreuung oft nur schwer verlässlich zusammen", affected: "Kinder, Eltern, Betreuungseinrichtungen und Arbeitgeber" },
  { id: "rente", subject: "Rente und Altersvorsorge", category: "Rente", level: "Bund", tags: ["Rente", "Vorsorge"], context: "Mehr Menschen sind länger im Ruhestand, während zugleich weniger Erwerbstätige Beiträge finanzieren", affected: "Rentnerinnen und Rentner, Beschäftigte und kommende Generationen" },
  { id: "soziales", subject: "Grundsicherung und soziale Teilhabe", category: "Soziales", level: "Bund", tags: ["Soziales", "Teilhabe"], context: "Menschen in schwierigen Lebenslagen brauchen schnelle Hilfe, während Leistungen verständlich und finanzierbar bleiben sollen", affected: "Leistungsberechtigte, Verwaltungen und Steuerzahlende" },
  { id: "migration", subject: "Migration, Asyl und Arbeitsmigration", category: "Migration", level: "Bund", tags: ["Migration", "Asyl"], context: "Schutz, Zuwanderung, Arbeitsmarkt und kommunale Aufnahmefähigkeit müssen gleichzeitig berücksichtigt werden", affected: "Schutzsuchende, Zugewanderte, Behörden, Kommunen und Betriebe" },
  { id: "integration", subject: "Sprache, Anerkennung und Integration", category: "Integration", level: "Bund", tags: ["Integration", "Chancen"], context: "Sprache, anerkannte Abschlüsse und Zugang zu Arbeit entscheiden oft darüber, wie schnell Menschen selbstständig teilhaben können", affected: "Zugewanderte, Betriebe, Bildungsträger und Kommunen" },
  { id: "sicherheit", subject: "innere Sicherheit, Prävention und Bevölkerungsschutz", category: "Sicherheit", level: "Bund", tags: ["Sicherheit", "Prävention"], context: "Sicherheitsprobleme entstehen sehr unterschiedlich, und Prävention wirkt oft schon bevor ein Schaden sichtbar wird", affected: "Bevölkerung, Sicherheitsbehörden und Kommunen" },
  { id: "demokratie", subject: "Bürgerbeteiligung, Transparenz und demokratische Verfahren", category: "Demokratie", level: "Bund", tags: ["Demokratie", "Beteiligung"], context: "Menschen können politische Entscheidungen oft erst spät nachvollziehen oder beeinflussen", affected: "Bürgerinnen und Bürger, Parlamente, Verwaltungen und Initiativen" },
  { id: "digital", subject: "digitale Verwaltung, Datennutzung und öffentliche Dienste", category: "Digitalisierung", level: "Bund", tags: ["Digitalisierung", "Verwaltung"], context: "Behördengänge verlangen noch oft mehrfach dieselben Angaben, und digitale Angebote funktionieren nicht überall durchgängig", affected: "Bürgerinnen und Bürger, Unternehmen und Verwaltungen" },
  { id: "klima", subject: "Klimaschutz und Klimaanpassung", category: "Klima", level: "Bund", tags: ["Klima", "Anpassung"], context: "Klimaschutz und Anpassung verlangen heute Investitionen, während Kosten und Nutzen sehr unterschiedlich verteilt sein können", affected: "Haushalte, Unternehmen, Kommunen und kommende Generationen" },
  { id: "energie", subject: "Energieversorgung, Netze, Speicher und Erzeugung", category: "Energie", level: "Bund", tags: ["Energie", "Netze"], context: "Energie soll gleichzeitig bezahlbar, verfügbar und klimaverträglich sein, während Netze und Erzeugung umgebaut werden", affected: "Haushalte, Industrie, Energieversorger und Regionen" },
  { id: "verkehr", subject: "Straße, Schiene und öffentlichen Verkehr", category: "Verkehr", level: "Bund", tags: ["Verkehr", "Mobilität"], context: "Menschen haben je nach Wohnort sehr unterschiedliche Möglichkeiten, zuverlässig und bezahlbar unterwegs zu sein", affected: "Pendlerinnen und Pendler, Reisende, Kommunen und Verkehrsunternehmen" },
  { id: "europa", subject: "europäische Zusammenarbeit und gemeinsame Entscheidungen", category: "Europa", level: "EU", tags: ["Europa", "EU"], context: "Viele Krisen und Wirtschaftsfragen sind grenzüberschreitend, während Entscheidungen demokratisch nachvollziehbar bleiben müssen", affected: "Bürgerinnen und Bürger, Mitgliedstaaten und europäische Institutionen" },
  { id: "kommunen", subject: "kommunale Finanzen, Infrastruktur und Daseinsvorsorge", category: "Kommunen", level: "Kommune", tags: ["Kommunen", "Daseinsvorsorge"], context: "Städte und Gemeinden sichern viele Leistungen direkt vor Ort, obwohl Geld, Personal und Infrastruktur oft knapp sind", affected: "Einwohnerinnen und Einwohner, Kommunalpolitik und Verwaltungen" },
];

function upperFirst(value: string): string {
  return value ? `${value[0].toLocaleUpperCase("de-DE")}${value.slice(1)}` : value;
}

function decisionFor(theme: SeedTheme, variant: DecisionVariant): string {
  if (variant === 1) return `${theme.subject} bei politischen Prioritäten und öffentlichen Mitteln stärker gewichtet wird`;
  if (variant === 2) return `für ${theme.subject} klarere und überprüfbare Mindestziele gelten`;
  if (variant === 3) return `zuständige öffentliche Stellen bei ${theme.subject} mehr Spielraum für unterschiedliche regionale Lösungen erhalten`;
  if (variant === 4) return `öffentliche Mittel für ${theme.subject} stärker an nachvollziehbare Wirkung und Zielerreichung geknüpft werden`;
  return `Fortschritte, Kosten und Nebenfolgen bei ${theme.subject} regelmäßig öffentlich bilanziert werden`;
}

function tradeoffFor(theme: SeedTheme, variant: DecisionVariant): string {
  if (variant === 1) return `Mehr Priorität für ${theme.subject} kann Ressourcen bündeln, verschiebt aber Gewicht gegenüber anderen öffentlichen Aufgaben`;
  if (variant === 2) return `Gemeinsame Mindestziele können Vergleichbarkeit und Verlässlichkeit erhöhen, begrenzen aber lokale Gestaltungsspielräume`;
  if (variant === 3) return `Mehr regionaler Spielraum kann passgenauere Lösungen ermöglichen, führt aber eher zu unterschiedlichen Bedingungen`;
  if (variant === 4) return `Wirkungsbezogene Finanzierung kann Anreize und Kontrolle stärken, erhöht aber Mess-, Daten- und Nachweisaufwand`;
  return `Regelmäßige öffentliche Bilanzierung erhöht Nachvollziehbarkeit, erzeugt aber zusätzlichen Erhebungs- und Berichtsaufwand`;
}

function questionFrameIndex(theme: SeedTheme, variant: DecisionVariant): number {
  const themeSalt = Array.from(theme.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (themeSalt + variant * 3) % 10;
}

function buildQuestion(theme: SeedTheme, variant: DecisionVariant): string {
  const decision = decisionFor(theme, variant);
  const standaloneDecision = upperFirst(decision);
  const frames = [
    `Wie stehst du dazu, dass ${decision}?`,
    `Bist du eher dafür oder dagegen, dass ${decision}?`,
    `Wie ordnest du diese Entscheidung ein: ${standaloneDecision}?`,
    `Was ist deine Haltung dazu: ${standaloneDecision}?`,
    `Würdest du einer solchen Regelung zustimmen: ${standaloneDecision}?`,
    `Wie würdest du entscheiden, wenn ${decision}?`,
    `Wie bewertest du die Entscheidung, dass ${decision}?`,
    `Wo stehst du bei dieser Entscheidung: ${standaloneDecision}?`,
    `Wie würdest du dich dazu positionieren: ${standaloneDecision}?`,
    `Eher dafür, eher dagegen oder noch offen: ${standaloneDecision}?`,
  ] as const;
  return frames[questionFrameIndex(theme, variant)];
}

function consequence(title: string, detail: string): SwipeConsequence {
  return { title, detail };
}

function buildConsequences(theme: SeedTheme, variant: DecisionVariant): SwipeItem["decisionConsequences"] {
  if (variant === 1) {
    return {
      agree: [
        consequence("Mehr politische Aufmerksamkeit", `${theme.category} könnte in Planung und öffentlicher Debatte stärker gewichtet werden.`),
        consequence("Mehr Ressourcen möglich", `Für ${theme.subject} könnten eher zusätzliche Mittel oder Kapazitäten vorgesehen werden.`),
        consequence("Andere Prioritäten konkurrieren stärker", "Zusätzliche Aufmerksamkeit oder Mittel stehen dann für andere Aufgaben nicht im selben Umfang zur Verfügung."),
        consequence(`Spürbare Wirkung für ${theme.affected}`, "Leistungen, Bedingungen oder Zugänge könnten sich bei konsequenter Umsetzung verändern."),
        consequence("Ergebnis hängt von Umsetzung ab", "Mehr Priorität allein garantiert noch keine bessere Wirkung; Ausgestaltung und Kontrolle bleiben entscheidend."),
      ],
      disagree: [
        consequence("Bestehende Prioritäten bleiben eher erhalten", `${theme.category} würde gegenüber anderen Aufgaben nicht zusätzlich aufgewertet.`),
        consequence("Ressourcen bleiben breiter verteilt", "Öffentliche Mittel und Kapazitäten könnten stärker nach bisherigen Schwerpunkten verteilt bleiben."),
        consequence("Veränderungen können langsamer ausfallen", `Bei ${theme.subject} könnte zusätzlicher politischer Handlungsdruck geringer bleiben.`),
        consequence("Andere Themen behalten mehr Raum", "Konkurrierende öffentliche Aufgaben würden weniger durch eine neue Schwerpunktsetzung verdrängt."),
        consequence("Bestehende Probleme können fortbestehen", "Ohne zusätzliche Priorisierung können bekannte Engpässe oder Unterschiede länger bestehen bleiben."),
      ],
    };
  }

  if (variant === 2) {
    return {
      agree: [
        consequence("Einheitlichere Mindestbedingungen", `Für ${theme.subject} könnten klarere gemeinsame Erwartungen gelten.`),
        consequence("Mehr Vergleichbarkeit", "Unterschiede zwischen Regionen oder Einrichtungen würden leichter sichtbar und überprüfbar."),
        consequence("Mehr Umsetzungsaufwand", "Verantwortliche Stellen müssten zusätzliche Vorgaben dokumentieren und praktisch erfüllen."),
        consequence("Weniger lokaler Spielraum", "Regionale oder institutionelle Sonderlösungen könnten enger begrenzt werden."),
        consequence("Kontrolle wird wichtiger", "Mindestziele entfalten nur Wirkung, wenn Erfüllung und Abweichungen nachvollziehbar geprüft werden."),
      ],
      disagree: [
        consequence("Mehr lokale Flexibilität", "Regionen und Einrichtungen könnten stärker eigene Standards oder Prioritäten setzen."),
        consequence("Weniger neue Nachweispflichten", "Zusätzlicher Regelungs- und Kontrollaufwand würde zunächst vermieden."),
        consequence("Größere Unterschiede möglich", `Bedingungen für ${theme.affected} könnten regional oder institutionell weiter auseinandergehen.`),
        consequence("Vergleich wird schwieriger", "Ohne gemeinsame Mindestziele ist schwerer erkennbar, welche Unterschiede auf Qualität oder Rahmenbedingungen zurückgehen."),
        consequence("Verantwortung bleibt stärker dezentral", "Verbesserungen würden stärker von einzelnen Trägern, Regionen oder bestehenden Programmen abhängen."),
      ],
    };
  }

  if (variant === 3) {
    return {
      agree: [
        consequence("Passgenauere lokale Lösungen", `Maßnahmen bei ${theme.subject} könnten stärker an regionale Bedingungen angepasst werden.`),
        consequence("Mehr Unterschiede zwischen Regionen", "Regeln, Leistungen oder Zugänge könnten je nach Ort deutlicher voneinander abweichen."),
        consequence("Lokale Verantwortung wächst", "Erfolg und Fehler würden stärker von regionalen Entscheidungen und Kapazitäten abhängen."),
        consequence("Schnellere Erprobung möglich", "Regionen könnten neue Ansätze testen, ohne überall denselben Weg abzuwarten."),
        consequence("Vergleichbarkeit nimmt ab", "Unterschiedliche Modelle erschweren direkte Vergleiche und gemeinsame Bewertung."),
      ],
      disagree: [
        consequence("Einheitlichere Regeln", "Gemeinsame Vorgaben könnten stärker über Regionen hinweg gelten."),
        consequence("Leichterer Vergleich", "Ähnliche Regeln erleichtern die Bewertung von Leistungen und Ergebnissen."),
        consequence("Weniger regionale Anpassung", "Besondere örtliche Bedingungen könnten weniger flexibel berücksichtigt werden."),
        consequence("Mehr zentrale Abstimmung", "Entscheidungen würden stärker auf übergeordneter Ebene koordiniert."),
        consequence("Umsetzung kann langsamer abgestimmt werden", "Gemeinsame Lösungen brauchen häufig mehr Koordination zwischen Ebenen und Beteiligten."),
      ],
    };
  }

  if (variant === 4) {
    return {
      agree: [
        consequence("Stärkere Wirkungsanreize", "Finanzierung würde deutlicher daran gekoppelt, ob vereinbarte Ziele erreicht werden."),
        consequence("Mehr Mess- und Datenbedarf", "Wirkung müsste systematischer erfasst und nachvollziehbar dokumentiert werden."),
        consequence("Finanzierung kann schwankender werden", "Träger mit schwächeren Ergebnissen könnten bei ungeeigneter Ausgestaltung zusätzliche Unsicherheit erleben."),
        consequence("Messgrößen gewinnen Einfluss", "Was gemessen wird, kann stärker bestimmen, welche Aktivitäten finanziell attraktiv werden."),
        consequence("Zielerreichung wird sichtbarer", "Öffentliche Mittel und beobachtete Ergebnisse ließen sich leichter miteinander vergleichen."),
      ],
      disagree: [
        consequence("Planbarere Grundfinanzierung", "Mittel könnten stärker unabhängig von kurzfristig gemessenen Ergebnissen bereitgestellt werden."),
        consequence("Weniger Messdruck", "Träger müssten weniger Ressourcen in zusätzliche Wirkungsnachweise investieren."),
        consequence("Schwächere finanzielle Leistungsanreize", "Gute oder schlechte Ergebnisse würden die Mittelvergabe weniger unmittelbar beeinflussen."),
        consequence("Weniger Risiko durch ungeeignete Kennzahlen", "Fehlsteuerung durch zu enge Messgrößen wäre weniger wahrscheinlich."),
        consequence("Zusammenhang von Geld und Wirkung bleibt weniger sichtbar", "Es wäre schwieriger zu beurteilen, welche Ausgaben mit welchen Ergebnissen verbunden sind."),
      ],
    };
  }

  return {
    agree: [
      consequence("Mehr öffentliche Nachvollziehbarkeit", `Entwicklung bei ${theme.subject} würde regelmäßiger sichtbar gemacht.`),
      consequence("Probleme und Nebenfolgen werden früher erkennbar", "Regelmäßige Berichte können Abweichungen oder unerwartete Entwicklungen schneller zeigen."),
      consequence("Mehr Grundlage für Kurskorrekturen", "Politik und Verwaltung könnten Entscheidungen auf regelmäßig aktualisierte Informationen stützen."),
      consequence("Zusätzlicher Berichtsaufwand", "Daten müssen erhoben, geprüft, erklärt und veröffentlicht werden."),
      consequence("Kennzahlen können vereinfachen", "Komplexe Entwicklungen lassen sich in Berichten nicht immer vollständig abbilden."),
    ],
    disagree: [
      consequence("Weniger zusätzlicher Verwaltungsaufwand", "Neue regelmäßige Berichts- und Veröffentlichungspflichten würden vermieden."),
      consequence("Weniger öffentliche Vergleichsdaten", `Entwicklung bei ${theme.subject} wäre weniger einheitlich dokumentiert.`),
      consequence("Probleme können später sichtbar werden", "Ohne regelmäßige Bilanzierung fallen Abweichungen möglicherweise erst durch andere Verfahren auf."),
      consequence("Weniger öffentlicher Rechtfertigungsdruck", "Verantwortliche Stellen müssten Entwicklungen nicht in derselben Regelmäßigkeit öffentlich erklären."),
      consequence("Lernen bleibt stärker an Einzelprüfungen gebunden", "Kurskorrekturen würden häufiger von vorhandenen Prüfungen, Evaluationen oder politischen Debatten abhängen."),
    ],
  };
}

function toSwipeItem(theme: SeedTheme, variant: DecisionVariant): SwipeItem {
  const decision = decisionFor(theme, variant);
  const tradeoff = tradeoffFor(theme, variant);
  return {
    id: `seed-public-${theme.id}-${variant}`,
    title: buildQuestion(theme, variant),
    text: `${theme.context}. Entscheidung: ${upperFirst(decision)}. ${tradeoff}.`,
    humanContext: theme.context,
    tradeoff,
    decisionConsequences: buildConsequences(theme, variant),
    category: theme.category,
    level: theme.level,
    topicTags: theme.tags,
    evidenceCount: 0,
    responsibilityLabel: `Zuständigkeit: ${theme.level}`,
    domainLabel: theme.category,
    hasEventualities: false,
    eventualitiesCount: 0,
  };
}

export const PUBLIC_PROGRAMME_QUESTION_SEEDS: SwipeItem[] = THEMES.flatMap((theme) =>
  ([1, 2, 3, 4, 5] as const).map((variant) => toSwipeItem(theme, variant)),
);
