// features/report/data/demoReports.ts
import type { ReportFull } from "./types";
// Wichtig: Statements **nur importieren**, nicht erneut deklarieren!
import demoStatements from "../../statement/data/statements_demo";

// Optional: auslagern in z. B. features/common/data/demoThemes.ts
export const demoThemes = [
  { id: "migration", label: "Migration" },
  { id: "rente", label: "Rente" },
  { id: "gesundheit", label: "Gesundheit" },
  { id: "klima", label: "Klima" },
  { id: "bildung", label: "Bildung" },
  { id: "wirtschaft", label: "Wirtschaft" },
  { id: "energie", label: "Energie" },
  { id: "eu", label: "EU-Politik" },
];

const demoReports: ReportFull[] = [
  {
    id: "demo-1",
    slug: "migration-integration-2025",
    title: "Migration & Integration 2025",
    subtitle: "Wie viel Integration braucht Europa?",
    createdAt: "2025-07-25",
    updatedAt: "2025-07-27",
    author: "eDebatte-Redaktion",
    status: "active",
    visibility: "public",
    language: "de",
    tags: ["Integration", "Migration", "Deutschland", "EU"],
    imageUrl: "/dummy/dummy1.jpg",
    regionScope: ["Deutschland", "EU", "Global"],

    context: {
      scientific:
        "OECD und BAMF zeigen: Integration funktioniert dort, wo Teilhabe und Sprache politisch gefördert werden.",
      societal:
        "Debatte um Identität und Zusammenhalt spitzt sich in Krisenzeiten zu – Bürger:innen fordern Orientierung.",
      economic:
        "Fachkräftemangel und demografischer Wandel machen gesteuerte Zuwanderung zur Überlebensfrage.",
    },

    startingPoint: {
      de: "Höchste Zuwanderung seit 2015 – Diskussion über Pflichtkurse und gesellschaftliche Leitbilder.",
      fr: "Integration in den Banlieues im Fokus – Schulpolitik als Hebel.",
      eu: "Spannung zwischen Grenzschutz und humanitären Verpflichtungen.",
    },

    // nur IDs referenzieren – die Daten selbst liegen in statements_demo.ts
    statements: demoStatements.map((s) => s.id),

    votes: {
      // Beibehalten wie in V1 (falls du es künftig automatisch aggregieren willst:
      // siehe Kommentar weiter unten)
      total: { agree: 8500, neutral: 1200, disagree: 1600 },
      countries: [
        { code: "DE", region: "Deutschland", agree: 5000, neutral: 900, disagree: 600 },
        { code: "FR", region: "Frankreich",  agree: 1800, neutral: 400, disagree: 200 }, // „Frankreich“ korrigiert
        { code: "EU", region: "EU",          agree: 1200, neutral: 200, disagree: 100 },
      ],
    },

    facts: [
      {
        text: "Deutschland: 53 % der Befragten befürworten kontrollierte Zuwanderung.",
        source: { name: "Destatis", url: "https://destatis.de", trust: 0.9 },
      },
      {
        text: "EU-weit wünschen sich 56 % mehr Integrationsprojekte.",
        source: { name: "Eurobarometer", url: "https://europa.eu/eurobarometer", trust: 0.85 },
      },
    ],

    analytics: {
      statementsCount: demoStatements.length,
      eventualitiesCount: 8,
      agreementDistribution: { agree: 67, neutral: 19, disagree: 14 },
      topImpacts: {
        gesellschaftlich: "Stärkere Teilhabe, weniger Parallelgesellschaften.",
        sozial: "Mehr Motivation durch Pflicht, aber auch Debatte über Zwang.",
        kulturell: "Sprache als Schlüssel – Integration als Identitätsfrage.",
      },
      votesLastWeek: 3200,
      trend: [7800, 8000, 8200, 8500],
    },

    voices: [
      {
        type: "media",
        name: "SZ",
        quote:
          "Deutsch lernen ist Schlüssel zur Integration – aber auch zur gesellschaftlichen Teilhabe.",
        url: "https://www.sueddeutsche.de/thema/Migration",
        date: "2025-07-16",
      },
      {
        type: "association",
        name: "Deutscher Städtetag",
        quote:
          "Kommunen brauchen mehr Mittel für Integrationsarbeit, sonst geraten sie an ihre Grenzen.",
        url: "https://www.staedtetag.de/",
        date: "2025-07-18",
      },
      {
        type: "ngo",
        name: "Pro Asyl",
        quote:
          "Pflichtkurse sind hilfreich, wenn sie nicht zu Sanktionen bei Nicht-Teilnahme führen.",
        url: "https://www.proasyl.de/",
        date: "2025-07-15",
      },
      {
        type: "science",
        name: "DIW Berlin",
        quote:
          "Langfristige Investitionen in Integration rechnen sich volkswirtschaftlich in jedem Fall.",
        url: "https://www.diw.de/",
        date: "2025-07-13",
      },
    ],

    relevance: {
      citizen:
        "Bessere Integration bedeutet mehr Teilhabe und weniger Konflikte – jede:r kann mitgestalten.",
      policymaker:
        "Balance zwischen Steuerung und Offenheit sichert Akzeptanz und Zusammenhalt.",
      ngo: "NGOs übersetzen Erfahrungen vor Ort in politische Empfehlungen.",
      business: "Fachkräftebedarf macht Integration zur wirtschaftlichen Notwendigkeit.",
      directAction: "Wer helfen will, kann Sprachpartnerschaften und Mentoring übernehmen.",
    },

    editorialSummary: {
      pro: [
        "Sprache als Türöffner für Teilhabe und Arbeitsmarkt.",
        "Pflichtkurse verhindern Ausgrenzung und Parallelgesellschaften.",
      ],
      contra: ["Zwang kann Widerstand erzeugen.", "Nicht alle Geflüchteten haben gleiche Voraussetzungen."],
      neutral: ["Integration ist ein Prozess – beide Seiten müssen sich öffnen."],
    },

    globalTrend: "Integration ist weltweit Prüfstein für gesellschaftliche Resilienz.",
    metaRelevance:
      "Was heute in Europa gelingt oder scheitert, wird weltweit Modell oder Warnung.",
    legalBasis: ["Art. 16a GG", "Art. 3 EU-Grundrechtecharta"],
    responsibleBodies: ["Bundestag", "BAMF", "EU-Kommission"],

    timeline: [
      { date: "2025-07-01", agree: 8000, neutral: 1100, disagree: 1500 },
      { date: "2025-07-10", agree: 8250, neutral: 1150, disagree: 1550 },
    ],

    moderation: {
      reviewed: true,
      reviewedBy: ["admin", "expertpanel"],
      qualityScore: 0.98,
      aiNotes: "Statement-Coverage hoch, Debatte ausgewogen.",
    },
  },
];

export default demoReports;

/**
 * OPTIONAL – automatische Aggregation (falls gewünscht):
 * 
 * // Beispiel: Totals dynamisch aus den referenzierten Statements berechnen
 * import type { DemoStatement } from "../../statement/data/statements_demo";
 * 
 * function sumVotes(statements: DemoStatement[]): VoteTriple {
 *   return statements.reduce(
 *     (acc, s) => {
 *       if (s.votes) {
 *         acc.agree += s.votes.agree;
 *         acc.neutral += s.votes.neutral;
 *         acc.disagree += s.votes.disagree;
 *       }
 *       return acc;
 *     },
 *     { agree: 0, neutral: 0, disagree: 0 }
 *   );
 * }
 * 
 * // Nutzung:
 * // const selected = demoStatements.filter(s => ["statement-001","statement-002"].includes(s.id));
 * // const totals = sumVotes(selected);
 */
