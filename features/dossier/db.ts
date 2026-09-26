import type { ClientSession } from "mongodb";

import { coreCol } from "@core/db/triMongo";
import type {
  DossierDoc,
  DossierSourceDoc,
  DossierClaimDoc,
  DossierFindingDoc,
  DossierEdgeDoc,
  OpenQuestionDoc,
  DossierRevisionDoc,
  DossierDisputeDoc,
  DossierSuggestionDoc,
  DossierCounts,
} from "./schemas";
import type { DossierRevisionMutationResult } from "./revisions";
import { selectEffectiveFindings } from "./effective";

const DOSSIERS_COLLECTION = "dossiers";
const SOURCES_COLLECTION = "dossier_sources";
const CLAIMS_COLLECTION = "dossier_claims";
const FINDINGS_COLLECTION = "dossier_findings";
const EDGES_COLLECTION = "dossier_edges";
const QUESTIONS_COLLECTION = "open_questions";
const REVISIONS_COLLECTION = "dossier_revisions";
const DISPUTES_COLLECTION = "dossier_disputes";
const SUGGESTIONS_COLLECTION = "dossier_suggestions";

const DEFAULT_COUNTS: DossierCounts = {
  claims: 0,
  sources: 0,
  findings: 0,
  edges: 0,
  openQuestions: 0,
};

async function mutateWithRevision<T>(
  dossierId: string,
  mutate: (session: ClientSession) => Promise<DossierRevisionMutationResult<T>>,
) {
  const { mutateDossierWithRevision } = await import("./revisions");
  return mutateDossierWithRevision({ dossierId, mutate });
}

const ensured = {
  dossiers: false,
  sources: false,
  claims: false,
  findings: false,
  edges: false,
  questions: false,
  revisions: false,
  disputes: false,
  suggestions: false,
};

async function ensureDossierIndexes() {
  if (ensured.dossiers) return;
  const col = await coreCol<DossierDoc>(DOSSIERS_COLLECTION);
  await col.createIndex({ dossierId: 1 }, { unique: true });
  await col.createIndex({ statementId: 1 }, { unique: true });
  await col.createIndex({ status: 1 });
  ensured.dossiers = true;
}

async function ensureSourceIndexes() {
  if (ensured.sources) return;
  const col = await coreCol<DossierSourceDoc>(SOURCES_COLLECTION);
  await col.createIndex({ dossierId: 1, canonicalUrlHash: 1 }, { unique: true });
  await col.createIndex({ dossierId: 1, type: 1 });
  await col.createIndex({ publishedAt: -1 });
  ensured.sources = true;
}

async function ensureClaimIndexes() {
  if (ensured.claims) return;
  const col = await coreCol<DossierClaimDoc>(CLAIMS_COLLECTION);
  await col.createIndex({ dossierId: 1, claimId: 1 }, { unique: true });
  await col.createIndex({ dossierId: 1, status: 1 });
  ensured.claims = true;
}

async function ensureFindingIndexes() {
  if (ensured.findings) return;
  const col = await coreCol<DossierFindingDoc>(FINDINGS_COLLECTION);
  await col.createIndex({ dossierId: 1, findingId: 1 }, { unique: true });
  await col.createIndex({ dossierId: 1, claimId: 1, producedBy: 1 }, { unique: true });
  await col.createIndex({ dossierId: 1, verdict: 1 });
  ensured.findings = true;
}

async function ensureEdgeIndexes() {
  if (ensured.edges) return;
  const col = await coreCol<DossierEdgeDoc>(EDGES_COLLECTION);
  await col.createIndex({ dossierId: 1, edgeId: 1 }, { unique: true });
  await col.createIndex({ dossierId: 1, fromId: 1, toId: 1, rel: 1 }, { unique: true });
  await col.createIndex({ dossierId: 1, active: 1 });
  ensured.edges = true;
}

async function ensureQuestionIndexes() {
  if (ensured.questions) return;
  const col = await coreCol<OpenQuestionDoc>(QUESTIONS_COLLECTION);
  await col.createIndex({ dossierId: 1, questionId: 1 }, { unique: true });
  await col.createIndex({ dossierId: 1, status: 1 });
  ensured.questions = true;
}

async function ensureRevisionIndexes() {
  if (ensured.revisions) return;
  const col = await coreCol<DossierRevisionDoc>(REVISIONS_COLLECTION);
  await col.createIndex({ dossierId: 1, timestamp: -1 });
  await col.createIndex({ entityType: 1, entityId: 1 });
  ensured.revisions = true;
}

async function ensureDisputeIndexes() {
  if (ensured.disputes) return;
  const col = await coreCol<DossierDisputeDoc>(DISPUTES_COLLECTION);
  await col.createIndex({ dossierId: 1, disputeId: 1 }, { unique: true });
  await col.createIndex({ dossierId: 1, status: 1 });
  ensured.disputes = true;
}

async function ensureSuggestionIndexes() {
  if (ensured.suggestions) return;
  const col = await coreCol<DossierSuggestionDoc>(SUGGESTIONS_COLLECTION);
  await col.createIndex({ dossierId: 1, suggestionId: 1 }, { unique: true });
  await col.createIndex({ dossierId: 1, status: 1 });
  ensured.suggestions = true;
}

export async function dossiersCol() {
  await ensureDossierIndexes();
  return coreCol<DossierDoc>(DOSSIERS_COLLECTION);
}

export async function dossierSourcesCol() {
  await ensureSourceIndexes();
  return coreCol<DossierSourceDoc>(SOURCES_COLLECTION);
}

export async function dossierClaimsCol() {
  await ensureClaimIndexes();
  return coreCol<DossierClaimDoc>(CLAIMS_COLLECTION);
}

export async function dossierFindingsCol() {
  await ensureFindingIndexes();
  return coreCol<DossierFindingDoc>(FINDINGS_COLLECTION);
}

export async function dossierEdgesCol() {
  await ensureEdgeIndexes();
  return coreCol<DossierEdgeDoc>(EDGES_COLLECTION);
}

export async function openQuestionsCol() {
  await ensureQuestionIndexes();
  return coreCol<OpenQuestionDoc>(QUESTIONS_COLLECTION);
}

export async function dossierRevisionsCol() {
  await ensureRevisionIndexes();
  return coreCol<DossierRevisionDoc>(REVISIONS_COLLECTION);
}

export async function dossierDisputesCol() {
  await ensureDisputeIndexes();
  return coreCol<DossierDisputeDoc>(DISPUTES_COLLECTION);
}

export async function dossierSuggestionsCol() {
  await ensureSuggestionIndexes();
  return coreCol<DossierSuggestionDoc>(SUGGESTIONS_COLLECTION);
}

export async function ensureDossierForStatement(
  statementId: string,
  seed?: { title?: string },
  aliases: string[] = [],
) {
  const col = await dossiersCol();
  const now = new Date();
  const dossierId = statementId;
  const ids = [statementId, ...aliases].filter(Boolean);
  const existing = await col.findOne({
    $or: [{ statementId: { $in: ids } }, { dossierId: { $in: ids } }],
  } as any);
  if (existing) return existing;

  const update: Record<string, any> = {
    $setOnInsert: {
      dossierId,
      statementId,
      status: "active",
      counts: { ...DEFAULT_COUNTS },
      createdAt: now,
    },
  };
  if (seed?.title) {
    update.$set = { title: seed.title, updatedAt: now };
  }

  const transaction = await mutateWithRevision(dossierId, async (session) => {
    const res = await col.findOneAndUpdate(
      { statementId },
      update,
      { upsert: true, returnDocument: "before", includeResultMetadata: true, session },
    );
    const created = !res.value;
    const dossier = await col.findOne({ statementId }, { session });
    if (!dossier) {
      throw new Error(`[dossier] failed to load dossier ${dossierId} inside creation transaction`);
    }

    const changedTitle = Boolean(!created && seed?.title && res.value?.title !== seed.title);
    return {
      result: dossier,
      revision: created
        ? {
            entityType: "dossier",
            entityId: dossier.dossierId,
            action: "create",
            diffSummary: "Dossier erstellt.",
            byRole: "system",
          }
        : changedTitle
          ? {
              entityType: "dossier",
              entityId: dossier.dossierId,
              action: "update",
              diffSummary: "Dossier aktualisiert.",
              byRole: "system",
            }
          : null,
    };
  });

  return transaction.result;
}

export async function computeDossierCounts(dossierId: string, session?: ClientSession) {
  const sessionOptions = session ? { session } : {};
  const [claims, sources, findings, edges, openQuestions] = await Promise.all([
    (await dossierClaimsCol()).countDocuments({ dossierId }, sessionOptions),
    (await dossierSourcesCol()).countDocuments({ dossierId }, sessionOptions),
    (await dossierFindingsCol())
      .find(
        { dossierId },
        { projection: { claimId: 1, producedBy: 1, updatedAt: 1 }, ...sessionOptions },
      )
      .toArray(),
    (await dossierEdgesCol()).countDocuments({ dossierId, active: { $ne: false } }, sessionOptions),
    (await openQuestionsCol()).countDocuments({ dossierId }, sessionOptions),
  ]);
  const effectiveFindings = selectEffectiveFindings(findings as any[]);

  return {
    claims,
    sources,
    findings: effectiveFindings.length,
    edges,
    openQuestions,
  } satisfies DossierCounts;
}

export async function updateDossierCounts(dossierId: string, reason = "Dossier-Zaehler aktualisiert.") {
  const dossierCol = await dossiersCol();

  const transaction = await mutateWithRevision(dossierId, async (session) => {
    const counts = await computeDossierCounts(dossierId, session);
    const existing = await dossierCol.findOne({ dossierId }, { session });
    if (!existing) {
      return { result: counts, revision: null };
    }

    const changed =
      existing.counts?.claims !== counts.claims ||
      existing.counts?.sources !== counts.sources ||
      existing.counts?.findings !== counts.findings ||
      existing.counts?.edges !== counts.edges ||
      existing.counts?.openQuestions !== counts.openQuestions;

    if (!changed) {
      return { result: counts, revision: null };
    }

    await dossierCol.updateOne(
      { dossierId },
      { $set: { counts, updatedAt: new Date() } },
      { session },
    );
    return {
      result: counts,
      revision: {
        entityType: "dossier",
        entityId: dossierId,
        action: "system_update",
        diffSummary: reason,
        byRole: "system",
      },
    };
  });

  return transaction.result;
}

// Backwards-compat alias: prefer updateDossierCounts in write paths only.
export async function refreshDossierCounts(dossierId: string) {
  return updateDossierCounts(dossierId);
}

export async function touchDossierFactchecked(dossierId: string, at: Date = new Date()) {
  await (await dossiersCol()).updateOne(
    { dossierId },
    { $set: { lastFactcheckedAt: at, updatedAt: new Date() } },
  );
}

export const dossierCollections = {
  DOSSIERS_COLLECTION,
  SOURCES_COLLECTION,
  CLAIMS_COLLECTION,
  FINDINGS_COLLECTION,
  EDGES_COLLECTION,
  QUESTIONS_COLLECTION,
  REVISIONS_COLLECTION,
  DISPUTES_COLLECTION,
  SUGGESTIONS_COLLECTION,
};
