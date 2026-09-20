import type {
  Dossier,
  DossierClaimDoc,
  DossierDoc,
  DossierFindingDoc,
  DossierSourceDoc,
  OpenQuestionDoc,
} from "@features/dossier";
import type { DossierPublicUpdateContext } from "@features/dossier/updateReadModel";
import {
  stripDossierInternalFieldsForPublic,
  type DossierPublicationRecord,
} from "@/features/create/dossierPublishWorkflow";
import { getDossierRuntimeSourceStatusLabel } from "@/features/create/dossierRuntime";
import { DOSSIER_EXPORT_SHARE_PUBLICATION_NOTES } from "@/features/review/dossierExportShareTruth";

export type PublicDossierRuntimeItem = {
  id: string;
  slug: string;
  title: string;
  coreQuestion: string | null;
  summary: string;
  statusLabel: string;
  sourceStatusLabel: string;
  updatedAt: string;
  source: "runtime";
};

export type PublicDossierRuntimeDetail = {
  id: string;
  slug: string;
  dossier: Dossier;
  updateContext: DossierPublicUpdateContext | null;
  materialLinks: [];
  sourceStatusLabel: string;
  source: "runtime";
};

type AnalyzeClaim = Dossier["analyze"]["claims"][number];
type AnalyzeQuestion = Dossier["analyze"]["questions"][number];
type AnalyzeFinding = Dossier["analyze"]["findings"][number];

function mapClaim(claim: DossierClaimDoc): AnalyzeClaim {
  return {
    id: claim.claimId,
    text: claim.text,
    title: claim.text,
    topic: null,
    domain: null,
    domains: null,
    responsibility: null,
    importance: null,
    stance: null,
    statementType:
      claim.kind === "fact"
        ? "fact"
        : claim.kind === "value"
          ? "value"
          : claim.kind === "question"
            ? "question"
            : "interpretation",
  };
}

function mapQuestion(question: OpenQuestionDoc): AnalyzeQuestion {
  return {
    id: question.questionId,
    text: question.text,
    dimension: question.responsibility?.label ?? null,
  };
}

function normalizeStandpoint(value: string, index: number): AnalyzeClaim {
  const stance = /^\s*pro\s*:/i.test(value)
    ? "pro"
    : /^\s*(contra|gegen)\s*:/i.test(value)
      ? "contra"
      : "neutral";
  const text = value.replace(/^\s*(pro|contra|gegen)\s*:\s*/i, "").trim() || value;
  return {
    id: `published-standpoint-${index + 1}`,
    text,
    title: text,
    topic: null,
    domain: null,
    domains: null,
    responsibility: null,
    importance: null,
    stance,
    statementType: "interpretation",
  };
}

function uniqueFindingCitations(finding: DossierFindingDoc) {
  const seenSourceIds = new Set<string>();
  return finding.citations.filter((citation) => {
    if (seenSourceIds.has(citation.sourceId)) return false;
    seenSourceIds.add(citation.sourceId);
    return true;
  });
}

function mapFinding(
  finding: DossierFindingDoc,
  citation: DossierFindingDoc["citations"][number] | null,
  id = finding.findingId,
): AnalyzeFinding {
  return {
    id,
    claimId: finding.claimId,
    sourceId: citation?.sourceId ?? "unknown-source",
    finding:
      finding.verdict === "supports"
        ? "supports"
        : finding.verdict === "refutes"
          ? "contradicts"
          : "unclear",
    rationale: finding.rationale.join(" "),
    excerptRef: citation?.locator ?? citation?.quote ?? undefined,
  };
}

function mapSource(source: DossierSourceDoc): Dossier["sourceSet"][number] {
  return {
    canonicalUrl: source.url,
    host: new URL(source.url).host,
    publisher: source.publisher,
    sourceClass:
      source.type === "official"
        ? "gov"
        : source.type === "research"
          ? "research"
          : source.type === "quality_media"
            ? "media"
            : source.type === "stakeholder"
              ? "community"
              : "other",
    sourceType:
      source.type === "official"
        ? "gov"
        : source.type === "research"
          ? "research"
          : source.type === "quality_media"
            ? "media"
            : source.type === "stakeholder"
              ? "community"
              : "other",
    timeRange: source.publishedAt ? new Date(source.publishedAt).toISOString().slice(0, 10) : undefined,
    location: undefined,
    audience: undefined,
    assumptions: source.licenseNote ? [source.licenseNote] : undefined,
    fetchedAt: source.retrievedAt ? new Date(source.retrievedAt).toISOString() : undefined,
    title: source.title,
  };
}

export function mapDossierToPublicDossier(input: {
  publication: DossierPublicationRecord;
  dossierDoc: DossierDoc | null;
  claims: DossierClaimDoc[];
  sources: DossierSourceDoc[];
  findings: DossierFindingDoc[];
  openQuestions: OpenQuestionDoc[];
}): Dossier {
  const persistedClaims = input.claims.map(mapClaim);
  const knownClaims = new Set(persistedClaims.map((claim) => claim.text.trim().toLowerCase()));
  const publishedStandpoints = input.publication.recognizedStandpoints
    .map(normalizeStandpoint)
    .filter((claim) => {
      const key = claim.text.trim().toLowerCase();
      if (!key || knownClaims.has(key)) return false;
      knownClaims.add(key);
      return true;
    });
  const claims = [...persistedClaims, ...publishedStandpoints];
  const persistedQuestions = input.openQuestions.map(mapQuestion);
  const knownQuestions = new Set(
    persistedQuestions.map((question) => question.text.trim().toLowerCase()),
  );
  const publicationQuestions = input.publication.openQuestions
    .map((text, index): AnalyzeQuestion => ({
      id: `published-question-${index + 1}`,
      text,
      dimension: null,
    }))
    .filter((question) => {
      const key = question.text.trim().toLowerCase();
      if (!key || knownQuestions.has(key)) return false;
      knownQuestions.add(key);
      return true;
    });
  const openQuestions = [...persistedQuestions, ...publicationQuestions];
  const findingIdsByDocumentId = new Map<string, string[]>();
  const findings = input.findings.flatMap((finding) => {
    const citations = uniqueFindingCitations(finding);
    const mappedFindings = citations.length
      ? citations.map((citation, index) =>
          mapFinding(
            finding,
            citation,
            index === 0 ? finding.findingId : `${finding.findingId}:citation:${index + 1}`,
          ),
        )
      : [mapFinding(finding, null)];
    findingIdsByDocumentId.set(
      finding.findingId,
      mappedFindings.map((mappedFinding) => mappedFinding.id),
    );
    return mappedFindings;
  });
  const sourceNodes = input.sources.map((source) => ({
    id: source.sourceId,
    type: "evidence" as const,
    label: source.title,
    url: source.url,
    publisher: source.publisher,
    sourceClass: source.type,
  }));
  const claimNodes = claims.map((claim) => ({
    id: claim.id,
    type: "claim" as const,
    label: claim.title ?? claim.text,
  }));
  const evidenceEdgeKeys = new Set<string>();
  const evidenceEdges = findings.flatMap((finding) => {
    if (finding.sourceId === "unknown-source") return [];
    const kind =
      finding.finding === "contradicts"
        ? ("refutes" as const)
        : finding.finding === "supports"
          ? ("supports" as const)
          : ("mentions" as const);
    const key = `${finding.claimId}:${finding.sourceId}:${kind}`;
    if (evidenceEdgeKeys.has(key)) return [];
    evidenceEdgeKeys.add(key);
    return [
      {
        from: finding.claimId,
        to: finding.sourceId,
        kind,
        weight: finding.finding === "unclear" ? 0.4 : 0.7,
      },
    ];
  });
  const linkedClaims = new Set(evidenceEdges.map((edge) => edge.from));
  const findingDocById = new Map(input.findings.map((finding) => [finding.findingId, finding]));
  const presentationOpenQuestions = [
    ...input.openQuestions.map((question) => {
      const linkedFindingDocumentIds = question.links?.findingIds ?? [];
      const linkedFindingIds = linkedFindingDocumentIds.flatMap(
        (findingId) => findingIdsByDocumentId.get(findingId) ?? [findingId],
      );
      return {
        id: question.questionId,
        text: question.text,
        status: question.status,
        responsible: question.responsibility?.label,
        lastUpdate: question.updatedAt?.toISOString(),
        claimIds: question.links?.claimIds ?? [],
        sourceIds: question.links?.sourceIds ?? [],
        findingIds: linkedFindingIds,
        answerCandidates: linkedFindingDocumentIds.flatMap(
          (findingId) => findingDocById.get(findingId)?.rationale ?? [],
        ),
      };
    }),
    ...publicationQuestions.map((question) => ({
      id: question.id,
      text: question.text,
      status: "open" as const,
    })),
  ];
  const dossier: Dossier = {
    meta: {
      id: String(input.publication.dossierId),
      title: input.publication.title,
      jurisdiction: "unknown",
      region: undefined,
      status: "published",
      createdAt: input.publication.createdAt,
      updatedAt: input.publication.updatedAt,
    },
    analyze: {
      mode: "E150",
      sourceText: input.publication.summary,
      language: "und",
      claims,
      findings,
      notes: [
        {
          id: `note-workspace-${input.publication.sourceHandoffId}`,
          kind: "presentation",
          text: JSON.stringify({
            topic: {
              label: input.publication.originQuestion ?? input.publication.title,
            },
            openQuestions: presentationOpenQuestions,
          }),
        },
        {
          id: `note-publication-${input.publication.sourceHandoffId}`,
          kind: "context",
          text: DOSSIER_EXPORT_SHARE_PUBLICATION_NOTES[0],
        },
        {
          id: `note-sources-${input.publication.sourceHandoffId}`,
          kind: "context",
          text: DOSSIER_EXPORT_SHARE_PUBLICATION_NOTES[1],
        },
        {
          id: `note-guardrails-${input.publication.sourceHandoffId}`,
          kind: "context",
          text: DOSSIER_EXPORT_SHARE_PUBLICATION_NOTES[4],
        },
      ],
      questions: openQuestions,
      missingPerspectives: [],
      knots: input.publication.topicReferences.map((topic, index) => ({
        id: `topic-${index + 1}`,
        label: topic,
        description: `Themenbezug: ${topic}`,
      })),
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
        nodes: [...claimNodes, ...sourceNodes],
        edges: evidenceEdges,
        summary: {
          claimCount: claims.length,
          evidenceCount: sourceNodes.length,
          linkedClaimCount: linkedClaims.size,
          unlinkedClaimCount: Math.max(0, claims.length - linkedClaims.size),
        },
      },
      report: {
        summary: input.publication.summary,
        keyConflicts: input.publication.argumentLines.slice(0, 4),
        facts: {
          local: [],
          international: [],
        },
        openQuestions: openQuestions.map((question) => question.text),
        takeaways: [
          "Veröffentlichung bedeutet keinen Wahrheitsbeweis.",
          "Quellen bleiben Einordnung und prüfbarer Kontext.",
        ],
      },
    } as Dossier["analyze"],
    sourceSet: input.sources.map(mapSource),
  };

  return stripDossierInternalFieldsForPublic(dossier);
}

export async function listPublishedDossiers(limit = 40) {
  const { listPublishedDossierPublicationRecords } = await import(
    "@/features/create/dossierPublishWorkflowServer"
  );
  const records = await listPublishedDossierPublicationRecords(limit);
  return records.map((record): PublicDossierRuntimeItem => ({
    id: String(record.dossierId),
    slug: String(record.dossierId),
    title: record.title,
    coreQuestion: record.originQuestion,
    summary: record.summary,
    statusLabel: "Veröffentlicht",
    sourceStatusLabel: getDossierRuntimeSourceStatusLabel(record.sourceStatus),
    updatedAt: record.updatedAt,
    source: "runtime",
  }));
}

export async function getPublishedDossierBySlugOrId(slugOrId: string) {
  const [workflowServer, dossierDb, updateReadModel] = await Promise.all([
    import("@/features/create/dossierPublishWorkflowServer"),
    import("@features/dossier/db"),
    import("@features/dossier/updateReadModel"),
  ]);
  const publication = await workflowServer.getPublishedDossierPublicationRecordByDossierId(slugOrId);
  if (!publication) return null;

  const [dossierDoc, claims, sources, findings, openQuestions, updateReadModelResult] =
    await Promise.all([
      (await dossierDb.dossiersCol()).findOne({ dossierId: String(publication.dossierId) } as any),
      (await dossierDb.dossierClaimsCol())
        .find({ dossierId: String(publication.dossierId) })
        .sort({ createdAt: 1 })
        .toArray(),
      (await dossierDb.dossierSourcesCol())
        .find({ dossierId: String(publication.dossierId) })
        .sort({ publishedAt: -1, createdAt: -1 })
        .toArray(),
      (await dossierDb.dossierFindingsCol())
        .find({ dossierId: String(publication.dossierId) })
        .sort({ updatedAt: -1 })
        .toArray(),
      (await dossierDb.openQuestionsCol())
        .find({ dossierId: String(publication.dossierId) })
        .sort({ status: 1, createdAt: 1 })
        .toArray(),
      updateReadModel.buildDossierUpdateReadModel({
        dossierId: String(publication.dossierId),
        materialize: true,
        publicVisible: true,
      }).catch(() => null),
    ]);

  const dossier = mapDossierToPublicDossier({
    publication,
    dossierDoc,
    claims,
    sources,
    findings,
    openQuestions,
  });

  return {
    detail: {
      id: String(publication.dossierId),
      slug: String(publication.dossierId),
      dossier,
      updateContext: updateReadModelResult?.publicContext ?? null,
      materialLinks: [],
      sourceStatusLabel: getDossierRuntimeSourceStatusLabel(publication.sourceStatus),
      source: "runtime" as const,
    },
    record: publication,
  };
}

export async function getDossierPublicationRuntimeHint(slugOrId: string) {
  const { getAnyDossierPublicationRecordByDossierId } = await import(
    "@/features/create/dossierPublishWorkflowServer"
  );
  return getAnyDossierPublicationRecordByDossierId(slugOrId);
}
