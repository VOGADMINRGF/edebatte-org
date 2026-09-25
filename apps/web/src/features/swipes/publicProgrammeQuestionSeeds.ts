import type { SwipeItem } from "./types";

// Demo-Fragebank: 100 bewusst entparteilichte Fragen aus Themenfeldern,
// die in den öffentlichen Bundestagsprogrammen 2025 breit vorkommen.
// Keine Frage ist ein Parteizitat oder eine Parteizuordnung. Die Herkunft
// dient nur der Themenbreite; öffentlich bleibt die Frage frei von Schablonen.

type SeedTheme = {
  id: string;
  subject: string;
  object: string;
  category: string;
  level: SwipeItem["level"];
  tags: string[];
};

const THEMES: SeedTheme[] = [
  { id: "wirtschaft", subject: "Wettbewerbsfähigkeit und Innovation", object: "Wirtschaft und Innovation", category: "Wirtschaft", level: "Bund", tags: ["Wirtschaft", "Innovation"] },
  { id: "arbeit", subject: "gute und zukunftsfähige Arbeit", object: "Arbeitsbedingungen und Weiterbildung", category: "Arbeit", level: "Bund", tags: ["Arbeit", "Weiterbildung"] },
  { id: "steuern", subject: "ein verständliches und gerechtes Steuersystem", object: "Steuern und staatliche Entlastungen", category: "Steuern", level: "Bund", tags: ["Steuern", "Finanzen"] },
  { id: "wohnen", subject: "bezahlbarer Wohnraum", object: "Wohnen, Bauen und Mieten", category: "Wohnen", level: "Bund", tags: ["Wohnen", "Bauen"] },
  { id: "gesundheit", subject: "eine verlässliche Gesundheitsversorgung", object: "Gesundheitsversorgung und Prävention", category: "Gesundheit", level: "Bund", tags: ["Gesundheit", "Versorgung"] },
  { id: "pflege", subject: "eine verlässliche und menschenwürdige Pflege", object: "Pflege und Unterstützung im Alltag", category: "Pflege", level: "Bund", tags: ["Pflege", "Versorgung"] },
  { id: "bildung", subject: "gute Bildung unabhängig vom Wohnort", object: "Schulen, Ausbildung und Bildungschancen", category: "Bildung", level: "Land", tags: ["Bildung", "Schule"] },
  { id: "familie", subject: "verlässliche Bedingungen für Familien", object: "Familienleistungen und Kinderbetreuung", category: "Familie", level: "Bund", tags: ["Familie", "Kinder"] },
  { id: "rente", subject: "eine langfristig tragfähige Alterssicherung", object: "Rente und Altersvorsorge", category: "Rente", level: "Bund", tags: ["Rente", "Vorsorge"] },
  { id: "soziales", subject: "soziale Sicherheit und Teilhabe", object: "Grundsicherung und soziale Leistungen", category: "Soziales", level: "Bund", tags: ["Soziales", "Teilhabe"] },
  { id: "migration", subject: "eine geordnete und nachvollziehbare Migrationspolitik", object: "Migration, Asyl und Arbeitsmigration", category: "Migration", level: "Bund", tags: ["Migration", "Asyl"] },
  { id: "integration", subject: "gelingende Integration und gleiche Chancen", object: "Sprache, Anerkennung und Integration", category: "Integration", level: "Bund", tags: ["Integration", "Chancen"] },
  { id: "sicherheit", subject: "Sicherheit und wirksame Prävention", object: "innere Sicherheit und Bevölkerungsschutz", category: "Sicherheit", level: "Bund", tags: ["Sicherheit", "Prävention"] },
  { id: "demokratie", subject: "mehr nachvollziehbare demokratische Beteiligung", object: "Bürgerbeteiligung, Transparenz und demokratische Verfahren", category: "Demokratie", level: "Bund", tags: ["Demokratie", "Beteiligung"] },
  { id: "digital", subject: "eine einfache digitale Verwaltung", object: "Digitalisierung, Daten und öffentliche Dienste", category: "Digitalisierung", level: "Bund", tags: ["Digitalisierung", "Verwaltung"] },
  { id: "klima", subject: "wirksamer Klimaschutz mit nachvollziehbaren Folgen", object: "Klimaschutz und Klimaanpassung", category: "Klima", level: "Bund", tags: ["Klima", "Anpassung"] },
  { id: "energie", subject: "eine sichere und bezahlbare Energieversorgung", object: "Energieversorgung, Netze und Erzeugung", category: "Energie", level: "Bund", tags: ["Energie", "Netze"] },
  { id: "verkehr", subject: "eine verlässliche und bezahlbare Mobilität", object: "Straße, Schiene und öffentlicher Verkehr", category: "Verkehr", level: "Bund", tags: ["Verkehr", "Mobilität"] },
  { id: "europa", subject: "ein handlungsfähiges und demokratisches Europa", object: "europäische Zusammenarbeit und gemeinsame Entscheidungen", category: "Europa", level: "EU", tags: ["Europa", "EU"] },
  { id: "kommunen", subject: "handlungsfähige Städte und Gemeinden", object: "kommunale Finanzen, Infrastruktur und Beteiligung", category: "Kommunen", level: "Kommune", tags: ["Kommunen", "Daseinsvorsorge"] },
];

function buildQuestion(theme: SeedTheme, variant: number): string {
  if (variant === 1) return `Soll ${theme.subject} politisch stärker priorisiert werden?`;
  if (variant === 2) return `Soll es für ${theme.object} klarere und überprüfbare Ziele geben?`;
  if (variant === 3) return `Soll bei ${theme.object} mehr Raum für unterschiedliche regionale Lösungen bestehen?`;
  if (variant === 4) return `Soll die Finanzierung von ${theme.object} stärker an messbare Wirkungen gekoppelt werden?`;
  return `Soll über Veränderungen bei ${theme.object} regelmäßig öffentlich berichtet und beraten werden?`;
}

function toSwipeItem(theme: SeedTheme, variant: number): SwipeItem {
  return {
    id: `seed-public-${theme.id}-${variant}`,
    title: buildQuestion(theme, variant),
    text: "Offene Diskussionsfrage: Positionen, Gründe, Folgen und Quellen sollen getrennt sichtbar werden.",
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
