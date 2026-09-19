import { getCol } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import { normalizeGermanSearchText, normalizeGermanSlug } from "@features/common/utils/textNormalization";
import { dossiersCol, dossierSuggestionsCol } from "@features/dossier/db";
import { logDossierRevision } from "@features/dossier/revisions";

export type ResearchTopicSource = {
  title: string;
  url: string;
  publisher: string;
  publishedAt?: string | null;
  type?: "official" | "research" | "quality_media" | "primary_doc" | "other";
};

export type ResearchTopicFinding = {
  topicKey: string;
  title: string;
  summary: string;
  decisionQuestion: string;
  topic: string;
  responsibility: string;
  createDossierDraft: boolean;
  sources: ResearchTopicSource[];
  openQuestions?: string[];
};

type StatementProposalDoc = {
  _id?: unknown;
  researchTopicKey?: string | null;
  dossierId?: string | null;
  title?: string | null;
  text?: string | null;
  topic?: string | null;
  status?: string | null;
  createdAt?: Date | null;
  [key: string]: unknown;
};

function normalizeKey(value: string) {
  return normalizeGermanSlug(value, { maxLength: 72, fallback: "thema" });
}

function sourceType(type: ResearchTopicSource["type"]) {
  return type ?? "other";
}

function toDate(value?: string | null) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function proposalText(finding: ResearchTopicFinding) {
  return [
    finding.summary,
    "",
    `Entscheidungsfrage: ${finding.decisionQuestion}`,
    "",
    `Quellen: ${finding.sources.map((source) => source.publisher).join(", ")}`,
  ].join("\n");
}

async function findExistingProposal(topicKey: string) {
  const proposals = await getCol<StatementProposalDoc>("statement_proposals");
  const exact = await proposals.findOne({ researchTopicKey: topicKey } as Record<string, unknown>);
  if (exact) return { collection: proposals, proposal: exact };

  const docs = await proposals
    .find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  const normalizedTarget = normalizeGermanSearchText(topicKey);
  const match = docs.find((doc) => {
    const candidate = normalizeGermanSearchText(
      String(doc.topic ?? doc.title ?? doc.text ?? ""),
    );
    return candidate === normalizedTarget;
  });

  return { collection: proposals, proposal: match ?? null };
}

async function ensureDossierDraft(finding: ResearchTopicFinding, statementId: string) {
  const dossierId = `research-draft:${normalizeKey(finding.topicKey)}`;
  const dossiers = await dossiersCol();
  const existing = await dossiers.findOne({
    $or: [{ dossierId }, { statementId }],
  } as Record<string, unknown>);

  if (existing) {
    return { dossierId: String(existing.dossierId ?? dossierId), created: false };
  }

  const now = new Date();
  await dossiers.insertOne({
    dossierId,
    statementId,
    title: finding.title,
    status: "draft",
    counts: {
      claims: 0,
      sources: 0,
      findings: 0,
      edges: 0,
      openQuestions: 0,
    },
    createdAt: now,
    updatedAt: now,
  } as any);

  await logDossierRevision({
    dossierId,
    entityType: "dossier",
    entityId: dossierId,
    action: "create",
    diffSummary: "Review-first Dossier-Entwurf aus Research-Topic erstellt.",
    byRole: "system",
  });

  return { dossierId, created: true };
}

async function upsertSourceSuggestions(
  finding: ResearchTopicFinding,
  dossierId: string,
  statementId: string,
) {
  const suggestions = await dossierSuggestionsCol();

  for (const source of finding.sources) {
    const suggestionId = `research:source:${normalizeKey(finding.topicKey)}:${stableHash(source.url).slice(0, 16)}`;
    await suggestions.updateOne(
      { suggestionId },
      {
        $set: {
          dossierId,
          type: "source",
          payload: {
            title: source.title,
            summary: `${source.publisher}: ${source.title}`,
            origin: "research",
            section: "sources",
            sourceHref: source.url,
            swipesHref: `/swipes?topic=${encodeURIComponent(finding.topic)}`,
            reviewHint:
              "Research-Fund ist als Quelle vorgemerkt. Quellenabgleich mit bereits importierten RSS/API/Open-Data-Signalen bleibt review-first.",
            riskHint:
              "Die Quelle wird als Provenienz geführt; sie ist noch keine automatisch bestätigte Dossierwahrheit.",
            nextAction:
              "Mit vorhandenen Feed-/API-/Open-Data-Quellen und dem Evidenzgraphen abgleichen.",
            statementId,
            publisher: source.publisher,
            sourceType: sourceType(source.type),
            publishedAt: source.publishedAt ?? null,
          },
          status: "pending",
          moderationNote: "research_backfill_review_first",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          suggestionId,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}

export async function upsertResearchTopicFinding(finding: ResearchTopicFinding) {
  const topicKey = normalizeKey(finding.topicKey);
  const statementId = `research-topic:${topicKey}`;
  const { collection, proposal: existingProposal } = await findExistingProposal(topicKey);

  let proposalId: string;
  let dossierId: string | null = existingProposal?.dossierId
    ? String(existingProposal.dossierId)
    : null;

  if (existingProposal) {
    proposalId =
      String(existingProposal._id ?? "") ||
      `research-proposal:${topicKey}`;

    if (!dossierId && finding.createDossierDraft) {
      const dossier = await ensureDossierDraft(finding, statementId);
      dossierId = dossier.dossierId;
    }

    await collection.updateOne(
      { _id: existingProposal._id },
      {
        $set: {
          researchTopicKey: topicKey,
          title: finding.title,
          text: proposalText(finding),
          topic: finding.topic,
          responsibility: finding.responsibility,
          dossierId,
          status: "proposed",
          updatedAt: new Date(),
        },
      },
    );
  } else {
    if (finding.createDossierDraft) {
      const dossier = await ensureDossierDraft(finding, statementId);
      dossierId = dossier.dossierId;
    }

    const inserted = await collection.insertOne({
      researchTopicKey: topicKey,
      title: finding.title,
      text: proposalText(finding),
      topic: finding.topic,
      responsibility: finding.responsibility,
      dossierId,
      status: "proposed",
      importance: 1,
      researchProvenance: {
        origin: "research_backfill",
        reviewRequired: true,
        aiOrchestratorReviewed: false,
        sourceCount: finding.sources.length,
        sourceUrls: finding.sources.map((source) => source.url),
        decisionQuestion: finding.decisionQuestion,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    proposalId = String(inserted.insertedId ?? `research-proposal:${topicKey}`);
  }

  if (dossierId) {
    await upsertSourceSuggestions(finding, dossierId, statementId);
  }

  return {
    topicKey,
    statementId,
    proposalId,
    dossierId,
    swipeReady: true,
    dossierDraftCreated: Boolean(dossierId),
    aiOrchestratorReviewed: false,
    reviewRequired: true,
  };
}

export const PRIOR_RESEARCH_TOPIC_BACKFILL: ResearchTopicFinding[] = [
  {
    topicKey: "cannabis-teillegalisierung",
    title: "Cannabis-Teillegalisierung: Was soll nach der Evaluation gelten?",
    summary:
      "Die zweite Evaluation des Konsumcannabisgesetzes berichtet Handlungsbedarf beim Kinder- und Jugendschutz und bei medizinischem Cannabis. Eine DIW-Auswertung findet zugleich kurzfristig keine strukturelle Veränderung des Cannabiskonsums und deutlich weniger registrierte cannabisbezogene Delikte.",
    decisionQuestion:
      "Welche Regeln für Zugang, Prävention, Jugendschutz und Strafrecht sollen nach der bisherigen Evidenz gelten?",
    topic: "Cannabis",
    responsibility: "Bund",
    createDossierDraft: true,
    sources: [
      {
        title: "Zweite Evaluation zur Cannabis-Teillegalisierung",
        url: "https://www.bundesgesundheitsministerium.de/presse/pressemitteilungen/zweite-evaluation-zur-cannabis-teillegalisierung-01-04-26",
        publisher: "Bundesministerium für Gesundheit",
        publishedAt: "2026-04-01",
        type: "official",
      },
      {
        title: "Cannabiskonsum nach Teillegalisierung stabil, Kokain nimmt seit Jahren zu",
        url: "https://www.diw-berlin.de/de/diw_01.c.1003629.de/publikationen/wochenberichte/2026_13_1/cannabiskonsum_nach_teillegalisierung_stabil__kokain_nimmt_seit_jahren_zu.html",
        publisher: "DIW Berlin",
        publishedAt: "2026-04-01",
        type: "research",
      },
    ],
    openQuestions: [
      "Welche Veränderungen sind bei Jugendlichen belastbar nachweisbar?",
      "Welche Effekte sind reine Änderungen der Strafbarkeit und welche betreffen tatsächliches Markt- oder Konsumverhalten?",
    ],
  },
  {
    topicKey: "mindestlohn-niedriglohn",
    title: "Mindestlohn und Niedriglohn: Wie viel Einkommen soll Arbeit sichern?",
    summary:
      "Der gesetzliche Mindestlohn beträgt seit Januar 2026 13,90 Euro und steigt 2027 auf 14,60 Euro. Destatis weist für April 2025 16 Prozent der Jobs im Niedriglohnsektor aus.",
    decisionQuestion:
      "Wie soll eine tragfähige Lohnuntergrenze zwischen Einkommen, Beschäftigung, Preisen und staatlichen Transfers austariert werden?",
    topic: "Arbeit und Einkommen",
    responsibility: "Bund",
    createDossierDraft: true,
    sources: [
      {
        title: "Mindestlohn",
        url: "https://www.destatis.de/DE/Themen/Arbeit/Verdienste/Mindestloehne/_inhalt.html",
        publisher: "Statistisches Bundesamt",
        publishedAt: "2026-09-01",
        type: "official",
      },
      {
        title: "Fünfte Mindestlohnanpassungsverordnung",
        url: "https://www.gesetze-im-internet.de/milov5/__1.html",
        publisher: "Gesetze im Internet",
        publishedAt: null,
        type: "primary_doc",
      },
    ],
    openQuestions: [
      "Welche Beschäftigungs- und Preiseffekte sind für Deutschland empirisch belastbar?",
      "Wie verändern Mindestlohn und Transfers gemeinsam das verfügbare Einkommen?",
    ],
  },
  {
    topicKey: "eeg-novelle-2027",
    title: "EEG-Novelle 2027: Wie soll der Ausbau erneuerbarer Energien künftig gesteuert werden?",
    summary:
      "Der Bundestag berät am 24. September 2026 in erster Lesung eine grundlegende EEG-Reform. Das 80-Prozent-Ziel für erneuerbaren Strom bis 2030 soll bleiben; Förderung und Ausbau sollen stärker kosten-, markt- und netzorientiert werden.",
    decisionQuestion:
      "Wie sollen Ausbau, Förderung, Netzausbau, Speicher und Kosten künftig zusammen gesteuert werden?",
    topic: "Energie",
    responsibility: "Bund",
    createDossierDraft: true,
    sources: [
      {
        title: "Grundlegende Reform des Erneuerbare-Energien-Gesetzes geplant",
        url: "https://www.bundestag.de/dokumente/textarchiv/2026/kw39-de-energie-stromsektor-1211294",
        publisher: "Deutscher Bundestag",
        publishedAt: "2026-09-18",
        type: "official",
      },
      {
        title: "Kabinett beschließt EEG-Novelle und Netzpaket",
        url: "https://www.bundesregierung.de/breg-de/aktuelles/kabinett-eeg-novelle-netzpaket-strom-2448636",
        publisher: "Bundesregierung",
        publishedAt: "2026-08-20",
        type: "official",
      },
    ],
    openQuestions: [
      "Wie werden Förderkosten und Systemkosten zwischen Haushalt, Wirtschaft und Anlagenbetreibern verteilt?",
      "Welche Rolle spielen Netzausbau und Speicher gegenüber zusätzlichem Erzeugungszubau?",
    ],
  },
];

export async function backfillPriorResearchTopics() {
  const results = [];
  for (const finding of PRIOR_RESEARCH_TOPIC_BACKFILL) {
    results.push(await upsertResearchTopicFinding(finding));
  }
  return results;
}
