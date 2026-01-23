import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { coreCol } from "@core/db/triMongo";
import { statementCandidatesCol, voteDraftsCol, feedStatementsCol } from "@features/feeds/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Counts = Record<string, number>;

function bool(v: any) {
  return Boolean(v && String(v).trim());
}

async function countBy<T extends { [k: string]: any }>(
  col: { aggregate: (p: any[]) => any },
  field: string,
): Promise<Counts> {
  const rows = await col
    .aggregate([
      { $group: { _id: `$${field}`, n: { $sum: 1 } } },
      { $project: { _id: 0, k: "$_id", n: 1 } },
    ])
    .toArray();
  const out: Counts = {};
  for (const r of rows) out[String(r.k ?? "null")] = Number(r.n ?? 0);
  return out;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const now = new Date().toISOString();

  // ENV sanity (no secrets here)
  const env = {
    triMongo: {
      core: bool(process.env.CORE_MONGODB_URI) && bool(process.env.CORE_DB_NAME),
      votes: bool(process.env.VOTES_MONGODB_URI) && bool(process.env.VOTES_DB_NAME),
      pii: bool(process.env.PII_MONGODB_URI) && bool(process.env.PII_DB_NAME),
      ai_core_reader:
        bool(process.env.AI_CORE_READER_MONGODB_URI) && bool(process.env.AI_CORE_READER_DB_NAME),
    },
    openai: {
      key: bool(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_MODEL ?? null,
    },
    ari: {
      key: bool(process.env.ARI_API_KEY || process.env.YOUCOM_ARI_API_KEY),
      baseUrl: bool(process.env.ARI_BASE_URL),
      mode: process.env.ARI_MODE ?? null,
    },
    gemini: { key: bool(process.env.GEMINI_API_KEY) },
  };

  // Feeds pipeline
  const candidates = await statementCandidatesCol();
  const drafts = await voteDraftsCol();
  const statements = await feedStatementsCol();

  const [candByStatus, draftByStatus, stmtByStatus] = await Promise.all([
    countBy(candidates as any, "analyzeStatus"),
    countBy(drafts as any, "status"),
    countBy(statements as any, "status"),
  ]);

  const candTotal = Object.values(candByStatus).reduce((a, b) => a + b, 0);
  const draftTotal = Object.values(draftByStatus).reduce((a, b) => a + b, 0);
  const stmtTotal = Object.values(stmtByStatus).reduce((a, b) => a + b, 0);

  const lastCandidateError = await candidates
    .find({ analyzeStatus: "error" } as any)
    .sort({ analyzeCompletedAt: -1, createdAt: -1 } as any)
    .limit(1)
    .toArray()
    .then((xs: any[]) => xs?.[0] ?? null);

  const lastDraft = await drafts
    .find({} as any)
    .sort({ createdAt: -1 } as any)
    .limit(1)
    .toArray()
    .then((xs: any[]) => xs?.[0] ?? null);

  const lastStatement = await statements
    .find({} as any)
    .sort({ createdAt: -1 } as any)
    .limit(1)
    .toArray()
    .then((xs: any[]) => xs?.[0] ?? null);

  // Factcheck (best effort): collection may not exist yet
  let factcheck: any = { available: false, byStatus: {}, total: 0, lastError: null };
  try {
    const fc = await coreCol<any>("factcheck_jobs");
    const fcByStatus = await countBy(fc as any, "status");
    const fcTotal = Object.values(fcByStatus).reduce((a, b) => a + b, 0);
    const lastFcError = await fc
      .find({ status: "failed" } as any)
      .sort({ createdAt: -1 } as any)
      .limit(1)
      .toArray()
      .then((xs: any[]) => xs?.[0] ?? null);
    factcheck = {
      available: true,
      byStatus: fcByStatus,
      total: fcTotal,
      lastError: lastFcError
        ? {
            jobId: lastFcError.jobId ?? null,
            createdAt: lastFcError.createdAt ?? null,
            error: lastFcError.error ?? null,
          }
        : null,
    };
  } catch (e: any) {
    factcheck = { available: false, error: String(e?.message ?? e), byStatus: {}, total: 0, lastError: null };
  }

  // Dossier health (best effort)
  let dossiers: any = {
    available: false,
    total: 0,
    claimStatus: {},
    suggestionsPending: 0,
    disputesOpen: 0,
    completeness: {},
  };
  try {
    const dossierCol = await coreCol<any>("dossiers");
    const claimsCol = await coreCol<any>("dossier_claims");
    const sourcesCol = await coreCol<any>("dossier_sources");
    const findingsCol = await coreCol<any>("dossier_findings");
    const edgesCol = await coreCol<any>("dossier_edges");
    const suggestionsCol = await coreCol<any>("dossier_suggestions");
    const disputesCol = await coreCol<any>("dossier_disputes");

    const [dossierTotal, claimStatus, suggestionsPending, disputesOpen, sourcesTotal] = await Promise.all([
      dossierCol.countDocuments({}),
      countBy(claimsCol as any, "status"),
      suggestionsCol.countDocuments({ status: "pending" }),
      disputesCol.countDocuments({ status: "open" }),
      sourcesCol.countDocuments({}),
    ]);

    const [findingsDossiers, edgesDossiers] = await Promise.all([
      findingsCol.distinct("dossierId"),
      edgesCol.distinct("dossierId"),
    ]);

    const total = Number(dossierTotal ?? 0);
    const avgSourcesPerDossier = total > 0 ? sourcesTotal / total : 0;
    const pctWithFindings = total > 0 ? findingsDossiers.length / total : 0;
    const pctWithEdges = total > 0 ? edgesDossiers.length / total : 0;

    dossiers = {
      available: true,
      total,
      claimStatus,
      suggestionsPending,
      disputesOpen,
      completeness: {
        avgSourcesPerDossier: Number(avgSourcesPerDossier.toFixed(2)),
        pctWithFindings: Number(pctWithFindings.toFixed(3)),
        pctWithEdges: Number(pctWithEdges.toFixed(3)),
        sourcesTotal,
        dossiersWithFindings: findingsDossiers.length,
        dossiersWithEdges: edgesDossiers.length,
      },
    };
  } catch (e: any) {
    dossiers = {
      available: false,
      error: String(e?.message ?? e),
      total: 0,
      claimStatus: {},
      suggestionsPending: 0,
      disputesOpen: 0,
      completeness: {},
    };
  }

  return NextResponse.json({
    ok: true,
    now,
    env,
    feeds: {
      candidates: { byStatus: candByStatus, total: candTotal },
      drafts: { byStatus: draftByStatus, total: draftTotal },
      statements: { byStatus: stmtByStatus, total: stmtTotal },
      latest: {
        candidateError: lastCandidateError
          ? {
              id: lastCandidateError.id,
              sourceUrl: lastCandidateError.sourceUrl,
              sourceTitle: lastCandidateError.sourceTitle,
              analyzeError: lastCandidateError.analyzeError ?? null,
              analyzeCompletedAt: lastCandidateError.analyzeCompletedAt ?? null,
            }
          : null,
        draft: lastDraft
          ? {
              id: String(lastDraft._id),
              title: lastDraft.title,
              status: lastDraft.status,
              createdAt: lastDraft.createdAt,
              sourceUrl: lastDraft.sourceUrl ?? null,
            }
          : null,
        statement: lastStatement
          ? {
              id: String(lastStatement._id),
              title: lastStatement.title,
              status: lastStatement.status,
              createdAt: lastStatement.createdAt,
              sourceUrl: lastStatement.sourceUrl ?? null,
            }
          : null,
      },
    },
    factcheck,
    dossiers,
    links: {
      orchestratorSmoke: "/admin/telemetry/ai/orchestrator",
      feedDrafts: "/admin/feeds/drafts",
      swipe: "/swipes",
      aiHub: "/admin/telemetry/ai",
    },
  });
}
