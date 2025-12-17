import type {
  EDebattePackage,
  SwipeFeedRequest,
  SwipeFeedResponse,
  SwipeItem,
  EventualitiesRequest,
  EventualitiesResponse,
  Eventuality,
  SwipeVotePayload,
} from "./types";
import { recordSwipeVoteInGraph } from "@/modules/graph/swipes";

// TODO: An tri-mongo / E150 anbinden. Aktuell: Mock-Daten.

const MOCK_SWIPES: SwipeItem[] = [
  {
    id: "1",
    title: "Soll Social-Media automatisch beleidigende Kommentare ausblenden?",
    category: "Moderation",
    level: "Bund",
    topicTags: ["Digitale Räume", "Hassrede"],
    evidenceCount: 4,
    responsibilityLabel: "Zuständigkeit: Bund",
    domainLabel: "Digitale Räume",
    hasEventualities: true,
    eventualitiesCount: 3,
  },
  {
    id: "2",
    title: "Brauchen Pflegekräfte bundesweit einheitliche Personalstandards?",
    category: "Pflege",
    level: "Bund",
    topicTags: ["Gesundheit", "Arbeitswelt"],
    evidenceCount: 3,
    responsibilityLabel: "Zuständigkeit: Bund",
    domainLabel: "Pflege",
    hasEventualities: true,
    eventualitiesCount: 2,
  },
  {
    id: "3",
    title: "Soll der ÖPNV bis 2030 in Städten gebührenfrei werden?",
    category: "Mobilität",
    level: "Kommune",
    topicTags: ["Klima", "Städte"],
    evidenceCount: 5,
    responsibilityLabel: "Zuständigkeit: Kommune",
    domainLabel: "Mobilität",
    hasEventualities: false,
    eventualitiesCount: 0,
  },
];

const MOCK_EVENTUALITIES: Record<string, Eventuality[]> = {
  "1": [
    {
      id: "1a",
      title: "Ausblenden nur bei wiederholten Verstößen nach manueller Prüfung",
      shortLabel: "Nur bei Wiederholung",
    },
    {
      id: "1b",
      title: "Nur Kennzeichnung statt Ausblenden, damit Kontext sichtbar bleibt",
      shortLabel: "Kennzeichnung statt Löschung",
    },
    {
      id: "1c",
      title: "Kein automatisches Ausblenden, aber einfache Meldefunktion für Nutzer:innen",
      shortLabel: "Melden statt Algorithmus",
    },
  ],
  "2": [
    {
      id: "2a",
      title: "Bundeseinheitliche Mindeststandards, Details durch Länder/Kassen",
    },
    {
      id: "2b",
      title: "Regionale Modelle statt bundesweiter Standards, aber Transparenzpflicht",
    },
  ],
};

export async function getSwipeFeed(req: SwipeFeedRequest): Promise<SwipeFeedResponse> {
  // Filter rudimentär auf Basis der Mock-Daten
  const { filter } = req;
  const topicQuery = filter?.topicQuery?.toLowerCase() ?? "";
  const level = filter?.level;
  const statementId = filter?.statementId;

  let items = MOCK_SWIPES;

  if (statementId) {
    items = items.filter((item) => item.id === statementId);
  }

  if (topicQuery) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(topicQuery) ||
        item.topicTags.some((tag) => tag.toLowerCase().includes(topicQuery)),
    );
  }

  if (level && level !== "ALL") {
    items = items.filter((item) => item.level === level);
  }

  return { items, nextCursor: null };
}

export async function getEventualitiesForStatement(req: EventualitiesRequest): Promise<EventualitiesResponse> {
  const eventualities = MOCK_EVENTUALITIES[req.statementId] ?? [];
  return { statementId: req.statementId, eventualities };
}

export async function recordSwipeVote(payload: SwipeVotePayload): Promise<void> {
  // TODO: Votes in Mongo speichern. Aktuell nur Graph-Stub + Log.
  console.log("[swipes] vote", payload);
  try {
    await recordSwipeVoteInGraph(payload);
  } catch (err) {
    console.error("[swipes] graph integration failed", err);
  }
}
