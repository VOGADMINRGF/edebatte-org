import type { SwipeConsequence, SwipeItem } from "./types";

// Demo-Fragebank: 100 bewusst entparteilichte Fragen aus Themenfeldern,
// die in den öffentlichen Bundestagsprogrammen 2025 breit vorkommen.
// Keine Frage ist ein Parteizitat oder eine Parteizuordnung. Die Herkunft
// dient nur der Themenbreite. Die Formulierungen sollen einen konkreten
// Zielkonflikt greifbar machen statt dieselbe "Soll ...?"-Schablone zu wiederholen.

type SeedTheme = {
  id: string;
  category: string;
  level: SwipeItem["level"];
  tags: string[];
  context: string;
  decision: string;
  tradeoff: string;
  affected: string;
};

const THEMES: SeedTheme[] = [
  {
    id: "wirtschaft",
    category: "Wirtschaft",
    level: "Bund",
    tags: ["Wirtschaft", "Innovation"],
    context: "Unternehmen müssen investieren, während Kosten, Fachkräftemangel und internationaler Wettbewerb gleichzeitig Druck machen",
    decision: "der Bund Investitionen und Innovation stärker mit verlässlichen Rahmenbedingungen unterstützt",
    tradeoff: "Mehr staatliche Unterstützung kann Investitionen erleichtern, kostet aber Geld und kann einzelne Branchen unterschiedlich begünstigen",
    affected: "Beschäftigte, Unternehmen und Steuerzahlende",
  },
  {
    id: "arbeit",
    category: "Arbeit",
    level: "Bund",
    tags: ["Arbeit", "Weiterbildung"],
    context: "Weiterbildung im Arbeitsalltag oft an Zeit, Geld oder fehlenden Angeboten scheitert",
    decision: "der Bund für Weiterbildung klarere Mindestbedingungen und planbare Freiräume setzt",
    tradeoff: "Verbindlichere Regeln können Beschäftigten Sicherheit geben, schränken aber betriebliche und regionale Spielräume ein",
    affected: "Beschäftigte und Betriebe",
  },
  {
    id: "steuern",
    category: "Steuern",
    level: "Bund",
    tags: ["Steuern", "Finanzen"],
    context: "viele Menschen und Unternehmen das Steuersystem als schwer verständlich und aufwendig erleben",
    decision: "der Bund Regeln vereinfacht und Entlastungen stärker nach klaren, überprüfbaren Kriterien ausrichtet",
    tradeoff: "Einfachere Regeln können Bürokratie senken, verändern aber Verteilung, Einnahmen und bestehende Ausnahmen",
    affected: "Haushalte, Unternehmen und öffentliche Haushalte",
  },
  {
    id: "wohnen",
    category: "Wohnen",
    level: "Bund",
    tags: ["Wohnen", "Bauen"],
    context: "Mieten steigen und neuer Wohnraum vielerorts langsamer entsteht als der Bedarf",
    decision: "Bund und Länder schnelleres Bauen mit verbindlichen Sozial- und Qualitätszielen verbinden",
    tradeoff: "Schnellere Verfahren können Wohnraum schaffen, zugleich geraten Kosten, Standards und lokale Planung in einen Zielkonflikt",
    affected: "Mietende, Eigentümer, Bauwirtschaft und Kommunen",
  },
  {
    id: "gesundheit",
    category: "Gesundheit",
    level: "Bund",
    tags: ["Gesundheit", "Versorgung"],
    context: "Wartezeiten, Personalmangel und regionale Versorgungslücken den Zugang zur Behandlung unterschiedlich schwer machen",
    decision: "der Bund Versorgung stärker nach Erreichbarkeit, Wartezeiten und Prävention steuert",
    tradeoff: "Verbindlichere Versorgungsziele können Zugänge verbessern, greifen aber stärker in bestehende Strukturen und Budgets ein",
    affected: "Patientinnen und Patienten, Praxen, Kliniken und Kassen",
  },
  {
    id: "pflege",
    category: "Pflege",
    level: "Bund",
    tags: ["Pflege", "Versorgung"],
    context: "Pflegebedürftige und Angehörige zwischen hohen Kosten, knappen Plätzen und Personalmangel abwägen müssen",
    decision: "der Bund Pflege stärker finanziell absichert und verbindliche Qualitäts- sowie Personalziele setzt",
    tradeoff: "Mehr Absicherung kann Familien entlasten, erhöht aber Finanzierungsbedarf und Umsetzungsdruck auf Einrichtungen",
    affected: "Pflegebedürftige, Angehörige und Pflegekräfte",
  },
  {
    id: "bildung",
    category: "Bildung",
    level: "Land",
    tags: ["Bildung", "Schule"],
    context: "Bildungschancen noch stark davon abhängen können, wo Kinder wohnen und welche Ausstattung ihre Schule hat",
    decision: "die Länder verbindlichere Mindeststandards für Personal, Förderung und Ausstattung festlegen",
    tradeoff: "Gemeinsame Mindeststandards können Unterschiede verkleinern, reduzieren aber den Gestaltungsspielraum von Ländern und Schulen",
    affected: "Kinder, Eltern, Lehrkräfte und Schulträger",
  },
  {
    id: "familie",
    category: "Familie",
    level: "Bund",
    tags: ["Familie", "Kinder"],
    context: "Familien Alltag, Arbeit und Betreuung oft nur schwer verlässlich zusammenbekommen",
    decision: "Bund und Länder Betreuung und Familienleistungen stärker auf Verlässlichkeit und tatsächliche Verfügbarkeit ausrichten",
    tradeoff: "Mehr Verlässlichkeit kann Familien entlasten, braucht aber Personal, Geld und klare Zuständigkeiten",
    affected: "Kinder, Eltern, Betreuungseinrichtungen und Arbeitgeber",
  },
  {
    id: "rente",
    category: "Rente",
    level: "Bund",
    tags: ["Rente", "Vorsorge"],
    context: "mehr Menschen länger im Ruhestand sind und zugleich weniger Erwerbstätige Beiträge finanzieren",
    decision: "der Bund die Alterssicherung langfristiger über mehrere Finanzierungsbausteine absichert",
    tradeoff: "Mehr Stabilität im Alter kann zusätzliche Beiträge, Steuermittel oder Veränderungen beim Renteneintritt erfordern",
    affected: "Rentnerinnen und Rentner, Beschäftigte und kommende Generationen",
  },
  {
    id: "soziales",
    category: "Soziales",
    level: "Bund",
    tags: ["Soziales", "Teilhabe"],
    context: "Menschen in schwierigen Lebenslagen schnelle Hilfe brauchen, während Leistungen verständlich und finanzierbar bleiben sollen",
    decision: "der Bund Grundsicherung und soziale Leistungen einfacher zugänglich und stärker auf Teilhabe ausrichtet",
    tradeoff: "Einfacherer Zugang kann Hürden senken, verändert aber Kontrollen, Verwaltungsaufwand und Ausgaben",
    affected: "Leistungsberechtigte, Verwaltungen und Steuerzahlende",
  },
  {
    id: "migration",
    category: "Migration",
    level: "Bund",
    tags: ["Migration", "Asyl"],
    context: "Schutz, Zuwanderung, Arbeitsmarkt und kommunale Aufnahmefähigkeit gleichzeitig berücksichtigt werden müssen",
    decision: "der Bund Verfahren stärker trennt, beschleunigt und Zuständigkeiten nachvollziehbarer macht",
    tradeoff: "Schnellere und klarere Verfahren können Planung erleichtern, müssen aber Rechtsstaatlichkeit, Schutzansprüche und praktische Kapazitäten zusammenbringen",
    affected: "Schutzsuchende, Zugewanderte, Behörden, Kommunen und Betriebe",
  },
  {
    id: "integration",
    category: "Integration",
    level: "Bund",
    tags: ["Integration", "Chancen"],
    context: "Sprache, Anerkennung von Abschlüssen und Zugang zu Arbeit oft darüber entscheiden, wie schnell Menschen selbstständig teilhaben können",
    decision: "Bund und Länder Sprachförderung, Anerkennung und Arbeitsmarktzugang enger miteinander verzahnen",
    tradeoff: "Frühere Zugänge können Integration beschleunigen, brauchen aber Angebote, Prüfkapazitäten und verlässliche Qualitätsstandards",
    affected: "Zugewanderte, Betriebe, Bildungsträger und Kommunen",
  },
  {
    id: "sicherheit",
    category: "Sicherheit",
    level: "Bund",
    tags: ["Sicherheit", "Prävention"],
    context: "Sicherheitsprobleme sehr unterschiedlich entstehen und Prävention oft erst wirkt, bevor ein Schaden sichtbar wird",
    decision: "Bund und Länder Prävention stärker anhand transparenter Risiken und nachprüfbarer Wirkung steuern",
    tradeoff: "Gezieltere Prävention kann Ressourcen bündeln, wirft aber Fragen zu Daten, Kriterien und regionaler Fairness auf",
    affected: "Bevölkerung, Sicherheitsbehörden und Kommunen",
  },
  {
    id: "demokratie",
    category: "Demokratie",
    level: "Bund",
    tags: ["Demokratie", "Beteiligung"],
    context: "Menschen politische Entscheidungen oft erst spät nachvollziehen oder beeinflussen können",
    decision: "öffentliche Beteiligung früher, verständlicher und mit klarer Rückmeldung in Verfahren eingebaut wird",
    tradeoff: "Mehr Beteiligung kann Entscheidungen nachvollziehbarer machen, verlängert aber Verfahren und schafft zusätzliche Moderationsaufgaben",
    affected: "Bürgerinnen und Bürger, Parlamente, Verwaltungen und Initiativen",
  },
  {
    id: "digital",
    category: "Digitalisierung",
    level: "Bund",
    tags: ["Digitalisierung", "Verwaltung"],
    context: "Behördengänge noch oft mehrfach dieselben Angaben verlangen und digitale Angebote nicht überall durchgängig funktionieren",
    decision: "Verwaltungen Daten und digitale Dienste stärker interoperabel und nach dem Once-Only-Prinzip organisieren",
    tradeoff: "Weniger Doppelarbeit kann Zeit sparen, erhöht aber Anforderungen an Datenschutz, Standards und IT-Sicherheit",
    affected: "Bürgerinnen und Bürger, Unternehmen und Verwaltungen",
  },
  {
    id: "klima",
    category: "Klima",
    level: "Bund",
    tags: ["Klima", "Anpassung"],
    context: "Klimaschutz und Anpassung Investitionen heute verlangen, während Kosten und Nutzen sehr unterschiedlich verteilt sein können",
    decision: "der Bund Klimaschutz und Anpassung stärker mit transparenten Zwischenzielen und sozialen Ausgleichsregeln verbindet",
    tradeoff: "Verbindliche Ziele können Planung schaffen, erhöhen aber kurzfristig Anpassungsdruck und Finanzierungsbedarf",
    affected: "Haushalte, Unternehmen, Kommunen und kommende Generationen",
  },
  {
    id: "energie",
    category: "Energie",
    level: "Bund",
    tags: ["Energie", "Netze"],
    context: "Energie gleichzeitig bezahlbar, verfügbar und klimaverträglich sein soll, während Netze und Erzeugung umgebaut werden",
    decision: "der Bund Netze, Erzeugung und Speicher stärker nach gemeinsamen Ausbauzielen koordiniert",
    tradeoff: "Mehr Koordination kann Versorgungssicherheit erhöhen, braucht aber Investitionen und kann lokale Konflikte verschärfen",
    affected: "Haushalte, Industrie, Energieversorger und Regionen",
  },
  {
    id: "verkehr",
    category: "Verkehr",
    level: "Bund",
    tags: ["Verkehr", "Mobilität"],
    context: "Menschen je nach Wohnort sehr unterschiedliche Möglichkeiten haben, zuverlässig und bezahlbar unterwegs zu sein",
    decision: "Bund und Länder Investitionen stärker an Erreichbarkeit, Zuverlässigkeit und tatsächlicher Nutzung ausrichten",
    tradeoff: "Eine stärkere Wirkungsausrichtung kann Mittel gezielter einsetzen, verschiebt aber Prioritäten zwischen Straße, Schiene und ÖPNV",
    affected: "Pendlerinnen und Pendler, Reisende, Kommunen und Verkehrsunternehmen",
  },
  {
    id: "europa",
    category: "Europa",
    level: "EU",
    tags: ["Europa", "EU"],
    context: "viele Krisen und Wirtschaftsfragen grenzüberschreitend sind, Entscheidungen aber demokratisch nachvollziehbar bleiben müssen",
    decision: "EU-Staaten in ausgewählten Bereichen enger gemeinsam entscheiden und Verantwortlichkeiten transparenter machen",
    tradeoff: "Gemeinsames Handeln kann schneller und wirksamer sein, reduziert aber nationale Spielräume und verlangt klare demokratische Kontrolle",
    affected: "Bürgerinnen und Bürger, Mitgliedstaaten und europäische Institutionen",
  },
  {
    id: "kommunen",
    category: "Kommunen",
    level: "Kommune",
    tags: ["Kommunen", "Daseinsvorsorge"],
    context: "Städte und Gemeinden viele Leistungen direkt vor Ort sichern, obwohl Geld, Personal und Infrastruktur oft knapp sind",
    decision: "Kommunen verlässlichere Finanzierung und mehr planbaren Spielraum für lokale Prioritäten erhalten",
    tradeoff: "Mehr kommunaler Spielraum kann Lösungen näher am Alltag ermöglichen, braucht aber verlässliche Finanzierung und transparente Kontrolle",
    affected: "Einwohnerinnen und Einwohner, Kommunalpolitik und Verwaltungen",
  },
];

function buildQuestion(theme: SeedTheme, variant: number): string {
  if (variant === 1) return `Wenn ${theme.context}: Wäre es sinnvoll, wenn ${theme.decision}?`;
  if (variant === 2) return `${theme.tradeoff}. Würdest du es befürworten, wenn ${theme.decision}?`;
  if (variant === 3) return `Gerade ${theme.affected} spüren die Folgen. Könnte es der richtige Weg sein, wenn ${theme.decision}?`;
  if (variant === 4) return `Es geht um einen echten Zielkonflikt: ${theme.tradeoff}. Ist es für dich vertretbar, wenn ${theme.decision}?`;
  return `Mit Blick auf die nächsten Jahre: Wäre es die bessere Lösung, wenn ${theme.decision}?`;
}

function buildConsequences(theme: SeedTheme): SwipeItem["decisionConsequences"] {
  const agree: SwipeConsequence[] = [
    { title: "Mehr Verbindlichkeit", detail: `Die Entscheidung würde ${theme.category.toLowerCase()} stärker über gemeinsame Regeln oder Ziele steuern.` },
    { title: `Direkte Wirkung für ${theme.affected}`, detail: "Leistungen, Pflichten oder Zugänge könnten sich spürbar verändern." },
    { title: "Umstellung und Finanzierung", detail: "Verwaltungen, Träger oder Betriebe müssten neue Vorgaben praktisch und finanziell umsetzen." },
    { title: "Weniger Spielraum", detail: "Regionale oder individuelle Lösungen könnten dort enger werden, wo gemeinsame Standards greifen." },
    { title: "Wirkung muss überprüfbar bleiben", detail: "Ob die erhofften Verbesserungen eintreten, hängt von Umsetzung, Finanzierung und Kontrolle ab." },
  ];
  const disagree: SwipeConsequence[] = [
    { title: "Mehr bestehender Spielraum", detail: "Regionen, Einrichtungen oder Beteiligte könnten stärker bei ihren bisherigen Lösungen bleiben." },
    { title: "Weniger unmittelbarer Umstellungsaufwand", detail: "Neue Vorgaben, Kosten oder organisatorische Änderungen würden zunächst vermieden." },
    { title: `Unterschiede für ${theme.affected} bleiben eher bestehen`, detail: "Zugang, Qualität oder Bedingungen können regional und institutionell weiter auseinandergehen." },
    { title: "Das Ausgangsproblem kann langsamer verändert werden", detail: `Der Kontext bleibt relevant: ${theme.context}.` },
    { title: "Veränderung hängt stärker von freiwilligen Lösungen ab", detail: "Fortschritt würde stärker durch bestehende Programme, lokale Entscheidungen oder Eigeninitiative bestimmt." },
  ];
  return { agree, disagree };
}

function toSwipeItem(theme: SeedTheme, variant: number): SwipeItem {
  return {
    id: `seed-public-${theme.id}-${variant}`,
    title: buildQuestion(theme, variant),
    text: `${theme.context}. ${theme.tradeoff}.`,
    humanContext: theme.context,
    tradeoff: theme.tradeoff,
    decisionConsequences: buildConsequences(theme),
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
  [1, 2, 3, 4, 5].map((variant) => toSwipeItem(theme, variant)),
);
