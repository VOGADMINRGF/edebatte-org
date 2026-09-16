import type { Dossier } from "@features/dossier";
import demoDossier from "@features/dossier/data/demoDossier";

export type ParliamentaryDemoTopic = "chatkontrolle" | "informationsfreiheit";

const UPDATED_AT = "2026-09-16T17:20:00.000Z";

const CHATCONTROL_SOURCES: Dossier["sourceSet"] = [
  {
    canonicalUrl:
      "https://www.europarl.europa.eu/news/en/press-room/20260706IPR46318/combating-child-sexual-abuse-support-for-a-more-limited-eprivacy-derogation",
    host: "europarl.europa.eu",
    publisher: "Europäisches Parlament",
    sourceClass: "gov",
    sourceType: "gov",
    timeRange: "09.07.2026",
    location: "EU",
    audience: "Öffentlichkeit",
    assumptions: ["Amtlicher Verfahrensstand; keine Bewertung des Gesamtvorhabens"],
    fetchedAt: UPDATED_AT,
    title: "Chatkontrolle / CSA: Position des Europäischen Parlaments zur ePrivacy-Ausnahme",
  },
  {
    canonicalUrl: "https://www.consilium.europa.eu/de/meetings/mpo/2026/9/jha-counsellors-%28369706%29/",
    host: "consilium.europa.eu",
    publisher: "Rat der Europäischen Union",
    sourceClass: "gov",
    sourceType: "gov",
    timeRange: "14.09.2026",
    location: "EU",
    audience: "Öffentlichkeit",
    assumptions: ["Sitzungs-/Verfahrensinformation; keine Aussage über spätere Einigung"],
    fetchedAt: UPDATED_AT,
    title: "CSA Regulation: state of play and way forward",
  },
  {
    canonicalUrl: "https://www.abgeordnetenwatch.de/api/v2/polls/6454",
    host: "abgeordnetenwatch.de",
    publisher: "abgeordnetenwatch.de",
    sourceClass: "other",
    sourceType: "other",
    timeRange: "26.03.2026",
    location: "EU",
    audience: "Öffentlichkeit",
    assumptions: ["Open-Data-Abstimmungsdatensatz; getrennt vom aktuellen Verfahrensstand lesen"],
    fetchedAt: UPDATED_AT,
    title: "Chatkontrolle: abgeordnetenwatch Open-Data Poll 6454",
  },
];

const IFG_SOURCES: Dossier["sourceSet"] = [
  {
    canonicalUrl: "https://www.lobbyregister.bundestag.de/inhalte-der-interessenvertretung/regelungsvorhabensuche/RV0027707/508772",
    host: "lobbyregister.bundestag.de",
    publisher: "Lobbyregister beim Deutschen Bundestag",
    sourceClass: "gov",
    sourceType: "gov",
    timeRange: "2026",
    location: "Deutschland",
    audience: "Öffentlichkeit",
    assumptions: ["Amtliche Registerplattform; inhaltliche Angaben stammen vom registrierten Interessenvertreter"],
    fetchedAt: UPDATED_AT,
    title: "Informationsfreiheitsgesetz erhalten – Registereintrag zum Reformvorhaben",
  },
  {
    canonicalUrl: "https://www.abgeordnetenwatch.de/ueber-uns/transparenz-bei-abgeordnetenwatch",
    host: "abgeordnetenwatch.de",
    publisher: "abgeordnetenwatch.de",
    sourceClass: "stakeholder",
    sourceType: "stakeholder",
    timeRange: "Stand 15.09.2026",
    location: "Deutschland",
    audience: "Öffentlichkeit",
    assumptions: ["Eigene Transparenz- und Interessenvertretungsdokumentation von abgeordnetenwatch"],
    fetchedAt: UPDATED_AT,
    title: "Informationsfreiheit und politische Kontakte von abgeordnetenwatch",
  },
  {
    canonicalUrl:
      "https://www.abgeordnetenwatch.de/presse/pressemitteilungen/koalition-will-informationsfreiheitsgesetz-faktisch-abschaffen-abgeordnetenwatch-fordert-sofortigen-stopp-der-plaene",
    host: "abgeordnetenwatch.de",
    publisher: "abgeordnetenwatch.de",
    sourceClass: "stakeholder",
    sourceType: "stakeholder",
    timeRange: "02.07.2026",
    location: "Deutschland",
    audience: "Öffentlichkeit",
    assumptions: ["Organisationsposition von abgeordnetenwatch; keine amtliche Sachfeststellung"],
    fetchedAt: UPDATED_AT,
    title: "IFG-Reform: Organisationsposition von abgeordnetenwatch",
  },
];

const CONFIG = {
  chatkontrolle: {
    id: "demo-chatkontrolle",
    title: "Test-Dossier: EU-Chatkontrolle / CSA-Verordnung",
    jurisdiction: "eu" as const,
    region: "Europäische Union / Deutschland",
    sources: CHATCONTROL_SOURCES,
    summary:
      "Dieses Test-Dossier dient der Sichtprüfung des parlamentarischen Kontexts zur EU-Chatkontrolle/CSA. Verfahrensstand, dokumentierte Abstimmungen und Eigenaussagen werden getrennt dargestellt.",
    takeaways: [
      "Der aktuelle EU-Verfahrensstand und frühere dokumentierte Abstimmungen sind unterschiedliche Informationsarten.",
      "abgeordnetenwatch-Daten werden als parlamentarische Transparenzquelle eingebunden, nicht als redaktioneller Wahrheitsbeleg.",
      "Politikerantworten bleiben als Eigenaussagen gekennzeichnet.",
    ],
    openQuestions: [
      "Welche Fassung wird im weiteren EU-Verfahren tatsächlich verhandelt?",
      "Wie positioniert sich Deutschland im Rat zu den noch offenen Punkten?",
      "Welche Schutzmechanismen gelten für Ende-zu-Ende-verschlüsselte Kommunikation?",
    ],
  },
  informationsfreiheit: {
    id: "demo-informationsfreiheit",
    title: "Test-Dossier: Informationsfreiheitsgesetz & staatliche Transparenz",
    jurisdiction: "federal" as const,
    region: "Deutschland",
    sources: IFG_SOURCES,
    summary:
      "Dieses Test-Dossier dient der Sichtprüfung des parlamentarischen Kontexts zur IFG-Reform. Registerangaben, Organisationspositionen, Politikerantworten und Verfahrensstand werden getrennt ausgewiesen.",
    takeaways: [
      "Ein Lobbyregister-Eintrag ist eine amtlich veröffentlichte Registrierung, aber nicht automatisch eine amtliche Sachfeststellung.",
      "abgeordnetenwatch ist beim IFG selbst Interessenvertreter; diese Rolle wird sichtbar gekennzeichnet.",
      "Politikerantworten und Organisationsforderungen bleiben von der Evidenz- und Verfahrensebene getrennt.",
    ],
    openQuestions: [
      "Welche konkrete Gesetzesfassung wird das Bundesinnenministerium vorlegen?",
      "Welche Ausnahmen und Zugangsrechte sollen gegenüber dem geltenden IFG verändert werden?",
      "Wie verändert die Reform den praktischen Informationszugang für Bürger:innen, Medien und Zivilgesellschaft?",
    ],
  },
} satisfies Record<ParliamentaryDemoTopic, unknown>;

export function isParliamentaryDemoTopic(value: string): value is ParliamentaryDemoTopic {
  return value === "chatkontrolle" || value === "informationsfreiheit";
}

export function buildParliamentaryTestDossier(topic: ParliamentaryDemoTopic): Dossier {
  const config = CONFIG[topic] as (typeof CONFIG)[ParliamentaryDemoTopic];

  return {
    ...demoDossier,
    meta: {
      ...demoDossier.meta,
      id: config.id,
      title: config.title,
      jurisdiction: config.jurisdiction,
      region: config.region,
      updatedAt: UPDATED_AT,
      revision: {
        rev: 1,
        lastChangeAt: UPDATED_AT,
      },
    },
    sourceSet: config.sources,
    analyze: {
      ...demoDossier.analyze,
      report: {
        ...demoDossier.analyze.report,
        summary: config.summary,
        takeaways: config.takeaways,
        openQuestions: config.openQuestions,
      },
    },
  };
}
