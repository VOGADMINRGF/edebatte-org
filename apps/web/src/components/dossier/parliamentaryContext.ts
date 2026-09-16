import type { Dossier } from "@features/dossier";

export type ParliamentaryContextLink = {
  label: string;
  publisher: string;
  url: string;
  date: string;
  kind: "official" | "abgeordnetenwatch" | "position";
};

export type ParliamentaryContextStatement = {
  actor: string;
  affiliation: string;
  date: string;
  summary: string;
  url: string;
};

export type ParliamentaryContextTopic = {
  id: "eu-csa-chatkontrolle" | "de-ifg-reform";
  title: string;
  jurisdiction: string;
  updatedAt: string;
  procedureStatus: string;
  procedureSummary: string;
  keywords: string[];
  statements: ParliamentaryContextStatement[];
  links: ParliamentaryContextLink[];
  caveat: string;
};

const TOPICS: ParliamentaryContextTopic[] = [
  {
    id: "eu-csa-chatkontrolle",
    title: "EU-Chatkontrolle / CSA-Verordnung",
    jurisdiction: "EU · Deutschland im Rat",
    updatedAt: "2026-09-16",
    procedureStatus: "EU-Verfahren läuft weiter",
    procedureSummary:
      "Das Europäische Parlament schloss am 9. Juli 2026 die zweite Lesung zur befristeten ePrivacy-Ausnahme ab. Seine Position nimmt Ende-zu-Ende-verschlüsselte Kommunikation aus dem Anwendungsbereich. Parallel laufen die Verhandlungen über den dauerhaften CSA-Rechtsrahmen weiter; am 14. September 2026 berieten die JHA Counsellors den Stand und das weitere Vorgehen.",
    keywords: [
      "chatkontrolle",
      "chat control",
      "child sexual abuse",
      "csam",
      "csa-verordnung",
      "csa regulation",
      "2021/1232",
      "eprivacy",
    ],
    statements: [
      {
        actor: "Bettina Hagedorn",
        affiliation: "SPD · Bundestag",
        date: "2026-07-20",
        summary:
          "Erklärte auf abgeordnetenwatch, eine anlasslose Kommunikationsüberwachung müsse im Regelfall tabu sein; der Bundestag sei nicht direkt am Trilog beteiligt.",
        url: "https://www.abgeordnetenwatch.de/profile/bettina-hagedorn/fragen-antworten/die-sd-fraktion-stimmte-am-97-mehrheitlich-fuer-die-verlaengerung-der-chatkontrolle-wie-steht-die-spd",
      },
      {
        actor: "Markus Ferber",
        affiliation: "CSU · EU-Parlament",
        date: "2026-07-14",
        summary:
          "Begründete seine Zustimmung zur Übergangsregelung mit einer eng begrenzten freiwilligen Erkennung und erklärte zugleich, einer allgemeinen oder anlasslosen Überwachung privater Kommunikation nicht zuzustimmen.",
        url: "https://www.abgeordnetenwatch.de/profile/markus-ferber/fragen-antworten/warum-haben-sie-der-chatkontrolle-zugestimmt-obwohl-diese-zuvor-immer-wieder-scheiterte-und-jetzt-nur-mit",
      },
    ],
    links: [
      {
        label: "EP: support for a more limited ePrivacy derogation",
        publisher: "Europäisches Parlament",
        url: "https://www.europarl.europa.eu/news/en/press-room/20260706IPR46318/combating-child-sexual-abuse-support-for-a-more-limited-eprivacy-derogation",
        date: "2026-07-09",
        kind: "official",
      },
      {
        label: "JHA Counsellors: CSA Regulation – state of play and way forward",
        publisher: "Rat der Europäischen Union",
        url: "https://www.consilium.europa.eu/de/meetings/mpo/2026/9/jha-counsellors-%28369706%29/",
        date: "2026-09-14",
        kind: "official",
      },
      {
        label: "Fragen und Antworten zum Thema Chatkontrolle",
        publisher: "abgeordnetenwatch.de",
        url: "https://www.abgeordnetenwatch.de/fragen-antworten?Themen=Chatkontrolle",
        date: "2026-09-16",
        kind: "abgeordnetenwatch",
      },
    ],
    caveat:
      "Die dargestellten Politikerpositionen sind öffentliche Eigenaussagen auf abgeordnetenwatch. Sie werden nicht als Faktenbeleg oder als Position einer gesamten Partei gewertet. Maßgeblich für den Verfahrensstand sind die verlinkten offiziellen EU-Quellen.",
  },
  {
    id: "de-ifg-reform",
    title: "Informationsfreiheitsgesetz / staatliche Transparenz",
    jurisdiction: "Bund",
    updatedAt: "2026-09-16",
    procedureStatus: "Reformvorhaben in Vorbereitung",
    procedureSummary:
      "Der Koalitionsausschuss beschloss am 2. Juli 2026 Eckpunkte für eine Reform des Informationsfreiheitsgesetzes. Im Lobbyregister des Bundestages wird unter Verweis auf die Antwort der Bundesregierung in BT-Drs. 21/7180 dokumentiert, dass ein Gesetzentwurf des Bundesinnenministeriums vorbereitet wird. Ein parlamentarisch beschlossenes Reformgesetz liegt damit noch nicht vor.",
    keywords: [
      "informationsfreiheitsgesetz",
      "informationsfreiheit",
      "ifg-reform",
      "ifg reform",
      "staatliche transparenz",
      "transparenzgesetz",
    ],
    statements: [
      {
        actor: "Hakan Demir",
        affiliation: "SPD · Bundestag",
        date: "2026-07-03",
        summary:
          "Erklärte auf abgeordnetenwatch, der Koalitionsbeschluss sei noch kein Gesetz und der Zugang zu staatlichen Informationen solle im parlamentarischen Verfahren nicht faktisch erschwert oder auf wenige Gruppen begrenzt werden.",
        url: "https://www.abgeordnetenwatch.de/profile/hakan-demir/fragen-antworten/sehr-geehrter-herr-demir-wie-werden-sie-sich-zur-aenderung-des-informationsfreiheitsgesetz-positionieren",
      },
      {
        actor: "Josef Oster",
        affiliation: "CDU · Bundestag",
        date: "2026-07-10",
        summary:
          "Erklärte auf abgeordnetenwatch, der grundsätzliche Zugang zu amtlichen Informationen solle erhalten bleiben; die Reform solle zugleich Sicherheitsbelange und staatliche Handlungsfähigkeit stärker berücksichtigen.",
        url: "https://www.abgeordnetenwatch.de/profile/josef-oster/fragen-antworten/ist-es-tatsaechlich-war-das-die-regierungskoalition-das-informationsfreiheitsgestz-in-seiner-jetzigen-form",
      },
    ],
    links: [
      {
        label: "Regelungsvorhaben: Informationsfreiheitsgesetz erhalten",
        publisher: "Lobbyregister beim Deutschen Bundestag",
        url: "https://www.lobbyregister.bundestag.de/inhalte-der-interessenvertretung/regelungsvorhabensuche/RV0027707/508772",
        date: "2026-08-07",
        kind: "official",
      },
      {
        label: "Koalition will Informationsfreiheitsgesetz stark einschränken",
        publisher: "abgeordnetenwatch.de",
        url: "https://www.abgeordnetenwatch.de/presse/pressemitteilungen/koalition-will-informationsfreiheitsgesetz-faktisch-abschaffen-abgeordnetenwatch-fordert-sofortigen-stopp-der-plaene",
        date: "2026-07-02",
        kind: "position",
      },
      {
        label: "Politische Kontakte von abgeordnetenwatch",
        publisher: "abgeordnetenwatch.de",
        url: "https://www.abgeordnetenwatch.de/ueber-uns/transparenz-bei-abgeordnetenwatch",
        date: "2026-09-15",
        kind: "abgeordnetenwatch",
      },
    ],
    caveat:
      "abgeordnetenwatch tritt beim IFG selbst als Interessenvertreter für weitgehende Informationsfreiheit auf. Diese Organisationsposition ist deshalb getrennt von amtlichem Verfahrensstand und von Eigenaussagen einzelner Abgeordneter gekennzeichnet.",
  },
];

function sourceHaystack(sources: Dossier["sourceSet"]): string {
  return sources
    .flatMap((source) => [
      source.title,
      source.canonicalUrl,
      source.publisher,
      source.location,
      source.timeRange,
      ...(source.assumptions ?? []),
    ])
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("de-DE");
}

export function getParliamentaryContextTopics(
  sources: Dossier["sourceSet"],
): ParliamentaryContextTopic[] {
  if (!sources.length) return [];
  const haystack = sourceHaystack(sources);
  return TOPICS.filter((topic) =>
    topic.keywords.some((keyword) => haystack.includes(keyword.toLocaleLowerCase("de-DE"))),
  );
}

export const PARLIAMENTARY_CONTEXT_PILOT_TOPICS = TOPICS;
