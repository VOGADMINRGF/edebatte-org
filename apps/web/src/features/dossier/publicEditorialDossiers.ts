import type { Dossier } from "@features/dossier";
import type { PublicDossierRuntimeItem } from "./publicRuntime";

const CHECKED_AT = "2026-09-17T04:50:00.000Z";

const sourceMatrix = {
  section: "Quellenmatrix",
  entries: [
    {
      id: "source-ep-july-2026",
      title: "Combating child sexual abuse online: support for more limited ePrivacy derogation",
      canonicalUrl:
        "https://www.europarl.europa.eu/news/en/press-room/20260706IPR46318/combating-child-sexual-abuse-support-for-a-more-limited-eprivacy-derogation",
      cluster: "governance",
      takeaway:
        "Dokumentiert die zweite Lesung vom 9. Juli 2026 und die vom Parlament beschlossenen Änderungen.",
      notAutomatic:
        "Die Pressemitteilung beschreibt den Parlamentsstand; sie ist keine technische Bewertung der eingesetzten Erkennungsmethoden.",
      evidenceStatus: "geprüft – offizielle EU-Primärquelle",
      transferability: "hoch",
      criticalCaveat:
        "Die befristete ePrivacy-Ausnahme und die dauerhafte CSA-Verordnung sind getrennte Gesetzgebungsverfahren.",
    },
    {
      id: "source-council-september-2026",
      title: "JHA Counsellors – CSA Regulation: state of play and way forward",
      canonicalUrl:
        "https://www.consilium.europa.eu/de/meetings/mpo/2026/9/jha-counsellors-%28369706%29/",
      cluster: "governance",
      takeaway:
        "Belegt, dass die Verhandlungen zur dauerhaften CSA-Verordnung im September 2026 weiterliefen.",
      notAutomatic:
        "Aus der Sitzungsankündigung lässt sich keine endgültige Ratsposition Deutschlands ableiten.",
      evidenceStatus: "geprüft – offizielle EU-Primärquelle",
      transferability: "hoch",
      criticalCaveat:
        "Der konkrete Verhandlungstext kann sich zwischen Sitzungen und Trilogen verändern.",
    },
    {
      id: "source-aw-poll-6454",
      title: "Verlängerung der freiwilligen Chatkontrolle als Maßnahme gegen Kindesmissbrauch",
      canonicalUrl:
        "https://www.abgeordnetenwatch.de/eu/10/abstimmungen/verlaengerung-der-freiwilligen-chatkontrolle-als-massnahme-gegen-kindesmissbrauch",
      cluster: "governance",
      takeaway:
        "Dokumentiert die namentlich zuordenbare Abstimmung vom 26. März 2026 und stellt die deutschen EU-Abgeordneten separat dar.",
      notAutomatic:
        "Die Abstimmung vom März beschreibt einen früheren Verfahrensstand und darf nicht mit dem Parlamentsstand vom 9. Juli 2026 gleichgesetzt werden.",
      evidenceStatus: "geprüft – abgeordnetenwatch Open Data",
      transferability: "hoch",
      criticalCaveat:
        "Die deutsche Delegationsauswertung umfasst nur die von abgeordnetenwatch ausgewiesenen deutschen EU-Abgeordneten, nicht das gesamte Parlament.",
    },
    {
      id: "source-aw-ferber",
      title: "Antwort von Markus Ferber zur Übergangsregelung",
      canonicalUrl:
        "https://www.abgeordnetenwatch.de/profile/markus-ferber/fragen-antworten/warum-haben-sie-der-chatkontrolle-zugestimmt-obwohl-diese-zuvor-immer-wieder-scheiterte-und-jetzt-nur-mit",
      cluster: "participation",
      takeaway:
        "Dokumentiert eine öffentliche Begründung eines Europaabgeordneten, der der Übergangsregelung zustimmte.",
      notAutomatic:
        "Die Antwort ist eine Eigenaussage und weder unabhängige Faktenprüfung noch Position einer gesamten Partei oder Fraktion.",
      evidenceStatus: "geprüft als öffentliche Eigenaussage",
      transferability: "mittel",
      criticalCaveat: "Politische Selbsteinordnung bleibt als solche gekennzeichnet.",
    },
    {
      id: "source-aw-hagedorn",
      title: "Antwort von Bettina Hagedorn zur Chatkontrolle und zum Trilog",
      canonicalUrl:
        "https://www.abgeordnetenwatch.de/profile/bettina-hagedorn/fragen-antworten/die-sd-fraktion-stimmte-am-97-mehrheitlich-fuer-die-verlaengerung-der-chatkontrolle-wie-steht-die-spd",
      cluster: "participation",
      takeaway:
        "Dokumentiert eine öffentliche Bundestagsposition gegen anlasslose Kommunikationsüberwachung.",
      notAutomatic:
        "Die Antwort ist eine Eigenaussage und ersetzt keine amtliche Feststellung der Bundesregierung oder des Rates.",
      evidenceStatus: "geprüft als öffentliche Eigenaussage",
      transferability: "mittel",
      criticalCaveat: "Nicht als Position der gesamten Partei oder Bundesregierung lesen.",
    },
  ],
};

const presentation = {
  topic: {
    id: "chatkontrolle",
    label: "EU-Chatkontrolle / CSA-Verordnung",
    municipality: "Europäische Union",
  },
  hero: {
    impactLevel: "hoch",
    relevance: "Grundrechte · Kinderschutz · digitale Kommunikation",
    participation: "laufendes EU-Gesetzgebungsverfahren",
  },
  statementStats: {
    total: 6,
    pro: 1,
    neutral: 4,
    contra: 1,
    clusters: [
      { label: "Verfahrensstand", count: 3 },
      { label: "Kinderschutz", count: 1 },
      { label: "Privatsphäre & Verschlüsselung", count: 2 },
    ],
  },
  clusters: [
    { label: "Verfahrensstand", count: 3 },
    { label: "Kinderschutz", count: 1 },
    { label: "Privatsphäre & Verschlüsselung", count: 2 },
  ],
  openQuestions: [
    {
      id: "question-current-text",
      text: "Welcher konkrete Kompromisstext liegt den laufenden Verhandlungen zur dauerhaften CSA-Verordnung aktuell zugrunde?",
      status: "open",
      responsible: "Rat der EU / Europäisches Parlament",
      lastUpdate: CHECKED_AT,
      sourceIds: ["source-council-september-2026"],
    },
    {
      id: "question-germany",
      text: "Welche konkrete Position vertritt die Bundesregierung im Rat zu Detection Orders, Client-Side-Scanning und Ende-zu-Ende-Verschlüsselung?",
      status: "open",
      responsible: "Bundesregierung / Rat der EU",
      lastUpdate: CHECKED_AT,
      sourceIds: ["source-council-september-2026", "source-aw-hagedorn"],
    },
    {
      id: "question-technology",
      text: "Welche Erkennungstechniken wären technisch vorgesehen, und welche Fehlerraten sowie Kontrollmechanismen wären für sie nachweisbar?",
      status: "open",
      responsible: "Gesetzgeber / technische Fachprüfung",
      lastUpdate: CHECKED_AT,
    },
    {
      id: "question-safeguards",
      text: "Welche rechtsstaatlichen Schwellen, unabhängigen Kontrollen und Rechtsbehelfe gelten für mögliche Eingriffe in private Kommunikation?",
      status: "open",
      responsible: "EU-Gesetzgeber / Gerichte",
      lastUpdate: CHECKED_AT,
      sourceIds: ["source-ep-july-2026", "source-council-september-2026"],
    },
  ],
  contributionPolicy: {
    publicContributionLanguage:
      "Neue Quellen, technische Analysen und dokumentierte Positionen können zur Prüfung vorgeschlagen werden.",
    citizenVotesSeparatedFromOrganizationPositions: true,
    hostedRoomVisibility: "public_open",
    hostedRoomPublicOpinionNote:
      "Politiker- und Organisationspositionen werden getrennt von Bürgerpositionen ausgewiesen.",
  },
};

const claims: Dossier["analyze"]["claims"] = [
  {
    id: "claim-temporary-vs-permanent",
    text: "Die öffentliche Debatte verbindet zwei getrennte EU-Verfahren: die befristete ePrivacy-Ausnahme für freiwillige Erkennung und die dauerhafte CSA-Verordnung.",
    title: "Zwei getrennte EU-Verfahren",
    topic: "Chatkontrolle",
    domain: "digitales",
    domains: ["digitales", "justiz"],
    responsibility: "EU",
    importance: "high",
    stance: "neutral",
    statementType: "fact",
  },
  {
    id: "claim-ep-july",
    text: "Das Europäische Parlament schloss am 9. Juli 2026 seine zweite Lesung zur befristeten ePrivacy-Ausnahme ab und nahm Änderungen an der Ratsposition an.",
    title: "Zweite Lesung am 9. Juli 2026",
    topic: "EU-Verfahren",
    domain: "digitales",
    domains: ["digitales", "justiz"],
    responsibility: "EU-Parlament",
    importance: "high",
    stance: "neutral",
    statementType: "fact",
  },
  {
    id: "claim-e2ee",
    text: "Nach dem Parlamentsstand vom 9. Juli 2026 sollen Kommunikationen, auf die Ende-zu-Ende-Verschlüsselung angewandt wird oder werden soll, von dieser befristeten Regelung ausgenommen sein.",
    title: "Ende-zu-Ende-Verschlüsselung im Parlamentsstand",
    topic: "Verschlüsselung",
    domain: "digitales",
    domains: ["digitales", "justiz"],
    responsibility: "EU-Parlament",
    importance: "high",
    stance: "neutral",
    statementType: "fact",
  },
  {
    id: "claim-csa-ongoing",
    text: "Die Verhandlungen zur dauerhaften CSA-Verordnung liefen im September 2026 weiter; für den 14. September dokumentiert der Rat ausdrücklich einen Beratungsstand und das weitere Vorgehen.",
    title: "Dauerhafte CSA-Verordnung weiter in Verhandlung",
    topic: "CSA-Verordnung",
    domain: "justiz",
    domains: ["justiz", "digitales"],
    responsibility: "Rat der EU / EU-Parlament",
    importance: "high",
    stance: "neutral",
    statementType: "fact",
  },
  {
    id: "claim-support-position",
    text: "Eine öffentlich dokumentierte befürwortende Position begründet freiwillige Erkennung in nicht Ende-zu-Ende-verschlüsselten Diensten mit der Schließung einer Rechtslücke beim Schutz vor Darstellungen sexuellen Kindesmissbrauchs.",
    title: "Dokumentierte Begründung für begrenzte freiwillige Erkennung",
    topic: "Kinderschutz",
    domain: "justiz",
    domains: ["justiz", "digitales"],
    responsibility: "politische Position",
    importance: "medium",
    stance: "pro",
    statementType: "interpretation",
  },
  {
    id: "claim-critical-position",
    text: "Eine öffentlich dokumentierte kritische Position lehnt anlasslose Kommunikationsüberwachung als Regelfall ab und fordert eine enge Begrenzung staatlicher Eingriffe in private Kommunikation.",
    title: "Dokumentierte Kritik an anlassloser Überwachung",
    topic: "Grundrechte",
    domain: "justiz",
    domains: ["justiz", "digitales"],
    responsibility: "politische Position",
    importance: "medium",
    stance: "contra",
    statementType: "interpretation",
  },
];

const findings: Dossier["analyze"]["findings"] = [
  {
    id: "finding-ep-july",
    claimId: "claim-ep-july",
    sourceId: "source-ep-july-2026",
    finding: "supports",
    rationale: "Die offizielle Pressemitteilung des Europäischen Parlaments dokumentiert Datum, Verfahrensstufe und Abstimmungsfolge.",
  },
  {
    id: "finding-e2ee",
    claimId: "claim-e2ee",
    sourceId: "source-ep-july-2026",
    finding: "supports",
    rationale: "Die Parlamentsmitteilung nennt Ende-zu-Ende-verschlüsselte Kommunikation ausdrücklich als vom Anwendungsbereich auszunehmend.",
  },
  {
    id: "finding-csa-ongoing",
    claimId: "claim-csa-ongoing",
    sourceId: "source-council-september-2026",
    finding: "supports",
    rationale: "Der Rat führt am 14. September 2026 den Stand der CSA-Verordnung und das weitere Vorgehen als Beratungsgegenstand.",
  },
  {
    id: "finding-support-position",
    claimId: "claim-support-position",
    sourceId: "source-aw-ferber",
    finding: "supports",
    rationale: "Der Befund stützt nur, dass diese Begründung öffentlich geäußert wurde; er bewertet nicht ihre Richtigkeit.",
  },
  {
    id: "finding-critical-position",
    claimId: "claim-critical-position",
    sourceId: "source-aw-hagedorn",
    finding: "supports",
    rationale: "Der Befund stützt nur, dass diese kritische Position öffentlich geäußert wurde; er bewertet sie nicht als allgemeine Parteiposition.",
  },
];

const sourceSet: Dossier["sourceSet"] = [
  {
    canonicalUrl:
      "https://www.europarl.europa.eu/news/en/press-room/20260706IPR46318/combating-child-sexual-abuse-support-for-a-more-limited-eprivacy-derogation",
    host: "europarl.europa.eu",
    publisher: "Europäisches Parlament",
    sourceClass: "gov",
    sourceType: "gov",
    timeRange: "09.07.2026",
    location: "Europäische Union",
    audience: "Öffentlichkeit",
    assumptions: ["Offizielle Verfahrens- und Abstimmungsdarstellung des Europäischen Parlaments"],
    fetchedAt: CHECKED_AT,
    title: "Chatkontrolle / CSA: zweite Lesung zur befristeten ePrivacy-Ausnahme",
  },
  {
    canonicalUrl:
      "https://www.consilium.europa.eu/de/meetings/mpo/2026/9/jha-counsellors-%28369706%29/",
    host: "consilium.europa.eu",
    publisher: "Rat der Europäischen Union",
    sourceClass: "gov",
    sourceType: "gov",
    timeRange: "14.09.2026",
    location: "Europäische Union",
    audience: "Öffentlichkeit / Mitgliedstaaten",
    assumptions: ["Sitzungs- und Dokumentenübersicht; keine abschließende politische Einigung"],
    fetchedAt: CHECKED_AT,
    title: "CSA Regulation – state of play and way forward",
  },
  {
    canonicalUrl:
      "https://www.abgeordnetenwatch.de/eu/10/abstimmungen/verlaengerung-der-freiwilligen-chatkontrolle-als-massnahme-gegen-kindesmissbrauch",
    host: "abgeordnetenwatch.de",
    publisher: "abgeordnetenwatch.de",
    sourceClass: "community",
    sourceType: "community",
    timeRange: "26.03.2026",
    location: "Europäisches Parlament",
    audience: "Öffentlichkeit",
    assumptions: ["Open-Data-Abstimmungsdokumentation; zeitlich früherer Verfahrensstand"],
    fetchedAt: CHECKED_AT,
    title: "Chatkontrolle: dokumentierte Abstimmung vom 26. März 2026 (Poll 6454)",
  },
  {
    canonicalUrl:
      "https://www.abgeordnetenwatch.de/profile/markus-ferber/fragen-antworten/warum-haben-sie-der-chatkontrolle-zugestimmt-obwohl-diese-zuvor-immer-wieder-scheiterte-und-jetzt-nur-mit",
    host: "abgeordnetenwatch.de",
    publisher: "abgeordnetenwatch.de",
    sourceClass: "community",
    sourceType: "community",
    timeRange: "14.07.2026",
    location: "Europäisches Parlament",
    audience: "Öffentlichkeit",
    assumptions: ["Öffentliche Eigenaussage eines Abgeordneten; keine unabhängige Faktenprüfung"],
    fetchedAt: CHECKED_AT,
    title: "Chatkontrolle: öffentliche Antwort von Markus Ferber",
  },
  {
    canonicalUrl:
      "https://www.abgeordnetenwatch.de/profile/bettina-hagedorn/fragen-antworten/die-sd-fraktion-stimmte-am-97-mehrheitlich-fuer-die-verlaengerung-der-chatkontrolle-wie-steht-die-spd",
    host: "abgeordnetenwatch.de",
    publisher: "abgeordnetenwatch.de",
    sourceClass: "community",
    sourceType: "community",
    timeRange: "20.07.2026",
    location: "Deutschland / EU",
    audience: "Öffentlichkeit",
    assumptions: ["Öffentliche Eigenaussage einer Abgeordneten; keine amtliche Ratsposition"],
    fetchedAt: CHECKED_AT,
    title: "Chatkontrolle: öffentliche Antwort von Bettina Hagedorn",
  },
];

const evidenceNodes = [
  ...claims.map((claim) => ({
    id: claim.id,
    type: "claim" as const,
    label: claim.title ?? claim.text,
  })),
  ...sourceSet.map((source, index) => ({
    id: [
      "source-ep-july-2026",
      "source-council-september-2026",
      "source-aw-poll-6454",
      "source-aw-ferber",
      "source-aw-hagedorn",
    ][index]!,
    type: "evidence" as const,
    label: source.title ?? source.publisher ?? source.canonicalUrl,
    url: source.canonicalUrl,
    publisher: source.publisher,
    sourceClass: source.sourceClass,
  })),
];

const evidenceEdges: Dossier["analyze"]["evidenceGraph"]["edges"] = [
  { from: "claim-temporary-vs-permanent", to: "source-ep-july-2026", kind: "supports", weight: 0.9 },
  { from: "claim-temporary-vs-permanent", to: "source-council-september-2026", kind: "supports", weight: 0.9 },
  { from: "claim-ep-july", to: "source-ep-july-2026", kind: "supports", weight: 1 },
  { from: "claim-e2ee", to: "source-ep-july-2026", kind: "supports", weight: 1 },
  { from: "claim-csa-ongoing", to: "source-council-september-2026", kind: "supports", weight: 1 },
  { from: "claim-support-position", to: "source-aw-ferber", kind: "supports", weight: 0.8 },
  { from: "claim-critical-position", to: "source-aw-hagedorn", kind: "supports", weight: 0.8 },
  { from: "claim-temporary-vs-permanent", to: "source-aw-poll-6454", kind: "context_for", weight: 0.6 },
];

export const CHATKONTROLLE_DOSSIER: Dossier = {
  meta: {
    id: "chatkontrolle",
    title: "EU-Chatkontrolle / CSA-Verordnung",
    jurisdiction: "eu",
    region: "Europäische Union",
    status: "published",
    owner: "eDebatte Redaktion",
    createdAt: "2026-09-17T04:50:00.000Z",
    updatedAt: CHECKED_AT,
    revision: {
      rev: 1,
      lastChangeAt: CHECKED_AT,
    },
  },
  analyze: {
    mode: "E150",
    sourceText:
      "Aktueller öffentlicher Dossierstand zur EU-Debatte über freiwillige Erkennung von Darstellungen sexuellen Kindesmissbrauchs und die dauerhafte CSA-Verordnung. Verfahrensstand, Abstimmungsverhalten und politische Eigenaussagen werden getrennt behandelt.",
    language: "de",
    claims,
    findings,
    notes: [
      {
        id: "note-chatkontrolle-presentation",
        kind: "presentation",
        text: JSON.stringify(presentation),
      },
      {
        id: "note-source-matrix",
        kind: "context",
        text: JSON.stringify(sourceMatrix),
      },
      {
        id: "note-chatkontrolle-provenance",
        kind: "context",
        text: "Politikerantworten von abgeordnetenwatch werden ausschließlich als öffentliche Eigenaussagen behandelt. Abgeordnetenwatch-Abstimmungsdaten dokumentieren parlamentarisches Verhalten. Für den aktuellen EU-Verfahrensstand werden offizielle EU-Quellen priorisiert.",
      },
    ],
    questions: [
      {
        id: "question-current-text",
        text: "Welcher konkrete Kompromisstext liegt den laufenden Verhandlungen zur dauerhaften CSA-Verordnung aktuell zugrunde?",
        dimension: "EU-Verfahren",
      },
      {
        id: "question-germany",
        text: "Welche konkrete Position vertritt die Bundesregierung im Rat zu Detection Orders, Client-Side-Scanning und Ende-zu-Ende-Verschlüsselung?",
        dimension: "Deutschland im Rat",
      },
      {
        id: "question-technology",
        text: "Welche Erkennungstechniken wären technisch vorgesehen, und welche Fehlerraten sowie Kontrollmechanismen wären für sie nachweisbar?",
        dimension: "Technik",
      },
      {
        id: "question-safeguards",
        text: "Welche rechtsstaatlichen Schwellen, unabhängigen Kontrollen und Rechtsbehelfe gelten für mögliche Eingriffe in private Kommunikation?",
        dimension: "Grundrechte",
      },
    ],
    missingPerspectives: [
      {
        id: "perspective-crypto",
        text: "Unabhängige technische Bewertung durch Kryptografie- und IT-Sicherheitsforschung",
        dimension: "digitales",
      },
      {
        id: "perspective-child-protection",
        text: "Empirisch belegte Perspektive von Kinderschutz-Fachorganisationen zur Wirksamkeit unterschiedlicher Instrumente",
        dimension: "justiz",
      },
      {
        id: "perspective-law-enforcement",
        text: "Praktische Vollzugsperspektive von Strafverfolgungsbehörden mit belastbaren Zahlen zu Nutzen, Fehlalarmen und Ressourcen",
        dimension: "justiz",
      },
    ],
    knots: [
      {
        id: "knot-rights-child-protection",
        label: "Kinderschutz und Kommunikationsgeheimnis",
        description: "Wie lassen sich wirksame Maßnahmen gegen Missbrauchsdarstellungen mit Vertraulichkeit privater Kommunikation und Grundrechten vereinbaren?",
      },
      {
        id: "knot-temporary-permanent",
        label: "Übergangsregelung versus dauerhafte CSA-Verordnung",
        description: "Die beiden Verfahren werden öffentlich häufig vermischt, haben aber unterschiedliche Rechtsgrundlagen und Verfahrensstände.",
      },
    ],
    consequences: {
      consequences: [],
      responsibilities: [],
    },
    responsibilityPaths: [],
    eventualities: [],
    decisionTrees: [],
    impactAndResponsibility: {
      impacts: [],
      responsibleActors: [],
    },
    participationCandidates: [],
    evidenceGraph: {
      nodes: evidenceNodes,
      edges: evidenceEdges,
      summary: {
        claimCount: claims.length,
        evidenceCount: sourceSet.length,
        linkedClaimCount: claims.length,
        unlinkedClaimCount: 0,
      },
    },
    report: {
      summary:
        "Die Bezeichnung „Chatkontrolle“ bündelt mehrere unterschiedliche Regelungsfragen. Im Juli 2026 schloss das Europäische Parlament die zweite Lesung zur befristeten ePrivacy-Ausnahme ab und wollte Ende-zu-Ende-verschlüsselte Kommunikation aus deren Anwendungsbereich herausnehmen. Die Verhandlungen über die dauerhafte CSA-Verordnung liefen im September 2026 weiter. Das Dossier trennt diesen Verfahrensstand von früheren Abstimmungen und von öffentlichen Eigenaussagen einzelner Abgeordneter.",
      keyConflicts: [
        "Schutz von Kindern vor sexualisierter Gewalt und Missbrauchsdarstellungen versus Vertraulichkeit privater Kommunikation",
        "Wirksamkeit automatisierter Erkennung versus Fehlalarme, technische Umgehbarkeit und Grundrechtseingriffe",
        "Bekämpfung illegaler Inhalte versus Schutz Ende-zu-Ende-verschlüsselter Kommunikation",
      ],
      facts: {
        local: [
          "Das Europäische Parlament schloss am 9. Juli 2026 die zweite Lesung zur befristeten ePrivacy-Ausnahme ab.",
          "Der Parlamentsstand nimmt Ende-zu-Ende-verschlüsselte Kommunikation aus dem Anwendungsbereich dieser befristeten Regelung aus.",
          "Der Rat dokumentierte am 14. September 2026 Beratungen zum Stand und weiteren Vorgehen bei der dauerhaften CSA-Verordnung.",
        ],
        international: [],
      },
      openQuestions: [
        "Welcher konkrete Kompromisstext ist aktuell Verhandlungsgrundlage?",
        "Welche Position vertritt Deutschland im Rat in den noch offenen Punkten?",
        "Welche technischen Verfahren und Schutzmechanismen wären konkret vorgesehen?",
      ],
      takeaways: [
        "Befristete ePrivacy-Ausnahme und dauerhafte CSA-Verordnung müssen getrennt bewertet werden.",
        "Abstimmungsdaten zeigen dokumentiertes parlamentarisches Verhalten, nicht automatisch Motive oder Parteipositionen.",
        "Eigenaussagen von Abgeordneten werden als Positionen und nicht als Faktenbeleg behandelt.",
      ],
    },
  } as Dossier["analyze"],
  sourceSet,
  voteConfig: {
    enabled: false,
    policy: "civic",
    minOptions: 5,
    allowCommunityOptions: true,
  },
};

export const CHATKONTROLLE_DOSSIER_ITEM: PublicDossierRuntimeItem = {
  id: "chatkontrolle",
  slug: "chatkontrolle",
  title: CHATKONTROLLE_DOSSIER.meta.title,
  coreQuestion:
    "Wie kann der Schutz von Kindern vor sexualisierter Gewalt im Netz verbessert werden, ohne unverhältnismäßig in vertrauliche Kommunikation und Verschlüsselung einzugreifen?",
  summary: CHATKONTROLLE_DOSSIER.analyze.report.summary,
  statusLabel: "Veröffentlicht",
  sourceStatusLabel: "5 öffentlich nachvollziehbare Quellen · Stand 17.09.2026",
  updatedAt: CHECKED_AT,
  source: "runtime",
};

export function getPublicEditorialDossier(slugOrId: string): Dossier | null {
  const normalized = decodeURIComponent(slugOrId).trim().toLocaleLowerCase("de-DE");
  if (normalized === "chatkontrolle" || normalized === "chat-control") {
    return CHATKONTROLLE_DOSSIER;
  }
  return null;
}
