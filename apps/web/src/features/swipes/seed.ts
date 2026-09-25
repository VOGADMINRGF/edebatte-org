import type { Eventuality, SwipeFeedFilter, SwipeItem } from "./types";
import { PUBLIC_PROGRAMME_QUESTION_SEEDS } from "./publicProgrammeQuestionSeeds";

export const SWIPE_SEED_ITEMS: SwipeItem[] = [
  ...PUBLIC_PROGRAMME_QUESTION_SEEDS,
  {
    id: "seed-kommunal-mobilitaet",
    title: "Soll die Stadt mehr Mittel für sichere Radwege priorisieren?",
    text: "Kernthese: Unfallrisiken lassen sich durch baulich getrennte Radwege in Hauptachsen spürbar senken.",
    category: "Mobilität",
    level: "Kommune",
    topicTags: ["Radwege", "Verkehrssicherheit", "Stadtbudget"],
    evidenceCount: 3,
    responsibilityLabel: "Zuständigkeit: Kommune",
    domainLabel: "Mobilität",
    hasEventualities: true,
    eventualitiesCount: 3,
  },
  {
    id: "seed-land-bildung",
    title: "Braucht das Land einen verbindlichen Ganztagsausbau bis 2028?",
    text: "Kernthese: Ganztag verbessert Vereinbarkeit und Lernförderung, wenn Personal- und Raumplanung gesichert sind.",
    category: "Bildung",
    level: "Land",
    topicTags: ["Ganztag", "Personal", "Schulentwicklung"],
    evidenceCount: 4,
    responsibilityLabel: "Zuständigkeit: Land",
    domainLabel: "Bildung",
    hasEventualities: true,
    eventualitiesCount: 3,
  },
  {
    id: "seed-bund-wohnen",
    title: "Soll der Bund Genehmigungsfristen im Wohnungsbau deutlich verkürzen?",
    text: "Kernthese: Schnellere Verfahren können Neubau beschleunigen, wenn Qualitäts- und Sozialstandards abgesichert bleiben.",
    category: "Wohnen",
    level: "Bund",
    topicTags: ["Wohnungsbau", "Planung", "Sozialquote"],
    evidenceCount: 2,
    responsibilityLabel: "Zuständigkeit: Bund/Land",
    domainLabel: "Wohnen",
    hasEventualities: true,
    eventualitiesCount: 2,
  },
  {
    id: "seed-eu-energie",
    title: "Soll die EU gemeinsame Beschaffung für kritische Energieträger ausweiten?",
    text: "Kernthese: Gemeinsame Beschaffung kann Versorgungssicherheit erhöhen, erfordert aber klare Verteilungsregeln.",
    category: "Klima & Energie",
    level: "EU",
    topicTags: ["Beschaffung", "Energiepreise", "Versorgungssicherheit"],
    evidenceCount: 3,
    responsibilityLabel: "Zuständigkeit: EU",
    domainLabel: "Klima & Energie",
    hasEventualities: true,
    eventualitiesCount: 3,
  },
  {
    id: "seed-kommunal-gesundheit",
    title: "Soll die Kommune ein lokales Versorgungszentrum für Hausarzttermine aufbauen?",
    text: "Kernthese: Lokale Zentren und digitale Triage können Wartezeiten reduzieren, wenn Praxen eingebunden sind.",
    category: "Gesundheit",
    level: "Kommune",
    topicTags: ["Versorgungszentrum", "Termine", "Hausarzt"],
    evidenceCount: 2,
    responsibilityLabel: "Zuständigkeit: Kommune/KV",
    domainLabel: "Gesundheit",
    hasEventualities: true,
    eventualitiesCount: 2,
  },
  {
    id: "seed-land-haushalt",
    title: "Soll das Land Investitionen in Schulmodernisierung gegenüber Neubau priorisieren?",
    text: "Kernthese: Sanierung spart kurzfristig Kosten, Neubau kann langfristig Betrieb und Raumqualität verbessern.",
    category: "Haushalt",
    level: "Land",
    topicTags: ["Investition", "Sanierung", "Neubau"],
    evidenceCount: 5,
    responsibilityLabel: "Zuständigkeit: Land/Kommune",
    domainLabel: "Haushalt",
    hasEventualities: true,
    eventualitiesCount: 4,
  },
  {
    id: "seed-bund-sicherheit",
    title: "Soll der Bund Präventionsmittel stärker an kommunale Risikoindikatoren koppeln?",
    text: "Kernthese: Zielgenaue Präventionsmittel erhöhen Wirksamkeit, wenn Kriterien transparent und überprüfbar sind.",
    category: "Sicherheit",
    level: "Bund",
    topicTags: ["Prävention", "Risikodaten", "Mittelverteilung"],
    evidenceCount: 3,
    responsibilityLabel: "Zuständigkeit: Bund/Kommune",
    domainLabel: "Sicherheit",
    hasEventualities: true,
    eventualitiesCount: 2,
  },
  {
    id: "seed-eu-klima",
    title: "Soll die EU für öffentliche Gebäude strengere Energieeffizienz-Pfade setzen?",
    text: "Kernthese: Strengere Pfade reduzieren Emissionen, benötigen aber Übergangsfinanzierung für finanzschwache Kommunen.",
    category: "Klima & Energie",
    level: "EU",
    topicTags: ["Energieeffizienz", "Gebäude", "Förderung"],
    evidenceCount: 4,
    responsibilityLabel: "Zuständigkeit: EU/Member States",
    domainLabel: "Klima & Energie",
    hasEventualities: true,
    eventualitiesCount: 3,
  },
];

const SWIPE_SEED_EVENTUALITIES: Record<string, Eventuality[]> = {
  "seed-kommunal-mobilitaet": [
    { id: "evt-rad-1", title: "Sofortprogramm auf Hauptachsen", shortLabel: "Hauptachsen zuerst" },
    { id: "evt-rad-2", title: "Pilot in zwei Stadtteilen mit Wirkungscheck", shortLabel: "Pilot + Check" },
    { id: "evt-rad-3", title: "Kombimodell: Markierung + bauliche Trennung an Hotspots", shortLabel: "Kombimodell" },
  ],
  "seed-land-bildung": [
    { id: "evt-bild-1", title: "Ganztagspflicht in Stufen bis 2028", shortLabel: "Stufenmodell" },
    { id: "evt-bild-2", title: "Regionale Pilotcluster mit Personalpool", shortLabel: "Pilotcluster" },
    { id: "evt-bild-3", title: "Kommunal freiwillig mit Landesbonus", shortLabel: "Freiwillig + Bonus" },
  ],
  "seed-bund-wohnen": [
    { id: "evt-wohn-1", title: "Fast-Track nur für Nachverdichtung", shortLabel: "Fast-Track lokal" },
    { id: "evt-wohn-2", title: "Bundesweit mit Sozialquote als Bedingung", shortLabel: "Bund + Sozialquote" },
  ],
  "seed-eu-energie": [
    { id: "evt-eu-1", title: "Gemeinsame Beschaffung nur für Krisenphasen", shortLabel: "Nur Krisenmodus" },
    { id: "evt-eu-2", title: "Dauerhafter EU-Pool mit Ausgleichsmechanismus", shortLabel: "EU-Pool dauerhaft" },
    { id: "evt-eu-3", title: "Hybrid: freiwillig + Mindestkontingent", shortLabel: "Hybridmodell" },
  ],
  "seed-kommunal-gesundheit": [
    { id: "evt-gesund-1", title: "Zentrales Terminportal mit Praxisanbindung", shortLabel: "Terminportal" },
    { id: "evt-gesund-2", title: "Quartierszentren mit Telemedizin-Slots", shortLabel: "Quartier + Telemedizin" },
  ],
  "seed-land-haushalt": [
    { id: "evt-haushalt-1", title: "Sanierung zuerst, Neubau bei klaren Defiziten", shortLabel: "Sanierung zuerst" },
    { id: "evt-haushalt-2", title: "Paralleles Modell mit festen Neubauquoten", shortLabel: "Paralleles Modell" },
    { id: "evt-haushalt-3", title: "Neubau nur in Wachstumsregionen priorisieren", shortLabel: "Neubau regional" },
    { id: "evt-haushalt-4", title: "Jährlicher Variantenvergleich mit Wirkungsbericht", shortLabel: "Wirkungsbericht" },
  ],
  "seed-bund-sicherheit": [
    { id: "evt-sicherheit-1", title: "Mittel strikt nach Risikoindex verteilen", shortLabel: "Indexbasiert" },
    { id: "evt-sicherheit-2", title: "Basiskontingent plus Bonus für Präventionserfolge", shortLabel: "Basis + Bonus" },
  ],
  "seed-eu-klima": [
    { id: "evt-klima-1", title: "Verbindliche EU-Pfade mit Härtefallfonds", shortLabel: "Pfade + Fonds" },
    { id: "evt-klima-2", title: "Nationale Spielräume mit verbindlichem Mindestziel", shortLabel: "Mindestziel" },
    { id: "evt-klima-3", title: "Pilotphase bis 2028, danach Verbindlichkeit", shortLabel: "Pilot bis 2028" },
  ],
};

export function getSwipeSeedEventualities(statementId: string): Eventuality[] {
  return SWIPE_SEED_EVENTUALITIES[statementId] ?? [];
}

function dedupe(items: SwipeItem[]): SwipeItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.trim().toLocaleLowerCase("de-DE").replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterSwipeSeedItems(filter?: SwipeFeedFilter): SwipeItem[] {
  const topicQuery = filter?.topicQuery?.trim().toLowerCase() ?? "";
  const level = filter?.level;
  const statementId = filter?.statementId;
  let items = dedupe([...SWIPE_SEED_ITEMS]);
  if (statementId) {
    items = items.filter((item) => item.id === statementId);
  }
  if (level && level !== "ALL") {
    items = items.filter((item) => item.level === level);
  }
  if (topicQuery) {
    items = items.filter((item) => {
      const hay = `${item.title} ${item.text ?? ""} ${item.category} ${item.domainLabel} ${item.topicTags.join(" ")}`.toLowerCase();
      return hay.includes(topicQuery);
    });
  }
  return items;
}
